import SunCalc from 'suncalc';

/**
 * Description mapping module for solar time.
 * 
 * Provides time-of-day description labels based on sun position and events.
 * Implements 16-label event-anchored system for normal solar cycles.
 * Handles polar edge cases (polar day, white nights, polar night) with compartmentalized fallback.
 * 
 * @param {Date} date - Current date
 * @param {number} latitude - Latitude in degrees
 * @param {number} longitude - Longitude in degrees
 * @returns {string} Description label or 'Day' fallback
 */
export function getDescription(date, latitude, longitude) {
  // Validate inputs
  if (!(date instanceof Date) || isNaN(date)) return 'Day';
  if (latitude == null || longitude == null) return 'Day';
  
  try {
    // Helper: check if event is valid
    const hasEvent = (event) => event && event instanceof Date && !isNaN(event.getTime());
    
    // Get current timestamp for comparison
    const now = date.getTime();
    
    // Determine which solar day we're in
    // Strategy: Solar day runs from noon to noon, but we need to handle the transition carefully.
    // Use yesterday's cycle ONLY if we're clearly in yesterday's late-night phase
    // (after yesterday's midnight, before today's dawn/twilight starts)
    let times = SunCalc.getTimes(date, latitude, longitude);
    const windowMs = 15 * 60000;
    let nextDayDawn = null; // Track today's dawn for late-night phase when using yesterday's cycle
    
    // Check if we're in yesterday's late-night phase
    // Only switch to yesterday if we're before today's astronomical dawn and not close to any morning events
    // Skip this for polar day conditions (no nightEnd means no normal night cycle)
    if (hasEvent(times.nightEnd)) {
      const todayDawn = times.nightEnd.getTime();
      // If we're more than a window before today's dawn, we might be in yesterday's late night
      if (now < todayDawn - windowMs) {
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayTimes = SunCalc.getTimes(yesterday, latitude, longitude);
        
        // Use yesterday's cycle if it has valid night events and we're after its midnight
        if (hasEvent(yesterdayTimes.solarNoon) && hasEvent(yesterdayTimes.night)) {
          const yesterdayMidnight = new Date(yesterdayTimes.solarNoon.getTime() + 12 * 3600000);
          // Use yesterday if we're after its midnight
          if (now >= yesterdayMidnight.getTime() - windowMs) {
            nextDayDawn = times.nightEnd; // Store today's dawn for late-night boundary
            times = yesterdayTimes;
          }
        }
      }
    }
    
    // Extract event validity flags
    const hasSunrise = hasEvent(times.sunrise);
    const hasSunset = hasEvent(times.sunset);
    const hasNightEnd = hasEvent(times.nightEnd);  // astronomical dawn (-18°)
    const hasNight = hasEvent(times.night);        // astronomical dusk (-18°)
    const hasSolarNoon = hasEvent(times.solarNoon);
    
    // Compute midnight as solar noon + 12 hours
    const midnight = hasSolarNoon ? new Date(times.solarNoon.getTime() + 12 * 3600000) : null;
    
    // Polar edge case detection (D-26)
    
    // Case 1: Polar day (sun ≥ 0° all day, no sunset/sunrise)
    if (!hasSunrise && !hasSunset && !hasNightEnd && !hasNight) {
      return polarDayLabel(now, times, midnight);
    }
    
    // Case 2: White nights (sun sets but never reaches -18°)
    if (hasSunrise && hasSunset && !hasNightEnd && !hasNight) {
      return whiteNightLabel(now, times);
    }
    
    // Case 3: Polar night (sun never rises above horizon but has twilight)
    if (!hasSunrise && !hasSunset && hasNightEnd && hasNight) {
      return polarNightLabel(now, times, midnight);
    }
    
    // Case 4: Normal solar cycle (all day events present)
    if (hasSunrise && hasSunset && hasNightEnd && hasNight && hasSolarNoon) {
      return normalSolarLabel(now, times, midnight, nextDayDawn);
    }
    
    // Fallback: use altitude bands when event pattern doesn't match any case
    return altitudeFallback(date, latitude, longitude);
    
  } catch (_) {
    return 'Day'; // Safe default on any error
  }
}

/**
 * Normal solar cycle: 16-label event-anchored system (D-24)
 */
