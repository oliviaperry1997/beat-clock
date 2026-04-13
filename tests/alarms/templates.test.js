import { describe, it, expect } from 'vitest';
import { TEMPLATES, getTemplate, getTemplatesByCategory } from '../../src/alarms/templates.js';

describe('getTemplate', () => {
  it('returns template object for valid key', () => {
    const result = getTemplate('at-beat');
    expect(result).not.toBeNull();
    expect(result.label).toBe('At specific beat time');
    expect(result.category).toBe('time');
  });

  it('returns null for invalid key', () => {
    expect(getTemplate('nonexistent')).toBeNull();
  });
});

describe('getTemplatesByCategory', () => {
  it('returns object with time, astro, lunar, seasonal keys', () => {
    const result = getTemplatesByCategory();
    expect(result).toHaveProperty('time');
    expect(result).toHaveProperty('astro');
    expect(result).toHaveProperty('lunar');
    expect(result).toHaveProperty('seasonal');
  });

  it('time category contains at-beat and at-time', () => {
    const result = getTemplatesByCategory();
    const keys = result.time.map(t => t.key);
    expect(keys).toContain('at-beat');
    expect(keys).toContain('at-time');
  });

  it('astro category contains after-sunrise, after-solar-noon, before-sunset', () => {
    const result = getTemplatesByCategory();
    const keys = result.astro.map(t => t.key);
    expect(keys).toContain('after-sunrise');
    expect(keys).toContain('after-solar-noon');
    expect(keys).toContain('before-sunset');
  });

  it('lunar category contains on-full-moon, on-new-moon', () => {
    const result = getTemplatesByCategory();
    const keys = result.lunar.map(t => t.key);
    expect(keys).toContain('on-full-moon');
    expect(keys).toContain('on-new-moon');
  });

  it('seasonal category contains on-equinox, on-solstice', () => {
    const result = getTemplatesByCategory();
    const keys = result.seasonal.map(t => t.key);
    expect(keys).toContain('on-equinox');
    expect(keys).toContain('on-solstice');
  });
});

describe('template build functions', () => {
  it('at-beat.build returns beat-time condition', () => {
    const result = TEMPLATES['at-beat'].build({ beat: 500 });
    expect(result.type).toBe('beat-time');
    expect(result.template).toBe('at-beat');
    expect(result.params.beat).toBe(500);
  });

  it('at-time.build returns standard-time condition', () => {
    const result = TEMPLATES['at-time'].build({ hours: 7, minutes: 30 });
    expect(result.type).toBe('standard-time');
    expect(result.template).toBe('at-time');
    expect(result.params.hours).toBe(7);
    expect(result.params.minutes).toBe(30);
  });

  it('after-sunrise.build returns astro-offset condition with sunrise event', () => {
    const result = TEMPLATES['after-sunrise'].build({ offsetMinutes: 30 });
    expect(result.type).toBe('astro-offset');
    expect(result.template).toBe('after-sunrise');
    expect(result.params.offsetMinutes).toBe(30);
    expect(result.params.event).toBe('sunrise');
  });

  it('after-solar-noon.build returns astro-offset-beats condition', () => {
    const result = TEMPLATES['after-solar-noon'].build({ offsetBeats: 200 });
    expect(result.type).toBe('astro-offset-beats');
    expect(result.template).toBe('after-solar-noon');
    expect(result.params.offsetBeats).toBe(200);
    expect(result.params.event).toBe('solarNoon');
  });

  it('before-sunset.build returns astro-offset condition with sunset event', () => {
    const result = TEMPLATES['before-sunset'].build({ offsetMinutes: 15 });
    expect(result.type).toBe('astro-offset');
    expect(result.template).toBe('before-sunset');
    expect(result.params.offsetMinutes).toBe(15);
    expect(result.params.event).toBe('sunset');
  });

  it('on-full-moon.build returns date-trigger with lunar-phase full-moon', () => {
    const result = TEMPLATES['on-full-moon'].build();
    expect(result.type).toBe('date-trigger');
    expect(result.template).toBe('on-full-moon');
    expect(result.dateFilter.type).toBe('lunar-phase');
    expect(result.dateFilter.params.phase).toBe('full-moon');
  });

  it('on-new-moon.build returns date-trigger with lunar-phase new-moon', () => {
    const result = TEMPLATES['on-new-moon'].build();
    expect(result.type).toBe('date-trigger');
    expect(result.template).toBe('on-new-moon');
    expect(result.dateFilter.type).toBe('lunar-phase');
    expect(result.dateFilter.params.phase).toBe('new-moon');
  });

  it('on-equinox.build returns date-trigger with equinox filter', () => {
    const result = TEMPLATES['on-equinox'].build();
    expect(result.type).toBe('date-trigger');
    expect(result.template).toBe('on-equinox');
    expect(result.dateFilter.type).toBe('equinox');
  });

  it('on-solstice.build returns date-trigger with solstice filter', () => {
    const result = TEMPLATES['on-solstice'].build();
    expect(result.type).toBe('date-trigger');
    expect(result.template).toBe('on-solstice');
    expect(result.dateFilter.type).toBe('solstice');
  });
});
