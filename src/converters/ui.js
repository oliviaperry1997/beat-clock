import { compose } from '../chronometers/index.js';
import { reverseBeatClock } from '../chronometers/reverse.js';
import { loadLocations } from '../location/store.js';
import { initGregorianToClockPicker } from './picker.js';

/**
 * Initialize the converter panel UI.
 */
export function initConverterPanel() {
  const container = document.getElementById('converter-panel');
  if (!container) return;

  container.innerHTML = `
    <div class="converter-panel">
      <h2>Datetime Converters</h2>
      <div class="converter-tabs">
        <button class="converter-tab active" data-tab="gregorian-to-clock">Gregorian → Clock</button>
        <button class="converter-tab" data-tab="clock-to-gregorian">Clock → Gregorian</button>
        <button class="converter-tab" data-tab="cross-timezone">Cross-Timezone</button>
      </div>
      <div id="converter-gregorian-to-clock" class="converter-panel-content">
        <input id="converter-datetime-input" placeholder="Select date and time..." />
        <div id="converter-result"></div>
      </div>
      <div id="converter-clock-to-gregorian" class="converter-panel-content hidden">
        <input id="reverse-beats-input" type="number" min="0" max="999.99" step="0.01" placeholder="@XXX.XX" />
        <input id="reverse-holocene-input" type="number" placeholder="Holocene year (e.g. 11726)" />
        <input id="reverse-lunar-month-input" type="number" min="1" max="12" placeholder="Lunar month (1-12)" />
        <input id="reverse-lunar-day-input" type="number" min="1" max="30" placeholder="Lunar day (1-30)" />
        <button id="reverse-convert-btn">Convert</button>
        <div id="reverse-result"></div>
        <div id="reverse-disclaimer"></div>
      </div>
      <div id="converter-cross-timezone" class="converter-panel-content hidden">
        <input id="cross-timezone-datetime-input" placeholder="Select date and time..." />
        <button id="cross-timezone-compare-btn">Compare</button>
        <div id="cross-timezone-locations"></div>
      </div>
    </div>
  `;

  // Tab switching
  const tabs = container.querySelectorAll('.converter-tab');
  const panels = container.querySelectorAll('.converter-panel-content');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      panels.forEach((panel) => {
        const panelId = panel.id.replace('converter-', '');
        if (panelId === target) {
          panel.classList.remove('hidden');
        } else {
          panel.classList.add('hidden');
        }
      });
    });
  });

  initGregorianToClockTab();
  initClockToGregorianTab();
  initCrossTimezoneTab();
}

function formatResult(result) {
  const { holocene, beats, solar, lunisolar } = result;
  const { month, day, isLeap } = lunisolar;
  const monthStr = isLeap ? `${month}X` : `${month}`;
  return `H${holocene} M${monthStr} D${day} ${beats} ${solar}`;
}

function initGregorianToClockTab() {
  const input = document.getElementById('converter-datetime-input');
  const resultDiv = document.getElementById('converter-result');
  if (!input || !resultDiv) return;

  const location = loadLocations().find((l) => l.active) || loadLocations()[0] || null;

  initGregorianToClockPicker(input, (date) => {
    const opts = location
      ? { latitude: location.lat, longitude: location.lon }
      : {};
    const result = compose(date, opts);
    resultDiv.textContent = formatResult(result);
  });
}

function initClockToGregorianTab() {
  const btn = document.getElementById('reverse-convert-btn');
  const resultDiv = document.getElementById('reverse-result');
  const disclaimerDiv = document.getElementById('reverse-disclaimer');
  if (!btn || !resultDiv || !disclaimerDiv) return;

  btn.addEventListener('click', () => {
    const beatsVal = parseFloat(document.getElementById('reverse-beats-input').value);
    const holoceneVal = parseInt(document.getElementById('reverse-holocene-input').value, 10);
    const lunarMonthVal = parseInt(document.getElementById('reverse-lunar-month-input').value, 10);
    const lunarDayVal = parseInt(document.getElementById('reverse-lunar-day-input').value, 10);

    const params = {};
    if (!isNaN(beatsVal)) params.beats = beatsVal;
    if (!isNaN(holoceneVal)) params.holoceneYear = holoceneVal;
    if (!isNaN(lunarMonthVal)) params.lunisolarMonth = lunarMonthVal;
    if (!isNaN(lunarDayVal)) params.lunisolarDay = lunarDayVal;

    if (Object.keys(params).length === 0) {
      resultDiv.textContent = 'Insufficient input — provide at least beats, or beats + Holocene year + lunar date for full conversion.';
      disclaimerDiv.textContent = '';
      return;
    }

    const result = reverseBeatClock(params);

    if (result.gregorianDate) {
      const d = result.gregorianDate;
      const formatted = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')} UTC`;
      resultDiv.textContent = formatted;
    } else {
      resultDiv.textContent = 'Insufficient input — provide at least beats, or beats + Holocene year + lunar date for full conversion.';
    }

    disclaimerDiv.textContent = result.disclaimer || '';
  });
}

function initCrossTimezoneTab() {
  const input = document.getElementById('cross-timezone-datetime-input');
  const compareBtn = document.getElementById('cross-timezone-compare-btn');
  const locationsDiv = document.getElementById('cross-timezone-locations');
  if (!input || !compareBtn || !locationsDiv) return;

  let selectedDate = null;

  initGregorianToClockPicker(input, (date) => {
    selectedDate = date;
  });

  compareBtn.addEventListener('click', () => {
    if (!selectedDate) {
      locationsDiv.innerHTML = '<p class="no-locations-msg">Please select a date and time first.</p>';
      return;
    }

    const locations = loadLocations();
    if (!locations.length) {
      locationsDiv.innerHTML = '<p class="no-locations-msg">Save locations first in the location selector to compare across timezones.</p>';
      return;
    }

    const results = locations.map((loc) => {
      const composed = compose(selectedDate, { latitude: loc.lat, longitude: loc.lon });
      return { name: loc.name, ...composed };
    });

    let html = '<p class="cross-timezone-note">Beats are identical across all locations (UTC+1). Solar position varies by location.</p>';
    results.forEach((r) => {
      html += `
        <div class="timezone-result">
          <h3>${r.name}</h3>
          <div class="result-value">${formatResult(r)}</div>
        </div>
      `;
    });

    locationsDiv.innerHTML = html;
  });
}
