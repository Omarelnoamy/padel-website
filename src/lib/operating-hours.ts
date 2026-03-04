/**
 * Operating hours utilities for locations.
 * Handles same-day and overnight schedules in a consistent way.
 */

/** When location has no opening/closing set: treat as 24h open (06:00→05:00 next day = all 24h). Only booked + past mark slots unavailable. */
export const DEFAULT_OPENING_TIME = "06:00";
export const DEFAULT_CLOSING_TIME = "05:00"; // Overnight: 06:00 → 05:00 next day = every hour 0–23 open

/**
 * Convert "HH:MM" string to minutes from midnight (0-1439).
 * Returns null if format is invalid.
 */
export function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
}

/**
 * Get opening/closing minutes for a location from DB.
 * When BOTH openingTime and closingTime are null/empty, use (0, 300) so isWithinOperatingWindow
 * treats all hours as open (24h). When only one is set, use defaults for the other.
 */
export function getLocationOperatingMinutes(location: {
  openingTime?: string | null;
  closingTime?: string | null;
}): {
  openingMinutes: number;
  closingMinutes: number;
  isOvernight: boolean;
} {
  const rawOpen = location.openingTime?.trim() || null;
  const rawClose = location.closingTime?.trim() || null;
  const bothUnset = rawOpen == null && rawClose == null;
  // When both unset: use 00:00 and 05:00 so isWithinOperatingWindow's 24h special case applies (all slots open)
  const opening = bothUnset
    ? 0
    : (parseTimeToMinutes(rawOpen) ?? parseTimeToMinutes(DEFAULT_OPENING_TIME)!);
  const closing = bothUnset
    ? 300 // 05:00 in minutes
    : (parseTimeToMinutes(rawClose) ?? parseTimeToMinutes(DEFAULT_CLOSING_TIME)!);

  const isOvernight = closing < opening;

  return {
    openingMinutes: opening,
    closingMinutes: closing,
    isOvernight,
  };
}

/**
 * Check if a slot [startMinutes, endMinutes) is fully inside the operating window.
 *
 * - startMinutes/endMinutes: 0-1439
 * - Handles overnight windows like 09:00 -> 05:00 (next day) by normalizing
 *   to a 0-2880 timeline.
 */
export function isWithinOperatingWindow(
  startMinutes: number,
  endMinutes: number,
  openingMinutes: number,
  closingMinutes: number
): boolean {
  // Guard: if opening and closing are equal, treat as closed all day
  if (openingMinutes === closingMinutes) return false;

  // 00:00 + 05:00 is commonly "open until 5am next day" = 24h. Treat as always open so only past/booked mark slots.
  if (openingMinutes === 0 && closingMinutes === 300) return true;

  // Normalize slot end for wrap-around (e.g., 23:00 -> 00:00)
  let s = startMinutes;
  let e = endMinutes;
  if (e <= s) {
    e += 1440;
  }

  if (closingMinutes > openingMinutes) {
    // Same-day schedule (e.g., 09:00 -> 23:00)
    return s >= openingMinutes && e <= closingMinutes;
  } else {
    // Overnight schedule (e.g., 09:00 -> 05:00 next day)
    const open = openingMinutes;
    const close = closingMinutes + 1440;

    if (s < openingMinutes) {
      s += 1440;
      e += 1440;
    }

    return s >= open && e <= close;
  }
}

/**
 * For a given operational day (booking.date) and hour 0-23,
 * compute the real calendar Date of the slot start.
 *
 * This is used for "past" checks.
 *
 * For overnight schedules (e.g., 08:00 -> 05:00):
 * - Hours 08-23 belong to the operational day's calendar date
 * - Hours 00-04 belong to the NEXT calendar date (part of the same operational day)
 *
 * IMPORTANT: When viewing "today" (e.g., Feb 11) with overnight schedule (08:00 -> 05:00):
 * - If viewing "today" and current time is BEFORE opening time: slots 00:00-04:00 are "tonight" (future)
 * - If viewing "today" and current time is AFTER opening time: slots 00:00-04:00 are "this morning" (past)
 * - We need to check the current time to determine which calendar date these slots belong to
 */
export function getSlotDateForOperationalDay(
  operationalDate: Date,
  hour: number,
  openingMinutes: number,
  closingMinutes: number,
  currentTime?: Date
): Date {
  // Create a new date object to avoid mutating the input
  const base = new Date(operationalDate);
  base.setHours(0, 0, 0, 0);

  const openingHour = Math.floor(openingMinutes / 60);
  const closingHour = Math.floor(closingMinutes / 60);

  const isOvernight = closingMinutes < openingMinutes;
  
  // Determine which calendar date this hour belongs to
  let targetDate = new Date(base);
  
  if (isOvernight) {
    // For overnight schedules:
    // - Hours >= openingHour belong to the operational day's calendar date
    // - Hours < closingHour: need to check if we're viewing "today" and it's already past opening time
    if (hour < closingHour) {
      // Early morning slots (0 to closingHour-1)
      // If we have currentTime and it's the same calendar date as operationalDate,
      // and current time is already past opening time, then these slots are from "this morning" (past)
      if (currentTime) {
        const currentDate = new Date(currentTime);
        currentDate.setHours(0, 0, 0, 0);
        const operationalDateOnly = new Date(base);
        
        // If viewing "today" and current time is past opening time, slots 00:00-04:00 are from "this morning" (same date)
        if (currentDate.getTime() === operationalDateOnly.getTime()) {
          const currentHour = currentTime.getHours();
          const currentMinutes = currentTime.getMinutes();
          const currentTotalMinutes = currentHour * 60 + currentMinutes;
          
          // If current time is past opening time, early morning slots are from "this morning" (past)
          if (currentTotalMinutes >= openingMinutes) {
            // These slots are from "this morning" (same calendar date, past)
            targetDate = new Date(base);
          } else {
            // Current time is before opening, so these slots are "tonight" (next calendar date, future)
            targetDate.setDate(targetDate.getDate() + 1);
          }
        } else {
          // Not viewing "today", so these slots are "tonight" (next calendar date)
          targetDate.setDate(targetDate.getDate() + 1);
        }
      } else {
        // No currentTime provided, default to "tonight" (next calendar date)
        targetDate.setDate(targetDate.getDate() + 1);
      }
    }
    // Hours >= openingHour stay on the same calendar date
  } else {
    // Same-day schedule: all hours are on the operational day's calendar date
  }

  // Set the hour, minute, second, and millisecond
  targetDate.setHours(hour, 0, 0, 0);
  
  return targetDate;
}

