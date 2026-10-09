import { ArrowUpRight } from 'lucide-react';

const CARD_SHADOW = '0 4px 16px rgba(0, 102, 255, 0.16)';

const TONES = {
  blue: { badge: '#EAF2FF', icon: '#0066FF' },
  green: { badge: '#EAF8F0', icon: '#16834A' },
  orange: { badge: '#FEF3C7', icon: '#D97706' },
  red: { badge: '#FEE9EB', icon: '#DC2626' },
};

export default function StatCard({ icon: Icon, label, value, tone = 'blue', trend }) {
  const palette = TONES[tone] ?? TONES.blue;

  return (
    <div
      className="bg-white rounded-3xl p-6 border border-[#E8EDF5]"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: palette.badge }}
        >
          <Icon size={18} color={palette.icon} />
        </div>

        {trend && (
          <span className="flex items-center gap-0.5 text-[#16834A] text-xs font-bold">
            <ArrowUpRight size={14} />
            {trend}
          </span>
        )}
      </div>

      <p className="mt-4 text-3xl font-bold text-[#0F1E36] tracking-tight">
        {value}
      </p>
      <p className="mt-1 text-sm text-[#64748B]">{label}</p>
    </div>
  );
}
