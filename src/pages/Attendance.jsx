import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MapPin,
  Clock3,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Search,
  X,
  User as UserIcon,
  UserCheck,
  UserX,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  CARD_SHADOW,
  CARD,
  ICON_BADGE,
} from '../lib/design';
import { getInitials } from '../lib/format';
import { DEFAULT_SETTINGS, isAbsenceDay } from '../lib/absence';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const RED = '#DC2626';
const PURPLE = '#A855F7';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateOnly(value) {
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatTime(iso) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatLongDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

async function getSignedUrl(path) {
  if (!path) return null;
  const { data } = await supabase.storage
    .from('selfies')
    .createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}

function StatusPill({ status }) {
  const config = {
    present: { label: 'Present', bg: '#EAF8F0', text: '#16834A', Icon: UserCheck },
    late: { label: 'Late', bg: '#FEF3C7', text: '#D97706', Icon: AlertCircle },
    absent: { label: 'Absent', bg: '#FEE9EB', text: '#DC2626', Icon: UserX },
    'half-day': { label: 'Half Day', bg: '#FEF3C7', text: '#D97706', Icon: AlertCircle },
    leave: { label: 'On Leave', bg: '#EAF2FF', text: '#0066FF', Icon: CalendarIcon },
  };
  const c = config[status] || config.present;
  const Icon = c.Icon;
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <Icon size={14} className="mr-1" />
      {c.label}
    </span>
  );
}

function NoTimeOutPill() {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
      style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}
    >
      <Clock3 size={14} className="mr-1" />
      No Time Out
    </span>
  );
}

