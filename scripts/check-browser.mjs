import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// Run against npm run dev / npm run preview. Uses installed Microsoft Edge.
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const failures = [];
const formUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfiNwo6R9rjkjwOea71OK2XyuDItfZkrpTBKTeepXy9RAhqrw/formResponse';
try {
  await mkdir('test-results', { recursive: true });
  for (const width of [360, 390, 430, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: width > 700 ? 1000 : 844 }, deviceScaleFactor: 1 });
    let mockedPosts = 0;
    // Never forward a test submission to Google or any other external service.
    await page.route('**/*', async route => {
      const request = route.request();
      if (request.method() === 'GET' || request.method() === 'HEAD') return route.continue();
      if (request.url() === formUrl && request.method() === 'POST') {
        const body = new URLSearchParams(request.postData());
        assert.equal(body.get('entry.999691961'), 'Сынақ қонақ');
        assert.equal(body.get('entry.944653112'), 'Қатыса алмаймын');
        mockedPosts++;
        return route.fulfill({ status: 200, contentType: 'text/plain', body: 'Mock only: no data saved' });
      }
      return route.abort();
    });
    page.on('pageerror', error => failures.push(error.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5173', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('html').getAttribute('lang'), 'kk');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}px`);
    await page.waitForTimeout(700);
    assert.equal(await page.locator('.intro-sealed').count(), 1, 'opening must require a click');
    assert.equal(await page.locator('.invitation-site').evaluate(node => node.inert), true);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflow), 'hidden');
    await page.screenshot({ path: `test-results/envelope-sealed-${width}.png` });
    await page.getByRole('button', { name: 'Шақыруды ашу' }).click();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.intro-opening').count(), 1);
    await page.screenshot({ path: `test-results/envelope-flap-${width}.png` });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `test-results/envelope-letter-${width}.png` });
    await page.locator('.intro-morphing').waitFor();
    const expectedLetter = await page.locator('.intro-floating').evaluate(node => ({ top: parseFloat(node.style.top), left: parseFloat(node.style.left), width: parseFloat(node.style.width), height: parseFloat(node.style.height) }));
    await page.waitForTimeout(200);
    await page.screenshot({ path: `test-results/envelope-morph-${width}.png` });
    await page.locator('.invitation-intro').waitFor({ state: 'detached' });
    const actualLetter = await page.locator('#invitation .letter').boundingBox();
    for (const key of ['width', 'height']) assert.ok(Math.abs(actualLetter[key] - expectedLetter[key]) < 2, `letter ${key} jumps at handoff`);
    assert.ok(Math.abs(actualLetter.y - expectedLetter.top) < 2, 'letter position jumps at handoff');
    assert.equal(await page.locator('.invitation-site').evaluate(node => node.inert), false);
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).overflow), 'hidden');
    assert.equal(await page.locator('#letter-title').evaluate(node => document.activeElement === node), true);
    await page.locator('#guest-name').fill('Сынақ қонақ');
    await page.getByText('Қатыса алмаймын', { exact: true }).click();
    await page.getByRole('button', { name: 'Жауапты жіберу' }).click();
    await page.getByText('Жіберу әрекеті орындалды, бірақ жауаптың сақталғанын растау мүмкін болмады.', { exact: true }).waitFor();
    assert.equal(mockedPosts, 1);
    assert.equal(await page.getByText('Жауабыңыз қабылданды.', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Қайта ашу' }).click();
    await page.locator('.intro-opening').waitFor();
    await page.locator('.invitation-intro').waitFor({ state: 'detached' });
    assert.equal(await page.locator('#guest-name').inputValue(), 'Сынақ қонақ', 'replay preserves RSVP values');
    await page.locator('#guest-name').fill('   ');
    await page.getByRole('button', { name: 'Жауапты жіберу' }).click();
    await page.getByText('Аты-жөніңізді жазыңыз.', { exact: true }).waitFor();
    // Reveal every scroll section before recording the complete design.
    for (const section of await page.locator('.reveal').all()) { await section.scrollIntoViewIfNeeded(); await page.waitForTimeout(150); }
    await page.waitForTimeout(1100);
    await page.screenshot({ path: `test-results/invitation-${width}.png`, fullPage: true });
    await page.close();
    console.log(`PASS ${width}px: staged opening, replay, scroll lock, focus, layout, intercepted Google payload (no real POST)`);
  }
  const reduced = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  await reduced.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5173');
  assert.equal(await reduced.locator('.intro-sealed').count(), 1, 'reduced motion still requires a click');
  assert.equal(await reduced.locator('.lux-envelope__object').first().evaluate(node => getComputedStyle(node).animationName), 'none');
  await reduced.keyboard.press('Tab');
  assert.equal(await reduced.getByRole('button', { name: 'Шақыруды ашу' }).evaluate(node => document.activeElement === node), true);
  await reduced.keyboard.press('Enter');
  await reduced.locator('.invitation-intro').waitFor({ state: 'detached', timeout: 1000 });
  assert.equal(await reduced.locator('.reveal').first().evaluate(node => getComputedStyle(node).opacity), '1');
  assert.equal(await reduced.locator('.particles').evaluate(node => getComputedStyle(node).display), 'none');
  await reduced.close();
  for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) {
    const small = await browser.newPage({ viewport, reducedMotion: 'reduce' });
    await small.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5173');
    const bounds = await small.locator('.intro-open__label').boundingBox();
    assert.ok(bounds.y > 0 && bounds.y + bounds.height <= viewport.height, 'open action clipped on a short screen');
    assert.equal(await small.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await small.getByRole('button', { name: 'Шақыруды ашу' }).click();
    await small.locator('.invitation-intro').waitFor({ state: 'detached', timeout: 1000 });
    await small.close();
  }
  assert.deepEqual(failures, []);
  console.log('PASS reduced motion; no JavaScript errors');
} finally { await browser.close(); }
