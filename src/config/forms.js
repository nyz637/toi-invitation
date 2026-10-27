// Public configuration only. Never put API keys or other secrets here.
export const formsConfig = {
  mode: 'google', // 'demo' | 'google' | 'verified'
  googleFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSfiNwo6R9rjkjwOea71OK2XyuDItfZkrpTBKTeepXy9RAhqrw/formResponse',
  // Read from the published form, not inferred from question/item IDs.
  entries: {
    name: 'entry.999691961',
    attendance: 'entry.944653112',
    wish: 'entry.1155546494',
  },
  // Optional HTTPS endpoint accepting JSON and returning { ok: true }
  // ONLY after the response has been saved to Google Forms.
  verifiedEndpoint: '',
};
