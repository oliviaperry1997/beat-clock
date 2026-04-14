// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/formats/renderers/year/holocene.js';

describe('holocene year renderer', () => {
  it('renders H{year} from data.holocene number', () => {
    expect(render({ holocene: 12026 })).toBe('H12026');
  });

  it('renders H?? when data.holocene is the error string', () => {
    expect(render({ holocene: '??' })).toBe('H??');
  });

  it('renders H{effectiveYear+9700} when data.effectiveYear is present', () => {
    expect(render({ effectiveYear: 2026 })).toBe('H11726');
  });

  it('effectiveYear 2025 yields H11725', () => {
    expect(render({ effectiveYear: 2025 })).toBe('H11725');
  });

  it('effectiveYear takes precedence over data.holocene', () => {
    expect(render({ holocene: 12026, effectiveYear: 2025 })).toBe('H11725');
  });

  it('renders H?? when data is null', () => {
    expect(render(null)).toBe('H??');
  });

  it('renders H?? when data is undefined', () => {
    expect(render(undefined)).toBe('H??');
  });

  it('renders H?? when data is empty object', () => {
    expect(render({})).toBe('H??');
  });
});
