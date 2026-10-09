import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CheckCircle2,
  ClipboardList,
  BarChart3,
  LogOut,
  Settings,
  X,
  Clock3,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import logo from '../assets/Attendify-logo-white.png';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/approvals/leaves', label: 'Leave Approvals', icon: CheckCircle2 },
  { to: '/attendance', label: 'Attendance', icon: ClipboardList },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

export default function Sidebar({ open, onClose }) {
  const { signOut } = useAuth();
  const handleSignOut = async () => {
    await signOut();
    onClose?.();
  };

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden cursor-pointer"
        />
      )}

      <aside
        className={`fixed z-40 top-0 left-0 h-screen w-[260px] bg-white border-r border-[#E8EDF5] flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-center gap-3 px-5 h-16 border- border-[#E5E7EB] shrink-0">
          <div className="w-12 h-12 rounded-xl bg-[#0066FF] flex items-center justify-center shrink-0">
            <img src={logo} alt="Attendify" className="w-11 h-11 object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[#0F1E36] text-sm leading-tight truncate">
              Attendify Admin
            </p>
            <p className="text-xs text-[#64748B] truncate">Management</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="lg:hidden text-gray-400 hover:text-[#0F1E36]"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 h-11 px-3 rounded-xl text-sm transition ${
                  isActive
                    ? 'bg-[#EAF2FF] text-[#0066FF] font-semibold'
                    : 'text-[#64748B] hover:bg-[#F8FAFD]'
                }`
              }
            >
              <Icon size={18} />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}

          <NavLink
            to="/admin/time-corrections"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 h-11 px-3 rounded-xl text-sm transition ${
                isActive
                  ? 'bg-[#EAF2FF] text-[#0066FF] font-semibold'
                  : 'text-[#64748B] hover:bg-[#F8FAFD]'
              }`
            }
          >
            <Clock3 size={18} />
            <span className="truncate">Time Corrections</span>
          </NavLink>

          <div className="pt-3 mt-3 border-t border-[#E5E7EB]">
            <NavLink
              to="/settings"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 h-11 px-3 rounded-xl text-sm transition ${
                  isActive
                    ? 'bg-[#EAF2FF] text-[#0066FF] font-semibold'
                    : 'text-[#64748B] hover:bg-[#F8FAFD]'
                }`
              }
            >
              <Settings size={18} />
              <span className="truncate">Settings</span>
            </NavLink>
          </div>
        </nav>

        <div className="p-3 border-t border-[#E5E7EB] shrink-0">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full h-11 px-3 rounded-xl text-sm font-semibold text-[#DC2626] hover:bg-[#FEE9EB] transition"
          >
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
