'use client';

import React from 'react';
import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from 'react-hook-form';
import Input from './Input';

type FormFieldProps<T extends FieldValues> = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'name' | 'defaultValue'
> & {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  icon?: React.ReactNode;
};

export default function FormField<T extends FieldValues>({
  name,
  control,
  label,
  icon,
  type,
  ...rest
}: FormFieldProps<T>) {
  const {
    field: { value, onChange, onBlur, ref },
    fieldState: { error },
  } = useController({ name, control });

  return (
    <Input
      {...rest}
      id={rest.id ?? name}
      ref={ref}
      label={label}
      icon={icon}
      type={type}
      value={value ?? ''}
      onChange={onChange}
      onBlur={onBlur}
      error={error?.message}
    />
  );
}
