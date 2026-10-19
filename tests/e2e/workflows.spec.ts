import { test, expect } from '@playwright/test';

test('tree and content survive tab switches; no page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const tree = page.locator('section:not([hidden]) textarea').first();
  await tree.fill('PersistentApp/\n└── main.py');
  await page.getByRole('button', { name: 'محرر وحقن الأكواد (Content)' }).click();
  const batch = page.locator('section:not([hidden]) textarea').first();
  await batch.fill('### main.py\nprint("keep this draft")');
  await page.getByRole('button', { name: 'منشئ المجلدات (Builder)' }).click();
  await expect(tree).toHaveValue('PersistentApp/\n└── main.py');
  await page.getByRole('button', { name: 'محرر وحقن الأكواد (Content)' }).click();
  await expect(page.locator('section:not([hidden]) textarea').first()).toHaveValue('### main.py\nprint("keep this draft")');
  expect(errors).toEqual([]);
});

test('AI apply is a single history checkpoint, not a render loop', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/generate-ai-tree', route => route.fulfill({ json: { success: true, data: {
    projectName: 'AIApp', summary: 'Example', treeText: 'AIApp/\n└── main.py', batchCode: '### main.py\nprint(42)',
  } } }));
  await page.goto('/');
  await page.getByRole('button', { name: 'المهندس الذكي (Thinking AI)' }).click();
  await page.locator('section:not([hidden]) textarea').fill('Create an app');
  await page.getByRole('button', { name: 'توليد الهيكل والأكواد بالذكاء الاصطناعي' }).click();
  await page.getByRole('button', { name: 'تحميل الشجرة والكود في التطبيق' }).click();
  const tree = page.locator('section:not([hidden]) textarea').first();
  await expect(tree).toHaveValue('AIApp/\n└── main.py');
  await tree.fill('AIApp/\n└── edited.py');
  // Wait beyond debounce: repeated effects previously overwrote the edit and filled history.
  await page.waitForTimeout(900);
  await expect(tree).toHaveValue('AIApp/\n└── edited.py');
  expect(errors).toEqual([]);
});

test('all application logo images resolve', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header')).toBeVisible();
  const logos = page.locator('img[alt="TreeForge"]');
  for (const logo of await logos.all()) {
    await expect(logo).toHaveJSProperty('complete', true);
    expect(await logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  }
});

test('export wizard downloads runnable Python with optional execution disabled', async ({ page }, info) => {
  const { readFileSync, mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { spawnSync } = await import('node:child_process');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('section:not([hidden]) textarea').first().fill('WizardApp/\n└── main.py');
  await page.getByRole('button', { name: 'معالج التصدير', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'معالج التصدير' });
  await dialog.getByRole('button', { name: 'التالي', exact: true }).click();
  await dialog.getByRole('button', { name: 'التالي', exact: true }).click();
  await dialog.getByRole('button', { name: /Python \(\.py\)/ }).click();
  const downloading = page.waitForEvent('download');
  await dialog.getByRole('button', { name: /تصدير وتحميل/ }).click();
  const download = await downloading;
  const filename = info.outputPath('installer.py');
  await download.saveAs(filename);
  const directory = mkdtempSync(path.join(tmpdir(), 'treeforge-wizard-'));
  try {
    const result = spawnSync(process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'), [filename], { cwd: directory, encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(path.join(directory, 'WizardApp/main.py'), 'utf8')).toContain('def main');
  } finally { rmSync(directory, { recursive: true, force: true }); }
  expect(errors).toEqual([]);
});
