import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  dateKey,
  parseDateOnly,
  isWeekday,
  parseTimeOnly,
  secondsOfDay,
  isWorkOver,
  isAbsenceDay,
} from '../src/lib/absence.js';

// Reference week: Mon 2026-10-05 … Sun 2026-10-11 (2026-10-05 is a Monday).
const MONDAY = '2026-10-05';
const SATURDAY = '2026-10-03';
const SUNDAY = '2026-10-04';

const baseCtx = (over) => ({
  now: new Date(2026, 9, 5, 12, 0, 0),
  settings: DEFAULT_SETTINGS,
  ...over,
});

test('dateKey uses the local calendar date, not the UTC date', () => {
  assert.equal(dateKey(new Date(2026, 9, 5, 23, 59, 59)), '2026-10-05');
  assert.equal(dateKey(new Date(2026, 0, 1, 0, 0, 1)), '2026-01-01');
});

test('dateKey is correct in a UTC-forward timezone (off-by-one guard)', () => {
  const instant = new Date('2026-10-01T20:00:00Z'); // 2026-10-02 04:00 in Manila
  const key = dateKey(instant, 'Asia/Manila');
  assert.equal(key, '2026-10-02');
  assert.notEqual(key, instant.toISOString().slice(0, 10)); // UTC key is the buggy one
});

test('parseDateOnly produces a local midnight Date (never UTC-parsed)', () => {
  const d = parseDateOnly('2026-10-05');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 9);
  assert.equal(d.getDate(), 5);
  assert.equal(d.getHours(), 0);
});

test('isWeekday excludes weekends', () => {
  assert.equal(isWeekday(MONDAY), true);
  assert.equal(isWeekday('2026-10-02'), true);
  assert.equal(isWeekday(SATURDAY), false);
  assert.equal(isWeekday(SUNDAY), false);
});

test('parseTimeOnly handles HH:MM:SS and HH:MM', () => {
  assert.equal(parseTimeOnly('17:00:00'), 17 * 3600);
  assert.equal(parseTimeOnly('08:15'), 8 * 3600 + 15 * 60);
  assert.equal(parseTimeOnly(null), 0);
});

test('secondsOfDay local matches clock time', () => {
  assert.equal(secondsOfDay(new Date(2026, 9, 5, 16, 59, 59)), 16 * 3600 + 59 * 60 + 59);
});

test('midnight: today does NOT count as absent before work_end_time', () => {
  for (const h of [0, 1, 8, 12, 16]) {
    const now = new Date(2026, 9, 5, h, 0, 0);
    assert.equal(isAbsenceDay(MONDAY, baseCtx({ now })), false, `hour ${h}`);
  }
  const justBefore = new Date(2026, 9, 5, 16, 59, 59);
  assert.equal(isAbsenceDay(MONDAY, baseCtx({ now: justBefore })), false);
});

test('exact work_end_time boundary: absent only at/after 17:00:00', () => {
  const atEnd = new Date(2026, 9, 5, 17, 0, 0);
  assert.equal(isAbsenceDay(MONDAY, baseCtx({ now: atEnd })), true);
  const late = new Date(2026, 9, 5, 23, 59, 59);
  assert.equal(isAbsenceDay(MONDAY, baseCtx({ now: late })), true);
});

test('weekends never count as absent (even after work_end_time)', () => {
  const now = new Date(2026, 9, 5, 23, 0, 0); // Monday, evaluating Sat/Sun
  assert.equal(isAbsenceDay(SATURDAY, baseCtx({ now })), false);
  assert.equal(isAbsenceDay(SUNDAY, baseCtx({ now })), false);
});

test('past days count when there is no record; records exempt the day', () => {
  const now = new Date(2026, 9, 5, 12, 0, 0);
  const friday = '2026-10-02';
  assert.equal(isAbsenceDay(friday, baseCtx({ now })), true);
  assert.equal(
    isAbsenceDay(friday, baseCtx({ now, attended: (k) => k === friday })),
    false,
  );
});

test('future days never count as absent', () => {
  const now = new Date(2026, 9, 5, 23, 0, 0);
  assert.equal(isAbsenceDay('2026-10-06', baseCtx({ now })), false);
});

test('account-creation day and days before it never count', () => {
  const now = new Date(2026, 9, 5, 23, 0, 0);
  const createdAtKey = '2026-10-01'; // Thursday
  assert.equal(
    isAbsenceDay('2026-10-01', baseCtx({ now, createdAtKey })),
    false,
    'creation day itself',
  );
  assert.equal(
    isAbsenceDay('2026-09-30', baseCtx({ now, createdAtKey })),
    false,
    'before creation',
  );
  assert.equal(
    isAbsenceDay('2026-10-02', baseCtx({ now, createdAtKey })),
    true,
    'day after creation counts',
  );
});

test('approved leave excuses the day; pending leave still counts as absent', () => {
  const now = new Date(2026, 9, 5, 17, 30, 0);
  const friday = '2026-10-02';
  // Pending/rejected: caller passes onApprovedLeave=false (only approved rows
  // are ever supplied by the approved-only queries) → still absent.
  assert.equal(isAbsenceDay(friday, baseCtx({ now })), true);
  assert.equal(
    isAbsenceDay(friday, baseCtx({ now, onApprovedLeave: (k) => k === friday })),
    false,
  );
});

test('day-key sets exempt the day (callback-free form used inside memos)', () => {
  const now = new Date(2026, 9, 5, 17, 30, 0);
  const friday = '2026-10-02';
  assert.equal(
    isAbsenceDay(friday, baseCtx({ now, attendedKeys: new Set([friday]) })),
    false,
  );
  assert.equal(
    isAbsenceDay(friday, baseCtx({ now, approvedLeaveKeys: new Set([friday]) })),
    false,
  );
  assert.equal(
    isAbsenceDay(friday, baseCtx({ now, attendedKeys: new Set() })),
    true,
  );
  // A provided set takes precedence over the callback form
  assert.equal(
    isAbsenceDay(friday, baseCtx({ now, attendedKeys: new Set(), attended: (k) => k === friday })),
    true,
  );
});

test('UTC-forward timezone: work_end boundary evaluated in that timezone', () => {
  const manila = 'Asia/Manila'; // UTC+8, no DST: 17:00 local == 09:00Z
  assert.equal(isWorkOver(new Date('2026-10-01T08:59:59Z'), DEFAULT_SETTINGS, manila), false);
  assert.equal(isWorkOver(new Date('2026-10-01T09:00:00Z'), DEFAULT_SETTINGS, manila), true);
  // 20:00Z is already 2026-10-02 04:00 in Manila → evaluating Oct 2 before 17:00
  assert.equal(
    isAbsenceDay('2026-10-02', {
      now: new Date('2026-10-01T20:00:00Z'),
      settings: DEFAULT_SETTINGS,
      timeZone: manila,
    }),
    false,
  );
});

test('overnight schedule (end <= start): today is never over early', () => {
  const overnight = { work_start_time: '22:00:00', work_end_time: '02:00:00' };
  assert.equal(isWorkOver(new Date(2026, 9, 5, 1, 0, 0), overnight), false);
  assert.equal(isWorkOver(new Date(2026, 9, 5, 3, 0, 0), overnight), false);
  assert.equal(isWorkOver(new Date(2026, 9, 5, 23, 0, 0), overnight), false);
});

test('isWorkOver falls back to false for a missing schedule (no false absences)', () => {
  assert.equal(isWorkOver(new Date(2026, 9, 5, 23, 0, 0), null), false);
  assert.equal(isWorkOver(new Date(2026, 9, 5, 23, 0, 0), {}), false);
});
