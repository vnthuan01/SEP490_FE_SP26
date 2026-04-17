import { UserRole } from '@/enums/UserRole';
import LoginPage from '@/pages/auth/LoginPage';
import DataManagementPage from '@/pages/admin/DataManagementPage';
import AdminDashboardPage from '@/pages/admin/DashboardPage';
import DonationManagementPage from '@/pages/admin/DonationManagementPage';
import AdminUserManagementPage from '@/pages/admin/UserManagementPage';
import PublicDonatePage from '@/pages/public/PublicDonatePage';
import DonationStatusPage from '@/pages/public/DonationStatusPage';
import FundraisingCampaignListPage from '@/pages/public/FundraisingCampaignListPage';
import CoordinatorVolunteerRequestPage from '@/pages/coordinator/VolunteerRequestManagement';
import CoordinatorDashboardPage from '@/pages/coordinator/DashboardPage';
import CoordinatorRequestManagementPage from '@/pages/coordinator/RequestManagementPage';
import CoordinatorMapsPage from '@/pages/coordinator/TeamAllocationPage';
import CoordinatorTeamsPage from '@/pages/coordinator/TeamManagement';
import CoordinatorInventoryPage from '@/pages/coordinator/InventoryPage';
import CoordinatorVolunteerAllocationPage from '@/pages/coordinator/VolunteerAllocationPage';
import CoordinatorDataManagementPage from '@/pages/coordinator/DataManagementPage';
import ReliefStationPage from '@/pages/coordinator/ReliefStationPage';
import MissionTrackingPage from '@/pages/coordinator/MissionTrackingPage';
import DispatchPage from '@/pages/coordinator/DispatchPage';
import CoordinatorVehicleManagementPage from '@/pages/coordinator/CoordinatorVehicleManagementPage';
import SettingsPage from '@/pages/user/settings';

// Manager pages
import ManagerStationPage from '@/pages/manager/ManagerStationPage';
import ManagerDashboardPage from '@/pages/manager/ManagerDashboardPage';
import ManagerVehicleManagementPage from '@/pages/manager/ManagerVehicleManagementPage';
import ManagerInventoryCoordinationPage from '@/pages/manager/ManagerInventoryCoordinationPage';
import ManagerCampaignPage from '@/pages/manager/ManagerCampaignPage';

import type { AppRoute } from '@/types/routes';
import RoleBasedRoute from './protectedRoute';
import { Navigate } from 'react-router-dom';

export const routes: AppRoute[] = [
  //Authentication
  {
    path: '/',
    element: <RoleBasedRoute element={<Navigate to="/login" replace />} />,
  },
  { path: '/login', element: <RoleBasedRoute element={<LoginPage />} /> },
  { path: '/fundraising', element: <FundraisingCampaignListPage />, isProtected: false },
  { path: '/donate/:campaignId', element: <PublicDonatePage />, isProtected: false },
  { path: '/donate/status/:donationId', element: <DonationStatusPage />, isProtected: false },
  //Admin routes
  {
    path: '/portal/admin/dashboard',
    element: <AdminDashboardPage />,
    roles: [UserRole.Admin],
    isProtected: true,
  },
  {
    path: '/portal/admin/data-management',
    element: <DataManagementPage />,
    roles: [UserRole.Admin],
    isProtected: true,
  },
  {
    path: '/portal/admin/users',
    element: <AdminUserManagementPage />,
    roles: [UserRole.Admin],
    isProtected: true,
  },
  {
    path: '/portal/admin/donations',
    element: <DonationManagementPage />,
    roles: [UserRole.Admin],
    isProtected: true,
  },

  //Coordinator routes
  {
    path: '/portal/coordinator/dashboard',
    element: <CoordinatorDashboardPage />,
    roles: [UserRole.Coordinator],
    isProtected: true,
  },

  {
    path: '/portal/coordinator/maps',
    element: <CoordinatorMapsPage />,
    roles: [UserRole.Coordinator],
    isProtected: true,
  },
  {
    path: '/portal/coordinator/teams',
    element: <CoordinatorTeamsPage />,
    roles: [UserRole.Coordinator],
    isProtected: true,
  },
  {
    path: '/portal/coordinator/inventory',
    element: <CoordinatorInventoryPage />,
    roles: [UserRole.Coordinator],
    isProtected: true,
  },
  {
    path: '/portal/coordinator/requests',
    element: <CoordinatorRequestManagementPage />,
    roles: [UserRole.Coordinator],
    isProtected: true,
  },

  {
    path: '/portal/coordinator/volunteer-requests',
    element: <CoordinatorVolunteerRequestPage />,
    roles: [UserRole.Coordinator],
    isProtected: true,
  },
  {
    path: '/portal/coordinator/data-management',
    element: <CoordinatorDataManagementPage />,
    roles: [UserRole.Coordinator],
    isProtected: true,
  },
  {
    path: '/portal/coordinator/volunteer-allocation',
    element: <CoordinatorVolunteerAllocationPage />,
    roles: [UserRole.Coordinator],
    isProtected: true,
  },
  {
    path: '/portal/coordinator/relief-station',
    element: <ReliefStationPage />,
    roles: [UserRole.Coordinator],
    isProtected: true,
  },
  {
    path: '/portal/coordinator/mission-tracking',
    element: <MissionTrackingPage />,
    roles: [UserRole.Coordinator],
    isProtected: true,
  },
  {
    path: '/portal/coordinator/dispatch',
    element: <DispatchPage />,
    roles: [UserRole.Coordinator],
    isProtected: true,
  },
  {
    path: '/portal/coordinator/vehicles',
    element: <CoordinatorVehicleManagementPage />,
    roles: [UserRole.Coordinator],
    isProtected: true,
  },

  // Manager routes
  {
    path: '/portal/manager/dashboard',
    element: <ManagerDashboardPage />,
    roles: [UserRole.Manager],
    isProtected: true,
  },
  {
    path: '/portal/manager/stations',
    element: <ManagerStationPage />,
    roles: [UserRole.Manager],
    isProtected: true,
  },
  {
    path: '/portal/manager/vehicles',
    element: <ManagerVehicleManagementPage />,
    roles: [UserRole.Manager],
    isProtected: true,
  },
  {
    path: '/portal/manager/inventory',
    element: <ManagerInventoryCoordinationPage />,
    roles: [UserRole.Manager],
    isProtected: true,
  },
  {
    path: '/portal/manager/campaigns',
    element: <ManagerCampaignPage />,
    roles: [UserRole.Manager],
    isProtected: true,
  },

  // Shared portal routes (all authenticated roles)
  {
    path: '/portal/settings',
    element: <SettingsPage />,
    roles: [UserRole.Admin, UserRole.Coordinator, UserRole.Manager],
    isProtected: true,
  },
];
