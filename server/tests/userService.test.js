'use strict';

jest.mock('../src/config/db', () => ({
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

const db = require('../src/config/db');
const userService = require('../src/services/userService');

const mockUser = {
  id: 'user-1',
  phone: '+917000000001',
  name: 'Parvi',
  rashi: 'Mithun',
  language: 'en',
  deliveryTime: '07:00',
  onboardingStep: 0,
  isOnboarded: false,
  streakCount: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('userService.findByPhone', () => {
  it('returns user for known phone', async () => {
    db.user.findUnique.mockResolvedValue(mockUser);
    const result = await userService.findByPhone('+917000000001');
    expect(result).toEqual(mockUser);
  });

  it('returns null for unknown phone', async () => {
    db.user.findUnique.mockResolvedValue(null);
    const result = await userService.findByPhone('+910000000000');
    expect(result).toBeNull();
  });

  it('returns null when phone is falsy', async () => {
    const result = await userService.findByPhone(null);
    expect(result).toBeNull();
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('userService.createUser', () => {
  it('creates a user with default values and onboardingStep = 0', async () => {
    const createdUser = { ...mockUser, onboardingStep: 0, isOnboarded: false };
    db.user.create.mockResolvedValue(createdUser);

    const result = await userService.createUser('+917000000001');

    expect(result.onboardingStep).toBe(0);
    expect(result.isOnboarded).toBe(false);
    expect(result.streakCount).toBe(0);
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phone: '+917000000001',
          onboardingStep: 0,
          isOnboarded: false,
        }),
      })
    );
  });
});

describe('userService.updateUser', () => {
  it('merges only provided fields without overwriting unset fields', async () => {
    const updatedUser = { ...mockUser, name: 'Parvi' };
    db.user.update.mockResolvedValue(updatedUser);

    await userService.updateUser('+917000000001', { name: 'Parvi' });

    expect(db.user.update).toHaveBeenCalledWith({
      where: { phone: '+917000000001' },
      data: { name: 'Parvi' },
    });
  });

  it('strips undefined values from the update payload', async () => {
    db.user.update.mockResolvedValue(mockUser);

    await userService.updateUser('+917000000001', { name: 'Parvi', rashi: undefined });

    const callArgs = db.user.update.mock.calls[0][0];
    expect(callArgs.data).not.toHaveProperty('rashi');
    expect(callArgs.data).toHaveProperty('name', 'Parvi');
  });
});

describe('userService.getOnboardingStep', () => {
  it('returns current step for existing user', async () => {
    db.user.findUnique.mockResolvedValue({ ...mockUser, onboardingStep: 3 });

    const result = await userService.getOnboardingStep('+917000000001');

    expect(result).toBe(3);
  });

  it('returns 0 for unknown user', async () => {
    db.user.findUnique.mockResolvedValue(null);

    const result = await userService.getOnboardingStep('+910000000000');

    expect(result).toBe(0);
  });
});

describe('userService.markOnboarded', () => {
  it('sets isOnboarded = true and onboardingStep = 5', async () => {
    db.user.update.mockResolvedValue({ ...mockUser, isOnboarded: true, onboardingStep: 5 });

    await userService.markOnboarded('+917000000001');

    expect(db.user.update).toHaveBeenCalledWith({
      where: { phone: '+917000000001' },
      data: { isOnboarded: true, onboardingStep: 5 },
    });
  });
});
