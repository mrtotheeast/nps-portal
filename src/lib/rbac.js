// Role-Based Access Control configuration

// Pages accessible by ALL authenticated roles
const COMMON_PAGES = [
  'Profile', 'Notifications', 'NotificationPreferences', 'Chat', 'Help',
  'UserPreferences', 'LanguageSettings', 'Settings', 'Accessibility',
];

const ROLE_PERMISSIONS = {
  super_admin: {
    label: 'Super Admin',
    dashboard: 'AdminDashboard',
    allowedPages: ['*'], // Super admin has access to everything
  },
  admin: {
    label: 'Admin',
    dashboard: 'AdminDashboard',
    allowedPages: [
      ...COMMON_PAGES,
      'AdminDashboard', 'AdminMore', 'AdminAnalyticsDashboard', 'AnalyticsDashboard', 'AdminDMMonitor',
      'EmployeeDirectory', 'NewEmployee', 'EmployeeProfile', 'Schedule', 'Scheduling', 'Payroll', 'PayrollIntegration',
      'PayrollExport', 'Invoices', 'InvoiceCreate', 'InvoiceDetail', 'InvoiceSettings', 'InvoicesAdmin',
      'ClientManagement', 'ClientDetails', 'ClientContracts', 'ClientCommunicationHub', 'ClientOnboarding',
      'SiteManagement', 'SiteDetails', 'SiteCheckInManagement', 'SiteQRManagement', 'SiteCheckIn', 'SiteCheckInUser',
      'SiteInspections', 'SiteInspectionForm',
      'IncidentManagement', 'IncidentApproval', 'IncidentReports', 'IncidentForm', 'IncidentFormAI',
      'IncidentAnalysis', 'AIIncidentAnalysis',
      'TrainingBuilder', 'TrainingAssignments', 'Training', 'MyTrainings', 'AITrainingBuilder',
      'TrainingLeaderboard', 'TrainingSuggestions', 'TrainingGeneratorAI', 'CertificateTemplates', 'BadgeManagement',
      'AuditLog', 'RoleAudit', 'ArchivedRecords',
      'Announcements', 'DocumentAdmin', 'DocumentManagement', 'Documents', 'DocumentLibrary', 'OnboardingDocuments', 'OnboardingTask', 'PolicyManagement',
      'Reports', 'ReportingDashboard', 'ReportAutomation', 'AIReports', 'AIReportsNew', 'WeeklySiteReports', 'MonthlySiteReport', 'CCWReciprocityMap',
      'UserManagement', 'InviteUser', 'PendingInvites', 'Onboarding', 'OnboardingManagement', 'BulkEmployeeActions', 'ProfilePhotoApproval',
      'Credentials', 'CredentialsManagement', 'CredentialsDashboard',
      'StateLicensing', 'RolesPermissions', 'CompanySettings', 'TimekeepingSecuritySettings', 'DataImport',
      'PTOCalendar', 'PTOApproval', 'PTOSettings', 'PTORequest',
      'LiveMap', 'GPSViolations', 'PatrolReview', 'PatrolAnalytics', 'PatrolHistory', 'PatrolPlayback', 'DeletedPatrolsReport',
      'PerformanceReviews', 'PerformanceReviewList', 'RecognitionSystem', 'RecognitionLeaderboard',
      'UniformInventory', 'PositionManagement', 'TaxForms', 'AccountingDashboard',
      'OfficerAnalytics', 'OfficerDashboard', 'EmployeeDashboard',
      'RoleWorkspaceAdmin', 'RoleWorkspaceView',
      'ShiftBidding', 'TimesheetsManagement', 'TimesheetSummaryDashboard',
      'NewEmployee', 'EmployeeAvailabilitySettings', 'EmployeeImportSettings',
      'PayrollSettings', 'ServiceCoverageMap', 'IncidentSummaryReport',
      'StateLicensingSettings', 'IncidentSummaryReport',
    ]
  },
  supervisor: {
    label: 'Supervisor',
    dashboard: 'SupervisorDashboard',
    allowedPages: [
      ...COMMON_PAGES,
      'EmployeeHome', 'EmployeeMore', 'SupervisorDashboard', 'SupervisorMore', 'Schedule', 'LiveMap', 'GPSViolations', 'PatrolReview',
      'PatrolHistory', 'PatrolPlayback', 'IncidentApproval', 'IncidentReports', 'IncidentFormAI', 'IncidentForm',
      'SiteCheckInManagement', 'SiteCheckIn', 'SiteDetails', 'EmployeeDirectory', 'EmployeeProfile', 'Announcements',
      'Reports', 'WeeklySiteReports', 'Training', 'TrainingAssignments', 'TrainingLeaderboard', 'Credentials', 'CredentialsDashboard', 'Timesheet',
      'TimesheetsManagement', 'TimesheetSummaryDashboard', 'PTOApproval', 'PTOCalendar',
      'SiteInspections', 'SiteInspectionForm', 'RecognitionLeaderboard', 'MonthlySiteReport', 'PerformanceReviews', 'PerformanceReviewList',
      'Documents', 'DocumentLibrary', 'OnboardingDocuments', 'CCWReciprocityMap',
      'Scheduling', 'NewEmployee',
    ]
  },
  employee: {
    label: 'Employee',
    dashboard: 'EmployeeDashboard',
    allowedPages: [
      ...COMMON_PAGES,
      'EmployeeDashboard', 'EmployeeHome', 'EmployeeMore', 'Schedule', 'Patrol', 'SiteCheckIn', 'SiteCheckInUser', 'Timesheet',
      'IncidentForm', 'IncidentFormAI', 'IncidentReports', 'MyTrainings', 'Training',
      'PTORequest', 'PTOCalendar', 'Documents', 'DocumentLibrary', 'OnboardingDocuments', 'OnboardingTask',
      'Credentials', 'CredentialsDashboard', 'ShiftBidding', 'RecognitionLeaderboard',
      'EmployeeAvailabilitySettings', 'PatrolHistory',
      'Announcements', 'OfficerAnalytics', 'Payroll', 'CCWReciprocityMap',
    ]
  },
  officer: {
    label: 'Officer',
    dashboard: 'EmployeeDashboard',
    allowedPages: [
      ...COMMON_PAGES,
      'EmployeeDashboard', 'OfficerDashboard', 'EmployeeMore', 'Schedule', 'Patrol', 'SiteCheckIn', 'SiteCheckInUser', 'Timesheet',
      'IncidentForm', 'IncidentFormAI', 'IncidentReports', 'MyTrainings', 'Training',
      'PTORequest', 'PTOCalendar', 'Documents', 'DocumentLibrary', 'OnboardingDocuments',
      'Credentials', 'CredentialsDashboard', 'ShiftBidding', 'RecognitionLeaderboard',
      'SiteInspections', 'SiteInspectionForm', 'EmployeeAvailabilitySettings', 'PatrolHistory',
      'Announcements', 'OfficerAnalytics', 'Payroll', 'OnboardingTask', 'CCWReciprocityMap',
    ]
  },
  manager: {
    label: 'Manager',
    dashboard: 'ManagerDashboard',
    allowedPages: [
      ...COMMON_PAGES,
      // Manager sees operational data but NOT billing, company settings, or super admin tools
      'EmployeeHome', 'EmployeeMore', 'ManagerDashboard', 'ManagerMore',
      'EmployeeDirectory', 'NewEmployee', 'EmployeeProfile', 'Schedule', 'Scheduling',
      'ClientManagement', 'ClientDetails', 'ClientContracts', 'ClientCommunicationHub',
      'SiteManagement', 'SiteDetails', 'SiteCheckInManagement', 'SiteQRManagement', 'SiteCheckIn', 'SiteCheckInUser',
      'SiteInspections', 'SiteInspectionForm',
      'IncidentManagement', 'IncidentApproval', 'IncidentReports', 'IncidentForm', 'IncidentFormAI', 'IncidentAnalysis',
      'TrainingBuilder', 'TrainingAssignments', 'Training', 'MyTrainings',
      'TrainingLeaderboard', 'TrainingSuggestions', 'CertificateTemplates', 'BadgeManagement',
      'AuditLog',
      'Announcements', 'Documents', 'DocumentLibrary', 'OnboardingDocuments', 'OnboardingTask', 'PolicyManagement',
      'Reports', 'ReportingDashboard', 'WeeklySiteReports', 'MonthlySiteReport', 'CCWReciprocityMap', 'IncidentSummaryReport',
      'UserManagement', 'InviteUser', 'PendingInvites', 'Onboarding', 'ProfilePhotoApproval',
      'Credentials', 'CredentialsManagement', 'CredentialsDashboard',
      'StateLicensing', 'TimekeepingSecuritySettings',
      'PTOCalendar', 'PTOApproval', 'PTOSettings', 'PTORequest',
      'LiveMap', 'GPSViolations', 'PatrolReview', 'PatrolAnalytics', 'PatrolHistory', 'PatrolPlayback',
      'PerformanceReviews', 'PerformanceReviewList', 'RecognitionSystem', 'RecognitionLeaderboard',
      'UniformInventory', 'PositionManagement',
      'OfficerAnalytics', 'OfficerDashboard', 'EmployeeDashboard',
      'ShiftBidding', 'TimesheetsManagement', 'TimesheetSummaryDashboard',
      'EmployeeAvailabilitySettings', 'ServiceCoverageMap',
    ]
  },
  client: {
    label: 'Client',
    dashboard: 'ClientDashboard',
    allowedPages: [
      ...COMMON_PAGES,
      'ClientPortal', 'ClientDashboard', 'ClientSecureDashboard', 'ClientMore', 'ClientSiteMap', 'ClientSiteSettings',
      'ClientSchedule', 'ClientReports', 'ClientPatrolReports', 'ClientInvoices', 'ClientContracts',
      'ClientCommunicationHub', 'ClientCredentials', 'ClientFeedback', 'ServiceRequests', 'ClientOnboarding',
      'ClientProfile', 'ClientInviteAccept',
    ]
  }
};

export const hasAccessToPage = (userRole, pageName) => {
  if (!userRole) return false;
  
  // Normalize generic platform role to app role
  const normalized = userRole === 'user' ? 'employee' : userRole;
  const roleConfig = ROLE_PERMISSIONS[normalized];
  if (!roleConfig) return false;
  
  // Super admin has access to everything
  if (roleConfig.allowedPages.includes('*')) return true;
  
  // Check if page is in allowed pages
  return roleConfig.allowedPages.includes(pageName);
};

export const getDashboardForRole = (role) => {
  // Map generic platform roles to app roles
  const normalized = role === 'user' ? 'employee' : role;
  const roleConfig = ROLE_PERMISSIONS[normalized];
  return roleConfig?.dashboard || 'EmployeeDashboard';
};

export const getRoleConfig = (role) => {
  return ROLE_PERMISSIONS[role];
};

export const getAllRoles = () => Object.keys(ROLE_PERMISSIONS);