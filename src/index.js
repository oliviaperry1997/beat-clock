import "./styles.css";
import { compose } from "./chronometers/index.js";
import { initLocationSystem } from "./location/ui.js";
import { initConverterPanel } from "./converters/ui.js";
import { getSkyGradientColors } from "./sky.js";
import { initAlarmEngine, setDismissCallback, handleMissedAlarms } from "./alarms/engine.js";
import { initAlarmSystem } from "./alarms/ui.js";
import { invalidateCache } from "./alarms/astro-cache.js";
import { getFormat } from "./formats/config.js";
import { getRenderer } from "./formats/registry.js";
import { tickRateForFormat } from "./formats/tick-rate.js";
import { initStdTimePicker, STDTIME_FORMAT_CHANGE_EVENT } from "./formats/ui/stdtime-picker.js";
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

function getStdTimeString(now) {
  const formatId = getActiveStdTimeFormat();
  const renderStdTime = getRenderer('stdTime', formatId) ?? getRenderer('stdTime', '24h');
  const options = formatId === '24h'
    ? { showSeconds: true, meridianOffset: 0 }
    : { meridianOffset: 0 };

  return renderStdTime({ now }, options);
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

  const { holocene, beats, solar, lunisolar } = result;

  // Format lunisolar: leap months display as MX (e.g., M6X for leap 6th month)
  const { month, day, isLeap } = lunisolar;
  const monthStr = isLeap ? `${month}X` : `${month}`;
  const stdTime = getStdTimeString(now);

  const clockText = `H${holocene} M${monthStr} D${day} ${stdTime} ${solar}`;
  document.querySelector("#beats-container").textContent = clockText;

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

function handleStdTimeFormatChange() {
  updateClock(currentLocation);
  restartDisplayLoop();
  restartAlarmLoop();
}

// Immediate render on page load (D-09)
updateClock(null);
initStdTimePicker();

initLocationSystem((location) => {
  handleLocationReady(location);
});

document.addEventListener(STDTIME_FORMAT_CHANGE_EVENT, handleStdTimeFormatChange);

// Handle missed alarms when tab becomes visible again
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    handleMissedAlarms();
  }
});

initConverterPanel();
