import type { Store } from './store';
import { Role } from './shared';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  storeId?: string;
  isActive: boolean;
  baseSalary: number | string;
  commissionPercent: number;
  compensationStartDate?: string | null;
  isCompensationEnabled: boolean;
  store?: Store;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateUserDto {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role?: Role;
  storeId?: string;
  isActive?: boolean;
  baseSalary?: number;
  commissionPercent?: number;
  compensationStartDate?: string;
  isCompensationEnabled?: boolean;
}

export interface UpdateUserDto {
  fullName?: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: Role;
  storeId?: string;
  isActive?: boolean;
  baseSalary?: number;
  commissionPercent?: number;
  compensationStartDate?: string;
  isCompensationEnabled?: boolean;
}

export type { UserFormData, PasswordFormData } from '@/schemas/user';
