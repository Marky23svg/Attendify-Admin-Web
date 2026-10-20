import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { getInitials } from '../lib/format';

const TITLES = [
  { match: '/dashboard', title: '' },
  { match: '/employees/add', title: '' },
  { match: '/employees', title: '' },
  { match: '/approvals/leaves', title: '' },
  { match: '/attendance', title: '' },
  { match: '/reports', title: 'Reports' },
];

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation();
  const { profile } = useAuth();

  const title =
    TITLES.find((t) => pathname.startsWith(t.match))?.title ?? 'Attendify';

  const name = profile?.full_name || profile?.email || 'Admin';

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-[#E5E7EB] flex items-center gap-4 px-6">
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="lg:hidden text-[#64748B] hover:text-[#0066FF] transition -ml-1"
      >
        <Menu size={22} />
      </button>

      <h1 className="font-bold text-[#0F1E36] tracking-tight text-lg flex-1 min-w-0 truncate">
        {title}
      </h1>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-[#0F1E36] leading-tight truncate max-w-[16rem]">
            {name}
          </p>
          <span className="inline-flex items-center rounded-full bg-[#EAF2FF] text-[#0066FF] text-xs font-semibold px-3 py-1 capitalize">
            {profile?.role ?? 'admin'}
          </span>
        </div>

        <div className="w-11 h-11 rounded-full bg-[#0066FF] flex items-center justify-center text-white font-bold text-sm shrink-0">
          {getInitials(name) || 'A'}
        </div>
      </div>
    </header>
  );
}
