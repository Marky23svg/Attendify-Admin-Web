import { AlertCircle } from 'lucide-react';

export default function Field({
  id,
  label,
  icon: Icon,
  trailing,
  error,
  hint,
  className = '',
  ...inputProps
}) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block text-[#64748B] text-xs font-semibold mb-2"
        >
          {label}
        </label>
      )}

      <div
        className={`flex items-center bg-white rounded-2xl px-4 border transition ${
          error
            ? 'border-[#DC2626]'
            : 'border-[#E8EDF5] focus-within:border-[#0066FF] focus-within:ring-2 focus-within:ring-[#0066FF]/20'
        } ${inputProps.disabled ? 'opacity-50' : ''}`}
      >
        {Icon && <Icon size={18} color="#9CA3AF" className="shrink-0" />}

        <input
          id={id}
          className={`flex-1 py-3.5 ml-3 bg-transparent text-[#0F1E36] text-sm outline-none placeholder-gray-400 w-full min-w-0 ${
            Icon ? '' : 'ml-0'
          }`}
          {...inputProps}
        />

        {trailing}
      </div>

      {error ? (
        <p className="flex items-center gap-1 text-[#DC2626] text-xs mt-1.5">
          <AlertCircle size={12} />
          {error}
        </p>
      ) : (
        hint && <p className="text-[#64748B] text-xs mt-1.5">{hint}</p>
      )}
    </div>
  );
}
