import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

// One second of digital silence, only returned by the local test interceptor.
// No audio file or musical content is added to the project.
const samples = 8000;
const silence = Buffer.alloc(44 + samples * 2);
silence.write('RIFF', 0); silence.writeUInt32LE(silence.length - 8, 4);
silence.write('WAVEfmt ', 8); silence.writeUInt32LE(16, 16);
silence.writeUInt16LE(1, 20); silence.writeUInt16LE(1, 22);
silence.writeUInt32LE(8000, 24); silence.writeUInt32LE(16000, 28);
silence.writeUInt16LE(2, 32); silence.writeUInt16LE(16, 34);
silence.write('data', 36); silence.writeUInt32LE(samples * 2, 40);

const useRealMusic = process.env.MUSIC_FILE === 'real';
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--mute-audio'] });
const errors = [];
try {
  await mkdir('test-results', { recursive: true });
  for (const [width, mode] of [[360, 'play'], [390, 'missing'], [430, 'play'], [1440, 'blocked']]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: width === 360 ? 'no-preference' : 'reduce' });
    let audioRequests = 0;
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({ blocked }) => {
      window.__audioContexts = 0;
      const NativeContext = window.AudioContext;
      window.AudioContext = class extends NativeContext {
        constructor(...args) { super(...args); window.__audioContexts++; }
        createGain() { const gain = super.createGain(); window.__musicGain = gain; return gain; }
      };
      if (blocked) {
        const originalPlay = HTMLMediaElement.prototype.play;
        let first = true;
        HTMLMediaElement.prototype.play = function () {
          if (first) { first = false; return Promise.reject(new DOMException('Test autoplay restriction', 'NotAllowedError')); }
          return originalPlay.call(this);
        };
      }
    }, { blocked: mode === 'blocked' });
    await page.route('**/*', route => {
      if (!['GET', 'HEAD'].includes(route.request().method())) return route.abort();
      if (new URL(route.request().url()).pathname === '/toi-invitation/music.mp3') {
        audioRequests++;
        if (useRealMusic && mode === 'play') return route.continue();
        return mode === 'missing'
          ? route.fulfill({ status: 404, body: 'No music provided' })
          : route.fulfill({ status: 200, contentType: 'audio/wav', body: silence });
      }
      return route.continue();
    });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5182/toi-invitation/', { waitUntil: 'networkidle' });
    assert.equal(audioRequests, 0, 'no preload or playback before a click');
    assert.equal(await page.locator('audio').count(), 1);
    assert.equal(await page.locator('.music-button').count(), 1);
    assert.equal(await page.locator('audio').getAttribute('src'), '/toi-invitation/music.mp3');
    await page.evaluate(() => { window.__firstAudio = document.querySelector('audio'); });
    await page.getByRole('button', { name: 'Шақыруды ашу' }).click();
    if (mode === 'missing') {
      await page.locator('.music-control[data-state=unavailable]').waitFor();
      await page.locator('.invitation-intro').waitFor({ state: 'detached' });
      assert.equal(await page.locator('audio').evaluate(element => element.paused), true);
      assert.equal(await page.getByRole('button', { name: 'Музыканы қосу' }).count(), 1);
    } else {
      if (mode === 'blocked') {
        await page.locator('.music-control[data-state=blocked]').waitFor();
        assert.equal(await page.locator('audio').evaluate(element => element.paused), true);
        await page.getByRole('button', { name: 'Музыканы қосу' }).click();
      }
      await page.locator('.music-control[data-state=playing]').waitFor();
      if (width === 360) assert.equal(await page.locator('.intro-opening').count(), 1, 'music starts during opening');
      await page.waitForTimeout(2100);
      if (useRealMusic && mode === 'play') {
        const metadata = await page.locator('audio').evaluate(element => ({ duration: element.duration, time: element.currentTime, error: element.error }));
        assert.ok(metadata.duration > 0 && Number.isFinite(metadata.duration), 'provided MP3 must decode');
        assert.ok(metadata.time > 0, 'provided MP3 must advance');
        assert.equal(metadata.error, null);
      }
      assert.ok(Math.abs(await page.evaluate(() => window.__musicGain.gain.value) - .3) < .002);
      assert.equal(await page.locator('audio').evaluate(element => element.loop && !element.paused && !element.ended), true);
      await page.getByRole('button', { name: 'Музыканы өшіру' }).click();
      assert.equal(await page.locator('audio').evaluate(element => element.paused), true);
      await page.locator('.invitation-intro').waitFor({ state: 'detached' });
      await page.getByRole('button', { name: 'Қайта ашу' }).click();
      await page.locator('.invitation-intro').waitFor({ state: 'detached' });
      await page.locator('.music-control[data-state=playing]').waitFor();
      assert.equal(await page.locator('audio').evaluate(element => !element.paused && !element.muted), true, 'opening explicitly enables sound again');
      assert.equal(await page.evaluate(() => window.__firstAudio === document.querySelector('audio')), true);
      assert.equal(await page.evaluate(() => window.__audioContexts), 1, 'only one audio graph');
      await page.getByRole('button', { name: 'Музыканы өшіру' }).click();
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `test-results/music-${width}-${mode}.png` });
    console.log(`PASS ${width}px: ${mode}, one audio element, base path, controls, no overflow`);
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS no JavaScript errors; ${useRealMusic ? 'provided MP3 decoded, speaker output muted' : 'test audio is silent and intercepted'}; Google Forms untouched`);
} finally { await browser.close(); }
