// src/constants/roleVariant.ts
import { UserRole } from '@/enums/UserRole';

export const roleVariantMap = {
  [UserRole.Admin]: 'primary',
  [UserRole.Coordinator]: 'supporter',
  [UserRole.Manager]: 'warning',
  [UserRole.Volunteer]: 'success',
  [UserRole.User]: 'secondary',
} as const;
