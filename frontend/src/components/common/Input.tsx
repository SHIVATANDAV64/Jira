import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-[--color-text-secondary]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-lg border bg-[--color-bg-secondary] px-3.5 py-2.5 text-sm text-[--color-text-primary]',
            'placeholder:text-[--color-text-muted]',
            'transition-all duration-200 ease-out',
            'focus:outline-none focus:ring-2 focus:ring-[--color-primary-500]/50 focus:border-[--color-primary-500] focus:shadow-lg focus:shadow-[--color-primary-500]/10',
            'hover:border-[--color-border-secondary]',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[--color-border-primary]',
            error
              ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
              : 'border-[--color-border-primary]',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-[--color-text-muted]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
