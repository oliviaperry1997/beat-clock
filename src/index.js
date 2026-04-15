import "./styles.css";
import { compose } from "./chronometers/index.js";
import { getChineseNewYear } from "./chronometers/chineseNewYear.js";
import { initLocationSystem } from "./location/ui.js";
import { initConverterPanel } from "./converters/ui.js";
import { getSkyGradientColors } from "./sky.js";
import { initAlarmEngine, setDismissCallback, handleMissedAlarms } from "./alarms/engine.js";
import { initAlarmSystem } from "./alarms/ui.js";
import { invalidateCache } from "./alarms/astro-cache.js";
import { getFormat } from "./formats/config.js";
import { getRenderer } from "./formats/registry.js";
import { tickRateForFormat } from "./formats/tick-rate.js";
import { FORMAT_CHANGE_EVENT, initFormatSelectors, renderFormatDisplay } from "./formats/selectors/ui.js";
import "./converters/styles.css";

function updateMoonIndicator(lunisolar) {
  const moonSvg = document.querySelector('#moon-lit');
  const moonIndicator = document.querySelector('#moon-indicator');

  if (!moonSvg || !moonIndicator) return;

  if (lunisolar === '??' || lunisolar.moonAge == null) {
    moonIndicator.style.display = 'none';
    return;
  }

  moonIndicator.style.display = 'block';

  const moonAge = lunisolar.moonAge;
  const phaseAngle = (moonAge / 29.53) * 2 * Math.PI;
  const cosPhase = Math.cos(phaseAngle);

  // SVG arc path for moon illumination
  const cx = 12, cy = 12, r = 10;
  const sweep = cosPhase >= 0 ? 1 : 0; // waxing=1, waning=0
  const width = Math.abs(cosPhase) * r;

  // Arc from top to bottom of circle, then back with illuminated width
  const d = `M ${cx} ${cy - r}
    A ${r} ${r} 0 0 1 ${cx} ${cy + r}
    A ${width} ${r} 0 0 ${sweep} ${cx} ${cy - r}
    Z`;

  moonSvg.setAttribute('d', d);
}

function getActiveStdTimeFormat() {
  const formatId = getFormat('stdTime');
  return getRenderer('stdTime', formatId) ? formatId : '24h';
}

function getSafeFormat(componentId, fallbackFormatId) {
  const savedFormatId = getFormat(componentId);
  return getRenderer(componentId, savedFormatId) ? savedFormatId : fallbackFormatId;
}

function getEffectiveYear(now, dateFormatId) {
  if (dateFormatId !== 'chinese') {
    return now.getUTCFullYear();
  }

  const gregorianYear = now.getUTCFullYear();
  const chineseNewYear = getChineseNewYear(gregorianYear);
  const chineseNewYearDate = new Date(Date.UTC(
    chineseNewYear.getYear(),
    chineseNewYear.getMonth() - 1,
    chineseNewYear.getDay(),
  ));

  return now < chineseNewYearDate ? gregorianYear - 1 : gregorianYear;
}

function getStdTimeOptions(formatId) {
  if (formatId === '24h') {
    return { showSeconds: true, meridianOffset: 0 };
  }

  return { meridianOffset: 0 };
}

function getRenderFallback(componentId, formatId) {
  if (componentId === 'stdTime') {
    return '??:??';
  }

  if (componentId === 'solarTime') {
    switch (formatId) {
      case '24h':
        return '??:??';
      case 'decimal':
        return '@???';
      case 'longitudinal':
        return '???\u00B0';
      case 'descriptive':
      default:
        return 'Day';
    }
  }

  return '??';
}

function renderComponent(componentId, formatId, data, opts) {
  const renderer = getRenderer(componentId, formatId);
  if (!renderer) {
    return getRenderFallback(componentId, formatId);
  }

  try {
    return renderer(data, opts);
  } catch (error) {
    console.warn(`Failed to render ${componentId}:`, error.message);
    return getRenderFallback(componentId, formatId);
  }
}

function renderClockComponents(data, userLocation) {
  const dateFormatId = getSafeFormat('date', 'gregorian');
  const effectiveYear = getEffectiveYear(data.now, dateFormatId);
  const renderData = { ...data, effectiveYear };

  const yearFormatId = getSafeFormat('year', 'holocene');
  const solarFormatId = getSafeFormat('solarTime', 'descriptive');
  const stdTimeFormatId = getSafeFormat('stdTime', '24h');

  const year = renderComponent('year', yearFormatId, renderData, {});
  const solarOpts = {
    meridianOffset: 0,
    latitude: userLocation?.latitude,
    longitude: userLocation?.longitude,
  };
  const solarTime = renderComponent('solarTime', solarFormatId, renderData, solarOpts);
  const date = renderComponent('date', dateFormatId, renderData, {
    solarDateDiffsStdDate: solarOpts.solarDateDiffsStdDate ?? null,
  });
  const stdTime = renderComponent('stdTime', stdTimeFormatId, renderData, getStdTimeOptions(stdTimeFormatId));

  return { year, date, stdTime, solarTime };
}

function getActiveTickRate() {
  return tickRateForFormat(getActiveStdTimeFormat());
}

function updateClock(userLocation) {
  const now = new Date();
  const result = compose(now, {
    latitude: userLocation?.latitude,
    longitude: userLocation?.longitude,
  });

  const { lunisolar } = result;
  const clockValues = renderClockComponents({ now, ...result }, userLocation);
  renderFormatDisplay(clockValues);

  // Update sky background
  const sky = getSkyGradientColors(now, userLocation?.latitude, userLocation?.longitude);
  document.body.style.background = `linear-gradient(180deg, ${sky.topColor}, ${sky.bottomColor})`;
  document.body.style.backgroundAttachment = 'fixed';

  updateMoonIndicator(lunisolar);
}

let updateInterval = null;
let alarmEngine = null;
let currentLocation = null;

function restartDisplayLoop() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }

  if (!currentLocation) return;

  updateInterval = setInterval(() => updateClock(currentLocation), getActiveTickRate());
}

function restartAlarmLoop() {
  if (!currentLocation) return;

  if (alarmEngine) {
    alarmEngine.stop();
  }

  alarmEngine = initAlarmEngine(currentLocation, getActiveTickRate());
  setDismissCallback((alarmId) => alarmEngine.dismissAlarm(alarmId));
}

function handleLocationReady(location) {
  currentLocation = location;
  updateClock(currentLocation);
  restartDisplayLoop();
  restartAlarmLoop();

  // Invalidate astronomical cache on location change
  invalidateCache();

  // Initialize alarm UI once location is ready (pass dismiss callback)
  initAlarmSystem(location, (alarmId) => alarmEngine.dismissAlarm(alarmId));
}

function handleFormatChange() {
  updateClock(currentLocation);
  restartDisplayLoop();
  restartAlarmLoop();
}

// Immediate render on page load (D-09)
initFormatSelectors(document.querySelector('#beats-container'));
updateClock(null);

initLocationSystem((location) => {
  handleLocationReady(location);
});

document.addEventListener(FORMAT_CHANGE_EVENT, handleFormatChange);

// Handle missed alarms when tab becomes visible again
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    handleMissedAlarms();
  }
});

initConverterPanel();
