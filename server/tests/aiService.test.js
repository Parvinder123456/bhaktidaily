'use strict';

// Mock the gemini config module so no real API calls are made
jest.mock('../src/config/gemini', () => {
  const mockGenerateContent = jest.fn();
  const mockGetGenerativeModel = jest.fn(() => ({
    generateContent: mockGenerateContent,
  }));
  return {
    getClient: jest.fn(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
    _mockGenerateContent: mockGenerateContent,
    _mockGetGenerativeModel: mockGetGenerativeModel,
  };
});

const geminiConfig = require('../src/config/gemini');
const aiService = require('../src/services/aiService');

function getMockGenerateContent() {
  return geminiConfig._mockGenerateContent;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('aiService.generateText', () => {
  it('returns the text from a successful Gemini response', async () => {
    getMockGenerateContent().mockResolvedValue({
      response: { text: () => 'Namaste! This is a test response.' },
    });

    const result = await aiService.generateText('Say Namaste');

    expect(result).toBe('Namaste! This is a test response.');
    expect(getMockGenerateContent()).toHaveBeenCalledTimes(1);
  });

  it('includes system instruction when provided', async () => {
    getMockGenerateContent().mockResolvedValue({
      response: { text: () => 'Response with system' },
    });

    await aiService.generateText('Test prompt', 'You are helpful.');

    const mockGetGenerativeModel = geminiConfig._mockGetGenerativeModel;
    const callArgs = mockGetGenerativeModel.mock.calls[0][0];
    expect(callArgs.systemInstruction).toBe('You are helpful.');
  });

  it('retries up to 3 times on 429 rate limit error', async () => {
    // Use real timers for this test — the backoff is short enough
    jest.useRealTimers();
    const rateLimitError = Object.assign(new Error('Rate limited'), { status: 429 });

    getMockGenerateContent()
      .mockRejectedValueOnce(rateLimitError)
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValue({ response: { text: () => 'Success after retries' } });

    const result = await aiService.generateText('Test prompt');

    expect(result).toBe('Success after retries');
    expect(getMockGenerateContent()).toHaveBeenCalledTimes(3);
  }, 15000);

  it('throws after 3 failed attempts without more retries', async () => {
    jest.useRealTimers();
    const rateLimitError = Object.assign(new Error('Rate limited'), { status: 429 });
    getMockGenerateContent().mockRejectedValue(rateLimitError);

    await expect(aiService.generateText('Test prompt')).rejects.toThrow('Rate limited');
    expect(getMockGenerateContent()).toHaveBeenCalledTimes(3);
  }, 15000);

  it('does not retry on non-retryable errors (e.g. 400)', async () => {
    const badRequestError = Object.assign(new Error('Bad request'), { status: 400 });
    getMockGenerateContent().mockRejectedValue(badRequestError);

    await expect(aiService.generateText('Test prompt')).rejects.toThrow('Bad request');
    expect(getMockGenerateContent()).toHaveBeenCalledTimes(1);
  });
});
