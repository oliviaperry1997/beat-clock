import "./styles.css";
import { compose } from "./chronometers/index.js";
import { initLocationSystem } from "./location/ui.js";

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
}

// Immediate render on page load (D-09)
updateClock(null);

// Initialize location system (handles first-run, active location, etc.)
let updateInterval = null;
initLocationSystem((location) => {
  updateClock(location);
  if (updateInterval) clearInterval(updateInterval);
  updateInterval = setInterval(() => updateClock(location), 864);
});
