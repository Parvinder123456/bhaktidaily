'use strict';

jest.mock('../src/services/scriptureService', () => ({
  getVerseByTag: jest.fn(),
  getRandomVerse: jest.fn(),
}));

jest.mock('../src/services/aiService', () => ({
  generateText: jest.fn(),
}));

jest.mock('../src/services/promptService', () => ({
  buildDailyPrompt: jest.fn(() => 'mocked prompt'),
  getSystemInstruction: jest.fn(() => 'mocked system'),
}));

const scriptureService = require('../src/services/scriptureService');
const aiService = require('../src/services/aiService');
const dailyMessageService = require('../src/services/dailyMessageService');

const mockVerse = {
  id: 'verse-1',
  source: 'Bhagavad Gita',
  reference: 'Chapter 2, Verse 47',
  textEnglish: 'You have a right to perform your prescribed duties...',
  textHindi: 'कर्म करने में ही तुम्हारा अधिकार है...',
  tags: ['karma', 'action'],
  category: 'shloka',
};

const mockUser = {
  id: 'user-1',
  phone: '+917000000001',
  name: 'Parvi',
  rashi: 'Mithun',
  language: 'en',
  deliveryTime: '07:00',
  streakCount: 5,
  isOnboarded: true,
};

const mockAiOutput = `RASHI READING:
Today, Mithun Rashi shines with the energy of Mercury. The cosmic winds align for clear communication and purposeful action.

DAILY CHALLENGE:
Take five minutes this morning to write down one duty you have been postponing. Perform it today without expectation of reward.`;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('dailyMessageService.generateDailyMessage', () => {
  it('returns object with non-empty horoscope, verse, challenge', async () => {
    scriptureService.getVerseByTag.mockResolvedValue(mockVerse);
    aiService.generateText.mockResolvedValue(mockAiOutput);

    const result = await dailyMessageService.generateDailyMessage(mockUser);

    expect(result.horoscope).toBeTruthy();
    expect(result.challenge).toBeTruthy();
    expect(result.verse).toEqual(mockVerse);
    expect(result.fullText).toBeTruthy();
  });

  it('verse in output matches the one fetched from DB (not AI-generated)', async () => {
    scriptureService.getVerseByTag.mockResolvedValue(mockVerse);
    aiService.generateText.mockResolvedValue(mockAiOutput);

    const result = await dailyMessageService.generateDailyMessage(mockUser);

    expect(result.verse.id).toBe(mockVerse.id);
    expect(result.verse.reference).toBe(mockVerse.reference);
  });

  it('full text is under 300 words', async () => {
    scriptureService.getVerseByTag.mockResolvedValue(mockVerse);
    aiService.generateText.mockResolvedValue(mockAiOutput);

    const result = await dailyMessageService.generateDailyMessage(mockUser);
    const wordCount = result.fullText.split(/\s+/).length;

    expect(wordCount).toBeLessThan(300);
  });

  it('falls back to random verse if tag search returns null', async () => {
    scriptureService.getVerseByTag.mockResolvedValue(null);
    scriptureService.getRandomVerse.mockResolvedValue(mockVerse);
    aiService.generateText.mockResolvedValue(mockAiOutput);

    const result = await dailyMessageService.generateDailyMessage(mockUser);

    expect(scriptureService.getRandomVerse).toHaveBeenCalled();
    expect(result.verse).toEqual(mockVerse);
  });

  it('includes streak count in fullText when user has a streak', async () => {
    scriptureService.getVerseByTag.mockResolvedValue(mockVerse);
    aiService.generateText.mockResolvedValue(mockAiOutput);

    const result = await dailyMessageService.generateDailyMessage({ ...mockUser, streakCount: 5 });

    expect(result.fullText).toContain('Day 5');
  });
});
