import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isConfigured, submitRsvp } from '../src/lib/submitRsvp.js';
import { formsConfig } from '../src/config/forms.js';
const values = { name: 'Қонақ', attendance: 'Қатысамын', wish: '' };
test('demo never transmits guest data', async () => {
  const result = await submitRsvp(values, { mode: 'demo' }, () => { throw Error('must not send'); });
  assert.equal(result.status, 'demo');
});
test('opaque Google response never becomes confirmed success', async () => {
  const result = await submitRsvp(values, { mode: 'google', googleFormUrl: 'https://docs.google.com/forms/d/e/test/formResponse', entries: { name: 'entry.1', attendance: 'entry.2', wish: 'entry.3' } }, async () => ({ type: 'opaque' }));
  assert.equal(result.status, 'unverified');
});
test('verified endpoint must explicitly acknowledge saving', async () => {
  const config = { mode: 'verified', verifiedEndpoint: 'https://example.test/rsvp' };
  await assert.rejects(() => submitRsvp(values, config, async () => ({ ok: true, json: async () => ({ ok: false }) })));
  await assert.rejects(() => submitRsvp(values, config, async () => ({ ok: false })));
  assert.equal((await submitRsvp(values, config, async () => ({ ok: true, json: async () => ({ ok: true }) }))).status, 'success');
});
test('network failure remains an error', async () => {
  await assert.rejects(() => submitRsvp(values, { mode: 'verified', verifiedEndpoint: 'https://example.test/rsvp' }, async () => { throw Error('offline'); }));
});
test('published form mapping produces the exact payload without sending it', async () => {
  assert.equal(isConfigured(formsConfig), true);
  const result = await submitRsvp({ ...values, wish: 'Ақ тілек' }, formsConfig, async (url, options) => {
    assert.equal(url, 'https://docs.google.com/forms/d/e/1FAIpQLSfiNwo6R9rjkjwOea71OK2XyuDItfZkrpTBKTeepXy9RAhqrw/formResponse');
    assert.equal(options.method, 'POST');
    assert.equal(options.mode, 'no-cors');
    assert.equal(options.credentials, 'omit');
    assert.deepEqual(Object.fromEntries(options.body), { 'entry.999691961': 'Қонақ', 'entry.944653112': 'Қатысамын', 'entry.1155546494': 'Ақ тілек' });
    return { type: 'opaque' };
  });
  assert.equal(result.status, 'unverified');
});
test('Google network failure never becomes success', async () => {
  await assert.rejects(() => submitRsvp(values, formsConfig, async () => { throw Error('offline'); }));
});
test('missing named entry or duplicate entries disables transmission', () => {
  assert.equal(isConfigured({ ...formsConfig, entries: undefined }), false);
  assert.equal(isConfigured({ ...formsConfig, entries: { name: 'entry.1', other: 'entry.2', wish: 'entry.3' } }), false);
  assert.equal(isConfigured({ ...formsConfig, entries: { name: 'entry.1', attendance: 'entry.1', wish: 'entry.3' } }), false);
});
