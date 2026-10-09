import { CARD_SHADOW, CARD } from '../lib/design';

export default function Placeholder({ icon: Icon, title, description }) {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-[#0F1E36] tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-[#64748B] mt-1">{description}</p>
      </div>

      <div
        className={`${CARD} flex flex-col items-center text-center px-6 py-20`}
        style={{ boxShadow: CARD_SHADOW }}
      >
        <div className="w-16 h-16 rounded-2xl bg-[#EAF2FF] flex items-center justify-center mb-4">
          <Icon size={28} color="#0066FF" />
        </div>
        <h3 className="font-bold text-[#0F1E36] text-lg">Coming soon</h3>
        <p className="text-sm text-[#64748B] mt-1 max-w-sm">
          This screen is not built yet. It will appear here once the
          corresponding Supabase tables are available.
        </p>
      </div>
    </div>
  );
}
