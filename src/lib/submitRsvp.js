export function isConfigured(config) {
  if (config.mode === 'verified') return /^https:\/\//.test(config.verifiedEndpoint);
  const entries = ['name', 'attendance', 'wish'].map(key => config.entries?.[key]);
  return config.mode === 'google' && /^https:\/\/docs\.google\.com\/forms\/d\/e\/[^/]+\/formResponse$/.test(config.googleFormUrl) && entries.every(id => /^entry\.\d+$/.test(id)) && new Set(entries).size === 3;
}

export async function submitRsvp(values, config, fetcher = fetch) {
  if (!isConfigured(config)) return { status: 'demo' };
  const signal = AbortSignal.timeout(20000);
  if (config.mode === 'verified') {
    const response = await fetcher(config.verifiedEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values), signal });
    if (!response.ok || (await response.json()).ok !== true) throw new Error('unconfirmed');
    return { status: 'success' };
  }
  const body = new URLSearchParams();
  for (const key of ['name', 'attendance', 'wish']) body.set(config.entries[key], values[key]);
  await fetcher(config.googleFormUrl, { method: 'POST', mode: 'no-cors', credentials: 'omit', referrerPolicy: 'no-referrer', body, signal });
  // An opaque response is NOT proof that Google saved the answer.
  return { status: 'unverified' };
}
