import './meridian-select.css';

// ---------------------------------------------------------------------------
// Preset data
// ---------------------------------------------------------------------------

/**
 * Returns the <option> data array for 24h format mode.
 * Each entry: { value: degrees (number|'custom'), label: string }
 */
function get24hPresets() {
  return [
    { value: 0,     label: 'UTC' },
    { value: 15,    label: 'UTC+1' },
    { value: 30,    label: 'UTC+2' },
    { value: 45,    label: 'UTC+3' },
    { value: 52.5,  label: 'UTC+3.5 IRST' },
    { value: 60,    label: 'UTC+4' },
    { value: 75,    label: 'UTC+5' },
    { value: 82.5,  label: 'UTC+5.5 IST' },
    { value: 86.25, label: 'UTC+5.75 NPT' },
    { value: 90,    label: 'UTC+6' },
    { value: 105,   label: 'UTC+7' },
    { value: 120,   label: 'UTC+8' },
    { value: 135,   label: 'UTC+9' },
    { value: 142.5, label: 'UTC+9.5 ACST' },
    { value: 150,   label: 'UTC+10' },
    { value: 165,   label: 'UTC+11' },
    { value: 180,   label: 'UTC+12' },
    { value: 195,   label: 'UTC+13' },
    { value: 210,   label: 'UTC+14' },
    { value: -15,   label: 'UTC\u22121' },
    { value: -30,   label: 'UTC\u22122' },
    { value: -45,   label: 'UTC\u22123' },
    { value: -60,   label: 'UTC\u22124' },
    { value: -75,   label: 'UTC\u22125' },
    { value: -90,   label: 'UTC\u22126' },
    { value: -105,  label: 'UTC\u22127' },
    { value: -120,  label: 'UTC\u22128' },
    { value: -135,  label: 'UTC\u22129' },
    { value: -150,  label: 'UTC\u221210' },
    { value: -165,  label: 'UTC\u221211' },
    { value: -180,  label: 'UTC\u221212' },
    { value: 'custom', label: 'Custom\u2026' },
  ];
}

/**
 * Returns the <option> data array for decimal format mode.
 * 100-beat steps = 36° each. Range: -500 to +500 beats = -180° to +180°.
 */
function getDecimalPresets() {
  return [
    { value: 0,    label: '0 beats (UTC)' },
    { value: 36,   label: '+100 beats' },
    { value: 72,   label: '+200 beats' },
    { value: 108,  label: '+300 beats' },
    { value: 144,  label: '+400 beats' },
    { value: 180,  label: '+500 beats' },
    { value: -36,  label: '\u2212100 beats' },
    { value: -72,  label: '\u2212200 beats' },
    { value: -108, label: '\u2212300 beats' },
    { value: -144, label: '\u2212400 beats' },
    { value: -180, label: '\u2212500 beats' },
    { value: 'custom', label: 'Custom\u2026' },
  ];
}

/**
 * Returns the <option> data array for longitudinal format mode.
 * 15° steps (= 1 hour each). Range: -180° to +180°.
 */
function getLongitudinalPresets() {
  const presets = [{ value: 0, label: '0\u00B0 (UTC)' }];
  for (let d = 15; d <= 180; d += 15) {
    presets.push({ value: d, label: `+${d}\u00B0` });
  }
  for (let d = -15; d >= -180; d -= 15) {
    presets.push({ value: d, label: `${d}\u00B0` });
  }
  presets.push({ value: 'custom', label: 'Custom\u2026' });
  return presets;
}

/**
 * Returns the preset array for the given format string.
 * @param {string} format - 'stdTime:24h' | 'stdTime:decimal' | 'stdTime:longitudinal'
 * @returns {Array<{value: number|'custom', label: string}>}
 */
function getPresetsForFormat(format) {
  if (format === 'stdTime:decimal') return getDecimalPresets();
  if (format === 'stdTime:longitudinal') return getLongitudinalPresets();
  return get24hPresets(); // default: 24h
}

// ---------------------------------------------------------------------------
// Snap helpers
// ---------------------------------------------------------------------------

/**
 * Snap degrees to nearest 15° interval (for 24h format).
 * @param {number} degrees
 * @returns {number}
 */
function snapTo24h(degrees) {
  return Math.round(degrees / 15) * 15;
}

/**
 * Snap degrees to nearest 36° interval (for decimal format).
 * @param {number} degrees
 * @returns {number}
 */
function snapToDecimal(degrees) {
  return Math.round(degrees / 36) * 36;
}

/**
 * Snap degrees to nearest 1° (for longitudinal format).
 * @param {number} degrees
 * @returns {number}
 */
function snapToLongitudinal(degrees) {
  return Math.round(degrees);
}

/**
 * Snap degrees to the appropriate interval for the given format.
 * @param {number} degrees
 * @param {string} format
 * @returns {number}
 */
