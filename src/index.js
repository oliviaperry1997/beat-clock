import "./styles.css";
import { compose } from "./chronometers/index.js";

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

// Then bootstrap geolocation
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      updateClock(userLocation);
      setInterval(() => updateClock(userLocation), 864);
    },
    (error) => {
      console.warn("Geolocation failed:", error.message);
      updateClock(null);
      setInterval(() => updateClock(null), 864);
    }
  );
} else {
  console.warn("Geolocation not supported.");
  updateClock(null);
  setInterval(() => updateClock(null), 864);
}
