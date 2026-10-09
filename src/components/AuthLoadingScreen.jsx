import { Loader2 } from 'lucide-react';

export default function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#0066FF] flex items-center justify-center shadow-[0_4px_16px_rgba(0,102,255,0.16)]">
          <Loader2 size={22} color="#ffffff" className="animate-spin" />
        </div>
        <p className="text-sm text-[#64748B]">Loading Attendify Admin…</p>
      </div>
    </div>
  );
}
