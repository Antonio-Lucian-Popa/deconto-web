import { clsx } from 'clsx';
import { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
        )}
        <select
          ref={ref}
          className={clsx(
            'app-select w-full',
            className
          )}
          {...props}
        >
          {children}
        </select>
      </div>
    );
  }
);
Select.displayName = 'Select';
