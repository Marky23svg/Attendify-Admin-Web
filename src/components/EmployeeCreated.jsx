import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Check,
  Plus,
  ArrowLeft,
  Users,
  Mail,
  Lock,
  BadgeCheck,
  ShieldCheck,
} from 'lucide-react';
import { CARD_SHADOW, PRIMARY_BUTTON, SECONDARY_BUTTON } from '../lib/design';
import { copyToClipboard } from '../lib/format';

function CopyRow({ icon: Icon, label, value, isPassword }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (await copyToClipboard(value)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-[#F8FAFD] rounded-2xl px-4 py-3 border border-[#E8EDF5]">
      <Icon size={18} color="#9CA3AF" className="shrink-0" />

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-[#64748B] uppercase tracking-wide">
          {label}
        </p>
        <p
          className={`text-sm font-semibold text-[#0F1E36] truncate ${
            isPassword ? 'font-mono' : ''
          }`}
        >
          {value}
        </p>
      </div>

      <button
        onClick={handleCopy}
        aria-label={`Copy ${label}`}
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-white border border-[#E8EDF5] text-[#64748B] hover:text-[#0066FF] hover:border-[#0066FF] transition"
      >
        {copied ? (
          <Check size={16} color="#16834A" />
        ) : (
          <Copy size={16} />
        )}
      </button>
    </div>
  );
}

export default function EmployeeCreated({ result, onReset }) {
  const navigate = useNavigate();
  const [copiedAll, setCopiedAll] = useState(false);

  const credentialsText = [
    `Attendify employee account`,
    ``,
    `Email: ${result.email}`,
    `Temporary password: ${result.password}`,
    `Employee ID: ${result.employee_id}`,
    `Role: ${result.role}`,
    `Department: ${result.department}`,
    `Position: ${result.position}`,
  ].join('\n');

  const handleCopyAll = async () => {
    if (await copyToClipboard(credentialsText)) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className="bg-white rounded-3xl border border-[#E8EDF5] p-8 sm:p-10 text-center"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <div className="w-16 h-16 rounded-full bg-[#EAF8F0] flex items-center justify-center mx-auto">
          <CheckCircle2 size={32} color="#16834A" />
        </div>

        <h2 className="mt-5 text-2xl font-extrabold text-[#0F1E36] tracking-tight">
          Employee account created successfully
        </h2>
        <p className="mt-2 text-sm text-[#64748B]">
          Share these credentials with {result.full_name}. They can change the
          password after first login.
        </p>

        <div className="mt-7 text-left space-y-3">
          <CopyRow icon={Mail} label="Email" value={result.email} />
          <CopyRow
            icon={Lock}
            label="Temporary password"
            value={result.password}
            isPassword
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <CopyRow
              icon={BadgeCheck}
              label="Employee ID"
              value={result.employee_id}
            />
            <div className="flex items-center gap-3 bg-[#F8FAFD] rounded-2xl px-4 py-3 border border-[#E8EDF5]">
              <ShieldCheck size={18} color="#9CA3AF" className="shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-[#64748B] uppercase tracking-wide">
                  Role
                </p>
                <p className="text-sm font-semibold text-[#0F1E36] capitalize">
                  {result.role}
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleCopyAll}
          className={`${PRIMARY_BUTTON} w-full mt-5 flex items-center justify-center gap-2`}
        >
          {copiedAll ? <Check size={18} /> : <Copy size={18} />}
          {copiedAll ? 'Copied to clipboard' : 'Copy All Credentials'}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mt-6">
        <button
          onClick={onReset}
          className={`${SECONDARY_BUTTON} flex items-center justify-center gap-2`}
        >
          <Plus size={18} />
          Create Another Employee
        </button>

        <button
          onClick={() => navigate('/employees')}
          className={`${SECONDARY_BUTTON} flex items-center justify-center gap-2`}
        >
          <Users size={18} />
          Back to Employees
        </button>
      </div>

      <button
        onClick={() => navigate('/employees')}
        className="w-full mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-[#64748B] hover:text-[#0066FF] transition"
      >
        <ArrowLeft size={16} />
        Back to employee list
      </button>
    </div>
  );
}