function normalSolarLabel(now, times, midnight, nextDayDawn = null) {
  const { sunrise, sunset, solarNoon, nightEnd, night } = times;
  
  // Convert events to timestamps
  const dawn = nightEnd.getTime();
  const riseTime = sunrise.getTime();
  const noonTime = solarNoon.getTime();
  const setTime = sunset.getTime();
  const duskTime = night.getTime();
  const midnightTime = midnight.getTime();
  
  // Define event windows (±15 minutes)
  const windowMs = 15 * 60000;
  
  // Astronomical Dawn (±15 min)
  if (Math.abs(now - dawn) <= windowMs) return 'Astronomical Dawn';
  
  // Morning Twilight (dawn → sunrise)
  if (now > dawn + windowMs && now < riseTime - windowMs) return 'Morning Twilight';
  
  // Sunrise (±15 min)
  if (Math.abs(now - riseTime) <= windowMs) return 'Sunrise';
  
  // Noon (±15 min) - check before partitioning day phases
  if (Math.abs(now - noonTime) <= windowMs) return 'Noon';
  
  // Morning phases (sunrise → noon)
  if (now > riseTime + windowMs && now < noonTime - windowMs) {
    const morningDuration = noonTime - riseTime - 2 * windowMs;
    const elapsed = now - riseTime - windowMs;
    const progress = elapsed / morningDuration;
    
    if (progress < 1/3) return 'Early Morning';
    if (progress < 2/3) return 'Midmorning';
    return 'Late Morning';
  }
  
  // Afternoon phases (noon → sunset)
  if (now > noonTime + windowMs && now < setTime - windowMs) {
    const afternoonDuration = setTime - noonTime - 2 * windowMs;
    const elapsed = now - noonTime - windowMs;
    const progress = elapsed / afternoonDuration;
    
    if (progress < 1/3) return 'Early Afternoon';
    if (progress < 2/3) return 'Midafternoon';
    return 'Late Afternoon';
  }
  
  // Sunset (±15 min)
  if (Math.abs(now - setTime) <= windowMs) return 'Sunset';
  
  // Evening Twilight (sunset → dusk)
  if (now > setTime + windowMs && now < duskTime - windowMs) return 'Evening Twilight';
  
  // Astronomical Dusk (±15 min)
  if (Math.abs(now - duskTime) <= windowMs) return 'Astronomical Dusk';
  
  // Midnight (±15 min)
  if (Math.abs(now - midnightTime) <= windowMs) return 'Midnight';
  
  // Night phases
  // Early Night: after dusk window until midnight window
  if (now > duskTime + windowMs && now < midnightTime - windowMs) {
    return 'Early Night';
  }
  
  // Late Night: after midnight window until next dawn window
  // Use nextDayDawn if provided (when we switched to yesterday's cycle)
  const endOfNight = nextDayDawn ? nextDayDawn.getTime() : dawn;
  if (now > midnightTime + windowMs && now < endOfNight - windowMs) {
    return 'Late Night';
  }
  
  // Default fallback (shouldn't reach here)
  return 'Day';
}

/**
 * Polar day: Skip night phases, use day phases only (D-26.1)
 */
function polarDayLabel(now, times, midnight) {
  const { solarNoon } = times;
  if (!solarNoon) return 'Day'; // fallback
  
  const noonTime = solarNoon.getTime();
  const midnightTime = midnight ? midnight.getTime() : noonTime + 12 * 3600000;
  
  // Partition day into phases without sunrise/sunset anchors
  // Use noon and midnight as reference points
  const windowMs = 15 * 60000;
  
  // Noon window (±15 min)
  if (Math.abs(now - noonTime) <= windowMs) return 'Noon';
  
  // Midnight window (±15 min) - check both today's and yesterday's midnight
  if (Math.abs(now - midnightTime) <= windowMs) return 'Midnight';
  
  // Also check if we're at yesterday's midnight (which would be ~24h before today's midnight)
  const yesterdayMidnight = midnightTime - 24 * 3600000;
  if (Math.abs(now - yesterdayMidnight) <= windowMs) return 'Midnight';
  
  // Partition between noon and midnight
  if (now > noonTime + windowMs && now < midnightTime - windowMs) {
    const duration = midnightTime - noonTime;
    const elapsed = now - noonTime - windowMs;
    const progress = elapsed / (duration - 2 * windowMs);
    
    if (progress < 1/3) return 'Early Afternoon';
    if (progress < 2/3) return 'Midafternoon';
    return 'Late Afternoon';
  }
  
  // Partition between midnight and noon
  if (now > midnightTime + windowMs || now < noonTime - windowMs) {
    // Handle wraparound: convert to 0-24h range relative to midnight
    let relativeMs = now - midnightTime;
    if (relativeMs < 0) relativeMs += 24 * 3600000;
    
    const duration = 12 * 3600000; // midnight to noon is 12 hours
    const progress = relativeMs / duration;
    
    if (progress < 1/3) return 'Late Night';
    if (progress < 2/3) return 'Early Morning';
    return 'Midmorning';
  }
  
  return 'Day';
}

