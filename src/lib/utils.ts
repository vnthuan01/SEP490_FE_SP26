import { UserRole, type UserRoleType } from '@/enums/UserRole';
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

export function getHomeByRole(role?: UserRoleType) {
  switch (role) {
    case UserRole.Admin:
      return '/portal/admin/dashboard';

    case UserRole.Coordinator:
      return '/portal/coordinator/dashboard';

    default:
      return '/login';
  }
}
