import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import {
  loadFormatConfig,
  saveFormatConfig,
  getFormat,
  setFormat,
  resetFormatConfig,
} from '../../src/formats/config.js';

// Use a shared store object that we mutate (never reassign) so closures always see current state
const store = {};

const localStorageMock = {
  getItem: vi.fn((key) => (key in store ? store[key] : null)),
  setItem: vi.fn((key, value) => {
    store[key] = String(value);
  }),
  removeItem: vi.fn((key) => {
    delete store[key];
  }),
};

// Replace window.localStorage (jsdom environment)
beforeAll(() => {
  window.localStorage = localStorageMock;
});

beforeEach(() => {
  // Mutate store in-place (don't reassign) so closures see the change
  for (const key of Object.keys(store)) {
    delete store[key];
  }
  vi.clearAllMocks();
});

describe('loadFormatConfig', () => {
  it('returns defaults when localStorage is empty', () => {
    const config = loadFormatConfig();
    expect(config.version).toBe(1);
    expect(config.components.year).toBe('holocene');
    expect(config.components.date).toBe('gregorian');
    expect(config.components.stdTime).toBe('24h');
    expect(config.components.solarTime).toBe('descriptive');
  });

  it('returns defaults when localStorage has null', () => {
    localStorageMock.getItem.mockReturnValueOnce(null);
    const config = loadFormatConfig();
    expect(config.version).toBe(1);
  });

  it('returns saved config when localStorage has valid data', () => {
    const saved = {
      version: 1,
      components: {
        year: 'gregorian',
        date: 'chinese',
        stdTime: 'decimal',
        solarTime: '24h',
      },
    };
    saveFormatConfig(saved);
    expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);

    const loaded = loadFormatConfig();
    expect(loaded).toEqual(saved);
  });

  it('returns defaults on schema version mismatch', () => {
    const wrongVersion = { version: 99, components: { year: 'custom' } };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(wrongVersion));
    const config = loadFormatConfig();
    expect(config.version).toBe(1);
    expect(config.components.year).toBe('holocene');
  });

  it('warns on schema version mismatch', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const wrongVersion = { version: 2, components: {} };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(wrongVersion));
    loadFormatConfig();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Format config schema version mismatch, using defaults'
    );
    consoleWarnSpy.mockRestore();
  });

  it('returns defaults on corrupted JSON', () => {
    localStorageMock.getItem.mockReturnValueOnce('not valid json{{{');
    const config = loadFormatConfig();
    expect(config.version).toBe(1);
  });

  it('warns on corrupted JSON', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorageMock.getItem.mockReturnValueOnce('not valid json');
    loadFormatConfig();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to load format config, using defaults'
    );
    consoleWarnSpy.mockRestore();
  });

  it('returns defaults when config is not an object', () => {
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify('just a string'));
    const config = loadFormatConfig();
    expect(config.version).toBe(1);
  });

  it('fills missing components with defaults', () => {
    const partial = { version: 1 };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(partial));
    const config = loadFormatConfig();
    expect(config.components.year).toBe('holocene');
    expect(config.components.date).toBe('gregorian');
  });

  it('returns a new copy each time (not frozen reference)', () => {
    const config1 = loadFormatConfig();
    const config2 = loadFormatConfig();
    expect(config1).toEqual(config2);
    expect(config1).not.toBe(config2); // different objects
  });
});

describe('saveFormatConfig', () => {
  it('saves config to localStorage with correct key', () => {
    const config = {
      version: 1,
      components: { year: 'meghalayan', date: 'gregorian', stdTime: '24h', solarTime: 'descriptive' },
    };
    saveFormatConfig(config);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'beatclock:formats',
      JSON.stringify(config)
    );
  });

  it('handles storage errors gracefully (no throw)', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveFormatConfig({})).not.toThrow();
  });
});

describe('getFormat', () => {
  it('returns format ID for valid component', () => {
    expect(getFormat('year')).toBe('holocene');
    expect(getFormat('date')).toBe('gregorian');
  });

  it('returns null for unknown component', () => {
    expect(getFormat('nonexistent')).toBe(null);
  });
});

describe('setFormat', () => {
  it('updates format for component and persists', () => {
    setFormat('year', 'gregorian');
    expect(getFormat('year')).toBe('gregorian');

    // Verify it was saved to localStorage
    const saved = loadFormatConfig();
    expect(saved.components.year).toBe('gregorian');
  });
});

describe('resetFormatConfig', () => {
  it('removes config from localStorage', () => {
    saveFormatConfig({ version: 1, components: { year: 'custom', date: 'chinese', stdTime: 'decimal', solarTime: '24h' } });
    resetFormatConfig();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('beatclock:formats');

    // Next load returns defaults
    const config = loadFormatConfig();
    expect(config.components.year).toBe('holocene');
  });
});

describe('DEFAULT_CONFIG constants', () => {
  it('has correct schema version', () => {
    // Verify by loading fresh config
    const config = loadFormatConfig();
    expect(config.version).toBe(1);
  });

  it('has correct default component mappings', () => {
    const config = loadFormatConfig();
    expect(config.components).toEqual({
      year: 'holocene',
      date: 'gregorian',
      stdTime: '24h',
      solarTime: 'descriptive',
    });
  });
});
