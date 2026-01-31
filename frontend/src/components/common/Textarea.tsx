import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-[--color-text-secondary]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={clsx(
            'w-full rounded-md border bg-[--color-bg-secondary] px-3 py-2 text-sm text-[--color-text-primary]',
            'placeholder:text-[--color-text-muted]',
            'focus:outline-none focus:ring-2 focus:ring-[--color-primary-500] focus:ring-offset-1 focus:ring-offset-[--color-bg-primary]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'min-h-[100px] resize-y',
            error
              ? 'border-red-500 focus:ring-red-500'
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

Textarea.displayName = 'Textarea';