function snapForFormat(degrees, format) {
  if (format === 'stdTime:decimal') return snapToDecimal(degrees);
  if (format === 'stdTime:longitudinal') return snapToLongitudinal(degrees);
  return snapTo24h(degrees); // default: 24h
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

/**
 * Creates a meridian selector UI component.
 *
 * Pure DOM factory — no global state, no document.body access, no localStorage.
 * Communicates only through opts.onChange(degrees).
 *
 * @param {object} [opts]
 * @param {string} [opts.format='stdTime:24h'] - Active Standard Time format key.
 * @param {number} [opts.initialDegrees=0] - Initial longitude degrees (-180 to +180).
 * @param {function} [opts.onChange] - Callback(degrees: number) on every valid change.
 * @returns {{ element: HTMLDivElement, getValue: () => number, setValue: (degrees: number, format: string) => void }}
 */
export function createMeridianSelector(opts = {}) {
  let currentFormat = opts.format ?? 'stdTime:24h';
  let currentDegrees = opts.initialDegrees ?? 0;
  const onChange = opts.onChange ?? (() => {});

  // --- Build root element ---
  const el = document.createElement('div');
  el.className = 'meridian-selector';

  // --- Build select element ---
  const select = document.createElement('select');
  select.className = 'meridian-preset-select';
  select.setAttribute('aria-label', 'Meridian offset');

  // --- Build custom panel ---
  const customPanel = document.createElement('div');
  customPanel.className = 'meridian-custom-panel';
  customPanel.hidden = true;

  const customInput = document.createElement('input');
  customInput.type = 'number';
  customInput.className = 'meridian-custom-input';
  customInput.min = '-180';
  customInput.max = '180';
  customInput.step = 'any';
  customInput.placeholder = 'Degrees (\u2212180 to +180)';
  customInput.setAttribute('aria-label', 'Custom meridian offset in degrees');

  const errorSpan = document.createElement('span');
  errorSpan.className = 'meridian-custom-error hidden';
  errorSpan.setAttribute('role', 'alert');

  customPanel.appendChild(customInput);
  customPanel.appendChild(errorSpan);

  el.appendChild(select);
  el.appendChild(customPanel);

  // --- Internal: populate select options ---
  function populateOptions(format, selectedDegrees) {
    const presets = getPresetsForFormat(format);
    select.innerHTML = '';
    let foundMatch = false;

    for (const preset of presets) {
      const option = document.createElement('option');
      option.value = String(preset.value);
      option.textContent = preset.label;
      if (preset.value !== 'custom' && preset.value === selectedDegrees) {
        option.selected = true;
        foundMatch = true;
      }
      select.appendChild(option);
    }

    // If no preset matches, select 'Custom…'
    if (!foundMatch) {
      const customOption = select.querySelector('option[value="custom"]');
      if (customOption) customOption.selected = true;
      customPanel.hidden = false;
      customInput.value = String(selectedDegrees);
    } else {
      customPanel.hidden = true;
      customInput.value = '';
      clearError();
    }
  }

  // --- Internal: error helpers ---
  function showError(message) {
    errorSpan.textContent = message;
    errorSpan.classList.remove('hidden');
    customInput.classList.add('meridian-input--invalid');
  }

  function clearError() {
    errorSpan.textContent = '';
    errorSpan.classList.add('hidden');
    customInput.classList.remove('meridian-input--invalid');
  }

  // --- Event: select change ---
  select.addEventListener('change', () => {
    const val = select.value;
    if (val === 'custom') {
      customPanel.hidden = false;
      customInput.focus();
      // Hold the last valid degrees — don't call onChange yet
    } else {
      customPanel.hidden = true;
      clearError();
      currentDegrees = parseFloat(val);
      onChange(currentDegrees);
    }
  });

  // --- Event: custom input ---
  customInput.addEventListener('input', () => {
    const raw = customInput.value.trim();
    if (raw === '') {
      clearError();
      return;
    }
    const parsed = parseFloat(raw);
    if (isNaN(parsed)) {
      showError('Enter a number');
      return;
    }
    if (parsed < -180 || parsed > 180) {
      showError('Enter a value between \u2212180 and 180');
      return;
    }
    clearError();
    currentDegrees = parsed;
    onChange(currentDegrees);
  });

  // --- Initialize ---
  populateOptions(currentFormat, currentDegrees);

  // --- Control object ---
  const control = {
    element: el,

    /** Returns the current longitude degrees value. */
    getValue() {
      return currentDegrees;
    },

    /**
     * Externally set the value and optionally change the format.
     * Snaps degrees to the new format's interval.
     * Calls opts.onChange with the snapped value.
     * @param {number} degrees - Longitude degrees to set.
     * @param {string} [format] - New format key. If omitted, keeps current format.
     */
    setValue(degrees, format) {
      if (format !== undefined) {
        currentFormat = format;
      }
      const snapped = snapForFormat(degrees, currentFormat);
      currentDegrees = snapped;
      populateOptions(currentFormat, currentDegrees);
      onChange(currentDegrees);
    },
  };

  return control;
}
