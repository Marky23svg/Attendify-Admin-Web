import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, BadgeCheck, Building2, Briefcase,
  Lock, Eye, EyeOff, Sparkles, ArrowLeft, Info,
  ChevronDown, AlertCircle, ShieldCheck, Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/useAuth';
import Field from '../components/Field';
import EmployeeCreated from '../components/EmployeeCreated';
import {
  CARD_SHADOW, CARD, PRIMARY_BUTTON, SECONDARY_BUTTON, ICON_BADGE,
} from '../lib/design';
import { generatePassword } from '../lib/format';
import { DEPARTMENTS, ROLES, MIN_PASSWORD_LENGTH } from '../lib/constants';

const CREATE_USER_ENDPOINT =
  'https://zdhyrsbwdpzvnivziyzx.supabase.co/functions/v1/create-user';

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const EMPTY_FORM = {
  full_name: '', email: '', phone: '', employee_id: '',
  department: '', position: '', role: 'employee', password: '',
};

function SectionCard({ icon: Icon, title, subtitle, children }) {
  return (
    <section className={`${CARD} p-6 sm:p-8`} style={{ boxShadow: CARD_SHADOW }}>
      <div className="flex items-center gap-3 mb-6">
        <div className={ICON_BADGE} style={{ backgroundColor: '#EAF2FF' }}>
          <Icon size={18} color="#0066FF" />
        </div>
        <div>
          <h2 className="font-bold text-[#0F1E36] tracking-tight">{title}</h2>
          <p className="text-xs text-[#64748B]">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function SelectField({ id, label, icon: Icon, value, error, onChange, disabled, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-[#64748B] text-xs font-semibold mb-2">
        {label}
      </label>
      <div className={`flex items-center bg-white rounded-2xl px-4 border transition ${
        error ? 'border-[#DC2626]' : 'border-[#E8EDF5] focus-within:border-[#0066FF] focus-within:ring-2 focus-within:ring-[#0066FF]/20'
      }`}>
        <Icon size={18} color="#9CA3AF" className="shrink-0" />
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 py-3.5 ml-3 bg-transparent text-sm text-[#0F1E36] outline-none cursor-pointer w-full min-w-0"
        >
          {children}
        </select>
        <ChevronDown size={16} color="#9CA3AF" className="shrink-0" />
      </div>
      {error && (
        <p className="flex items-center gap-1 text-[#DC2626] text-xs mt-1.5">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

export default function AddEmployee() {
  const navigate = useNavigate();
  const { profile: adminProfile } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingId, setCheckingId] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState(null);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const isEmployeeIdTaken = async (employeeId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('employee_id', employeeId.trim())
      .limit(1);
    if (error) throw error;
    return data.length > 0;
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
    if (!form.password) next.password = 'Password is required';
    else if (form.password.length < MIN_PASSWORD_LENGTH)
      next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters`;

    if (!next.employee_id) {
      setCheckingId(true);
      try {
        if (await isEmployeeIdTaken(form.employee_id))
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

  const handleSubmit = async (e) => {
  e.preventDefault();
  setBanner(null);
  if (!(await validate())) return;
  setSubmitting(true);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setBanner('You are not signed in. Please log in again.');
      setSubmitting(false);
      return;
    }

    console.log('=== CREATE USER DEBUG ===');
    console.log('URL:', CREATE_USER_ENDPOINT);
    console.log('Token length:', session.access_token?.length);
    console.log(
      'API key length:',
      SUPABASE_PUBLISHABLE_KEY?.length
    );

    const response = await fetch(CREATE_USER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        employee_id: form.employee_id.trim(),
        department: form.department,
        position: form.position.trim(),
        phone: form.phone.trim() || null,
        role: form.role,
      }),
    });

    console.log('Response status:', response.status);

    const text = await response.text();
    console.log('Raw response:', text);

    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: `Unexpected response: ${text.substring(0, 100)}` };
      }
    }

    if (!response.ok) {
      setBanner(
        /already/i.test(data.error || '')
          ? 'An account with that email already exists.'
          : data.error || `Server returned ${response.status}`
      );
      setSubmitting(false);
      return;
    }

    setResult({
      email: form.email.trim(),
      password: form.password,
      employee_id: form.employee_id.trim(),
      role: form.role,
      department: form.department,
      position: form.position.trim(),
      full_name: form.full_name.trim(),
    });
    setSubmitting(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    console.error('=== FETCH ERROR ===');
    console.error('Error:', err);
    setBanner(`${err.name}: ${err.message} — URL: ${CREATE_USER_ENDPOINT}`);
    setSubmitting(false);
  }
};

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setBanner(null);
    setShowPassword(false);
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (result) {
    return (
      <div className="py-6">
        <EmployeeCreated result={result} onReset={handleReset} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/employees')}
        className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#0066FF] transition mb-4"
      >
        <ArrowLeft size={16} /> Back to Employees
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[#0F1E36] tracking-tight">Add Employee</h2>
        <p className="text-sm text-[#64748B] mt-1">Create a new employee account for Attendify</p>
      </div>

      {banner && (
        <div className="flex items-start gap-2 bg-[#FEE9EB] text-[#DC2626] text-sm rounded-2xl px-4 py-3 mb-6">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{banner}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <SectionCard icon={User} title="Personal Information" subtitle="Basic contact details for the employee">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="full_name" label="Full Name *" icon={User} placeholder="Juan Dela Cruz"
              autoComplete="name" value={form.full_name} disabled={submitting}
              error={errors.full_name} onChange={(e) => setField('full_name', e.target.value)} />
            <Field id="email" type="email" label="Email *" icon={Mail} placeholder="juan@company.com"
              autoComplete="email" value={form.email} disabled={submitting}
              error={errors.email} onChange={(e) => setField('email', e.target.value)} />
            <Field id="phone" type="tel" label="Phone" icon={Phone} placeholder="+63 917 000 0000"
              autoComplete="tel" value={form.phone} disabled={submitting} hint="Optional"
              onChange={(e) => setField('phone', e.target.value)} />
          </div>
        </SectionCard>

        <SectionCard icon={Briefcase} title="Work Information" subtitle="Department, role and employee identifier">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="employee_id" label="Employee ID *" icon={BadgeCheck} placeholder="EMP-001"
              value={form.employee_id} disabled={submitting} error={errors.employee_id}
              hint={checkingId ? 'Checking availability…' : 'Must be unique'}
              onChange={(e) => setField('employee_id', e.target.value)} />
            <SelectField id="department" label="Department *" icon={Building2}
              value={form.department} disabled={submitting} error={errors.department}
              onChange={(v) => setField('department', v)}>
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => (<option key={d} value={d}>{d}</option>))}
            </SelectField>
            <Field id="position" label="Position *" icon={Briefcase} placeholder="Software Engineer"
              value={form.position} disabled={submitting} error={errors.position}
              onChange={(e) => setField('position', e.target.value)} />
            <SelectField id="role" label="Role" icon={ShieldCheck} value={form.role}
              disabled={submitting} onChange={(v) => setField('role', v)}>
              {ROLES.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
            </SelectField>
          </div>
        </SectionCard>

        <SectionCard icon={Lock} title="Account Setup" subtitle="Temporary sign-in credentials">
          <Field id="password" type={showPassword ? 'text' : 'password'}
            label="Temporary Password *" icon={Lock} placeholder="At least 8 characters"
            autoComplete="new-password" value={form.password} disabled={submitting}
            error={errors.password} hint={`Minimum ${MIN_PASSWORD_LENGTH} characters`}
            onChange={(e) => setField('password', e.target.value)}
            trailing={
              <div className="flex items-center gap-1 -mr-1">
                <button type="button" disabled={submitting}
                  onClick={() => setField('password', generatePassword())}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#0066FF] bg-[#EAF2FF] rounded-lg px-3 py-1.5 hover:bg-[#DCE9FF] transition disabled:opacity-50">
                  <Sparkles size={14} /> Generate
                </button>
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="text-gray-400 hover:text-[#0F1E36] transition pl-1">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            } />
          <div className="flex items-start gap-2 bg-[#EAF2FF] text-[#0F1E36] text-xs rounded-2xl px-4 py-3 mt-4">
            <Info size={15} className="shrink-0 mt-0.5 text-[#0066FF]" />
            <span>Share these credentials with the employee. They can change the password after first login.</span>
          </div>
        </SectionCard>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2 pb-6">
          <button type="button" onClick={() => navigate('/employees')} disabled={submitting}
            className={`${SECONDARY_BUTTON} flex items-center justify-center gap-2`}>
            Cancel
          </button>
          <button type="submit" disabled={submitting || checkingId}
            className={`${PRIMARY_BUTTON} flex items-center justify-center gap-2 sm:min-w-[13rem]`}>
            {submitting ? (<><Loader2 size={18} className="animate-spin" /> Creating account…</>) :
              (<><ShieldCheck size={18} /> Create Account</>)}
          </button>
        </div>
      </form>

      {adminProfile && (
        <p className="text-xs text-gray-400 text-center pb-6">
          Creating as {adminProfile.email}
        </p>
      )}
    </div>
  );
}