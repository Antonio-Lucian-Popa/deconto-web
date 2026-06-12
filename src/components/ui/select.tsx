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
          <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
        )}
        <select
          ref={ref}
          className={clsx(
            'w-full px-3 py-2 bg-[#262626] border border-white/10 rounded-lg text-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'appearance-none',
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
