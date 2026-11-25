import { expect, test } from '@playwright/test';

const username = 'act-test-admin';
const password = 'fake-test-password';

async function signIn(page: import('@playwright/test').Page) {
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'ACT content editor' })).toBeVisible();
}

test('rejects writes without an authenticated admin session', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByLabel('Username')).toBeVisible();

  const status = await page.evaluate(async () => {
    const response = await fetch('/api/v1/admin/site-copy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unauthorized: true }),
    });
    return response.status;
  });

  expect(status).toBe(401);
  await expect(page.getByLabel('Home title — English')).toHaveCount(0);
});

test('passes accessibility checks in login and editor states and supports skip-link navigation', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await page.goto('/admin');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();

  const loginAudit = await new AxeBuilder({ page })
    .include('.admin-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(loginAudit.violations).toEqual([]);

  await page.getByLabel('Username').focus();
  await page.keyboard.type(username);
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password')).toBeFocused();
  await page.keyboard.type(password);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'ACT content editor' })).toBeVisible();
  await page.getByRole('button', { name: 'Projects' }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', { name: 'Add project' })).toBeVisible();
  await page.getByRole('button', { name: 'Site copy' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Hero headline — English')).toBeVisible();

  const editorAudit = await new AxeBuilder({ page })
    .include('.admin-page')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(editorAudit.violations).toEqual([]);
});

test('hides private fields until login, edits bilingual copy and event data, and serves the saved copy live', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'ACT content studio' })).toBeVisible();
  await expect(page.getByLabel('Username')).toBeVisible();
  await expect(page.getByLabel('Home title — English')).toHaveCount(0);

  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('incorrect-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('The username or password is incorrect.');
  await expect(page.getByLabel('Home title — English')).toHaveCount(0);

  await signIn(page);
  await page.getByLabel('Hero headline — English').fill('Ideas start with a question.');
  await page.getByLabel('Hero headline — Thai').fill('ไอเดียเริ่มจากคำถาม');
  await page.getByRole('button', { name: 'Save site copy' }).click();
  await expect(page.getByRole('status')).toContainText('Site copy saved.');

  await page.getByRole('button', { name: 'Upcoming event' }).click();
  await page.getByLabel('Event note — English').fill('ACT is planning to apply. This is not a confirmed entry.');
  await page.getByLabel('Event note — Thai').fill('ACT วางแผนสมัคร แต่ยังไม่มีการยืนยัน');
  await page.getByRole('button', { name: 'Save upcoming event' }).click();
  await expect(page.getByRole('status')).toContainText('Upcoming event saved.');

  await page.reload();
  await expect(page.getByLabel('Hero headline — English')).toHaveValue('Ideas start with a question.');
  await page.getByRole('button', { name: 'Upcoming event' }).click();
  await expect(page.getByLabel('Event note — Thai')).toHaveValue('ACT วางแผนสมัคร แต่ยังไม่มีการยืนยัน');

  await page.goto('/');
  await expect(page.getByText(/Ideas start with a question\.\s*Build responsibly\./)).toBeVisible();
  await expect(page.getByText('ACT is planning to apply. This is not a confirmed entry.')).toBeVisible();
  await expect(page.getByText('Not yet registered')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Official event details' })).toHaveAttribute('href', 'https://futurecenter.ai/hackathon#talk');

  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(async () => { await document.fonts.ready; });
    const layout = await page.evaluate(() => {
      const overflowing = [...document.body.querySelectorAll<HTMLElement>('*')]
        .map((element) => ({
          tag: element.tagName,
          className: typeof element.className === 'string' ? element.className : '',
          right: Math.round(element.getBoundingClientRect().right),
        }))
        .filter((element) => element.right > window.innerWidth)
        .sort((left, right) => right.right - left.right)[0] ?? null;
      return { documentWidth: document.documentElement.scrollWidth, overflowing };
    });
    expect(layout.documentWidth, `Horizontal overflow at ${width}px: ${JSON.stringify(layout.overflowing)}`).toBeLessThanOrEqual(width);
  }
});

test('supports project creation, editing, deletion confirmation, and pagination', async ({ page }) => {
  await page.goto('/admin');
  await signIn(page);
  await page.getByRole('button', { name: 'Projects' }).click();

  for (let index = 1; index <= 6; index += 1) {
    await page.getByRole('button', { name: 'Add project' }).click();
    await page.getByLabel('Project title — English').fill(`Test project ${index}`);
    await page.getByLabel('Project title — Thai').fill(`โครงการทดสอบ ${index}`);
    await page.getByLabel('Project summary — English').fill(`Summary for test project ${index}`);
    await page.getByLabel('Project summary — Thai').fill(`สรุปโครงการทดสอบ ${index}`);
    await page.getByLabel('Project status').selectOption('planned');
    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page.getByRole('status')).toContainText('Project created.');
  }

  await expect(page.getByText('Page 1 of 2')).toBeVisible();
  await page.getByRole('button', { name: 'Next projects page' }).click();
  await expect(page.getByRole('heading', { name: 'Test project 6', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit project: Test project 6', exact: true }).click();
  await page.getByLabel('Project title — English').fill('Edited test project');
  await page.getByRole('button', { name: 'Save project' }).click();
  await expect(page.getByRole('status')).toContainText('Project saved.');
  await expect(page.getByRole('heading', { name: 'Edited test project', exact: true })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete project: Edited test project', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Edited test project', exact: true })).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Project deleted.');
});

