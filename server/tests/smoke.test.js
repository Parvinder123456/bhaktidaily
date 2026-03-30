'use strict';

describe('Smoke test', () => {
  it('environment is configured for tests', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('basic arithmetic works', () => {
    expect(1 + 1).toBe(2);
  });
});
