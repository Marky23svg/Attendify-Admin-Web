import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserCheck,
  CalendarOff,
  UserX,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import StatCard from '../components/StatCard';
import { CARD_SHADOW, CARD } from '../lib/design';
import { getInitials, formatDate } from '../lib/format';
import { DEFAULT_SETTINGS, dateKey, isAbsenceDay } from '../lib/absence';

function EmptyHint({ message }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10">
      <p className="text-sm text-[#64748B]">{message}</p>
    </div>
  );
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateOnly(value) {
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function Dashboard() {
  const { profile: adminProfile } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [activity, setActivity] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [actingId, setActingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setNotice(null);

    try {
      // 1. Profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) {
        setNotice(`Could not load profiles: ${profileError.message}`);
        setEmployees([]);
      } else {
        setEmployees(profileData || []);
      }

      // 2. Today's attendance
      const today = todayISO();
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', today);

      if (attendanceError) {
        setNotice(`Could not load attendance: ${attendanceError.message}`);
        setTodayAttendance([]);
      } else {
        setTodayAttendance(attendanceData || []);
      }

      // 3. Pending and approved leave requests
      const { data: leaveData, error: leaveError } = await supabase
        .from('leave_requests')
        .select('*')
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false });

      if (leaveError) {
        setNotice(`Could not load leave requests: ${leaveError.message}`);
        setLeaves([]);
      } else {
        setLeaves(leaveData || []);
      }

      // 4. Recent activity (last 5 records)
      const { data: activityData } = await supabase
        .from('attendance')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // 5. Work schedule (gates "absent today" until work_end_time)
      const { data: settingsRow } = await supabase
        .from('settings')
        .select('work_start_time, work_end_time')
        .eq('id', 1)
        .maybeSingle();

      if (settingsRow?.work_end_time) setSettings(settingsRow);

      setActivity(activityData || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setNotice('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Build a lookup of profiles by id for quick access
  const profileMap = useMemo(() => {
    const map = {};
    employees.forEach((e) => {
      map[e.id] = e;
    });
    return map;
  }, [employees]);

  // Stats
  const stats = useMemo(() => {
    // Exclude admin accounts from employee count
    const staff = employees.filter((e) => e.role !== 'admin');
    const total = staff.length;

    // Present today = records with time_in
    const present = todayAttendance.filter((a) => a.time_in).length;

    // On leave today = approved leaves that cover today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = dateKey(new Date());

    let onLeave = 0;
    let pendingCount = 0;
    const approvedTodayIds = new Set();
    leaves.forEach((l) => {
      if (l.status === 'pending') pendingCount += 1;
      if (l.status !== 'approved') return;
      const start = parseDateOnly(l.start_date);
      const end = parseDateOnly(l.end_date);
      if (today >= start && today <= end) {
        onLeave += 1;
        approvedTodayIds.add(l.user_id);
      }
    });

    const presentIds = new Set();
    todayAttendance.forEach((a) => {
      if (a.time_in) presentIds.add(a.user_id);
    });

    // Absent today = weekday staff with no record and no approved leave,
    // only counted once today's work_end_time has passed (never at midnight)
    const now = new Date();
    let absent = 0;
    staff.forEach((s) => {
      if (
        isAbsenceDay(todayKey, {
          now,
          settings,
          createdAtKey: s.created_at ? dateKey(new Date(s.created_at)) : null,
          attended: (key) => key === todayKey && presentIds.has(s.id),
          onApprovedLeave: (key) => key === todayKey && approvedTodayIds.has(s.id),
        })
      ) {
        absent += 1;
      }
    });

    return {
      total,
      present,
      onLeave,
      absent,
      pendingCount,
    };
  }, [employees, todayAttendance, leaves, settings]);

  const handleDecision = async (id, status) => {
    if (!adminProfile?.id) {
      setNotice('Could not identify your admin account.');
      return;
    }
    setActingId(id);
    const reviewedAt = new Date().toISOString();
    const { error } = await supabase
      .from('leave_requests')
      .update({
        status,
        reviewed_by: adminProfile.id,
        reviewed_at: reviewedAt,
      })
      .eq('id', id);

    if (error) {
      setNotice(`Could not update request: ${error.message}`);
    } else {
      setLeaves((prev) =>
        prev.map((l) =>
          l.id === id
            ? { ...l, status, reviewed_by: adminProfile.id, reviewed_at: reviewedAt }
            : l
        )
      );
    }
    setActingId(null);
  };

  // Enrich leave requests with employee name
  const enrichedLeaves = useMemo(() => {
    return leaves.map((l) => {
      const profile = profileMap[l.user_id];
      return {
        ...l,
        employee_name: profile?.full_name || profile?.email || 'Employee',
        employee_avatar: getInitials(
          profile?.full_name || profile?.email || ''
        ),
        department: profile?.department,
      };
    });
  }, [leaves, profileMap]);

  const pendingLeaves = useMemo(() => {
    return enrichedLeaves.filter((l) => l.status === 'pending');
  }, [enrichedLeaves]);

  // Enrich activity with employee name
  const enrichedActivity = useMemo(() => {
    return activity.map((a) => {
      const profile = profileMap[a.user_id];
      return {
        ...a,
        employee_name: profile?.full_name || profile?.email || 'Employee',
      };
    });
  }, [activity, profileMap]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users}
          label="Total Employees"
          value={stats.total}
          tone="blue"
          loading={loading}
        />
        <StatCard
          icon={UserCheck}
          label="Present Today"
          value={stats.present}
          tone="green"
          loading={loading}
        />
        <StatCard
          icon={CalendarOff}
          label="On Leave"
          value={stats.onLeave}
          tone="orange"
          loading={loading}
        />
        <StatCard
          icon={UserX}
          label="Absent"
          value={stats.absent}
          tone="red"
          loading={loading}
        />
      </div>

      {notice && (
        <div className="flex items-start gap-2 bg-[#FEF3C7] text-[#D97706] text-sm rounded-2xl px-4 py-3 mb-6">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Pending Approvals */}
        <div
          className={`${CARD} xl:col-span-2 overflow-hidden`}
          style={{ boxShadow: CARD_SHADOW }}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#E5E7EB]">
            <h3 className="font-bold text-[#0F1E36] tracking-tight">
              Pending Leave Approvals
            </h3>
            <span className="rounded-full bg-[#FEF3C7] text-[#D97706] text-xs font-semibold px-3 py-1">
              {stats.pendingCount} pending
            </span>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-2xl bg-[#F8FAFD] animate-pulse"
                />
              ))}
            </div>
          ) : pendingLeaves.length === 0 ? (
            <EmptyHint message="No leave requests waiting for approval." />
          ) : (
            <ul className="divide-y divide-[#E5E7EB]">
              {pendingLeaves.slice(0, 6).map((l) => (
                <li
                  key={l.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#EAF2FF] flex items-center justify-center text-[#0066FF] font-bold text-xs shrink-0">
                      {l.employee_avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0F1E36] text-sm truncate">
                        {l.employee_name}
                      </p>
                      <p className="text-xs text-[#64748B] truncate">
                        {l.leave_type} Â·{' '}
                        {formatDate(l.start_date)} â†’ {formatDate(l.end_date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:justify-end">
                    <button
                      onClick={() => handleDecision(l.id, 'approved')}
                      disabled={actingId === l.id}
                      className="flex items-center gap-1.5 rounded-xl bg-[#EAF8F0] text-[#16834A] text-xs font-semibold px-3 py-2 transition hover:brightness-95 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecision(l.id, 'rejected')}
                      disabled={actingId === l.id}
                      className="flex items-center gap-1.5 rounded-xl bg-[#FEE9EB] text-[#DC2626] text-xs font-semibold px-3 py-2 transition hover:brightness-95 disabled:opacity-50"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Activity */}
        <div
          className={`${CARD} overflow-hidden`}
          style={{ boxShadow: CARD_SHADOW }}
        >
          <div className="flex items-center gap-3 px-6 py-3 border-b border-[#E5E7EB]">
            <div className="w-10 h-10 rounded-xl bg-[#EAF2FF] flex items-center justify-center shrink-0">
              <Clock size={18} color="#0066FF" />
            </div>
            <h3 className="font-bold text-[#0F1E36] tracking-tight">
              Recent Activity
            </h3>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-2xl bg-[#F8FAFD] animate-pulse"
                />
              ))}
            </div>
          ) : enrichedActivity.length === 0 ? (
            <EmptyHint message="No clock-ins recorded yet." />
          ) : (
            <ul className="divide-y divide-[#E5E7EB]">
              {enrichedActivity.slice(0, 5).map((a) => {
                const isTimeOut = !!a.time_out;
                return (
                  <li key={a.id} className="flex items-center gap-3 px-6 py-3.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: isTimeOut ? '#FEE9EB' : '#EAF8F0',
                      }}
                    >
                      <Clock
                        size={14}
                        color={isTimeOut ? '#DC2626' : '#16834A'}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#0F1E36] truncate">
                        {a.employee_name}
                      </p>
                      <p className="text-xs text-[#64748B] truncate">
                        {isTimeOut
                          ? `Clocked out at ${new Date(a.time_out).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })} · ${formatDate(a.time_out)}`
                          : a.time_in
                            ? `Clocked in at ${new Date(a.time_in).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })} · ${formatDate(a.time_in)}`
                            : formatDate(a.created_at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}