test('creates, edits, and deletes competition records without mixing founder and ACT history', async ({ page }) => {
  await page.goto('/admin');
  await signIn(page);
  await page.getByRole('button', { name: 'Competitions' }).click();

  const founderGroup = page.getByRole('region', { name: 'Founder history before ACT' });
  await founderGroup.getByRole('button', { name: 'Add founder pre-ACT record' }).click();
  await page.getByLabel('Competition name — English').fill('Founder-only event');
  await page.getByLabel('Competition name — Thai').fill('การแข่งขันของผู้ก่อตั้ง');
  await page.getByLabel('Competition year').fill('2024');
  await page.getByLabel('Participants (comma-separated)').fill('Founder One');
  await page.getByLabel('Competition stage — English').fill('Participated');
  await page.getByLabel('Competition stage — Thai').fill('เข้าร่วม');
  await page.getByRole('button', { name: 'Create founder pre-ACT record' }).click();
  await expect(founderGroup.getByRole('status')).toContainText('Competition record created.');

  const actGroup = page.getByRole('region', { name: 'ACT competition history' });
  await actGroup.getByRole('button', { name: 'Add ACT competition record' }).click();
  await page.getByLabel('Competition name — English').fill('ACT team event');
  await page.getByLabel('Competition name — Thai').fill('การแข่งขันทีม ACT');
  await page.getByLabel('Competition year').fill('2026');
  await page.getByLabel('Participants (comma-separated)').fill('ACT Team');
  await page.getByLabel('Competition stage — English').fill('Planning to apply');
  await page.getByLabel('Competition stage — Thai').fill('วางแผนสมัคร');
  await page.getByRole('button', { name: 'Create ACT competition record' }).click();
  await expect(actGroup.getByRole('status')).toContainText('Competition record created.');

  await founderGroup.getByRole('button', { name: 'Edit competition: Founder-only event', exact: true }).click();
  await page.getByLabel('Competition name — English').fill('Edited founder-only event');
  await page.getByRole('button', { name: 'Save competition record' }).click();
  await expect(founderGroup.getByRole('status')).toContainText('Competition record saved.');
  await expect(founderGroup.getByRole('heading', { name: 'Edited founder-only event', exact: true })).toBeVisible();
  await expect(actGroup.getByRole('heading', { name: 'ACT team event', exact: true })).toBeVisible();

  await page.goto('/competitions');
  const publicFounderGroup = page.getByRole('region', { name: 'Founders before ACT' });
  const publicActGroup = page.getByRole('region', { name: 'ACT competition record' });
  await expect(publicFounderGroup.getByRole('heading', { name: 'Edited founder-only event', exact: true })).toBeVisible();
  await expect(publicActGroup.getByRole('heading', { name: 'ACT team event', exact: true })).toBeVisible();
  await expect(publicActGroup.getByRole('heading', { name: 'Edited founder-only event', exact: true })).toHaveCount(0);
  await expect(publicFounderGroup.getByRole('heading', { name: 'ACT team event', exact: true })).toHaveCount(0);

  await page.goto('/admin');
  await page.getByRole('button', { name: 'Competitions' }).click();
  const currentFounderGroup = page.getByRole('region', { name: 'Founder history before ACT' });
  const currentActGroup = page.getByRole('region', { name: 'ACT competition history' });
  page.once('dialog', (dialog) => dialog.accept());
  await currentFounderGroup.getByRole('button', { name: 'Delete competition: Edited founder-only event', exact: true }).click();
  await expect(currentFounderGroup.getByRole('heading', { name: 'Edited founder-only event', exact: true })).toHaveCount(0);
  await expect(currentFounderGroup.getByRole('status')).toContainText('Competition record deleted.');
  await expect(currentActGroup.getByRole('heading', { name: 'ACT team event', exact: true })).toBeVisible();
});

test('translates the editor to Thai and saves Thai content', async ({ page }) => {
  await page.goto('/admin');
  await signIn(page);
  await page.getByRole('button', { name: 'ไทย', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'เครื่องมือจัดการเนื้อหา ACT' })).toBeVisible();
  await expect(page.getByLabel('พาดหัวหลัก — ภาษาไทย')).toBeVisible();

  await page.getByLabel('พาดหัวหลัก — ภาษาไทย').fill('ไอเดียใหม่เริ่มต้นที่ ACT');
  await page.getByRole('button', { name: 'บันทึกเนื้อหาเว็บไซต์' }).click();
  await expect(page.getByRole('status')).toContainText('บันทึกเนื้อหาเว็บไซต์แล้ว');

  await page.reload();
  await expect(page.getByLabel('พาดหัวหลัก — ภาษาไทย')).toHaveValue('ไอเดียใหม่เริ่มต้นที่ ACT');
});

test('keeps the admin usable without horizontal overflow at mobile, tablet, and desktop widths', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/admin');
  await signIn(page);
  await page.getByRole('button', { name: 'Competitions' }).click();

  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole('button', { name: 'Add founder pre-ACT record' })).toBeVisible();
    const documentWidth = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
    expect(documentWidth).toBeLessThanOrEqual(width);
  }
});