function TimeCard({ title, time, location, selfieUrl, onPreview }) {
  const hasTime = time && time !== '--:--';
  return (
    <div className="bg-[#F8FAFD] rounded-2xl p-3 border border-[#E8EDF5] flex items-start gap-3">
      <div className="w-[68px] h-[68px] bg-[#EAF2FF] rounded-xl overflow-hidden flex-shrink-0">
        {selfieUrl ? (
          <button onClick={onPreview} className="w-full h-full" title="View selfie">
            <img
              src={selfieUrl}
              alt={`${title} selfie`}
              className="w-full h-full object-cover hover:scale-110 transition"
            />
          </button>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Camera size={22} color="#0066FF" />
            <p className="text-[#0066FF] text-[10px] font-medium mt-1">No Selfie</p>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#EAF2FF] flex items-center justify-center">
            <Clock3 size={15} color="#0066FF" />
          </div>
          <p className="text-[#0F1E36] font-bold text-base">{title}</p>
        </div>

        <div className="flex items-start gap-1 mt-2">
          <MapPin size={13} color="#0066FF" className="mt-0.5 shrink-0" />
          <p className="text-[#64748B] text-xs flex-1 min-w-0 break-words">
            {location || 'No location'}
          </p>
        </div>

        <p className="text-[#0F1E36] font-bold text-sm mt-1.5">{time}</p>
      </div>

      {hasTime && (
        <div
  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
  style={{ backgroundColor: '#EAF8F0' }}
>
  <CheckCircle2 size={17} color="#16834A" />
</div>
      )}
    </div>
  );
}

function getDayHours(inTime, outTime) {
  if (!inTime || !outTime) return null;
  const diff =
    (new Date(outTime).getTime() - new Date(inTime).getTime()) /
    (1000 * 60 * 60);
  return Math.round(diff * 100) / 100;
}

/**
 * Recompute attendance status from a corrected time-in.
 *
 * The corrected time is stored as a true UTC instant. The intended local
 * wall-clock is recovered by adding the correction's stored offset (minutes
 * east of UTC), exactly like the DB trigger `apply_time_correction`. This is
 * timezone-independent, so it does not depend on the admin browser's zone.
 * Falls back to the browser-local clock only when no offset is available.
 */
function recomputeStatus(
  correctedTimeIso,
  workStart,
  gracePeriodMinutes,
  timezoneOffsetMinutes
) {
  const d = new Date(correctedTimeIso);
  const offset = Number(timezoneOffsetMinutes);
  const utcMins =
    d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60;
  const clockMins = Number.isFinite(offset)
    ? (((utcMins + offset) % 1440) + 1440) % 1440
    : d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  const [h = 0, m = 0] = String(workStart || '').split(':').map(Number);
  const latestMins = h * 60 + m + (Number(gracePeriodMinutes) || 0);
  return clockMins <= latestMins ? 'present' : 'late';
}

export default function Attendance() {
  const today = new Date();
  const [activeTab, setActiveTab] = useState('date');

  const [error, setError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // ---------- By Date tab ----------
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);
  const [records, setRecords] = useState([]);
  const [loadingDate, setLoadingDate] = useState(false);
  const [search, setSearch] = useState('');
  const [signedUrls, setSignedUrls] = useState({});
  const [dateExtra, setDateExtra] = useState({ absent: 0, leave: 0 });

  // ---------- By Employee tab ----------
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [empMonthYear, setEmpMonthYear] = useState(today.getFullYear());
  const [empMonth, setEmpMonth] = useState(today.getMonth());
  const [empSelectedDay, setEmpSelectedDay] = useState(null);
  const [empRecords, setEmpRecords] = useState({});
  const [empLeaves, setEmpLeaves] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [workSchedule, setWorkSchedule] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;
    supabase
      .from('settings')
      .select('work_start_time, work_end_time, grace_period_minutes')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data?.work_end_time) setWorkSchedule(data);
      });
    return () => {
      active = false;
    };
  }, []);

  // ---------- Month navigation ----------
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };
  const empPrevMonth = () => {
    if (empMonth === 0) { setEmpMonth(11); setEmpMonthYear(y => y - 1); }
    else setEmpMonth(m => m - 1);
  };
  const empNextMonth = () => {
    if (empMonth === 11) { setEmpMonth(0); setEmpMonthYear(y => y + 1); }
    else setEmpMonth(m => m + 1);
  };

  // ---------- By Date: load ----------
  const loadAttendance = async (date) => {
    setLoadingDate(true);
    setError(null);
    setSignedUrls({});
    setDateExtra({ absent: 0, leave: 0 });

    try {
      const dateStr = toDateString(date);
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', dateStr)
        .order('created_at', { ascending: true });

      if (attError) {
        setError(attError.message);
        setRecords([]);
        setLoadingDate(false);
        return;
      }

      const userIds = [...new Set((attData || []).map((r) => r.user_id))];
      let profileMap = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, employee_id, department, position, avatar_url')
          .in('id', userIds);
        (profiles || []).forEach((p) => { profileMap[p.id] = p; });
      }

      // Apply approved time-in corrections so the day list reflects the
      // corrected status even if the DB trigger has not run.
      const attIds = (attData || []).map((r) => r.id);
      const correctedById = {};
      if (attIds.length > 0) {
        const { data: correctionRows, error: correctionError } = await supabase
          .from('time_corrections')
          .select('attendance_id, corrected_time, timezone_offset_minutes')
          .eq('field', 'time_in')
          .eq('status', 'approved')
          .in('attendance_id', attIds);
        if (correctionError) {
          console.error('Time corrections load error:', correctionError);
        }
        for (const c of correctionRows || []) {
          if (!correctedById[String(c.attendance_id)]) {
            correctedById[String(c.attendance_id)] = {
              time: c.corrected_time,
              offset: c.timezone_offset_minutes,
            };
          }
        }
      }

      const merged = (attData || []).map((r) => {
        const correction = correctedById[String(r.id)];
        return {
          ...r,
          status: correction
            ? recomputeStatus(
                correction.time,
                workSchedule.work_start_time,
                workSchedule.grace_period_minutes,
                correction.offset
              )
            : r.status,
          profile: profileMap[r.user_id] || null,
        };
      });

      // Approved leave requests covering the selected date
      const { data: leaveRows } = await supabase
        .from('leave_requests')
        .select('user_id, start_date, end_date')
        .eq('status', 'approved');

      const selectedMs = parseDateOnly(dateStr).getTime();
      const onLeaveIds = new Set(
        (leaveRows || [])
          .filter((l) => {
            const start = parseDateOnly(l.start_date).getTime();
            const end = parseDateOnly(l.end_date).getTime();
            return selectedMs >= start && selectedMs <= end;
          })
          .map((l) => l.user_id)
      );

      merged.forEach((r) => {
        if (r.status === 'absent' && onLeaveIds.has(r.user_id)) {
          r.status = 'leave';
        }
      });

      // Employees with a 'leave' status record are on leave too, whether or
      // not an approved leave_request row covers the date.
      merged.forEach((r) => {
        if (r.status === 'leave') onLeaveIds.add(r.user_id);
      });

      // Staff absent on the selected date: count every active employee who
      // has no attended record and no approved leave, using the shared
      // absence rules (same as the Dashboard). Employees with no attendance
      // row at all would otherwise never be counted.
      const { data: staffRows } = await supabase
        .from('profiles')
        .select('id, created_at, role')
        .eq('is_active', true);

      const dayKey = dateStr;
      const attendedIds = new Set(
        merged
          .filter((r) => ['present', 'late', 'half-day'].includes(r.status))
          .map((r) => r.user_id)
      );
      const now = new Date();
      let absentCount = 0;
      (staffRows || []).forEach((s) => {
        if (s.role === 'admin') return;
        if (
          isAbsenceDay(dayKey, {
            now,
            settings: workSchedule,
            createdAtKey: s.created_at ? toDateString(new Date(s.created_at)) : null,
            attended: (k) => k === dayKey && attendedIds.has(s.id),
            onApprovedLeave: (k) => k === dayKey && onLeaveIds.has(s.id),
          })
        ) {
          absentCount += 1;
        }
      });

      setDateExtra({ absent: absentCount, leave: onLeaveIds.size });

      setRecords(merged);

      const urlMap = {};
      for (const r of merged) {
        if (r.time_in_selfie) {
          urlMap[`in-${r.id}`] = await getSignedUrl(r.time_in_selfie);
        }
        if (r.time_out_selfie) {
          urlMap[`out-${r.id}`] = await getSignedUrl(r.time_out_selfie);
        }
      }
      setSignedUrls(urlMap);
    } catch (err) {
      console.error('Attendance load error:', err);
      setError('Failed to load attendance');
    } finally {
      setLoadingDate(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'date') {
      loadAttendance(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, activeTab, workSchedule]);

  // ---------- By Employee: load list ----------
  const loadEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, employee_id, department, position, role, created_at, avatar_url')
        .eq('is_active', true)
        .order('full_name', { ascending: true });
      setEmployees(data || []);
    } catch (err) {
      console.error('Employees load error:', err);
    } finally {
      setEmployeesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'employee' && employees.length === 0) {
      loadEmployees();
    }
  }, [activeTab]);

  // ---------- By Employee: load month ----------
  const loadEmployeeMonth = async (employeeId, year, month) => {
    if (!employeeId) return;
    setEmpLoading(true);
    setError(null);

    try {
      const daysInMonth = getDaysInMonth(year, month);
      const startDate = toDateString(new Date(year, month, 1));
      const endDate = toDateString(new Date(year, month, daysInMonth));

      const { data, error: monthError } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', employeeId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (monthError) {
        setError(monthError.message);
        setEmpRecords({});
        setEmpLeaves([]);
        setEmpLoading(false);
        return;
      }

      const map = {};
      const urlMap = {};

      // Apply approved time-in corrections so the calendar reflects the
      // corrected status even if the DB trigger has not run.
      const { data: correctionRows, error: correctionError } = await supabase
        .from('time_corrections')
        .select('attendance_id, corrected_time, timezone_offset_minutes')
        .eq('user_id', employeeId)
        .eq('field', 'time_in')
        .eq('status', 'approved');
      if (correctionError) {
        console.error('Time corrections load error:', correctionError);
      }

      const correctedById = {};
      for (const c of correctionRows || []) {
        if (!correctedById[String(c.attendance_id)]) {
          correctedById[String(c.attendance_id)] = {
            time: c.corrected_time,
            offset: c.timezone_offset_minutes,
          };
        }
      }

      for (const r of data || []) {
        const correction = correctedById[String(r.id)];
        if (correction) {
          r.status = recomputeStatus(
            correction.time,
            workSchedule.work_start_time,
            workSchedule.grace_period_minutes,
            correction.offset
          );
        }
        map[r.date] = r;
        if (r.time_in_selfie) {
          urlMap[`in-${r.id}`] = await getSignedUrl(r.time_in_selfie);
        }
        if (r.time_out_selfie) {
          urlMap[`out-${r.id}`] = await getSignedUrl(r.time_out_selfie);
        }
      }

      setEmpRecords(map);
      setSignedUrls((prev) => ({ ...prev, ...urlMap }));

      const { data: leaveRows } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', employeeId)
        .eq('status', 'approved');
      setEmpLeaves(leaveRows || []);
    } catch (err) {
      console.error('Employee month error:', err);
      setError('Failed to load employee attendance');
    } finally {
      setEmpLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'employee' && selectedEmployee) {
      loadEmployeeMonth(selectedEmployee.id, empMonthYear, empMonth);
      setEmpSelectedDay(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedEmployee, empMonth, empMonthYear, workSchedule]);

  // ---------- By Date derived ----------
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const isToday = (day) =>
    day === today.getDate() &&
    viewMonth === today.getMonth() &&
    viewYear === today.getFullYear();

  const isSelected = (day) =>
    day === selectedDate.getDate() &&
    viewMonth === selectedDate.getMonth() &&
    viewYear === selectedDate.getFullYear();

  const isWeekend = (day) => {
    const d = new Date(viewYear, viewMonth, day).getDay();
    return d === 0 || d === 6;
  };

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return records;
    return records.filter((r) => {
      const name = r.profile?.full_name?.toLowerCase() || '';
      const email = r.profile?.email?.toLowerCase() || '';
      const empId = r.profile?.employee_id?.toLowerCase() || '';
      return name.includes(term) || email.includes(term) || empId.includes(term);
    });
  }, [records, search]);

  const dateStats = useMemo(() => {
    const present = records.filter((r) => ['present', 'late', 'half-day'].includes(r.status)).length;
    const late = records.filter((r) => r.status === 'late').length;
    return { present, late, absent: dateExtra.absent, leave: dateExtra.leave, total: records.length };
  }, [records, dateExtra]);

  const handleSelectDate = (day) => {
    setSelectedDate(new Date(viewYear, viewMonth, day));
  };

  // ---------- By Employee derived ----------
  const filteredEmployees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((e) => {
      const name = e.full_name?.toLowerCase() || '';
      const email = e.email?.toLowerCase() || '';
      const empId = e.employee_id?.toLowerCase() || '';
      return name.includes(term) || email.includes(term) || empId.includes(term);
    });
  }, [employees, employeeSearch]);

  const empDaysInMonth = getDaysInMonth(empMonthYear, empMonth);
  const empFirstDay = getFirstDayOfMonth(empMonthYear, empMonth);
  const empCells = [
    ...Array(empFirstDay).fill(null),
    ...Array.from({ length: empDaysInMonth }, (_, i) => i + 1),
  ];

  // The employee's creation date normalized to midnight
  const empCreatedAt = useMemo(() => {
    if (!selectedEmployee?.created_at) return null;
    const d = new Date(selectedEmployee.created_at);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [selectedEmployee]);

  const empCreatedKey = empCreatedAt ? toDateString(empCreatedAt) : null;

  // Date keys in the viewed month covered by approved leave requests
  const empLeaveKeys = useMemo(() => {
    const keys = new Set();
    const monthStart = new Date(empMonthYear, empMonth, 1);
    const monthEnd = new Date(empMonthYear, empMonth + 1, 0);

    empLeaves.forEach((l) => {
      const leaveStart = parseDateOnly(l.start_date);
      const leaveEnd = parseDateOnly(l.end_date);
      const cursor = leaveStart > monthStart ? new Date(leaveStart) : new Date(monthStart);
      const rangeEnd = leaveEnd < monthEnd ? leaveEnd : monthEnd;
      while (cursor <= rangeEnd) {
        keys.add(toDateString(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return keys;
  }, [empLeaves, empMonthYear, empMonth]);

  // Is a specific day an approved leave day for the employee?
  const isEmpOnLeave = (day) => {
    if (!selectedEmployee) return false;
    const key = toDateString(new Date(empMonthYear, empMonth, day));
    if (empLeaveKeys.has(key)) return true;
    return empRecords[key]?.status === 'leave';
  };

  // Is a specific day absent for the employee?
  const isEmpAbsent = (day) => {
    if (!selectedEmployee || !empCreatedAt) return false;

    const dayKey = toDateString(new Date(empMonthYear, empMonth, day));
    return isAbsenceDay(dayKey, {
      now: new Date(),
      settings: workSchedule,
      createdAtKey: empCreatedKey,
      attended: (key) => Boolean(empRecords[key]),
      onApprovedLeave: (key) => empLeaveKeys.has(key),
    });
  };

  // ---- Month summary for the employee (starts at account creation) ----
  const empMonthStats = useMemo(() => {
    const stats = {
      present: 0,
      late: 0,
      halfDay: 0,
      leave: 0,
      absent: 0,
      totalHours: 0,
      overtime: 0,
    };

    // Count attendance records that fall inside the viewed month
    const firstOfMonth = new Date(empMonthYear, empMonth, 1);
    const lastOfMonth = new Date(empMonthYear, empMonth + 1, 0);
    const firstKey = toDateString(firstOfMonth);
    const lastKey = toDateString(lastOfMonth);

    // Leave days: approved requests in the month plus any 'leave' records
    const leaveKeys = new Set(empLeaveKeys);
    const attendedKeys = new Set();

    Object.values(empRecords).forEach((r) => {
      const d = parseDateOnly(r.date);
      if (d < firstOfMonth || d > lastOfMonth) return;

      if (r.status === 'present') stats.present++;
      else if (r.status === 'late') stats.late++;
      else if (r.status === 'half-day') stats.halfDay++;
      else if (r.status === 'leave' && r.date >= firstKey && r.date <= lastKey) leaveKeys.add(r.date);

      if (['present', 'late', 'half-day'].includes(r.status)) attendedKeys.add(r.date);

      // Only completed records (both time_in and time_out) count toward
      // hours worked and overtime; incomplete records contribute 0.
      if (r.time_in && r.time_out) {
        stats.totalHours += Number(r.total_hours || 0);
        stats.overtime += Number(r.overtime || 0);
      }
    });

    stats.leave = leaveKeys.size;

    // Absences: apply the shared rules to every month day (weekday, after
    // creation, no attended record, no approved leave; today only counts
    // once work_end_time has passed)
    if (empCreatedAt) {
      const now = new Date();
      const cursor = new Date(firstOfMonth);
      while (cursor <= lastOfMonth) {
        const key = toDateString(cursor);
        if (
          isAbsenceDay(key, {
            now,
            settings: workSchedule,
            createdAtKey: empCreatedKey,
            attendedKeys,
            approvedLeaveKeys: leaveKeys,
          })
        ) {
          stats.absent++;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return stats;
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
  }, [empRecords, empLeaveKeys, empMonthYear, empMonth, empCreatedAt, empCreatedKey, workSchedule]);



  const empSelectedRecord = empSelectedDay
    ? empRecords[toDateString(new Date(empMonthYear, empMonth, empSelectedDay))]
    : null;

  const empSelectedDateObj = empSelectedDay
    ? new Date(empMonthYear, empMonth, empSelectedDay)
    : null;

  return (
    <div className="max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-[#0F1E36] tracking-tight">
          Attendance
        </h2>
        <p className="text-sm text-[#64748B] mt-1">
          View daily clock-in and clock-out records
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'date', label: 'By Date', Icon: CalendarIcon },
          { key: 'employee', label: 'By Employee', Icon: UserIcon },
        ].map((tab) => {
          const active = activeTab === tab.key;
          const Icon = tab.Icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition ${
                active
                  ? 'bg-[#0066FF] text-white'
                  : 'bg-white text-[#64748B] border border-[#E8EDF5] hover:bg-[#F8FAFD]'
              }`}
              style={active ? { boxShadow: '0 4px 12px rgba(0,102,255,0.25)' } : {}}
            >
              <Icon size={16} color={active ? '#FFFFFF' : '#0066FF'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-[#FEE9EB] text-[#DC2626] text-sm rounded-2xl px-4 py-3 mb-6">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ============ BY DATE TAB ============ */}
      {activeTab === 'date' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div
              className={`${CARD} p-5 sticky top-6`}
              style={{ boxShadow: CARD_SHADOW }}
            >
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={prevMonth}
                  className="w-10 h-10 rounded-full bg-white border border-[#E8EDF5] flex items-center justify-center hover:bg-[#F8FAFD] transition"
                >
                  <ChevronLeft size={20} color="#1F2937" />
                </button>
                <h3 className="text-lg font-bold text-[#0F1E36]">
                  {MONTHS[viewMonth]} {viewYear}
                </h3>
                <button
                  onClick={nextMonth}
                  className="w-10 h-10 rounded-full bg-white border border-[#E8EDF5] flex items-center justify-center hover:bg-[#F8FAFD] transition"
                >
                  <ChevronRight size={20} color="#1F2937" />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-2">
                {DAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-[#64748B] py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} className="aspect-square" />;
                  const selected = isSelected(day);
                  const todayCell = isToday(day);
                  const weekend = isWeekend(day);

                  return (
                    <button
                      key={`day-${day}`}
                      onClick={() => handleSelectDate(day)}
                      className="aspect-square flex items-center justify-center rounded-full transition text-sm relative"
                      style={{
                        backgroundColor: selected ? '#0066FF' : 'transparent',
                        boxShadow: selected
                          ? '0 4px 12px rgba(0,102,255,0.3)'
                          : 'none',
                      }}
                    >
                      <span
                        style={{
                          color: selected
                            ? '#FFFFFF'
                            : todayCell
                            ? '#0066FF'
                            : weekend
                            ? '#9CA3AF'
                            : '#0F1E36',
                          fontWeight: todayCell || selected ? '700' : '500',
                        }}
                      >
                        {day}
                      </span>
                      {todayCell && !selected && (
                        <span
                          className="absolute bottom-1 w-1 h-1 rounded-full"
                          style={{ backgroundColor: '#0066FF' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 pt-5 border-t border-[#E5E7EB]">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">
                  Legend
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#0066FF]" />
                    <span className="text-[#64748B]">Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-[#0066FF]" />
                    <span className="text-[#64748B]">Today</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-5">
            <div className={`${CARD} p-5`} style={{ boxShadow: CARD_SHADOW }}>
              <div className="flex items-center gap-3 mb-4">
                <div className={ICON_BADGE} style={{ backgroundColor: '#EAF2FF' }}>
                  <CalendarIcon size={18} color="#0066FF" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0F1E36] text-lg">
                    {formatLongDate(selectedDate)}
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    {loadingDate
                      ? 'Loading...'
                      : `${dateStats.total} record${dateStats.total === 1 ? '' : 's'} submitted`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="bg-[#EAF8F0] rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold text-[#16834A]">{dateStats.present}</p>
                  <p className="text-xs text-[#16834A] mt-0.5">Present</p>
                </div>
                <div className="bg-[#FEF3C7] rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold text-[#D97706]">{dateStats.late}</p>
                  <p className="text-xs text-[#D97706] mt-0.5">Late</p>
                </div>
                <div className="bg-[#FEE9EB] rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold text-[#DC2626]">{dateStats.absent}</p>
                  <p className="text-xs text-[#DC2626] mt-0.5">Absent</p>
                </div>
                <div className="bg-[#EAF2FF] rounded-2xl p-3 text-center">
                  <p className="text-2xl font-bold text-[#0066FF]">{dateStats.leave}</p>
                  <p className="text-xs text-[#0066FF] mt-0.5">Leave</p>
                </div>
              </div>
            </div>

            <div className={`${CARD} p-4`} style={{ boxShadow: CARD_SHADOW }}>
              <div className="relative flex items-center bg-white rounded-2xl border border-[#E8EDF5] focus-within:border-[#0066FF] focus-within:ring-2 focus-within:ring-[#0066FF]/20 transition">
                <Search
                  size={18}
                  color="#9CA3AF"
                  className="absolute left-4 shrink-0 pointer-events-none"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or employee ID"
                  className="w-full bg-transparent text-sm text-[#0F1E36] outline-none placeholder-gray-400 py-3 pl-11 pr-4"
                />
              </div>
            </div>

            {loadingDate ? (
              <div className={`${CARD} p-10 flex items-center justify-center`} style={{ boxShadow: CARD_SHADOW }}>
                <Loader2 className="animate-spin" size={28} color="#0066FF" />
              </div>
            ) : filtered.length === 0 ? (
              <div className={`${CARD} p-10`} style={{ boxShadow: CARD_SHADOW }}>
                <div className="flex flex-col items-center text-center">
                  <div className={ICON_BADGE} style={{ backgroundColor: '#EAF2FF', width: 64, height: 64 }}>
                    <Users size={28} color="#0066FF" />
                  </div>
                  <h3 className="font-bold text-[#0F1E36] text-lg mt-4">
                    {search ? 'No matching records' : 'No attendance records'}
                  </h3>
                  <p className="text-sm text-[#64748B] mt-1 max-w-sm">
                    {search
                      ? 'Try a different search term.'
                      : 'No employees submitted attendance on this date.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((record) => {
                  const name =
                    record.profile?.full_name ||
                    record.profile?.email ||
                    'Unknown';
                  const inUrl = signedUrls[`in-${record.id}`];
                  const outUrl = signedUrls[`out-${record.id}`];
                  const hours = getDayHours(record.time_in, record.time_out);
                  const noTimeOut = record.time_in && !record.time_out;

                  return (
                    <div
                      key={record.id}
                      className={`${CARD} p-4`}
                      style={{ boxShadow: CARD_SHADOW }}
                    >
                      <div className="flex items-center gap-3 pb-3 border-b border-[#E5E7EB]">
                        {record.profile?.avatar_url ? (
                          <img src={record.profile.avatar_url} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#EAF2FF] flex items-center justify-center text-[#0066FF] font-bold text-xs shrink-0">
                            {getInitials(name)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#0F1E36] text-sm truncate">
                            {name}
                          </p>
                          <p className="text-xs text-[#64748B] truncate">
                            {record.profile?.employee_id && (
                              <span className="mr-2">
                                {record.profile.employee_id}
                              </span>
                            )}
                            {record.profile?.department}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusPill status={record.status} />
                          {noTimeOut && <NoTimeOutPill />}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <TimeCard
                          title="Time In"
                          time={formatTime(record.time_in)}
                          location={record.time_in_location}
                          selfieUrl={inUrl}
                          onPreview={() =>
                            setPreviewImage({
                              url: inUrl,
                              label: `Time In - ${name}`,
                            })
                          }
                        />
                        <TimeCard
                          title="Time Out"
                          time={formatTime(record.time_out)}
                          location={record.time_out_location}
                          selfieUrl={outUrl}
                          onPreview={() =>
                            setPreviewImage({
                              url: outUrl,
                              label: `Time Out - ${name}`,
                            })
                          }
                        />
                      </div>

                      {hours !== null && (
                        <div className="mt-3 pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs">
                          <span className="text-[#64748B]">
                            Total hours worked
                          </span>
                          <span className="font-bold text-[#0F1E36]">
                            {hours} hour{hours === 1 ? '' : 's'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ BY EMPLOYEE TAB ============ */}
      {activeTab === 'employee' && (
        <div className="space-y-5">

          <div className={`${CARD} p-4`} style={{ boxShadow: CARD_SHADOW }}>
            <label className="block text-xs font-semibold text-[#64748B] mb-2 ml-1">
              Select Employee
            </label>

            <div className="relative">
              <button
                onClick={() => setShowEmployeeDropdown((v) => !v)}
                className="w-full flex items-center justify-between bg-white border border-[#E8EDF5] rounded-2xl px-4 py-3 text-left hover:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {selectedEmployee ? (
                    <>
                      {selectedEmployee.avatar_url ? (
                        <img src={selectedEmployee.avatar_url} alt={selectedEmployee.full_name || ''} className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#EAF2FF] flex items-center justify-center text-[#0066FF] font-bold text-xs shrink-0">
                          {getInitials(selectedEmployee.full_name || selectedEmployee.email || '')}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[#0F1E36] truncate">
                          {selectedEmployee.full_name || selectedEmployee.email}
                        </p>
                        <p className="text-xs text-[#64748B] truncate">
                          {selectedEmployee.employee_id && (
                            <span className="mr-2">
                              {selectedEmployee.employee_id}
                            </span>
                          )}
                          {selectedEmployee.department}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-9 h-9 rounded-full bg-[#EAF2FF] flex items-center justify-center">
                        <UserIcon size={16} color="#9CA3AF" />
                      </div>
                      <p className="text-sm text-gray-400">
                        Choose an employee…
                      </p>
                    </>
                  )}
                </div>
                <ChevronRight
                  size={16}
                  color="#9CA3AF"
                  className={`transition ${showEmployeeDropdown ? 'rotate-90' : ''}`}
                />
              </button>

              {showEmployeeDropdown && (
                <div
                  className="absolute left-0 right-0 mt-2 bg-white border border-[#E8EDF5] rounded-2xl shadow-[0_8px_24px_rgba(15,30,54,0.12)] z-20 max-h-80 overflow-y-auto"
                  style={{ boxShadow: '0 12px 24px rgba(15,30,54,0.12)' }}
                >
                  <div className="p-2 border-b border-[#E5E7EB] sticky top-0 bg-white z-10">
                    <div className="relative flex items-center bg-white rounded-2xl border border-[#E8EDF5] focus-within:border-[#0066FF] focus-within:ring-2 focus-within:ring-[#0066FF]/20 transition">
                      <Search
                        size={16}
                        color="#9CA3AF"
                        className="absolute left-3 shrink-0 pointer-events-none"
                      />
                      <input
                        type="search"
                        value={employeeSearch}
                        onChange={(e) => setEmployeeSearch(e.target.value)}
                        placeholder="Search employee…"
                        className="w-full bg-transparent text-sm text-[#0F1E36] outline-none placeholder-gray-400 py-2.5 pl-9 pr-3"
                      />
                    </div>
                  </div>

                  {employeesLoading ? (
                    <div className="p-6 flex items-center justify-center">
                      <Loader2 className="animate-spin" size={20} color="#0066FF" />
                    </div>
                  ) : filteredEmployees.length === 0 ? (
                    <div className="p-6 text-center text-sm text-[#64748B]">
                      No employees found
                    </div>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <button
                        key={emp.id}
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setShowEmployeeDropdown(false);
                          setEmployeeSearch('');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#F8FAFD] transition text-left"
                      >
                        {emp.avatar_url ? (
                          <img src={emp.avatar_url} alt={emp.full_name || ''} className="w-9 h-9 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#EAF2FF] flex items-center justify-center text-[#0066FF] font-bold text-xs shrink-0">
                            {getInitials(emp.full_name || emp.email || '')}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-[#0F1E36] truncate">
                            {emp.full_name || emp.email}
                          </p>
                          <p className="text-xs text-[#64748B] truncate">
                            {emp.employee_id && (
                              <span className="mr-2">{emp.employee_id}</span>
                            )}
                            {emp.department}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {selectedEmployee && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              <div className="lg:col-span-1">
                <div className={`${CARD} p-5`} style={{ boxShadow: CARD_SHADOW }}>
                  <div className="flex items-center justify-between mb-5">
                    <button
                      onClick={empPrevMonth}
                      className="w-10 h-10 rounded-full bg-white border border-[#E8EDF5] flex items-center justify-center hover:bg-[#F8FAFD] transition"
                    >
                      <ChevronLeft size={20} color="#1F2937" />
                    </button>
                    <h3 className="text-lg font-bold text-[#0F1E36]">
                      {MONTHS[empMonth]} {empMonthYear}
                    </h3>
                    <button
                      onClick={empNextMonth}
                      className="w-10 h-10 rounded-full bg-white border border-[#E8EDF5] flex items-center justify-center hover:bg-[#F8FAFD] transition"
                    >
                      <ChevronRight size={20} color="#1F2937" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 mb-2">
                    {DAYS.map((day) => (
                      <div
                        key={day}
                        className="text-center text-xs font-semibold text-[#64748B] py-1"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-0.5">
                    {empCells.map((day, i) => {
                      if (!day) return <div key={`e-${i}`} className="aspect-square" />;

                      const record = empRecords[
                        toDateString(new Date(empMonthYear, empMonth, day))
                      ];
                      const selected = empSelectedDay === day;
                      const weekend =
                        new Date(empMonthYear, empMonth, day).getDay() === 0 ||
                        new Date(empMonthYear, empMonth, day).getDay() === 6;
                      const absent = isEmpAbsent(day);

                      let dotColor = null;
                      if (record) {
                        if (record.status === 'present') dotColor = '#22C55E';
                        else if (record.status === 'late') dotColor = '#EAB308';
                        else if (record.status === 'leave') dotColor = PURPLE;
                        else if (record.status === 'half-day') dotColor = '#EAB308';
                        else if (record.status === 'absent') dotColor = RED;
                      } else if (isEmpOnLeave(day)) {
                        dotColor = PURPLE;
                      } else if (absent) {
                        dotColor = RED;
                      }

                      let textColor = '#0F1E36';
                      if (selected) textColor = 'white';
                      else if (absent) textColor = RED;
                      else if (weekend) textColor = '#9CA3AF';

                      return (
                        <button
                          key={`ed-${day}`}
                          onClick={() => setEmpSelectedDay(day)}
                          className="aspect-square flex items-center justify-center rounded-full transition text-sm relative"
                          style={{
                            backgroundColor: selected ? '#0066FF' : 'transparent',
                            boxShadow: selected
                              ? '0 4px 12px rgba(0,102,255,0.3)'
                              : 'none',
                          }}
                        >
                          <span
                            style={{
                              color: textColor,
                              fontWeight: selected || absent ? '700' : '500',
                            }}
                          >
                            {day}
                          </span>

                          {dotColor && !selected && (
                            <span
                              className="absolute bottom-1 w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: dotColor }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 pt-5 border-t border-[#E5E7EB]">
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">
                      Legend
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
                        <span className="text-[#64748B]">Present</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#EAB308]" />
                        <span className="text-[#64748B]">Late / Half</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: RED }} />
                        <span className="text-[#64748B]">Absent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: PURPLE }}
                        />
                        <span className="text-[#64748B]">Leave</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-5">

                {/* Employee header card */}
                <div className={`${CARD} p-5`} style={{ boxShadow: CARD_SHADOW }}>
                  <div className="flex items-center gap-4">
                    {selectedEmployee.avatar_url ? (
                      <img src={selectedEmployee.avatar_url} alt={selectedEmployee.full_name || ''} className="w-14 h-14 rounded-2xl object-cover shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-[#EAF2FF] flex items-center justify-center text-[#0066FF] font-bold text-lg shrink-0">
                        {getInitials(selectedEmployee.full_name || selectedEmployee.email || '')}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[#0F1E36] text-lg truncate">
                        {selectedEmployee.full_name || selectedEmployee.email}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-1">
                        {selectedEmployee.employee_id && (
                          <span className="mr-3">
                            {selectedEmployee.employee_id}
                          </span>
                        )}
                        {selectedEmployee.department && (
                          <span className="mr-3">{selectedEmployee.department}</span>
                        )}
                        {selectedEmployee.position && <span>{selectedEmployee.position}</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Month stats card */}
                <div className={`${CARD} p-5`} style={{ boxShadow: CARD_SHADOW }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={ICON_BADGE} style={{ backgroundColor: '#EAF2FF' }}>
                      <CalendarIcon size={18} color="#0066FF" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0F1E36] text-lg">
                        {MONTHS[empMonth]} {empMonthYear} Summary
                      </h3>
                      <p className="text-xs text-[#64748B]">
                        {empCreatedAt
                          ? `Counted from ${empCreatedAt.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}`
                          : 'No account creation date'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    <div className="bg-[#EAF8F0] rounded-2xl p-3 text-center">
                      <p className="text-2xl font-bold text-[#16834A]">{empMonthStats.present}</p>
                      <p className="text-xs text-[#16834A] mt-0.5">Present</p>
                    </div>
                    <div className="bg-[#FEF3C7] rounded-2xl p-3 text-center">
                      <p className="text-2xl font-bold text-[#D97706]">{empMonthStats.late}</p>
                      <p className="text-xs text-[#D97706] mt-0.5">Late</p>
                    </div>
                    <div className="bg-[#FEF3C7] rounded-2xl p-3 text-center">
                      <p className="text-2xl font-bold text-[#D97706]">{empMonthStats.halfDay}</p>
                      <p className="text-xs text-[#D97706] mt-0.5">Half Day</p>
                    </div>
                    <div className="bg-[#FEE9EB] rounded-2xl p-3 text-center">
                      <p className="text-2xl font-bold text-[#DC2626]">{empMonthStats.absent}</p>
                      <p className="text-xs text-[#DC2626] mt-0.5">Absent</p>
                    </div>
                    <div className="bg-[#EAF2FF] rounded-2xl p-3 text-center">
                      <p className="text-2xl font-bold text-[#0066FF]">{empMonthStats.leave}</p>
                      <p className="text-xs text-[#0066FF] mt-0.5">Leave</p>
                    </div>
                    <div className="bg-white rounded-2xl p-3 text-center border border-[#E8EDF5]">
                      <p className="text-2xl font-extrabold text-[#0F1E36]">
                        {empMonthStats.totalHours.toFixed(1)}h
                      </p>
                      <p className="text-xs text-[#64748B] mt-0.5">Hours</p>
                    </div>
                    <div className="bg-[#EEF2FF] rounded-2xl p-3 text-center">
                      <p className="text-2xl font-bold text-[#4F46E5]">
                        {empMonthStats.overtime.toFixed(1)}h
                      </p>
                      <p className="text-xs text-[#4F46E5] mt-0.5">Overtime</p>
                    </div>
                  </div>
                </div>

                {/* Selected day panel */}
                <div className={`${CARD} p-5`} style={{ boxShadow: CARD_SHADOW }}>
                  {!empSelectedDay ? (
                    <div className="flex flex-col items-center text-center py-8">
                      <div className={ICON_BADGE} style={{ backgroundColor: '#EAF2FF', width: 64, height: 64 }}>
                        <CalendarIcon size={28} color="#0066FF" />
                      </div>
                      <h3 className="font-bold text-[#0F1E36] text-lg mt-4">
                        Select a day
                      </h3>
                      <p className="text-sm text-[#64748B] mt-1 max-w-sm">
                        Click a date on the calendar to see the attendance details.
                      </p>
                    </div>
                  ) : empLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="animate-spin" size={24} color="#0066FF" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className={ICON_BADGE} style={{ backgroundColor: '#EAF2FF' }}>
                            <CalendarIcon size={16} color="#0066FF" />
                          </div>
                          <div>
                            <h3 className="font-bold text-[#0F1E36] text-base">
                              {formatLongDate(empSelectedDateObj)}
                            </h3>
                            <p className="text-xs text-[#64748B]">
                              {empSelectedRecord
                                ? 'Recorded'
                                : isEmpOnLeave(empSelectedDay)
                                ? 'On approved leave'
                                : isEmpAbsent(empSelectedDay)
                                ? 'Marked absent'
                                : 'No record'}
                            </p>
                          </div>
                        </div>

                        {empSelectedRecord && <StatusPill status={empSelectedRecord.status} />}
                      </div>

                      {!empSelectedRecord ? (
                        <div className="bg-[#F8FAFD] rounded-2xl p-6 text-center">
                          <p className="text-sm text-[#64748B]">
                            {isEmpOnLeave(empSelectedDay)
                              ? 'On approved leave — not counted as absent.'
                              : 'No attendance record for this day.'}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <TimeCard
                              title="Time In"
                              time={formatTime(empSelectedRecord.time_in)}
                              location={empSelectedRecord.time_in_location}
                              selfieUrl={signedUrls[`in-${empSelectedRecord.id}`]}
                              onPreview={() =>
                                setPreviewImage({
                                  url: signedUrls[`in-${empSelectedRecord.id}`],
                                  label: `Time In - ${selectedEmployee.full_name}`,
                                })
                              }
                            />
                            <TimeCard
                              title="Time Out"
                              time={formatTime(empSelectedRecord.time_out)}
                              location={empSelectedRecord.time_out_location}
                              selfieUrl={signedUrls[`out-${empSelectedRecord.id}`]}
                              onPreview={() =>
                                setPreviewImage({
                                  url: signedUrls[`out-${empSelectedRecord.id}`],
                                  label: `Time Out - ${selectedEmployee.full_name}`,
                                })
                              }
                            />
                          </div>

                          {(() => {
                            const hours = getDayHours(
                              empSelectedRecord.time_in,
                              empSelectedRecord.time_out
                            );
                            if (hours === null) return null;
                            return (
                              <div className="mt-4 pt-4 border-t border-[#E5E7EB] flex items-center justify-between text-sm">
                                <span className="text-[#64748B]">
                                  Total hours worked
                                </span>
                                <span className="font-bold text-[#0F1E36]">
                                  {hours} hour{hours === 1 ? '' : 's'}
                                </span>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {!selectedEmployee && !employeesLoading && (
            <div className={`${CARD} p-10`} style={{ boxShadow: CARD_SHADOW }}>
              <div className="flex flex-col items-center text-center">
                <div className={ICON_BADGE} style={{ backgroundColor: '#EAF2FF', width: 64, height: 64 }}>
                  <UserIcon size={28} color="#0066FF" />
                </div>
                <h3 className="font-bold text-[#0F1E36] text-lg mt-4">
                  Choose an employee
                </h3>
                <p className="text-sm text-[#64748B] mt-1 max-w-sm">
                  Select an employee above to view their monthly attendance calendar.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
          >
            <X size={20} />
          </button>

          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-center mb-3 font-semibold">
              {previewImage.label}
            </p>
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black">
              <img
                src={previewImage.url}
                alt="Selfie preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}