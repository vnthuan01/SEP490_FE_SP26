// src/constants/roleRoutes.ts

import { UserRole, type UserRoleType } from '@/enums/UserRole';

export const roleRoutes: Record<UserRoleType, string> = {
  [UserRole.Admin]: '/portal/admin/dashboard',
  [UserRole.Coordinator]: '/portal/coordinator/dashboard',
  [UserRole.Manager]: '/portal/manager/stations',
  [UserRole.Volunteer]: '/login',
  [UserRole.User]: '/login',
};
