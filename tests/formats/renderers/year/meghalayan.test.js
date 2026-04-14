// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/formats/renderers/year/meghalayan.js';

describe('meghalayan year renderer', () => {
  it('renders Mgh{year} for meghalayan stage (no space)', () => {
    expect(render({ meghalayan: { stage: 'meghalayan', year: 4226, label: 'Mgh 4226' } })).toBe('Mgh4226');
  });

  it('renders Ngp{year} for northgrippian stage (not Nrg)', () => {
    expect(render({ meghalayan: { stage: 'northgrippian', year: 3327, label: 'Nrg 3327' } })).toBe('Ngp3327');
  });

  it('renders Grn{year} for greenlandian stage (not Ghg)', () => {
    expect(render({ meghalayan: { stage: 'greenlandian', year: 1701, label: 'Ghg 1701' } })).toBe('Grn1701');
  });

  it('renders em dash for pre-holocene stage', () => {
    expect(render({ meghalayan: { stage: 'pre-holocene', year: null, label: '—' } })).toBe('—');
  });

  it('renders ?? when data.meghalayan is missing', () => {
    expect(render({})).toBe('??');
  });

  it('renders ?? when data is null', () => {
    expect(render(null)).toBe('??');
  });

  it('renders Mgh4226 from effectiveYear 2026 (re-computes stage)', () => {
    expect(render({ effectiveYear: 2026 })).toBe('Mgh4226');
  });

  it('renders Mgh1 at Meghalayan boundary (effectiveYear = -2199)', () => {
    expect(render({ effectiveYear: -2199 })).toBe('Mgh1');
  });

  it('renders Ngp1 at Northgrippian boundary (effectiveYear = -6325)', () => {
    expect(render({ effectiveYear: -6325 })).toBe('Ngp1');
  });

  it('renders Grn1 at Greenlandian boundary (effectiveYear = -9699)', () => {
    expect(render({ effectiveYear: -9699 })).toBe('Grn1');
  });

  it('renders em dash for pre-Holocene via effectiveYear (effectiveYear = -9700)', () => {
    expect(render({ effectiveYear: -9700 })).toBe('—');
  });

  it('does not use data.meghalayan.label (ignores old abbreviations)', () => {
    // label has 'Nrg 3327' but renderer must output 'Ngp3327'
    const result = render({ meghalayan: { stage: 'northgrippian', year: 3327, label: 'Nrg 3327' } });
    expect(result).not.toContain('Nrg');
    expect(result).toBe('Ngp3327');
  });
});
