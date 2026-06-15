'use client';

import React, { forwardRef } from 'react';
import Input from './Input';

type PhoneInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  error?: string;
};

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = e.target.value
        .replace(/[^\d+]/g, '')
        .replace(/(?!^)\+/g, '')
        .slice(0, 16);

      const synthetic = Object.assign({}, e, {
        target: Object.assign({}, e.target, { value: sanitized }),
      });

      onChange?.(synthetic as React.ChangeEvent<HTMLInputElement>);
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        onChange={handleChange}
      />
    );
  },
);

PhoneInput.displayName = 'PhoneInput';

export default PhoneInput;
