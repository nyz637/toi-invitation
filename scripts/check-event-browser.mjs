import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { eventConfig } from '../src/config/event.js';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const failures = [];
const start = Date.parse(eventConfig.startsAt);
const initialTime = new Date(start - 90062000); // 1 day, 1 hour, 1 minute, 2 seconds.
try {
  await mkdir('test-results', { recursive: true });
  for (const [width, timezoneId] of [[360, 'America/New_York'], [390, 'Asia/Tokyo'], [430, 'UTC'], [1440, 'Asia/Oral']]) {
    const context = await browser.newContext({ viewport: { width, height: width > 700 ? 1000 : 844 }, timezoneId, reducedMotion: 'reduce' });
    const page = await context.newPage();
    // No test POST can reach Google Forms or any other service.
    await page.route('**/*', route => ['GET', 'HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
    page.on('pageerror', error => failures.push(error.message));
    await page.clock.setFixedTime(initialTime);
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5175', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Шақыруды ашу' }).click();
    await page.locator('.invitation-intro').waitFor({ state: 'detached' });
    assert.equal(await page.locator('.venue-name').innerText(), 'Symbat\nмейрамханасы');
    assert.equal(await page.locator('.venue-card address').innerText(), eventConfig.address);
    const mapLink = page.getByRole('link', { name: /2ГИС арқылы жолды көру/ });
    assert.equal(await mapLink.getAttribute('href'), eventConfig.mapUrl);
    assert.equal(await mapLink.getAttribute('target'), '_blank');
    assert.match(await mapLink.getAttribute('rel'), /noopener/);
    const ids = await page.locator('main > section').evaluateAll(nodes => nodes.map(node => node.id));
    assert.ok(ids.indexOf('date') < ids.indexOf('venue') && ids.indexOf('venue') < ids.indexOf('countdown') && ids.indexOf('countdown') < ids.indexOf('rsvp'));
    await page.locator('#venue').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/venue-${width}.png` });
    await page.locator('#countdown').scrollIntoViewIfNeeded();
    assert.deepEqual(await page.locator('.countdown-number').allTextContents(), ['01', '01', '01', '02']);
    assert.equal(await page.locator('.countdown-number').first().evaluate(node => getComputedStyle(node).animationName), 'none');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `horizontal overflow at ${width}px`);
    await page.screenshot({ path: `test-results/countdown-${width}.png` });
    await page.clock.setFixedTime(new Date(initialTime.getTime() + 1000));
    await page.waitForTimeout(1150);
    assert.deepEqual(await page.locator('.countdown-number').allTextContents(), ['01', '01', '01', '01'], 'timer must update each second');
    await page.clock.setFixedTime(new Date(start));
    await page.getByText('Мерейтой басталды!', { exact: true }).waitFor();
    assert.equal(await page.locator('.countdown-grid').count(), 0);
    await page.screenshot({ path: `test-results/countdown-started-${width}.png` });
    // Verify the actual new-tab action without loading 2GIS or inventing a map.
    await context.route('https://2gis.kz/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Map navigation intercepted</title>' }));
    const popupPromise = page.waitForEvent('popup');
    await mapLink.click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    assert.equal(popup.url(), eventConfig.mapUrl);
    await popup.close();
    console.log(`PASS ${width}px / ${timezoneId}: venue, map new tab, countdown ticks, start state, no overflow`);
    await context.close();
  }
  assert.deepEqual(failures, []);
  console.log('PASS no JavaScript errors; no real form submissions');
} finally { await browser.close(); }
