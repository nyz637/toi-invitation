import { eventConfig } from '../config/event.js';

export const EVENT_START_MS = Date.parse(eventConfig.startsAt);

export function getCountdown(now = Date.now()) {
  const remaining = Math.max(0, Math.ceil((EVENT_START_MS - now) / 1000));
  return {
    started: now >= EVENT_START_MS,
    days: Math.floor(remaining / 86400),
    hours: Math.floor((remaining % 86400) / 3600),
    minutes: Math.floor((remaining % 3600) / 60),
    seconds: remaining % 60,
  };
}
