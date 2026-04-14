import "./styles.css";
import { compose } from "./chronometers/index.js";
import { initLocationSystem } from "./location/ui.js";
import { initConverterPanel } from "./converters/ui.js";
import { getSkyGradientColors } from "./sky.js";
import { initAlarmEngine, handleMissedAlarms } from "./alarms/engine.js";
import { initAlarmSystem } from "./alarms/ui.js";
import { invalidateCache } from "./alarms/astro-cache.js";
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

  const clockText = `H${holocene} M${monthStr} D${day} ${beats} ${solar}`;
  document.querySelector("#beats-container").textContent = clockText;

  // Update sky background
  const sky = getSkyGradientColors(now, userLocation?.latitude, userLocation?.longitude);
  document.body.style.background = `linear-gradient(180deg, ${sky.topColor}, ${sky.bottomColor})`;
  document.body.style.backgroundAttachment = 'fixed';

  updateMoonIndicator(lunisolar);
}

// Immediate render on page load (D-09)
updateClock(null);

// Initialize location system (handles first-run, active location, etc.)
let updateInterval = null;
let alarmEngine = null;
initLocationSystem((location) => {
  updateClock(location);
  if (updateInterval) clearInterval(updateInterval);
  updateInterval = setInterval(() => updateClock(location), 864);

  // Reinitialize alarm engine with new location
  if (alarmEngine) alarmEngine.stop();
  alarmEngine = initAlarmEngine(location);

  // Invalidate astronomical cache on location change
  invalidateCache();

  // Initialize alarm UI once location is ready (pass dismiss callback)
  initAlarmSystem(location, (alarmId) => alarmEngine.dismissAlarm(alarmId));
});

// Handle missed alarms when tab becomes visible again
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    handleMissedAlarms();
  }
});

initConverterPanel();
