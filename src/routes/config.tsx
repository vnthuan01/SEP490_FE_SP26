import { UserRole } from '@/enums/UserRole';
import LoginPage from '@/pages/auth/LoginPage';
import DataManagementPage from '@/pages/admin/DataManagementPage';
import AdminDashboardPage from '@/pages/admin/DashboardPage';
import AdminUserManagementPage from '@/pages/admin/UserManagementPage';
import CoordinatorVolunteerRequestPage from '@/pages/coordinator/VolunteerRequestManagement';
import CoordinatorDashboardPage from '@/pages/coordinator/DashboardPage';
import CoordinatorRequestManagementPage from '@/pages/coordinator/RequestManagementPage';
import CoordinatorMapsPage from '@/pages/coordinator/TeamAllocationPage';
import CoordinatorTeamsPage from '@/pages/coordinator/TeamManagement';
import CoordinatorInventoryPage from '@/pages/coordinator/InventoryPage';
import CoordinatorVolunteerAllocationPage from '@/pages/coordinator/VolunteerAllocationPage';
import type { AppRoute } from '@/types/routes';
import RoleBasedRoute from './protectedRoute';
import { Navigate } from 'react-router-dom';
import CoordinatorDataManagementPage from '@/pages/coordinator/DataManagementPage';

export const routes: AppRoute[] = [
  //Authentication
  {
    path: '/',
    element: <RoleBasedRoute element={<Navigate to="/login" replace />} />,
  },
  { path: '/login', element: <LoginPage />, isProtected: false },
  //Admin routes
  {
    path: '/portal/admin/dashboard',
    element: <AdminDashboardPage />,
    roles: [UserRole.Admin],
    isProtected: false,
  },
  {
    path: '/portal/admin/data-management',
    element: <DataManagementPage />,
    roles: [UserRole.Admin],
    isProtected: false,
  },
  {
    path: '/portal/admin/users',
    element: <AdminUserManagementPage />,
    roles: [UserRole.Admin],
    isProtected: false,
  },

  //Coordinator routes
  {
    path: '/portal/coordinator/dashboard',
    element: <CoordinatorDashboardPage />,
    roles: [UserRole.Coordinator],
    isProtected: false,
  },

  {
    path: '/portal/coordinator/maps',
    element: <CoordinatorMapsPage />,
    roles: [UserRole.Coordinator],
    isProtected: false,
  },
  {
    path: '/portal/coordinator/teams',
    element: <CoordinatorTeamsPage />,
    roles: [UserRole.Coordinator],
    isProtected: false,
  },
  {
    path: '/portal/coordinator/inventory',
    element: <CoordinatorInventoryPage />,
    roles: [UserRole.Coordinator],
    isProtected: false,
  },
  {
    path: '/portal/coordinator/requests',
    element: <CoordinatorRequestManagementPage />,
    roles: [UserRole.Coordinator],
    isProtected: false,
  },
  {
    path: '/portal/coordinator/volunteer-requests',
    element: <CoordinatorVolunteerRequestPage />,
    roles: [UserRole.Coordinator],
    isProtected: false,
  },
  {
    path: '/portal/coordinator/data-management',
    element: <CoordinatorDataManagementPage />,
    roles: [UserRole.Coordinator],
    isProtected: false,
  },
  {
    path: '/portal/coordinator/volunteer-allocation',
    element: <CoordinatorVolunteerAllocationPage />,
    roles: [UserRole.Coordinator],
    isProtected: false,
  },
];
