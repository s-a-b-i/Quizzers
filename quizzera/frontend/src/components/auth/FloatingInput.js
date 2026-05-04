'use client';

import { useState } from 'react';

export function FloatingInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  autoComplete,
  error,
  rightAdornment,
  inputClassName = '',
}) {
  const [focused, setFocused] = useState(false);
  const floated = focused || (value && String(value).length > 0);

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          required
          placeholder=" "
          className={`h-[52px] w-full rounded-full border border-border bg-background text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none transition-[border-color,box-shadow] placeholder:text-transparent focus:border-primary focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_0_0_3px_rgba(17,17,17,0.06)] focus:ring-0 focus:ring-offset-0 ${rightAdornment ? 'pl-5 pr-12' : 'px-5'} pt-5 text-sm focus:outline-none ${inputClassName}`}
          style={{ fontSize: '14px' }}
        />
        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-5 transition-all duration-200 ease-out ${
            floated
              ? 'top-2 translate-y-0 text-[11px] text-secondary'
              : 'top-1/2 -translate-y-1/2 text-sm text-tertiary'
          }`}
        >
          {label}
        </label>
        {rightAdornment ? (
          <div className="absolute right-0 top-0 flex h-[52px] items-center pr-3">{rightAdornment}</div>
        ) : null}
      </div>
      {error ? (
        <p className="animate-fade-in mt-1.5 text-xs leading-snug text-primary">{error}</p>
      ) : null}
    </div>
  );
}
