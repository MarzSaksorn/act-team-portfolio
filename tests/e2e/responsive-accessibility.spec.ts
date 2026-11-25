import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

function rgbChannels(color: string): number[] {
  const channels = color.match(/[\d.]+/g)?.map(Number);
  if (!channels || channels.length !== 3) throw new Error(`Expected opaque RGB color: ${color}`);
  return channels;
}

function contrastRatio(foreground: string, background: string): number {
  const luminance = (color: string) => rgbChannels(color).reduce((sum, channel, index) => {
    const normalized = channel / 255;
    const linear = normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    const weight = [0.2126, 0.7152, 0.0722][index];
    if (weight === undefined) throw new Error('Unexpected color channel');
    return sum + linear * weight;
  }, 0);
  const values = [luminance(foreground), luminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

for (const width of [320, 360, 768, 1024, 1440]) {
  for (const route of ['/', '/competitions', '/projects']) {
    test(`allPagesFitMobileViewport ${width} ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 }); await page.goto(route);
      await page.evaluate(async () => { await document.fonts.ready; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      for (const label of ['Home', 'Competitions', 'Projects']) await expect(page.getByRole('link', { name: label, exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'ไทย', exact: true }).click();
      await page.evaluate(async () => { await document.fonts.ready; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
}
test('glassSurfacesHaveReadableText', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.site-header')).not.toHaveCSS('backdrop-filter', 'none');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
});
test('reducedMotionDisablesDecorativeTransitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/');
  await expect(page.locator('.button-primary').first()).toHaveCSS('transition-duration', '0s');
});
test('reducedTransparencyUsesSolidFallback', async ({ page }) => {
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
  await page.goto('/');
  await expect(page.locator('.site-header')).toHaveCSS('backdrop-filter', 'none');
  await expect(page.locator('.site-header')).toHaveCSS('background-color', 'rgb(253, 242, 242)');
});
for (const route of ['/', '/competitions', '/projects']) {
  for (const locale of ['en', 'th']) {
    test(`allRoutesPassAxe ${route} ${locale}`, async ({ page }) => {
      await page.addInitScript(language => localStorage.setItem('act-locale', language), locale); await page.goto(route);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(results.violations).toEqual([]);
    });
  }
}
test('keyboardFocusIsVisibleAndNavigationWorks', async ({ page }) => {
  await page.goto('/'); await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#main')).toBeFocused();
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ideas into action');
  await page.getByRole('link', { name: 'Join ACT', exact: true }).click();
  await expect(page.locator('#join')).toBeInViewport();
});

test('coralBrandAppearsInTheWordmarkAndBrowserTheme', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.act-mark i')).toHaveCSS('background-color', 'rgb(243, 88, 87)');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#F35857');
});

test('coralPrimaryActionsMeetTextContrastInDefaultHoverAndActiveStates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const button = page.locator('.button-primary').first();
  const assertReadableCoral = async () => {
    const colors = await button.evaluate(element => {
      const style = getComputedStyle(element);
      return { foreground: style.color, background: style.backgroundColor };
    });
    const channels = rgbChannels(colors.background);
    expect(channels[0]).toBeGreaterThan(channels[1] ?? 255);
    expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
  };
  await assertReadableCoral();
  await button.hover();
  await expect(button).toHaveCSS('transform', 'none');
  await assertReadableCoral();
  await page.mouse.down();
  try { await assertReadableCoral(); } finally { await page.mouse.up(); }
});

test('coralSurfacesKeepTextLinksAndKeyboardFocusReadable', async ({ page }) => {
  await page.goto('/');
  const colors = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const token = (name: string) => {
      const sample = document.createElement('span');
      sample.style.color = `var(${name})`;
      document.body.append(sample);
      const color = getComputedStyle(sample).color;
      sample.remove();
      return color;
    };
    return {
      ink: token('--ink'), muted: token('--muted'), link: token('--link'),
      paper: token('--paper'), tintedSurface: token('--coral-200'),
      scalePresent: root.getPropertyValue('--coral-50').trim().length > 0,
    };
  });
  expect(colors.scalePresent).toBe(true);
  for (const foreground of [colors.ink, colors.muted, colors.link]) {
    for (const background of [colors.paper, colors.tintedSurface]) {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  }
  await page.keyboard.press('Tab');
  const focus = await page.getByRole('link', { name: 'Skip to content' }).evaluate(element => {
    const style = getComputedStyle(element);
    return { color: style.outlineColor, width: parseFloat(style.outlineWidth), offset: parseFloat(style.outlineOffset) };
  });
  expect(focus.width).toBeGreaterThanOrEqual(3);
  expect(focus.offset).toBeGreaterThanOrEqual(3);
  expect(contrastRatio(focus.color, colors.paper)).toBeGreaterThanOrEqual(3);
});

test('blueTouchStaysDecorativeWhileCoralRemainsPrimary', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.ascii-canvas')).toBeVisible();
  await expect(page.locator('.ascii-surface')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.ascii-panel, .ascii-topline, .ascii-bottomline, .ascii-caption')).toHaveCount(0);
  const pause = page.getByRole('button', { name: 'Pause animation' });
  await expect(pause).toBeVisible();
  await expect(pause).toHaveAttribute('aria-label', 'Pause animation');
  await expect(pause).toHaveText('');
  const hasBlueGlyph = await page.locator('.ascii-canvas').evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error('ASCII canvas missing');
    const context = element.getContext('2d');
    if (!context) throw new Error('Canvas context missing');
    const { data } = context.getImageData(0, 0, element.width, element.height);
    for (let index = 0; index < data.length; index += 4) {
      const red = data[index] ?? 0;
      const green = data[index + 1] ?? 0;
      const blue = data[index + 2] ?? 0;
      const alpha = data[index + 3] ?? 0;
      if (alpha > 0 && red < 150 && green > 110 && blue > 140) return true;
    }
    return false;
  });
  expect(hasBlueGlyph).toBe(true);
  await expect(page.locator('.act-mark i')).toHaveCSS('background-color', 'rgb(243, 88, 87)');
  const colors = await page.locator('.button-primary').first().evaluate(element => {
    const style = getComputedStyle(element);
    return { foreground: style.color, background: style.backgroundColor };
  });
  expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5);
  expect(colors.background).toBe('rgb(191, 13, 13)');
});

test('requestedFontsLoadAndThaiFallbackRemainsAvailable', async ({ page }) => {
  await page.goto('/');
  const english = await page.evaluate(async () => {
    const hero = document.querySelector('.hero-display');
    const body = document.querySelector('.hero-body');
    const heading = document.querySelector('.about-strip h2');
    const wordmark = document.querySelector('.act-mark');
    if (!hero || !body || !heading || !wordmark) throw new Error('Typography targets are missing');

    const [aqua, alegreya, thai] = await Promise.all([
      document.fonts.load('400 64px "Aqua Grotesque"', 'Think beyond'),
      document.fonts.load('400 16px "Alegreya Sans"', 'Avoonger Competition Team'),
      document.fonts.load('400 16px "IBM Plex Sans Thai"', 'ทีมเทคโนโลยี'),
    ]);
    return {
      heroFamily: getComputedStyle(hero).fontFamily,
      heroWeight: getComputedStyle(hero).fontWeight,
      bodyFamily: getComputedStyle(body).fontFamily,
      headingFamily: getComputedStyle(heading).fontFamily,
      wordmarkFamily: getComputedStyle(wordmark).fontFamily,
      loadedFaces: { aqua: aqua.length, alegreya: alegreya.length, thai: thai.length },
    };
  });

  expect(english.heroFamily).toContain('Aqua Grotesque');
  expect(english.heroWeight).toBe('400');
  expect(english.bodyFamily).toContain('Alegreya Sans');
  expect(english.headingFamily).toContain('Alegreya Sans');
  expect(english.wordmarkFamily).toContain('Space Grotesk');
  expect(english.loadedFaces.aqua).toBeGreaterThan(0);
  expect(english.loadedFaces.alegreya).toBeGreaterThan(0);
  expect(english.loadedFaces.thai).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'ไทย', exact: true }).click();
  const thai = await page.evaluate(async () => {
    const hero = document.querySelector('.hero-display');
    const body = document.querySelector('.hero-body');
    if (!hero || !body) throw new Error('Thai typography targets are missing');
    const loaded = await document.fonts.load('400 16px "IBM Plex Sans Thai"', 'ข้อความภาษาไทย');
    return {
      heroFamily: getComputedStyle(hero).fontFamily,
      bodyFamily: getComputedStyle(body).fontFamily,
      thaiFaces: loaded.length,
    };
  });
  expect(thai.heroFamily).toContain('IBM Plex Sans Thai');
  expect(thai.bodyFamily).toContain('IBM Plex Sans Thai');
  expect(thai.thaiFaces).toBeGreaterThan(0);
});

for (const width of [320, 360, 768, 1024, 1440]) {
  test(`ascii hero stays bounded and keyboard pausable in both locales ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 }); await page.goto('/');
    const canvas = page.locator('.ascii-canvas');
    await expect(canvas).toBeVisible();
    const bounds = await canvas.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) throw new Error('ASCII bounds missing');
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    const pixels = () => canvas.evaluate(element => {
      if (!(element instanceof HTMLCanvasElement)) throw new Error('Canvas missing');
      return element.toDataURL();
    });
    const firstFrame = await pixels();
    await expect.poll(pixels).not.toBe(firstFrame);
    const pause = page.getByRole('button', { name: 'Pause animation' });
    await pause.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Resume animation' })).toBeFocused();
    const pausedFrame = await pixels(); await page.waitForTimeout(250);
    expect(await pixels()).toBe(pausedFrame);
    expect(await canvas.boundingBox()).toEqual(bounds);
    await page.getByRole('button', { name: 'ไทย', exact: true }).click();
    await expect(page.getByRole('button', { name: 'เล่นภาพเคลื่อนไหวต่อ' })).toBeVisible();
    await page.getByRole('button', { name: 'เล่นภาพเคลื่อนไหวต่อ' }).click();
    await expect(page.getByRole('button', { name: 'หยุดภาพเคลื่อนไหว' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('ascii hero is static on reduced motion including a live preference change', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/');
  const art = page.locator('.hero-art'); const canvas = page.locator('.ascii-canvas');
  await expect(art).toHaveAttribute('data-motion', 'reduced');
  const pixels = () => canvas.evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error('Canvas missing');
    return element.toDataURL();
  });
  const staticFrame = await pixels(); await page.waitForTimeout(250);
  expect(await pixels()).toBe(staticFrame);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.getByRole('button', { name: 'Pause animation' })).toBeVisible();
  await expect.poll(pixels).not.toBe(staticFrame);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(art).toHaveAttribute('data-motion', 'reduced');
  const stopped = await pixels(); await page.waitForTimeout(250); expect(await pixels()).toBe(stopped);
  await expect(page.locator('.hero-display')).toHaveText('Think boldly.Build responsibly.');
});

test('micro interaction feedback uses transforms with visible keyboard focus and reduced-motion alternatives', async ({ page }) => {
  await page.goto('/');
  const language = page.getByRole('button', { name: 'ไทย', exact: true });
  await language.hover(); await page.mouse.down();
  try { await expect(language).not.toHaveCSS('transform', 'none'); } finally { await page.mouse.up(); }
  const link = page.locator('.hero-actions .text-link');
  await link.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await expect(link).toBeFocused(); await expect(link).toHaveCSS('outline-width', '3px');
  await expect(link.locator('svg')).not.toHaveCSS('transform', 'none');
  const nav = page.locator('.main-nav a[href="/projects"]');
  await nav.focus();
  await expect.poll(() => nav.evaluate(element => getComputedStyle(element, '::after').transform)).not.toBe('none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(link.locator('svg')).toHaveCSS('transform', 'none');
  await language.hover(); await page.mouse.down();
  try { await expect(language).toHaveCSS('transform', 'none'); } finally { await page.mouse.up(); }
});

test('asciiBackgroundOverlapsHeroHeadlineWithoutCoveringItsCopy', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.ascii-canvas')).toBeVisible();
  const composition = await page.evaluate(() => {
    const canvas = document.querySelector('.ascii-canvas');
    const headline = document.querySelector('.hero-display');
    const copy = document.querySelector('.hero-copy');
    const art = document.querySelector('.hero-art');
    if (!(canvas instanceof HTMLElement) || !(headline instanceof HTMLElement)
      || !(copy instanceof HTMLElement) || !(art instanceof HTMLElement)) {
      throw new Error('Hero composition targets are missing');
    }
    const headlineLine = headline.querySelector('span');
    if (!(headlineLine instanceof HTMLElement)) throw new Error('Second headline line missing');
    const artBounds = canvas.getBoundingClientRect();
    const headlineBounds = headlineLine.getBoundingClientRect();
    return {
      horizontalOverlap: Math.min(artBounds.right, headlineBounds.right) - Math.max(artBounds.left, headlineBounds.left),
      verticalOverlap: Math.min(artBounds.bottom, headlineBounds.bottom) - Math.max(artBounds.top, headlineBounds.top),
      headlineWidth: headlineBounds.width,
      copyLayer: Number.parseInt(getComputedStyle(copy).zIndex, 10),
      artLayer: Number.parseInt(getComputedStyle(art).zIndex, 10),
      headlineText: headline.textContent ?? '',
    };
  });
  expect(composition.horizontalOverlap).toBeGreaterThan(0);
  expect(composition.horizontalOverlap / composition.headlineWidth).toBeLessThan(0.55);
  expect(composition.verticalOverlap).toBeGreaterThan(0);
  expect(composition.copyLayer).toBeGreaterThan(composition.artLayer);
  expect(composition.headlineText).toContain('Think boldly.');
  expect(composition.headlineText).toContain('Build responsibly.');
  const pause = page.getByRole('button', { name: 'Pause animation' });
  await expect(pause).toHaveAttribute('aria-label', 'Pause animation');
  await expect(pause).toHaveText('');
});

test('mobile ASCII glyphs soften without fading the animation control', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.ascii-canvas')).toBeVisible();
  const opacity = () => page.locator('.ascii-surface').evaluate(element => Number(getComputedStyle(element).opacity));
  const desktopOpacity = await opacity();
  await page.setViewportSize({ width: 320, height: 1000 });
  const mobileOpacity = await opacity();
  expect(mobileOpacity).toBeGreaterThan(0);
  expect(mobileOpacity).toBeLessThan(desktopOpacity);
  const pause = page.getByRole('button', { name: 'Pause animation' });
  await expect(pause).toHaveCSS('opacity', '1');
  await pause.click();
  await expect(page.getByRole('button', { name: 'Resume animation' })).toBeVisible();
});

test('homepage backdrop leaves coral for the ACT hero instead of washing the whole page', async ({ page }) => {
  await page.goto('/');
  const image = await page.locator('.site-backdrop').evaluate(element => getComputedStyle(element).backgroundImage);
  expect(image).not.toContain('radial-gradient');
});
