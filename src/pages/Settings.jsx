import { useEffect, useState } from 'react';
import {
  Clock3,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  CARD,
  CARD_SHADOW,
  ICON_BADGE,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
} from '../lib/design';

function toTimeInput(value) {
  return value ? String(value).slice(0, 5) : '';
}

function withSeconds(value) {
  return value.length === 5 ? `${value}:00` : value;
}

function formatClock(value) {
  if (!value) return '--:--';
  const [h, m] = String(value).slice(0, 5).split(':').map(Number);
  const d = new Date(2000, 0, 1, h || 0, m || 0);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function lateThreshold(start, grace) {
  if (!start) return null;
  const [h, m] = String(start).slice(0, 5).split(':').map(Number);
  const total = (h || 0) * 60 + (m || 0) + (Number(grace) || 0);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function parseRow(data) {
  if (!data) return null;
  return {
    work_start_time: toTimeInput(data.work_start_time),
    work_end_time: toTimeInput(data.work_end_time),
    grace_period_minutes: data.grace_period_minutes ?? 0,
  };
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [banner, setBanner] = useState(null);
  const [form, setForm] = useState({
    work_start_time: '',
    work_end_time: '',
    grace_period_minutes: 0,
  });

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      setBanner({
        type: 'error',
        message: `Could not load settings: ${error.message}`,
      });
      return;
    }
    const row = parseRow(data);
    if (!row) {
      setBanner({
        type: 'error',
        message: 'Settings row (id = 1) was not found.',
      });
      return;
    }
    setForm(row);
  };

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        const row = parseRow(data);
        if (error) {
          setBanner({
            type: 'error',
            message: `Could not load settings: ${error.message}`,
          });
        } else if (!row) {
          setBanner({
            type: 'error',
            message: 'Settings row (id = 1) was not found.',
          });
        } else {
          setForm(row);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (banner?.type !== 'success') return undefined;
    const t = setTimeout(() => setBanner(null), 2500);
    return () => clearTimeout(t);
  }, [banner]);

  const handleSave = async (e) => {
    e.preventDefault();
    setBanner(null);

    const grace = Number(form.grace_period_minutes);
    if (!form.work_start_time || !form.work_end_time) {
      setBanner({
        type: 'error',
        message: 'Work start time and work end time are required.',
      });
      return;
    }
    if (Number.isNaN(grace) || grace < 0 || grace > 120) {
      setBanner({
        type: 'error',
        message: 'Grace period must be between 0 and 120 minutes.',
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('settings')
      .update({
        work_start_time: withSeconds(form.work_start_time),
        work_end_time: withSeconds(form.work_end_time),
        grace_period_minutes: grace,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    setSaving(false);

    if (error) {
      setBanner({
        type: 'error',
        message: `Could not save settings: ${error.message}`,
      });
      return;
    }
    setBanner({ type: 'success', message: 'Work schedule saved.' });
  };

  const handleReset = async () => {
    setResetting(true);
    setBanner(null);
    await loadSettings();
    setResetting(false);
  };

  const grace = Number(form.grace_period_minutes) || 0;
  const startLabel = formatClock(form.work_start_time);
  const lateLabel = formatClock(lateThreshold(form.work_start_time, grace));
  const endLabel = formatClock(form.work_end_time);

  const inputClass =
    'w-full bg-white border border-[#E8EDF5] rounded-2xl px-4 py-3 text-sm text-[#0F1E36] outline-none focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 transition';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-[#0F1E36] tracking-tight">
          Settings
        </h2>
        <p className="text-sm text-[#64748B] mt-1">
          Manage the work schedule policy used for attendance
        </p>
      </div>

      <div className={`${CARD} p-6 sm:p-8`} style={{ boxShadow: CARD_SHADOW }}>
        <div className="flex items-center gap-3 mb-6">
          <div className={ICON_BADGE} style={{ backgroundColor: '#EAF2FF' }}>
            <Clock3 size={18} color="#0066FF" />
          </div>
          <div>
            <h3 className="font-bold text-[#0F1E36] text-base">Work Schedule</h3>
            <p className="text-xs text-[#64748B]">
              Set clock-in hours and the late grace period
            </p>
          </div>
        </div>

        {banner && (
          <div
            className={`flex items-start gap-2 text-sm rounded-2xl px-4 py-3 mb-6 ${
              banner.type === 'success'
                ? 'bg-[#EAF8F0] text-[#16834A]'
                : 'bg-[#FEE9EB] text-[#DC2626]'
            }`}
          >
            {banner.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
            )}
            <span>{banner.message}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-2xl bg-[#F8FAFD] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="work_start_time"
                  className="block text-xs font-semibold text-[#64748B] mb-1.5"
                >
                  Work Start Time
                </label>
                <input
                  id="work_start_time"
                  type="time"
                  required
                  value={form.work_start_time}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, work_start_time: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="work_end_time"
                  className="block text-xs font-semibold text-[#64748B] mb-1.5"
                >
                  Work End Time
                </label>
                <input
                  id="work_end_time"
                  type="time"
                  required
                  value={form.work_end_time}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, work_end_time: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="grace_period_minutes"
                  className="block text-xs font-semibold text-[#64748B] mb-1.5"
                >
                  Grace Period
                </label>
                <div className="relative">
                  <input
                    id="grace_period_minutes"
                    type="number"
                    min="0"
                    max="120"
                    required
                    value={form.grace_period_minutes}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        grace_period_minutes: e.target.value,
                      }))
                    }
                    className={`${inputClass} pr-12`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 pointer-events-none">
                    min
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="submit"
                disabled={saving || resetting}
                className={`${PRIMARY_BUTTON} flex items-center justify-center gap-2 text-sm`}
              >
                {saving ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                Save
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={saving || resetting}
                className={`${SECONDARY_BUTTON} flex items-center justify-center gap-2 text-sm`}
              >
                {resetting && <Loader2 size={16} className="animate-spin" />}
                Reset
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-[#E5E7EB]">
          <h4 className="font-bold text-[#0F1E36] text-sm mb-3">
            Current Policy
          </h4>
          <ul className="space-y-2.5">
            {[
              `Employees should clock in by ${startLabel}`,
              `Up to ${grace} minutes late is still considered Present`,
              `Any clock-in after ${lateLabel} will be marked Late`,
              `Any time worked past ${endLabel} counts as Overtime`,
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-2 text-sm text-[#64748B]"
              >
                <CheckCircle2
                  size={15}
                  color="#0066FF"
                  className="shrink-0 mt-0.5"
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
