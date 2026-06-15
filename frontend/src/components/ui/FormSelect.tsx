'use client';

import React from 'react';
import {
  type Control,
  type FieldValues,
  type Path,
  useController,
} from 'react-hook-form';
import Select from './Select';

type FormSelectProps<T extends FieldValues> = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'name' | 'defaultValue'
> & {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  options: { value: string; label: string }[];
};

export default function FormSelect<T extends FieldValues>({
  name,
  control,
  label,
  options,
  ...rest
}: FormSelectProps<T>) {
  const {
    field: { value, onChange, onBlur, ref },
    fieldState: { error },
  } = useController({ name, control });

  return (
    <Select
      {...rest}
      id={rest.id ?? name}
      ref={ref}
      label={label}
      options={options}
      value={value ?? ''}
      onChange={onChange}
      onBlur={onBlur}
      error={error?.message}
    />
  );
}
