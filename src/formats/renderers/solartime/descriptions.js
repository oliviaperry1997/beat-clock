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
    
    // Polar edge case detection
    
    // Case 1: Polar day (sun ≥ 0° all day, no sunset/sunrise) OR complete polar night (sun < -18° all day)
    // Both present as: no sunrise, no sunset, no nightEnd, no night
    // Distinguish using current sun altitude
    if (!hasSunrise && !hasSunset && !hasNightEnd && !hasNight) {
      const pos = SunCalc.getPosition(date, latitude, longitude);
      if (pos.altitude >= 0) {
        return polarDayLabel(now, times, midnight);
      } else {
        return completePolarNightLabel(now, times, midnight);
      }
    }
    
    // Case 2: White nights (sun sets but never reaches -18°)
    if (hasSunrise && hasSunset && !hasNightEnd && !hasNight) {
      return whiteNightLabel(now, times, windowMs);
    }
    
    // Case 3: Polar night (sun never rises above horizon but has astronomical twilight)
    if (!hasSunrise && !hasSunset && hasNightEnd && hasNight) {
      return polarNightLabel(now, times, midnight, windowMs);
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
 * Normal solar cycle: 16-label event-anchored system with short-day compression
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
  
  // Dawn (±15 min)
  if (Math.abs(now - dawn) <= windowMs) return 'Dawn';
  
  // Morning Twilight (dawn → sunrise)
  if (now > dawn + windowMs && now < riseTime - windowMs) return 'Morning Twilight';
  
  // Sunrise (±15 min)
  if (Math.abs(now - riseTime) <= windowMs) return 'Sunrise';
  
  // Short-day compression (checked before Noon/Morning/Afternoon sub-phases)
  // Gap = end of Sunrise window → start of Sunset window
  const dayGap = (setTime - windowMs) - (riseTime + windowMs);
  if (dayGap < 90 * 60000 && now > riseTime + windowMs && now < setTime - windowMs) {
    return 'Day';
  }
  
  // Morning compression: end of Sunrise window → start of Noon window < 90 min
  const morningGap = (noonTime - windowMs) - (riseTime + windowMs);
  if (morningGap < 90 * 60000 && now > riseTime + windowMs && now < noonTime - windowMs) {
    return 'Morning';
  }
  
  // Afternoon compression: end of Noon window → start of Sunset window < 90 min
  const afternoonGap = (setTime - windowMs) - (noonTime + windowMs);
  if (afternoonGap < 90 * 60000 && now > noonTime + windowMs && now < setTime - windowMs) {
    return 'Afternoon';
  }
  
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
  
  // Dusk (±15 min)
  if (Math.abs(now - duskTime) <= windowMs) return 'Dusk';
  
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
 * Polar day: sun never sets — use Antinoon/Noon anchors, no night labels
 */
function polarDayLabel(now, times, midnight) {
  const { solarNoon } = times;
  if (!solarNoon) return 'Day'; // fallback
  
  const noonTime = solarNoon.getTime();
  const antiNoonTime = midnight ? midnight.getTime() : noonTime + 12 * 3600000;
  
  const windowMs = 15 * 60000;
  
  // Noon window (±15 min)
  if (Math.abs(now - noonTime) <= windowMs) return 'Noon';
  
  // Antinoon window (±15 min) — replaces Midnight for polar day
  if (Math.abs(now - antiNoonTime) <= windowMs) return 'Antinoon';
  
  // Also check yesterday's antinoon (~24h before today's antinoon)
  const yesterdayAntiNoon = antiNoonTime - 24 * 3600000;
  if (Math.abs(now - yesterdayAntiNoon) <= windowMs) return 'Antinoon';
  
  // Partition between noon and antinoon (afternoon arc)
  if (now > noonTime + windowMs && now < antiNoonTime - windowMs) {
    const duration = antiNoonTime - noonTime;
    const elapsed = now - noonTime - windowMs;
    const progress = elapsed / (duration - 2 * windowMs);
    
    if (progress < 1/3) return 'Early Afternoon';
    if (progress < 2/3) return 'Midafternoon';
    return 'Late Afternoon';
  }
  
  // Partition between antinoon and noon (morning arc)
  if (now > antiNoonTime + windowMs || now < noonTime - windowMs) {
    // Handle wraparound: convert to 0-24h range relative to antinoon
    let relativeMs = now - antiNoonTime;
    if (relativeMs < 0) relativeMs += 24 * 3600000;
    
    const duration = 12 * 3600000; // antinoon to noon is 12 hours
    const progress = relativeMs / duration;
    
    if (progress < 1/3) return 'Early Morning';
    if (progress < 2/3) return 'Midmorning';
    return 'Late Morning';
  }
  
  return 'Day';
}

/**
 * White nights: sun sets but never reaches -18° — skip astronomical twilight and night phases.
 * Adds Lingering Sun (sunset/sunrise overlap) and short-gap Twilight merging.
 */
function whiteNightLabel(now, times, windowMs) {
  const { sunrise, sunset, solarNoon } = times;
  
  const riseTime = sunrise.getTime();
  const setTime = sunset.getTime();
  const noonTime = solarNoon.getTime();
  
  // Compute gap from sunset to next sunrise
  // riseTime from SunCalc is the sunrise of the queried date; next sunrise ≈ +24h
  const nextRise = riseTime + 24 * 3600000;
  const twilightGap = (nextRise - windowMs) - (setTime + windowMs);
  
  // Lingering Sun: sunset and next sunrise windows overlap (sun barely grazes horizon)
  if (twilightGap <= 0) {
    // During the twilight arc (sunset through next sunrise), show Lingering Sun
    if (now > setTime - windowMs || now < riseTime + windowMs) return 'Lingering Sun';
  }
  
  // Short twilight gap (< 1.5h between windows): collapse to single Twilight phase
  if (twilightGap < 90 * 60000) {
    if (now > setTime + windowMs || now < riseTime - windowMs) return 'Twilight';
  }
  
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
  
  // Normal white nights twilight (gap ≥ 90 min): Evening or Morning Twilight
  // Use proximity to determine which side of the twilight arc we're on
  if (now > setTime + windowMs || now < riseTime - windowMs) {
    const toSunset = now > setTime ? now - setTime : now + 24 * 3600000 - setTime;
    const toSunrise = riseTime > now ? riseTime - now : riseTime + 24 * 3600000 - now;
    return toSunset < toSunrise ? 'Evening Twilight' : 'Morning Twilight';
  }
  
  return 'Twilight';
}

/**
 * Polar night: sun never rises but astronomical twilight exists (nightEnd/night valid).
 * Sequence: Antimidnight ↔ Morning/Evening Twilight ↔ Dawn/Dusk ↔ Early/Late Night ↔ Midnight
 */
function polarNightLabel(now, times, midnight, windowMs) {
  const { nightEnd, night, solarNoon } = times;
  
  if (!nightEnd || !night || !solarNoon) return 'Night';
  
  const dawnTime = nightEnd.getTime();   // astronomical dawn (-18°)
  const duskTime = night.getTime();      // astronomical dusk (-18°)
  const antiMidnightTime = solarNoon.getTime(); // solar noon = brightest moment = Antimidnight
  const midnightTime = midnight ? midnight.getTime() : solarNoon.getTime() + 12 * 3600000;
  
  // Check Dawn/Dusk gap for merging
  const twilightGap = (duskTime - windowMs) - (dawnTime + windowMs);
  
  // Overlap: Dawn and Dusk windows overlap → single Twilight phase for entire arc
  if (twilightGap <= 0) {
    if (now >= dawnTime - windowMs && now <= duskTime + windowMs) return 'Twilight';
    // Night phases outside the overlap
    if (Math.abs(now - midnightTime) <= windowMs) return 'Midnight';
    if (now > duskTime + windowMs && now < midnightTime - windowMs) return 'Early Night';
    if (now > midnightTime + windowMs && now < dawnTime - windowMs) return 'Late Night';
    return 'Night';
  }
  
  // Short twilight gap (< 1.5h): collapse Morning Twilight + Antimidnight + Evening Twilight → Twilight
  if (twilightGap < 90 * 60000) {
    // Dawn and Dusk event windows still shown
    if (Math.abs(now - dawnTime) <= windowMs) return 'Dawn';
    if (Math.abs(now - duskTime) <= windowMs) return 'Dusk';
    // Entire arc between dawn and dusk → Twilight
    if (now > dawnTime + windowMs && now < duskTime - windowMs) return 'Twilight';
    // Night phases
    if (Math.abs(now - midnightTime) <= windowMs) return 'Midnight';
    if (now > duskTime + windowMs && now < midnightTime - windowMs) return 'Early Night';
    if (now > midnightTime + windowMs && now < dawnTime - windowMs) return 'Late Night';
    return 'Night';
  }
  
  // Normal polar night with well-separated Dawn and Dusk
  
  // Antimidnight (±15 min around solar noon)
  if (Math.abs(now - antiMidnightTime) <= windowMs) return 'Antimidnight';
  
  // Dawn (±15 min around nightEnd)
  if (Math.abs(now - dawnTime) <= windowMs) return 'Dawn';
  
  // Dusk (±15 min around night)
  if (Math.abs(now - duskTime) <= windowMs) return 'Dusk';
  
  // Morning Twilight: from after Dawn window to Antimidnight window
  if (now > dawnTime + windowMs && now < antiMidnightTime - windowMs) return 'Morning Twilight';
  
  // Evening Twilight: from after Antimidnight window to before Dusk window
  if (now > antiMidnightTime + windowMs && now < duskTime - windowMs) return 'Evening Twilight';
  
  // Early Night: after Dusk window until Midnight window
  if (now > duskTime + windowMs && now < midnightTime - windowMs) return 'Early Night';
  
  // Midnight (±15 min)
  if (Math.abs(now - midnightTime) <= windowMs) return 'Midnight';
  
  // Late Night: after Midnight window until next Dawn window
  // Dawn may fall earlier in the calendar day than Midnight (e.g. dawn at 06:38, midnight at 22:59),
  // so use dawnTime + 24h as the upper boundary to avoid an empty range.
  const nextDayDawnPolar = dawnTime + 24 * 3600000;
  if (now > midnightTime + windowMs && now < nextDayDawnPolar - windowMs) return 'Late Night';
  
  return 'Night';
}

/**
 * Complete polar night: sun always below -18°, no twilight events.
 * 4-phase only: Antimidnight, Early Night, Midnight, Late Night
 */
function completePolarNightLabel(now, times, midnight) {
  const { solarNoon } = times;
  if (!solarNoon) return 'Night';
  
  const antiMidnightTime = solarNoon.getTime();
  const midnightTime = midnight ? midnight.getTime() : solarNoon.getTime() + 12 * 3600000;
  const windowMs = 15 * 60000;
  
  // Antimidnight (±15 min around solar noon — brightest but still dark moment)
  if (Math.abs(now - antiMidnightTime) <= windowMs) return 'Antimidnight';
  
  // Midnight (±15 min)
  if (Math.abs(now - midnightTime) <= windowMs) return 'Midnight';
  
  // Early Night: after Antimidnight window until Midnight window
  if (now > antiMidnightTime + windowMs && now < midnightTime - windowMs) return 'Early Night';
  
  // Late Night: after Midnight window until next Antimidnight window
  // Handle wraparound
  const nextAntiMidnight = antiMidnightTime + 24 * 3600000;
  if (now > midnightTime + windowMs && now < nextAntiMidnight - windowMs) return 'Late Night';
  
  // Also handle if we're before today's antimidnight (coming from yesterday's late night)
  const prevMidnight = midnightTime - 24 * 3600000;
  if (now > prevMidnight + windowMs && now < antiMidnightTime - windowMs) return 'Late Night';
  
  return 'Night';
}

/**
 * Altitude fallback: simplified 3-band system
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
