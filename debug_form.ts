import { chromium } from '@playwright/test';
import { signInAs, BASE } from './tests/helpers';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signInAs(page, 'admin@test.toolclub');
  await page.goto(`${BASE}/admin/events/new`);
  await page.waitForLoadState('networkidle');

  // Listen for all responses
  page.on('response', r => {
    if (r.url().includes('admin')) {
      console.log('Response:', r.status(), r.url());
    }
  });
  page.on('request', r => {
    if (r.url().includes('admin') || r.method() === 'POST') {
      console.log('Request:', r.method(), r.url());
    }
  });

  await page.fill('input[name="title"]', 'Debug Event');
  await page.fill('input[name="starts_at"]', '2027-09-01T18:00');
  await page.fill('input[name="host_name"]', 'Debug Host');

  // Intercept the form POST response directly
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/admin/events/new') && r.request().method() === 'POST', { timeout: 5000 }),
    page.click('button[type="submit"]'),
  ]);

  console.log('Form POST status:', response.status());
  const body = await response.text();
  console.log('Response body (first 500 chars):', body.slice(0, 500));

  await browser.close();
}
run().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
