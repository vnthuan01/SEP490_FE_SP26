// src/enums/UserRole.ts
export const UserRole = {
  Admin: 'Admin',
  Coordinator: 'Moderator',
  Manager: 'Manager',
  Volunteer: 'Volunteer',
  User: 'User',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];