/**
 * White nights: Skip astronomical twilight and night phases (D-26.2)
 */
function whiteNightLabel(now, times) {
  const { sunrise, sunset, solarNoon } = times;
  
  const riseTime = sunrise.getTime();
  const setTime = sunset.getTime();
  const noonTime = solarNoon.getTime();
  const windowMs = 15 * 60000;
  
  // Sunrise (±15 min)
  if (Math.abs(now - riseTime) <= windowMs) return 'Sunrise';
  
  // Daytime phases (sunrise → noon → sunset)
  if (now > riseTime + windowMs && now < setTime - windowMs) {
    if (Math.abs(now - noonTime) <= windowMs) return 'Noon';
    
    if (now < noonTime - windowMs) {
      const morningDuration = noonTime - riseTime;
      const elapsed = now - riseTime - windowMs;
      const progress = elapsed / (morningDuration - 2 * windowMs);
      
      if (progress < 1/3) return 'Early Morning';
      if (progress < 2/3) return 'Midmorning';
      return 'Late Morning';
    } else {
      const afternoonDuration = setTime - noonTime;
      const elapsed = now - noonTime - windowMs;
      const progress = elapsed / (afternoonDuration - 2 * windowMs);
      
      if (progress < 1/3) return 'Early Afternoon';
      if (progress < 2/3) return 'Midafternoon';
      return 'Late Afternoon';
    }
  }
  
  // Sunset (±15 min)
  if (Math.abs(now - setTime) <= windowMs) return 'Sunset';
  
  // Twilight phase (sunset → sunrise, wrapping around midnight)
  // Evening Twilight (sunset → midnight) and Morning Twilight (midnight → sunrise)
  if (now > setTime + windowMs || now < riseTime - windowMs) {
    // Simple heuristic: if closer to sunset, evening twilight; if closer to sunrise, morning twilight
    const toSunset = Math.abs(now - setTime);
    const toSunrise = Math.abs(now - riseTime);
    
    return toSunset < toSunrise ? 'Evening Twilight' : 'Morning Twilight';
  }
  
  return 'Twilight';
}

/**
 * Polar night: Use night labels or partition into Early/Late Night (D-26.4)
 */
function polarNightLabel(now, times, midnight) {
  const { nightEnd, night, solarNoon } = times;
  
  // If we have twilight events (nightEnd and night), partition twilight phases
  if (nightEnd && night) {
    const dawnTime = nightEnd.getTime();
    const duskTime = night.getTime();
    const windowMs = 15 * 60000;
    
    // Astronomical Dawn (±15 min)
    if (Math.abs(now - dawnTime) <= windowMs) return 'Astronomical Dawn';
    
    // Astronomical Dusk (±15 min)
    if (Math.abs(now - duskTime) <= windowMs) return 'Astronomical Dusk';
    
    // Twilight (between dawn and dusk)
    if (now > dawnTime + windowMs && now < duskTime - windowMs) return 'Twilight';
  }
  
  // Deep night: partition into Early Night → Midnight → Late Night
  if (midnight) {
    const midnightTime = midnight.getTime();
    const windowMs = 15 * 60000;
    
    if (Math.abs(now - midnightTime) <= windowMs) return 'Midnight';
    
    // Before midnight: Early Night; after midnight: Late Night
    if (now < midnightTime - windowMs) return 'Early Night';
    if (now > midnightTime + windowMs) return 'Late Night';
  }
  
  return 'Night';
}

/**
 * Altitude fallback: simplified 3-band system (D-27)
 */
function altitudeFallback(date, latitude, longitude) {
  try {
    const position = SunCalc.getPosition(date, latitude, longitude);
    const altitude = position.altitude * (180 / Math.PI); // radians to degrees
    
    if (altitude >= 0) return 'Day';
    if (altitude >= -18) return 'Twilight';
    return 'Night';
  } catch (_) {
    return 'Day';
  }
}
