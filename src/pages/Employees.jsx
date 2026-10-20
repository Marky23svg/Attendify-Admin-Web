import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Users,
  AlertCircle,
  ChevronDown,
  Pencil,
  UserCheck,
  UserX,
  X,
  Loader2,
  User,
  Mail,
  Phone,
  BadgeCheck,
  Building2,
  Briefcase,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import Field from '../components/Field';
import {
  CARD_SHADOW,
  CARD,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  ICON_BADGE,
} from '../lib/design';
import { getInitials, formatDate } from '../lib/format';
import { DEPARTMENTS, ROLES } from '../lib/constants';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;

function SkeletonRow() {
  return (
    <tr className="border-t border-[#E5E7EB]">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-4 rounded-lg bg-[#F8FAFD] animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

function FilterSelect({ value, onChange, children, icon: Icon }) {
  return (
    <div className="relative flex items-center bg-white rounded-2xl border border-[#E8EDF5] focus-within:border-[#0066FF] focus-within:ring-2 focus-within:ring-[#0066FF]/20 transition">
      {Icon && (
        <Icon
          size={16}
          color="#9CA3AF"
          className="ml-4 shrink-0 pointer-events-none"
        />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none bg-transparent text-sm text-[#0F1E36] outline-none cursor-pointer py-3 pr-9 ${
          Icon ? 'pl-2.5' : 'pl-4'
        } w-full min-w-[9rem]`}
      >
        {children}
      </select>
      <ChevronDown
        size={15}
        color="#9CA3AF"
        className="absolute right-3 pointer-events-none"
      />
    </div>
  );
}

function RoleBadge({ role }) {
  const isAdmin = role === 'admin';
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${
        isAdmin ? 'bg-[#EAF2FF] text-[#0066FF]' : 'bg-[#F8FAFD] text-[#64748B]'
      }`}
    >
      {role ?? 'employee'}
    </span>
  );
}

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  employee_id: '',
  department: '',
  position: '',
  role: 'employee',
};

function SelectField({
  id,
  label,
  icon: Icon,
  value,
  error,
  onChange,
  disabled,
  children,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[#64748B] text-xs font-semibold mb-2"
      >
        {label}
      </label>
      <div
        className={`flex items-center bg-white rounded-2xl px-4 border transition ${
          error
            ? 'border-[#DC2626]'
            : 'border-[#E8EDF5] focus-within:border-[#0066FF] focus-within:ring-2 focus-within:ring-[#0066FF]/20'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <Icon size={18} color="#9CA3AF" className="shrink-0" />
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none flex-1 py-3.5 ml-3 pr-8 bg-transparent text-sm text-[#0F1E36] outline-none cursor-pointer w-full min-w-0"
        >
          {children}
        </select>
        <ChevronDown size={16} color="#9CA3AF" className="shrink-0" />
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[#DC2626] text-xs mt-1.5">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

export default function Employees() {
  const navigate = useNavigate();
  const { profile: adminProfile } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('all');
  const [role, setRole] = useState('all');

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [saving, setSaving] = useState(false);
  const [checkingId, setCheckingId] = useState(false);

  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [page, setPage] = useState(1);

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState(null);
  const [activatingId, setActivatingId] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchEmployees = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!active) return;

      if (fetchError) {
        setError(fetchError.message);
        setEmployees([]);
      } else {
        setEmployees(data ?? []);
      }
      setLoading(false);
    };

    fetchEmployees();

    return () => {
      active = false;
    };
  }, []);

  const departmentOptions = useMemo(() => {
    const fromDb = employees.map((e) => e.department).filter(Boolean);
    return [...new Set([...DEPARTMENTS, ...fromDb])].sort();
  }, [employees]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return employees.filter((e) => {
      if (e.id === adminProfile?.id) return false;

      if (role !== 'all' && (e.role ?? 'employee') !== role) return false;
      if (department !== 'all' && e.department !== department) return false;

      if (!term) return true;
      return [e.full_name, e.email, e.employee_id].some((field) =>
        field?.toLowerCase().includes(term),
      );
    });
  }, [employees, search, department, role, adminProfile]);

  const hasFilters =
    search.trim() !== '' || department !== 'all' || role !== 'all';

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, department, role]);

  useEffect(() => {
    if (!editing) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || saving) return;
      setEditing(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editing, saving]);

  useEffect(() => {
    if (!deactivateTarget) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== 'Escape' || deactivating) return;
      setDeactivateTarget(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deactivateTarget, deactivating]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const isEmployeeIdTaken = async (employeeId, excludeId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('employee_id', employeeId.trim())
      .limit(1);

    if (error) throw error;

    return data.some((row) => row.id !== excludeId);
  };

  const validate = async () => {
    const next = {};

    if (!form.full_name.trim()) next.full_name = 'Full name is required';

    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      next.email = 'Enter a valid email address';

    if (!form.employee_id.trim()) next.employee_id = 'Employee ID is required';
    if (!form.department) next.department = 'Select a department';
    if (!form.position.trim()) next.position = 'Position is required';

    if (!next.employee_id) {
      setCheckingId(true);
      try {
        if (await isEmployeeIdTaken(form.employee_id, editing.id))
          next.employee_id = 'That employee ID is already in use';
      } catch {
        next.employee_id = 'Could not verify employee ID, try again';
      } finally {
        setCheckingId(false);
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const openEdit = (employee) => {
    setNotice(null);
    setBanner(null);
    setErrors({});
    setForm({
      full_name: employee.full_name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      employee_id: employee.employee_id || '',
      department: employee.department || '',
      position: employee.position || '',
      role: employee.role || 'employee',
    });
    setEditing(employee);
  };

  const openDeactivate = (employee) => {
    setNotice(null);
    setActionError(null);
    setBanner(null);
    setDeactivateError(null);
    setDeactivateTarget(employee);
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    setDeactivateError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-toggle-ban`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            targetUserId: deactivateTarget.id,
            action: 'ban',
          }),
        }
      );

      const text = await response.text();
      if (!response.ok) throw new Error(text || 'Failed to communicate with Edge Function');
      
      const result = text ? JSON.parse(text) : {};

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === deactivateTarget.id ? { ...emp, is_active: false } : emp,
        ),
      );
      setNotice(`${deactivateTarget.full_name || deactivateTarget.email} was deactivated.`);
      setDeactivateTarget(null);
    } catch (err) {
      console.error('Deactivate error:', err);
      setDeactivateError(err.message);
    } finally {
      setDeactivating(false);
    }
  };

  const handleActivate = async (employee) => {
    setNotice(null);
    setActionError(null);
    setActivatingId(employee.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-toggle-ban`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            targetUserId: employee.id,
            action: 'unban',
          }),
        }
      );

      const text = await response.text();
      if (!response.ok) throw new Error(text || 'Failed to communicate with Edge Function');

      const result = text ? JSON.parse(text) : {};

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === employee.id ? { ...emp, is_active: true } : emp,
        ),
      );
      setNotice(`${employee.full_name || employee.email} was activated.`);
    } catch (err) {
      console.error('Activate error:', err);
      setActionError(err.message);
    } finally {
      setActivatingId(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setBanner(null);

    if (form.email.trim() !== editing.email) {
      setBanner(
        'Changing email requires server-side code and is not available in this build.',
      );
      return;
    }

    const isValid = await validate();
    if (!isValid) return;

    setSaving(true);

    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      employee_id: form.employee_id.trim(),
      department: form.department,
      position: form.position.trim(),
      role: form.role,
    };

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', editing.id)
      .select();

    if (updateError) {
      setBanner(`Could not save changes: ${updateError.message}`);
      setSaving(false);
      return;
    }

    if (!data || data.length === 0) {
      setBanner(
        'Save failed: 0 rows updated. This usually means RLS blocked the update or the row ID is wrong.',
      );
      setSaving(false);
      return;
    }

    setEmployees((prev) =>
      prev.map((emp) => (emp.id === editing.id ? { ...emp, ...payload } : emp)),
    );
    setNotice(`${payload.full_name} was updated.`);
    setEditing(null);
    setSaving(false);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex-1">
          <h2 className="text-2xl font-extrabold text-[#0F1E36] tracking-tight">
            Employees
          </h2>
          <p className="text-sm text-[#64748B] mt-1">
            {loading
              ? 'Loading employees…'
              : `${filtered.length} of ${Math.max(employees.length - 1, 0)} shown`}
          </p>
        </div>

        <button
          onClick={() => navigate('/employees/add')}
          className={`${PRIMARY_BUTTON} flex items-center justify-center gap-2 px-4 py-2.5 text-sm`}
        >
          <Plus size={16} />
          Add Employee
        </button>
      </div>

      {notice && (
        <div className="flex items-start gap-2 bg-[#EAF8F0] text-[#16834A] text-sm rounded-2xl px-4 py-3 mb-6">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {actionError && (
        <div className="flex items-start gap-2 bg-[#FEE9EB] text-[#DC2626] text-sm rounded-2xl px-4 py-3 mb-6">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      <div className={`${CARD} p-4 mb-6`} style={{ boxShadow: CARD_SHADOW }}>
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex items-center bg-white rounded-2xl border border-[#E8EDF5] focus-within:border-[#0066FF] focus-within:ring-2 focus-within:ring-[#0066FF]/20 transition flex-1">
            <Search
              size={18}
              color="#9CA3AF"
              className="absolute left-4 shrink-0 pointer-events-none"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email or employee ID"
              aria-label="Search employees"
              className="w-full bg-transparent text-sm text-[#0F1E36] outline-none placeholder-gray-400 py-3 pl-11 pr-4"
            />
          </div>

          <FilterSelect value={department} onChange={setDepartment} icon={null}>
            <option value="all">All departments</option>
            {departmentOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect value={role} onChange={setRole} icon={null}>
            <option value="all">All roles</option>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </FilterSelect>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-[#FEE9EB] text-[#DC2626] text-sm rounded-2xl px-4 py-3 mb-6">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            Could not load employees: {error}
            <br />
            <span className="text-xs">
              If this mentions recursion or a policy error, check the RLS
              policies on the profiles table.
            </span>
          </span>
        </div>
      )}

      <div
        className={`${CARD} overflow-hidden`}
        style={{ boxShadow: CARD_SHADOW }}
      >
        {!error && (loading || filtered.length > 0) && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem]">
              <thead>
                <tr className="bg-[#F8FAFD]">
                  {['Name', 'Employee ID', 'Department', 'Position', 'Role'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3.5 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ),
                  )}
                  <th className="px-4 py-3.5 text-right text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : (
                  paginated.map((e) => {
                    const name = e.full_name || e.email || 'Unnamed';
                    const isActive = e.is_active !== false;
                    return (
                      <tr
                        key={e.id}
                        className={`border-t border-[#E5E7EB] hover:bg-[#F8FAFD] transition ${
                          isActive ? '' : 'opacity-60'
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {e.avatar_url ? (
                              <img src={e.avatar_url} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#EAF2FF] flex items-center justify-center text-[#0066FF] font-bold text-xs shrink-0">
                                {getInitials(name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-[#0F1E36] text-sm truncate">
                                {name}
                              </p>
                              <p className="text-xs text-[#64748B] truncate">
                                {e.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-[#0F1E36]">
                          {e.employee_id || '—'}
                        </td>
                        <td className="px-4 py-4 text-sm text-[#64748B]">
                          {e.department || '—'}
                        </td>
                        <td className="px-4 py-4 text-sm text-[#64748B]">
                          {e.position || '—'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <RoleBadge role={e.role} />
                            {!isActive && (
                              <span className="inline-flex items-center rounded-full bg-[#FEE9EB] text-[#DC2626] px-3 py-1 text-xs font-semibold">
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(e)}
                              aria-label={`Edit ${name}`}
                              title="Edit"
                              className="p-2 rounded-xl text-gray-400 hover:text-[#0066FF] hover:bg-[#EAF2FF] transition"
                            >
                              <Pencil size={16} />
                            </button>
                            {isActive ? (
                              <button
                                type="button"
                                onClick={() => openDeactivate(e)}
                                aria-label={`Deactivate ${name}`}
                                title="Deactivate"
                                className="p-2 rounded-xl text-gray-400 hover:text-[#DC2626] hover:bg-[#FEE9EB] transition"
                              >
                                <UserX size={16} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleActivate(e)}
                                disabled={activatingId === e.id}
                                aria-label={`Activate ${name}`}
                                title="Activate"
                                className="p-2 rounded-xl text-gray-400 hover:text-[#16834A] hover:bg-[#EAF8F0] transition disabled:opacity-50"
                              >
                                {activatingId === e.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <UserCheck size={16} />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center text-center px-6 py-16">
            <div className="w-16 h-16 rounded-2xl bg-[#EAF2FF] flex items-center justify-center mb-4">
              <Users size={28} color="#0066FF" />
            </div>
            <h3 className="font-bold text-[#0F1E36] text-lg">
              {hasFilters ? 'No matching employees' : 'No employees yet'}
            </h3>
            <p className="text-sm text-[#64748B] mt-1 max-w-sm">
              {hasFilters
                ? 'Try a different search term or clear the filters.'
                : 'Add your first employee to start tracking attendance.'}
            </p>

            {hasFilters ? (
              <button
                onClick={() => {
                  setSearch('');
                  setDepartment('all');
                  setRole('all');
                }}
                className="mt-6 bg-white border border-[#E8EDF5] text-[#0F1E36] font-semibold rounded-2xl py-3 px-6 hover:bg-[#F8FAFD] active:scale-[0.98] transition"
              >
                Clear filters
              </button>
            ) : (
              <button
                onClick={() => navigate('/employees/add')}
                className={`${PRIMARY_BUTTON} mt-6 flex items-center gap-2 py-3.5`}
              >
                <Plus size={18} />
                Add your first employee
              </button>
            )}
          </div>
        )}
      </div>

      {!loading && !error && filtered.length > 0 && (
        <Pagination page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-employee-title"
        >
          <div
            className="absolute inset-0 bg-black/50 cursor-pointer"
            onClick={() => !saving && setEditing(null)}
          />

          <form
            onSubmit={handleSave}
            noValidate
            className={`relative ${CARD} w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8 scrollbar-none`}
            style={{ boxShadow: CARD_SHADOW }}
          >
            <div className="flex items-start gap-3 mb-6">
              <div
                className={ICON_BADGE}
                style={{ backgroundColor: '#EAF2FF' }}
              >
                <Pencil size={18} color="#0066FF" />
              </div>
              <div className="flex-1">
                <h2
                  id="edit-employee-title"
                  className="font-bold text-[#0F1E36] tracking-tight"
                >
                  Edit Employee
                </h2>
                <p className="text-xs text-[#64748B]">
                  Update the profile and work details for{' '}
                  {editing.full_name || editing.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={saving}
                aria-label="Close"
                className="p-2 -mt-1 -mr-1 rounded-xl text-gray-400 hover:text-[#0F1E36] hover:bg-[#F8FAFD] transition disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            

            {banner && (
              <div className="flex items-start gap-2 bg-[#FEE9EB] text-[#DC2626] text-sm rounded-2xl px-4 py-3 mb-4">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{banner}</span>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                id="edit_full_name"
                label="Full Name *"
                icon={User}
                placeholder="Juan Dela Cruz"
                autoComplete="name"
                value={form.full_name}
                disabled={saving}
                error={errors.full_name}
                onChange={(e) => setField('full_name', e.target.value)}
              />
              <Field
                id="edit_email"
                type="email"
                label="Email (read-only)"
                icon={Mail}
                value={form.email}
                disabled
                hint="Managed by Auth"
              />
              <Field
                id="edit_phone"
                type="tel"
                label="Phone"
                icon={Phone}
                placeholder="+63 917 000 0000"
                autoComplete="tel"
                value={form.phone}
                disabled={saving}
                hint="Optional"
                onChange={(e) => setField('phone', e.target.value)}
              />
              <Field
                id="edit_employee_id"
                label="Employee ID *"
                icon={BadgeCheck}
                placeholder="EMP-001"
                value={form.employee_id}
                disabled={saving}
                error={errors.employee_id}
                hint={checkingId ? 'Checking availability…' : 'Must be unique'}
                onChange={(e) => setField('employee_id', e.target.value)}
              />
                            <Field
                id="edit_department"
                label="Department *"
                icon={Building2}
                placeholder="e.g., IT, HR, Sales"
                value={form.department}
                disabled={saving}
                error={errors.department}
                onChange={(e) => setField('department', e.target.value)}
              />
              <Field
                id="edit_position"
                label="Position *"
                icon={Briefcase}
                placeholder="Software Engineer"
                value={form.position}
                disabled={saving}
                error={errors.position}
                onChange={(e) => setField('position', e.target.value)}
              />
              <SelectField
                id="edit_role"
                label="Role"
                icon={ShieldCheck}
                value={form.role}
                disabled={saving}
                onChange={(v) => setField('role', v)}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-6">
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={saving}
                className={`${SECONDARY_BUTTON} flex items-center justify-center gap-2`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || checkingId}
                className={`${PRIMARY_BUTTON} flex items-center justify-center gap-2 sm:min-w-[12rem]`}
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {deactivateTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deactivate-employee-title"
        >
          <div
            className="absolute inset-0 bg-black/50 cursor-pointer"
            onClick={() => !deactivating && setDeactivateTarget(null)}
          />

          <div
            className={`relative ${CARD} w-full max-w-md p-6 sm:p-8`}
            style={{ boxShadow: CARD_SHADOW }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className={ICON_BADGE} style={{ backgroundColor: '#FEE9EB' }}>
                <UserX size={18} color="#DC2626" />
              </div>
              <div className="flex-1">
                <h2
                  id="deactivate-employee-title"
                  className="font-bold text-[#0F1E36] tracking-tight"
                >
                  Deactivate Employee
                </h2>
                <p className="text-xs text-[#64748B]">
                  This deactivates{' '}
                  {deactivateTarget.full_name || deactivateTarget.email}. They
                  will not be able to sign in to the mobile app until you
                  activate the account again. Their records are kept.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeactivateTarget(null)}
                disabled={deactivating}
                aria-label="Close"
                className="p-2 -mt-1 -mr-1 rounded-xl text-gray-400 hover:text-[#0F1E36] hover:bg-[#F8FAFD] transition disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            {deactivateError && (
              <div className="flex items-start gap-2 bg-[#FEE9EB] text-[#DC2626] text-sm rounded-2xl px-4 py-3 mb-4">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{deactivateError}</span>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeactivateTarget(null)}
                disabled={deactivating}
                className={`${SECONDARY_BUTTON} flex items-center justify-center gap-2`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={deactivating}
                className="bg-[#DC2626] text-white font-bold rounded-2xl py-4 px-6 shadow-[0_4px_12px_rgba(220,38,38,0.25)] hover:bg-[#B91C1C] active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:min-w-[10rem]"
              >
                {deactivating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Deactivating…
                  </>
                ) : (
                  'Deactivate'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}