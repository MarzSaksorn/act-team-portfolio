import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [360, 768, 1440]) {
  for (const route of ['/', '/competitions', '/projects']) {
    test(`allPagesFitMobileViewport ${width} ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 }); await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      for (const label of ['Home', 'Competitions', 'Projects']) await expect(page.getByRole('link', { name: label, exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'ไทย', exact: true }).click();
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
  await expect(page.locator('.site-header')).toHaveCSS('background-color', 'rgb(244, 249, 248)');
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
