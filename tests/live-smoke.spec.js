import { test, expect } from '@playwright/test';

const LIVE_URL = process.env.LIVE_URL || 'http://localhost:5173';

test.describe('CertPrep Hub Live Verification', () => {
  test('1. Homepage loads hero, 9 certifications, and zero runtime errors', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });

    await expect(page.getByText('CertPrep Hub').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Master Cloud, AI & Security Certifications/i })
    ).toBeVisible();
    await expect(page.getByText(/Showing 9 certification tracks/i)).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('2. All 9 certification JSON banks return HTTP 200 with valid questions', async ({ request }) => {
    const catalogRes = await request.get(`${LIVE_URL}/data/catalog.json`);
    expect(catalogRes.ok()).toBeTruthy();
    const catalog = await catalogRes.json();
    expect(catalog.length).toBe(9);

    for (const cert of catalog) {
      const bankRes = await request.get(`${LIVE_URL}/data/${cert.id}.json`);
      expect(bankRes.ok(), `Missing question bank for ${cert.id}`).toBeTruthy();
      const bank = await bankRes.json();
      expect(Array.isArray(bank.questions)).toBeTruthy();
      expect(bank.questions.length).toBeGreaterThan(0);
    }
  });

  test('3. Blueprint screen opens and displays domain weightages and quiz buttons', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    await page.getByText('Claude Certified Developer – Foundations').first().click();

    await expect(page.getByText(/Syllabus Weightage/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Practice Mode/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Timed Exam/i })).toBeVisible();
  });

  test('4. Study Guides postcard studio flips cards and advances slides', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Study Guides/i }).click();

    await expect(page.getByText(/SLIDE 01/i)).toBeVisible();
    await page.getByRole('button', { name: /Flip: Quick Check/i }).click();
    await expect(page.getByText(/Active Recall Check/i)).toBeVisible();

    await page.getByRole('button', { name: /Next Slide/i }).click();
    await expect(page.getByText(/SLIDE 02/i)).toBeVisible();
  });

  test('5. Compare tab renders career roadmaps and comparison matrix', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^Compare$/i }).click();

    await expect(page.getByText(/Recommended Role Roadmaps/i)).toBeVisible();
    await expect(page.getByText(/Head-to-Head Exam Comparison Matrix/i)).toBeVisible();
  });

  test('6. Guidance Forum and Footer Policy modals open cleanly', async ({ page }) => {
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Guidance Forum/i }).click();
    await expect(page.getByText(/Certification Hashtag Guidance/i)).toBeVisible();

    await page.getByRole('button', { name: /Privacy Policy/i }).click();
    await expect(page.getByText(/Practice quizzes and exam simulations run locally/i)).toBeVisible();
  });

  test('7. Mobile viewport (390x844) has no horizontal page overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(LIVE_URL, { waitUntil: 'networkidle' });

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    expect(hasHorizontalOverflow).toBeFalsy();
  });
});