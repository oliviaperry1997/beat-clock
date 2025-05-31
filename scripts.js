import SunCalc from "https://esm.sh/suncalc@1.9.0";

// --- Helpers ---

function getHoloceneYear(date) {
    return date.getUTCFullYear() + 9700;
}

const equinoxTimestampsUTC = {
  2025: Date.UTC(2025, 2, 20, 3, 6, 0),  // March 20, 2025, 03:06 UTC
  2026: Date.UTC(2026, 2, 20, 9, 30, 0), // hypothetical example
  // add more if needed
};

function getSpringEquinox(holoceneYear) {
  const gregorianYear = holoceneYear - 9700;
  if (equinoxTimestampsUTC[gregorianYear]) {
    return new Date(equinoxTimestampsUTC[gregorianYear]);
  }
  // fallback: approximate March 20 at noon UTC if unknown
  return new Date(Date.UTC(gregorianYear, 2, 20, 12, 0, 0));
}

function getDaysSinceEquinox(now, equinox) {
    const diff = now - equinox;
    return Math.floor(diff / 86400000) + 1;
}

function getLunationSinceEquinox(now, equinox) {
  const lunarCycle = 29.53059 * 86400000;
  const firstNewMoonAfterEquinox = getNextNewMoon(equinox);
  if (now < firstNewMoonAfterEquinox) {
    // If we're before first new moon, lunation is 0 or 1 depending on your system
    return { lunation: 1, percent: "00" };
  }
  const diff = now - firstNewMoonAfterEquinox;
  const lunation = Math.floor(diff / lunarCycle) + 1;
  const phaseProgress = (diff % lunarCycle) / lunarCycle;
  return {
    lunation,
    percent: phaseProgress.toFixed(2).slice(2)
  };
}

function getNextNewMoon(afterDate) {
  let date = new Date(afterDate.getTime() + 1); // just after equinox
  const step = 60 * 60 * 1000; // 1 hour in ms
  const maxHours = 60 * 24 * 60; // search max 60 days in hours

  for (let i = 0; i < maxHours; i++) {
    const phase = SunCalc.getMoonIllumination(date).phase;
    if (phase < 0.01 || phase > 0.99) {
      // Found approximate new moon time, now try to refine by checking +/- 1 hour to find closest time
      let bestDate = date;
      let bestDiff = Math.min(phase, 1 - phase); // distance from 0 or 1

      for (let j = -1; j <= 1; j++) {
        const testDate = new Date(date.getTime() + j * step);
        const testPhase = SunCalc.getMoonIllumination(testDate).phase;
        const diff = Math.min(testPhase, 1 - testPhase);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestDate = testDate;
        }
      }
      return bestDate;
    }
    date = new Date(date.getTime() + step);
  }
  // Fallback: just return date after 60 days if no new moon found
  return date;
}

function getBeats(now) {
    const msOfDay = now.getUTCHours() * 3600000 +
        now.getUTCMinutes() * 60000 +
        now.getUTCSeconds() * 1000 +
        now.getUTCMilliseconds();
    const bmtOffset = 3600000; // UTC+1
    const totalMs = (msOfDay + bmtOffset) % 86400000;
    const beats = totalMs / 86400;
    return `@${beats.toFixed(2).padStart(6, '0')}`;
}

function getNextSunrise(now, lat, lon) {
    for (let i = 1; i <= 3; i++) {
        const future = new Date(now.getTime() + i * 86400000);
        const times = SunCalc.getTimes(future, lat, lon);
        if (times.sunrise) return times.sunrise;
    }
    return new Date(now.getTime() + 86400000); // fallback
}

function getSolarPercent(now, lat, lon) {
    if (lat == null || lon == null) return 'S??';
    const times = SunCalc.getTimes(now, lat, lon);
    const sunrise = times.sunrise;
    const sunset = times.sunset;

    if (!sunrise || !sunset || isNaN(sunrise.getTime()) || isNaN(sunset.getTime())) return 'S??';

    const isDay = now >= sunrise && now < sunset;
    const start = isDay ? sunrise : sunset;
    const end = isDay ? sunset : getNextSunrise(now, lat, lon);

    const percent = ((now - start) / (end - start)) * 100;
    return `${isDay ? 'S' : 'N'}${Math.floor(percent).toString().padStart(2, '0')}`;
}

// --- Main Clock Function ---

function updateClock(userLocation) {
    const now = new Date();
    const holoceneYear = getHoloceneYear(now);
    const equinox = getSpringEquinox(holoceneYear);
    const daysSinceEquinox = getDaysSinceEquinox(now, equinox);
    const moon = getLunationSinceEquinox(now, equinox);
    const beats = getBeats(now);
    const solar = getSolarPercent(now, userLocation?.latitude, userLocation?.longitude);

    const clockText = `H${holoceneYear} L${moon.lunation}.${moon.percent} D${daysSinceEquinox} ${beats} ${solar}`;
    document.querySelector("#beats-container").textContent = clockText;
}

// --- Run with Geolocation ---

if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
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
