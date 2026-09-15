import * as React from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(event.target.checked);
      if (onChange) {
        onChange(event);
      }
    };

    return (
      <input
        type="checkbox"
        ref={ref}
        className={`h-4 w-4 rounded border border-input bg-background text-primary shadow-sm outline-none transition-all duration-150 focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        onChange={handleChange}
        {...props}
      />
    );
  },
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
