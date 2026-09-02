import type { ReactNode } from 'react';

type Tone = 'default' | 'primary' | 'danger' | 'success';

interface Props {
  icon: ReactNode;
  label: string; // used for aria-label + tooltip
  onClick?: () => void;
  tone?: Tone;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

const toneClasses: Record<Tone, string> = {
  default: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
  primary: 'text-brand-600 hover:bg-brand-50 hover:text-brand-700',
  danger: 'text-slate-400 hover:bg-red-50 hover:text-red-600',
  success: 'text-green-600 hover:bg-green-50 hover:text-green-700',
};

/** An icon-only button with a hover tooltip. */
export default function IconButton({
  icon,
  label,
  onClick,
  tone = 'default',
  disabled,
  type = 'button',
}: Props) {
  return (
    <span className="group relative inline-flex">
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`rounded-lg p-2 transition active:scale-95 disabled:opacity-40 ${toneClasses[tone]}`}
      >
        {icon}
      </button>
      {/* Tooltip */}
      <span className="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
        {label}
      </span>
    </span>
  );
}
