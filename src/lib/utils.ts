import { type UserRoleType } from '@/enums/UserRole';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind class names, resolving any conflicts.
 *
 * @param inputs - An array of class names to merge.
 * @returns A string of merged and optimized class names.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const formatCurrencyVND = (value: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0, // không hiển thị phần thập phân
  }).format(value);
};

// Format tiền VND rút gọn (dùng cho chart axis, small UI)
export const formatCurrencyVNDSHORT = (value: number): string => {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B'; // Tỷ
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(0) + 'M'; // Triệu
  if (value >= 1_000) return (value / 1_000).toFixed(0) + 'K'; // Ngàn
  return value.toString();
};

export const formatNumberVN = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '0';

  const numericValue =
    typeof value === 'number' ? value : Number(String(value).replace(/[.,\s]/g, ''));

  if (!Number.isFinite(numericValue)) return '0';

  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(numericValue);
};

export const normalizeNumberInput = (value: string): string => value.replace(/\D/g, '');

export const formatNumberInputVN = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';

  const normalized = normalizeNumberInput(String(value));
  if (!normalized) return '';

  return formatNumberVN(normalized);
};

export const parseFormattedNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const normalized = normalizeNumberInput(value);
  return normalized ? Number(normalized) : 0;
};

//Local time
export function getDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// helper/formatDateTime.ts
export function toDateOnly(date: Date): string {
  // trả về "YYYY-MM-DD"
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toTimeOnly(date: Date): string {
  // trả về "HH:mm:ss.fffffff"
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const fraction = '0000000'; // luôn 7 số 0 như TimeOnly yêu cầu
  return `${hours}:${minutes}:${seconds}.${fraction}`;
}

import { roleRoutes } from '@/constants/roleRoutes';

export function getHomeByRole(role?: UserRoleType) {
  if (role && roleRoutes[role]) {
    return roleRoutes[role];
  }
  return '/login';
}
