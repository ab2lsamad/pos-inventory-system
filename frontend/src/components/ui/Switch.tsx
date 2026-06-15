'use client';

interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export default function Switch({ id, checked, onChange, label, disabled }: SwitchProps) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-3 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
    >
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/20 ${
          checked
            ? 'border-[var(--accent)] bg-[var(--accent)]'
            : 'border-slate-300 bg-slate-200'
        } ${disabled ? 'pointer-events-none' : ''}`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
      {label && (
        <span className="text-sm font-semibold text-[var(--text-secondary)]">{label}</span>
      )}
    </label>
  );
}
