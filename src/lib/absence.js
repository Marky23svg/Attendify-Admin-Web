/**
 * Absence-day rules shared by the Dashboard and Attendance pages.
 *
 * Timezone policy: every calendar-day comparison is evaluated in the
 * REQUESTER'S LOCAL TIMEZONE (the browser's), matching the mobile app.
 * Date keys are built from local calendar components — never from
 * `date.toISOString().slice(0, 10)`, which yields the UTC date and is off
 * by one for timezones ahead of UTC. An explicit IANA `timeZone` argument
 * can be passed for testing or a fixed-zone deployment.
 *
 * A calendar day counts as an absence for a user when ALL of these hold:
 * 1. It is a weekday (Mon-Fri).
 * 2. It is strictly after the account-creation day (the creation day itself
 *    never counts).
 * 3. The user has no attendance record for that date.
 * 4. The day is not inside an APPROVED leave range (start/end inclusive).
 *    Pending and rejected leaves still count as absent.
 * 5. The day is strictly before today, OR it is today and the current time
 *    has already passed `work_end_time`. A day still in progress is never
 *    an absence — "not yet clocked in" is not "absent".
 */

/** Fallback schedule used until the settings row (id = 1) is loaded. */
export const DEFAULT_SETTINGS = {
  work_start_time: '08:00:00',
  work_end_time: '17:00:00',
};

const dateFormatterCache = new Map();
const timeFormatterCache = new Map();

function getDateFormatter(timeZone) {
  let fmt = dateFormatterCache.get(timeZone);
  if (!fmt) {
    // en-CA formats dates as YYYY-MM-DD.
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dateFormatterCache.set(timeZone, fmt);
  }
  return fmt;
}

function getTimeFormatter(timeZone) {
  let fmt = timeFormatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    timeFormatterCache.set(timeZone, fmt);
  }
  return fmt;
}

/** Local calendar date key 'YYYY-MM-DD' for the requester's timezone (or `timeZone`). */
export function dateKey(date = new Date(), timeZone) {
  if (timeZone) return getDateFormatter(timeZone).format(date);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a 'YYYY-MM-DD' date column into a LOCAL midnight Date (never UTC). */
export function parseDateOnly(value) {
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Mon-Fri? Derived from the calendar date itself, so it is timezone-independent. */
export function isWeekday(dayKey) {
  const [y, m, d] = String(dayKey).slice(0, 10).split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return dow !== 0 && dow !== 6;
}

/** 'HH:MM:SS' (or 'HH:MM') → seconds since midnight. Missing values → 0. */
export function parseTimeOnly(value) {
  const [h, m, s] = String(value || '').split(':').map(Number);
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
}

/** Seconds since midnight for `date` in the requester's timezone (or `timeZone`). */
export function secondsOfDay(date = new Date(), timeZone) {
  if (!timeZone) {
    return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
  }
  const parts = getTimeFormatter(timeZone).formatToParts(date);
  let h = 0;
  let m = 0;
  let s = 0;
  for (const p of parts) {
    if (p.type === 'hour') h = Number(p.value);
    else if (p.type === 'minute') m = Number(p.value);
    else if (p.type === 'second') s = Number(p.value);
  }
  return h * 3600 + m * 60 + s;
}

/**
 * Has today's work ended yet? Overnight schedules (end <= start) end the
 * shift on the NEXT day, so "today" is never over early — rule 5 counts the
 * day once it becomes a past day instead.
 */
export function isWorkOver(now, settings, timeZone) {
  const start = parseTimeOnly(settings?.work_start_time);
  const end = parseTimeOnly(settings?.work_end_time);
  if (!end || end <= start) return false;
  return secondsOfDay(now, timeZone) >= end;
}

/**
 * Does `dayKey` count as an absence? See the business rules in the module
 * docblock. Day sets are plain `Set`s of 'YYYY-MM-DD' keys; the callback
 * forms receive the day key so callers can close over their own data.
 * Day sets are preferred inside `useMemo` bodies (no closures to capture).
 */
export function isAbsenceDay(dayKey, ctx) {
  const {
    now = new Date(),
    settings = DEFAULT_SETTINGS,
    timeZone,
    createdAtKey = null,
    attendedKeys = null,
    approvedLeaveKeys = null,
    attended = () => false,
    onApprovedLeave = () => false,
  } = ctx;

  if (!isWeekday(dayKey)) return false;
  if (createdAtKey && dayKey <= createdAtKey) return false;
  if (attendedKeys ? attendedKeys.has(dayKey) : attended(dayKey)) return false;
  if (approvedLeaveKeys ? approvedLeaveKeys.has(dayKey) : onApprovedLeave(dayKey)) return false;

  const todayKey = dateKey(now, timeZone);
  if (dayKey > todayKey) return false;
  if (dayKey < todayKey) return true;
  return isWorkOver(now, settings, timeZone);
}
