import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_START_MS, getCountdown } from '../src/lib/countdown.js';

test('event starts at 13:00 UTC regardless of guest timezone', () => {
  assert.equal(EVENT_START_MS, Date.parse('2026-12-05T13:00:00Z'));
  for (const time of ['2026-12-04T13:00:00Z', '2026-12-04T08:00:00-05:00', '2026-12-04T22:00:00+09:00']) {
    assert.deepEqual(getCountdown(Date.parse(time)), { started: false, days: 1, hours: 0, minutes: 0, seconds: 0 });
  }
});
test('seconds roll over into days, hours and minutes correctly', () => {
  assert.deepEqual(getCountdown(EVENT_START_MS - 90061000), { started: false, days: 1, hours: 1, minutes: 1, seconds: 1 });
});
test('last fraction of a second does not announce an early start', () => {
  assert.deepEqual(getCountdown(EVENT_START_MS - 1), { started: false, days: 0, hours: 0, minutes: 0, seconds: 1 });
});
test('at and after the start there are no negative values', () => {
  for (const now of [EVENT_START_MS, EVENT_START_MS + 1, EVENT_START_MS + 86400000]) {
    assert.deepEqual(getCountdown(now), { started: true, days: 0, hours: 0, minutes: 0, seconds: 0 });
  }
});
