'use client';

import React from 'react';
import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from 'react-hook-form';
import PhoneInput from './PhoneInput';

type PhoneFormFieldProps<T extends FieldValues> = {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  placeholder?: string;
};

export default function PhoneFormField<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
}: PhoneFormFieldProps<T>) {
  const {
    field: { value, onChange, onBlur, ref },
    fieldState: { error },
  } = useController({ name, control });

  return (
    <PhoneInput
      id={name}
      ref={ref}
      label={label}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={onChange}
      onBlur={onBlur}
      error={error?.message}
    />
  );
}
