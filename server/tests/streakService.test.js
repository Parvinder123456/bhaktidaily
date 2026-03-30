'use strict';

// Mock the db module before requiring streakService
jest.mock('../src/config/db', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn(),
  },
}));

const db = require('../src/config/db');
const streakService = require('../src/services/streakService');

// Helper: build a date-string offset from today in IST
function istDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function istDate(offsetDays = 0) {
  return new Date(`${istDateString(offsetDays)}T12:00:00+05:30`);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getMilestoneMessage
// ---------------------------------------------------------------------------
describe('getMilestoneMessage', () => {
  test('returns null for non-milestone streaks', () => {
    expect(streakService.getMilestoneMessage(1)).toBeNull();
    expect(streakService.getMilestoneMessage(5)).toBeNull();
    expect(streakService.getMilestoneMessage(10)).toBeNull();
    expect(streakService.getMilestoneMessage(50)).toBeNull();
  });

  test('returns correct message for 7-day milestone', () => {
    const msg = streakService.getMilestoneMessage(7);
    expect(msg).toBeTruthy();
    expect(msg).toContain('7');
    expect(msg).toContain('Saptha');
  });

  test('returns correct message for 21-day milestone', () => {
    const msg = streakService.getMilestoneMessage(21);
    expect(msg).toBeTruthy();
    expect(msg).toContain('21');
  });

  test('returns correct message for 40-day milestone', () => {
    const msg = streakService.getMilestoneMessage(40);
    expect(msg).toBeTruthy();
    expect(msg).toContain('40');
    expect(msg).toContain('Tapasya');
  });

  test('returns correct message for 108-day milestone', () => {
    const msg = streakService.getMilestoneMessage(108);
    expect(msg).toBeTruthy();
    expect(msg).toContain('108');
    expect(msg).toContain('Sadhak');
  });
});

// ---------------------------------------------------------------------------
// recordInteraction
// ---------------------------------------------------------------------------
describe('recordInteraction', () => {
  test('returns null for unknown user', async () => {
    db.user.findUnique.mockResolvedValue(null);
    const result = await streakService.recordInteraction('nonexistent-id');
    expect(result).toBeNull();
    expect(db.user.update).not.toHaveBeenCalled();
  });

  test('sets streak to 1 on first-ever interaction (lastInteraction is null)', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'user-1',
      streakCount: 0,
      lastInteraction: null,
    });
    db.user.update.mockResolvedValue({ streakCount: 1 });

    const result = await streakService.recordInteraction('user-1');

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({ streakCount: 1 }),
    });
    expect(result).toBeNull(); // 1 is not a milestone
  });

  test('increments streak from 2 to 3 when last interaction was yesterday', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'user-2',
      streakCount: 2,
      lastInteraction: istDate(-1), // yesterday
    });
    db.user.update.mockResolvedValue({ streakCount: 3 });

    const result = await streakService.recordInteraction('user-2');

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: expect.objectContaining({ streakCount: 3 }),
    });
    expect(result).toBeNull(); // 3 is not a milestone
  });

  test('does not increment if user already interacted today', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'user-3',
      streakCount: 5,
      lastInteraction: istDate(0), // today
    });
    db.user.update.mockResolvedValue({ streakCount: 5 });

    await streakService.recordInteraction('user-3');

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-3' },
      data: expect.objectContaining({ streakCount: 5 }),
    });
  });

  test('resets streak to 1 when last interaction was 2+ days ago', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'user-4',
      streakCount: 10,
      lastInteraction: istDate(-3), // 3 days ago
    });
    db.user.update.mockResolvedValue({ streakCount: 1 });

    await streakService.recordInteraction('user-4');

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-4' },
      data: expect.objectContaining({ streakCount: 1 }),
    });
  });

  test('returns milestone message when streak hits 7', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'user-5',
      streakCount: 6,
      lastInteraction: istDate(-1),
    });
    db.user.update.mockResolvedValue({ streakCount: 7 });

    const result = await streakService.recordInteraction('user-5');

    expect(result).toBeTruthy();
    expect(result).toContain('7');
  });
});

// ---------------------------------------------------------------------------
// checkAndResetStreaks
// ---------------------------------------------------------------------------
describe('checkAndResetStreaks', () => {
  test('returns 0 when no stale users found', async () => {
    db.user.findMany.mockResolvedValue([]);

    const count = await streakService.checkAndResetStreaks();
    expect(count).toBe(0);
    expect(db.user.updateMany).not.toHaveBeenCalled();
  });

  test('resets streaks for users inactive 2+ days', async () => {
    const staleUsers = [
      { id: 'stale-1', streakCount: 5, lastInteraction: istDate(-3) },
      { id: 'stale-2', streakCount: 12, lastInteraction: istDate(-5) },
    ];
    db.user.findMany.mockResolvedValue(staleUsers);
    db.user.updateMany.mockResolvedValue({ count: 2 });

    const count = await streakService.checkAndResetStreaks();

    expect(count).toBe(2);
    expect(db.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['stale-1', 'stale-2'] } },
      data: { streakCount: 0 },
    });
  });
});
