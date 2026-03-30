'use strict';

const { handleOnboarding, RASHI_NAMES } = require('../src/services/onboardingService');

const baseUser = {
  id: 'user-1',
  phone: '+917000000001',
  name: null,
  rashi: null,
  language: 'en',
  deliveryTime: '07:00',
  onboardingStep: 0,
  isOnboarded: false,
};

describe('onboardingService.handleOnboarding — Step 0 (greeting)', () => {
  it('returns greeting and advances to step 1', () => {
    const result = handleOnboarding({ ...baseUser, onboardingStep: 0 }, 'Hi');

    expect(result.responseText).toContain('Namaste');
    expect(result.responseText).toContain('DharmaDaily');
    expect(result.nextStep).toBe(1);
    expect(result.fieldsToUpdate.onboardingStep).toBe(1);
  });
});

describe('onboardingService.handleOnboarding — Step 1 (name)', () => {
  it('captures name and advances to step 2 with Rashi list', () => {
    const result = handleOnboarding({ ...baseUser, onboardingStep: 1 }, 'Parvi');

    expect(result.responseText).toContain('Parvi');
    expect(result.responseText).toContain('Rashi');
    expect(result.nextStep).toBe(2);
    expect(result.fieldsToUpdate.name).toBe('Parvi');
    expect(result.fieldsToUpdate.onboardingStep).toBe(2);
  });

  it('re-sends greeting if empty name is provided', () => {
    const result = handleOnboarding({ ...baseUser, onboardingStep: 1 }, '');

    expect(result.nextStep).toBe(1);
  });
});

describe('onboardingService.handleOnboarding — Step 2 (rashi)', () => {
  it('selecting "3" stores rashi = "Mithun"', () => {
    const result = handleOnboarding({ ...baseUser, onboardingStep: 2 }, '3');

    expect(result.fieldsToUpdate.rashi).toBe('Mithun');
    expect(result.nextStep).toBe(3);
  });

  it('stores all 12 rashi names correctly', () => {
    for (let i = 1; i <= 12; i++) {
      const result = handleOnboarding({ ...baseUser, onboardingStep: 2 }, String(i));
      expect(result.fieldsToUpdate.rashi).toBe(RASHI_NAMES[i - 1]);
    }
  });

  it('re-sends prompt on invalid rashi input', () => {
    const result = handleOnboarding({ ...baseUser, onboardingStep: 2 }, '13');

    expect(result.responseText).toContain('1 and 12');
    expect(result.nextStep).toBe(2);
    expect(result.fieldsToUpdate).toEqual({});
  });

  it('re-sends prompt on non-numeric input', () => {
    const result = handleOnboarding({ ...baseUser, onboardingStep: 2 }, 'Leo');

    expect(result.nextStep).toBe(2);
    expect(result.fieldsToUpdate).toEqual({});
  });
});

describe('onboardingService.handleOnboarding — Step 3 (language)', () => {
  it('selecting "1" stores language = "en"', () => {
    const result = handleOnboarding({ ...baseUser, onboardingStep: 3 }, '1');
    expect(result.fieldsToUpdate.language).toBe('en');
    expect(result.nextStep).toBe(4);
  });

  it('selecting "2" stores language = "hi"', () => {
    const result = handleOnboarding({ ...baseUser, onboardingStep: 3 }, '2');
    expect(result.fieldsToUpdate.language).toBe('hi');
  });

  it('selecting "3" stores language = "both"', () => {
    const result = handleOnboarding({ ...baseUser, onboardingStep: 3 }, '3');
    expect(result.fieldsToUpdate.language).toBe('both');
  });

  it('re-sends prompt on invalid language input', () => {
    const result = handleOnboarding({ ...baseUser, onboardingStep: 3 }, '5');
    expect(result.nextStep).toBe(3);
    expect(result.fieldsToUpdate).toEqual({});
  });
});

describe('onboardingService.handleOnboarding — Step 4 (delivery time)', () => {
  it('selecting "1" stores deliveryTime = "06:00"', () => {
    const result = handleOnboarding({ ...baseUser, onboardingStep: 4, name: 'Parvi', rashi: 'Mithun' }, '1');
    expect(result.fieldsToUpdate.deliveryTime).toBe('06:00');
    expect(result.nextStep).toBe(5);
  });

  it('selecting "2" stores deliveryTime = "07:00"', () => {
    const result = handleOnboarding({ ...baseUser, onboardingStep: 4, name: 'Parvi', rashi: 'Mithun' }, '2');
    expect(result.fieldsToUpdate.deliveryTime).toBe('07:00');
  });

  it('selecting "3" stores deliveryTime = "08:00"', () => {
    const result = handleOnboarding({ ...baseUser, onboardingStep: 4, name: 'Parvi', rashi: 'Mithun' }, '3');
    expect(result.fieldsToUpdate.deliveryTime).toBe('08:00');
  });

  it('accepts custom HH:MM time', () => {
    const result = handleOnboarding({ ...baseUser, onboardingStep: 4, name: 'Parvi', rashi: 'Mithun' }, '09:30');
    expect(result.fieldsToUpdate.deliveryTime).toBe('09:30');
    expect(result.nextStep).toBe(5);
  });

  it('re-sends prompt on invalid time', () => {
    const result = handleOnboarding({ ...baseUser, onboardingStep: 4, name: 'Parvi', rashi: 'Mithun' }, 'soon');
    expect(result.nextStep).toBe(4);
    expect(result.fieldsToUpdate).toEqual({});
  });

  it('sets isOnboarded = true after step 4', () => {
    const result = handleOnboarding({ ...baseUser, onboardingStep: 4, name: 'Parvi', rashi: 'Mithun' }, '2');
    expect(result.fieldsToUpdate.isOnboarded).toBe(true);
  });
});
