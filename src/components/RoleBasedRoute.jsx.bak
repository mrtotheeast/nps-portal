import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { hasAccessToPage, getDashboardForRole } from '@/lib/rbac';
import { useDualView } from '@/context/DualViewContext';
import { toast } from 'sonner';

// Pages that are management-only — employees in dual-view (employee mode) cannot access these
const MANAGEMENT_ONLY_PAGES = new Set([
  'SupervisorDashboard', 'ManagerDashboard', 'SupervisorMore', 'ManagerMore',
  'IncidentApproval', 'TimesheetsManagement', 'TimesheetSummaryDashboard',
  'PTOApproval', 'PTOApprovalDashboard', 'SiteCheckInManagement',
  'EmployeeDirectory', 'EmployeeProfile', 'NewEmployee',
  'PerformanceReviews', 'PerformanceReviewList',
  'TrainingAssignments', 'TrainingBuilder', 'AITrainingBuilder',
  'GPSViolations', 'PatrolReview', 'PatrolPlayback', 'PatrolAnalytics',
  'LiveMap', 'Scheduling', 'Reports', 'ReportingDashboard',
  'SiteManagement', 'SiteDetails', 'SiteCheckInManagement',
  'BulkEmployeeActions', 'Onboarding', 'OnboardingManagement', 'UserManagement',
  'AdminDashboard', 'AdminMore', 'AdminAnalyticsDashboard', 'AnalyticsDashboard',
  'TeamAssignments', 'OfficerAnalytics', 'WeeklySiteReports',
]);

export default function RoleBasedRoute({ pageName, allowedRoles, children }) {
  const { user, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  // user.role is fully resolved by AuthContext (super_admin is never downgraded)
  const userRole = user?.role || 'employee';
  const { activeView } = useDualView();

  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user && !isLoadingAuth) return <Navigate to="/Login" replace />;

  // Hard block: non-admin roles cannot access AdminDashboard regardless of RBAC config
  const ADMIN_ONLY_PAGES = new Set(['AdminDashboard', 'AdminMore', 'AdminAnalyticsDashboard', 'SuperAdminDashboard']);
  if (ADMIN_ONLY_PAGES.has(pageName) && !['admin', 'super_admin'].includes(userRole)) {
    return <AccessDenied userRole={userRole} />;
  }

  // Dual-view check: supervisor or manager in employee view trying to access management pages
  const isDualRoleUser = userRole === 'supervisor' || userRole === 'manager';
  if (isDualRoleUser && activeView === 'employee' && pageName && MANAGEMENT_ONLY_PAGES.has(pageName)) {
    return <ViewMismatchDenied userRole={userRole} />;
  }

  // Check allowedRoles list
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <AccessDenied userRole={userRole} />;
  }

  // Check RBAC page permissions
  if (pageName && !hasAccessToPage(userRole, pageName)) {
    return <AccessDenied userRole={userRole} />;
  }

  return children;
}

function AccessDenied({ userRole }) {
  const dashboard = getDashboardForRole(userRole);
  useEffect(() => {
    toast.error("You don't have permission to access this page.");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Navigate to={`/${dashboard}`} replace />;
}

function ViewMismatchDenied({ userRole }) {
  const dashboard = userRole === 'manager' ? '/EmployeeHome' : '/EmployeeHome';
  useEffect(() => {
    toast.error("You are currently in Employee View. Switch to " + (userRole === 'manager' ? 'Manager' : 'Supervisor') + " View to access this page.");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Navigate to={dashboard} replace />;
}