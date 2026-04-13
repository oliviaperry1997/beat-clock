import SunCalc from 'suncalc';

/**
 * Solar chronometer — computes solar percent based on sunrise/sunset.
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Optional configuration
 * @param {number} [opts.latitude] - Latitude
 * @param {number} [opts.longitude] - Longitude
 * @returns {string} Solar percent string (S{percent} or N{percent} or S??)
 */
export function compute(date, opts = {}) {
  const { latitude, longitude } = opts;

  if (latitude == null || longitude == null) return 'S??';

  const times = SunCalc.getTimes(date, latitude, longitude);
  const sunrise = times.sunrise;
  const sunset = times.sunset;

  if (!sunrise || !sunset || isNaN(sunrise.getTime()) || isNaN(sunset.getTime())) {
    return 'S??';
  }

  const isDay = date >= sunrise && date < sunset;
  let start, end;

  if (isDay) {
    start = sunrise;
    end = sunset;
  } else if (date < sunrise) {
    start = getPreviousSunset(date, latitude, longitude);
    end = sunrise;
  } else {
    start = sunset;
    end = getNextSunrise(date, latitude, longitude);
  }

  if (!start || !end || start.getTime() === end.getTime()) {
    return 'S??';
  }

  const percent = ((date - start) / (end - start)) * 100;
  return `${isDay ? 'S' : 'N'}${Math.floor(percent).toString().padStart(2, '0')}`;
}

function getNextSunrise(now, lat, lon) {
  for (let i = 1; i <= 3; i++) {
    const future = new Date(now.getTime() + i * 86400000);
    const times = SunCalc.getTimes(future, lat, lon);
    if (times.sunrise) return times.sunrise;
  }
  return new Date(now.getTime() + 86400000);
}

function getPreviousSunset(now, lat, lon) {
  for (let i = 1; i <= 3; i++) {
    const past = new Date(now.getTime() - i * 86400000);
    const times = SunCalc.getTimes(past, lat, lon);
    if (times.sunset) return times.sunset;
  }
  return new Date(now.getTime() - 86400000);
}
