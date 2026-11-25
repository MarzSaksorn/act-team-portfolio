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

for (const width of [320, 360, 768, 1440]) {
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
  await expect.poll(() => button.evaluate(element => getComputedStyle(element).transform)).not.toBe('none');
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
  await expect(page.locator('.hero-art')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.orbit-one')).toHaveCSS('border-color', 'rgb(102, 155, 188)');
  await expect(page.locator('.art-glass')).toHaveCSS('background-color', 'rgba(102, 155, 188, 0.14)');
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
    const wordmark = document.querySelector('.art-wordmark');
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
