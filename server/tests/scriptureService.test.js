'use strict';

// Mock the db module before requiring the service
jest.mock('../src/config/db', () => ({
  scripture: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
}));

const db = require('../src/config/db');
const scriptureService = require('../src/services/scriptureService');

const mockVerse = {
  id: 'verse-1',
  source: 'Bhagavad Gita',
  reference: 'Chapter 2, Verse 47',
  textSanskrit: 'कर्मण्येवाधिकारस्ते...',
  textEnglish: 'You have a right to perform your prescribed duties...',
  textHindi: 'कर्म करने में ही तुम्हारा अधिकार है...',
  tags: ['karma', 'action', 'detachment'],
  category: 'shloka',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('scriptureService.getVerseByTag', () => {
  it('returns a verse matching the given tag', async () => {
    db.scripture.findMany.mockResolvedValue([mockVerse]);

    const result = await scriptureService.getVerseByTag('karma');

    expect(result).toEqual(mockVerse);
    expect(db.scripture.findMany).toHaveBeenCalledWith({
      where: { tags: { has: 'karma' } },
    });
  });

  it('returns null when no verse matches the tag', async () => {
    db.scripture.findMany.mockResolvedValue([]);

    const result = await scriptureService.getVerseByTag('nonexistent');

    expect(result).toBeNull();
  });

  it('returns null when tag is falsy', async () => {
    const result = await scriptureService.getVerseByTag(null);
    expect(result).toBeNull();
    expect(db.scripture.findMany).not.toHaveBeenCalled();
  });
});

describe('scriptureService.getVerseById', () => {
  it('returns a verse by id', async () => {
    db.scripture.findUnique.mockResolvedValue(mockVerse);

    const result = await scriptureService.getVerseById('verse-1');

    expect(result).toEqual(mockVerse);
    expect(db.scripture.findUnique).toHaveBeenCalledWith({ where: { id: 'verse-1' } });
  });

  it('returns null for unknown id', async () => {
    db.scripture.findUnique.mockResolvedValue(null);

    const result = await scriptureService.getVerseById('unknown');

    expect(result).toBeNull();
  });

  it('returns null when id is falsy', async () => {
    const result = await scriptureService.getVerseById(null);
    expect(result).toBeNull();
    expect(db.scripture.findUnique).not.toHaveBeenCalled();
  });
});

describe('scriptureService.getRandomVerse', () => {
  it('returns a verse when DB has records', async () => {
    db.scripture.count.mockResolvedValue(10);
    db.scripture.findMany.mockResolvedValue([mockVerse]);

    const result = await scriptureService.getRandomVerse();

    expect(result).toEqual(mockVerse);
    expect(result).not.toBeUndefined();
  });

  it('throws when DB is empty', async () => {
    db.scripture.count.mockResolvedValue(0);

    await expect(scriptureService.getRandomVerse()).rejects.toThrow('No scriptures in database');
  });
});

describe('scriptureService.getAllTags', () => {
  it('returns sorted list of distinct tags', async () => {
    db.scripture.findMany.mockResolvedValue([
      { tags: ['karma', 'action'] },
      { tags: ['karma', 'devotion'] },
      { tags: ['peace'] },
    ]);

    const result = await scriptureService.getAllTags();

    expect(result).toEqual(['action', 'devotion', 'karma', 'peace']);
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns empty array when no scriptures exist', async () => {
    db.scripture.findMany.mockResolvedValue([]);

    const result = await scriptureService.getAllTags();

    expect(result).toEqual([]);
  });
});
