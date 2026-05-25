import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS = {
  AdminDashboard: "Dashboard", SupervisorDashboard: "Dashboard", OfficerDashboard: "Dashboard",
  EmployeeHome: "Home", ClientDashboard: "Dashboard", Scheduling: "Scheduling", Reports: "Reports",
  LiveMap: "Live Map", Timesheet: "Timesheet", Patrol: "Patrol", AdminMore: "More", SupervisorMore: "More",
  EmployeeMore: "More", ClientMore: "More",
  EmployeeDirectory: "Employee Directory", UserManagement: "User Management", PositionManagement: "Positions",
  SiteManagement: "Sites", SiteDetails: "Site Details", ClientManagement: "Clients", ClientDetails: "Client Details",
  TimesheetsManagement: "Timesheets", PatrolReview: "Patrol Review", PatrolPlayback: "Patrol Playback",
  CredentialsManagement: "Credentials", DocumentAdmin: "Documents", DocumentLibrary: "Document Library",
  InvoicesAdmin: "Invoices", InvoiceCreate: "Create Invoice", InvoiceDetail: "Invoice Detail",
  AccountingDashboard: "Accounting", GPSViolations: "GPS Violations", PTOApproval: "PTO Approval",
  PTORequest: "PTO Request", IncidentApproval: "Incident Approval", IncidentManagement: "Incidents",
  Training: "Training", TrainingBuilder: "Training Builder", TrainingAssignments: "Training Assignments",
  Profile: "My Profile", Settings: "Settings", CompanySettings: "Company Settings",
  Notifications: "Notifications", AuditLog: "Audit Log", RolesPermissions: "Roles & Permissions",
  EmployeeProfile: "Employee Profile", WeeklySiteReports: "Weekly Reports",
  TimekeepingSecuritySettings: "Timekeeping Settings", Chat: "Messages", Help: "Help",
  MonthlySiteReport: "Monthly Site Report", PatrolHistory: "Patrol History",
  PatrolAnalytics: "Patrol Analytics", OfficerAnalytics: "Officer Analytics",
  DeletedPatrolsReport: "Deleted Patrols", SiteInspections: "Site Inspections",
  SiteInspectionForm: "Inspection Form", TrainingGeneratorAI: "AI Training Generator",
  AIReportsNew: "AI Reports", AIIncidentAnalysis: "Incident Analysis",
  IncidentReports: "Incident Reports", IncidentForm: "Report Incident",
  PTOCalendar: "PTO Calendar", PTOSettings: "PTO Settings",
  RecognitionSystem: "Recognition", RecognitionLeaderboard: "Leaderboard",
  PerformanceReviews: "Performance Reviews", PerformanceReviewList: "Review List",
  BulkEmployeeActions: "Bulk Actions", ProfilePhotoApproval: "Photo Approval",
  DataImport: "Data Import", RoleWorkspaceAdmin: "Role Workspaces", RoleWorkspaceView: "My Workspace",
  CertificateTemplates: "Certificate Templates", BadgeManagement: "Badge Management",
  Onboarding: "Onboarding", CredentialsDashboard: "Credentials Dashboard",
  Credentials: "My Credentials", UniformInventory: "Uniform Inventory",
  StateLicensing: "State Licensing", PayrollExport: "Payroll Export",
  PayrollIntegration: "Payroll Integration", Payroll: "Payroll",
  InvoiceSettings: "Invoice Settings", TaxForms: "Tax Forms",
  DocumentManagement: "Document Management", PolicyManagement: "Policy Management",
  Announcements: "Announcements", OnboardingDocuments: "Onboarding Documents",
  Documents: "My Documents", ReportAutomation: "Report Automation",
  ReportingDashboard: "Reporting Dashboard", AIReports: "AI Reports",
  SiteCheckInManagement: "Check-In Management", SiteQRManagement: "QR Management",
  SiteCheckIn: "Site Check-In", SiteCheckInUser: "Check-In",
  ShiftBidding: "Shift Bidding", Schedule: "Schedule",
  MyTrainings: "My Trainings", TrainingSuggestions: "Training Suggestions",
  TrainingLeaderboard: "Training Leaderboard", AITrainingBuilder: "AI Training Builder",
  NotificationPreferences: "Notification Preferences", LanguageSettings: "Language",
  UserPreferences: "Preferences", InviteUser: "Invite User", PendingInvites: "Pending Invites",
  ClientOnboarding: "Client Onboarding", ClientContracts: "Contracts",
  ClientSchedule: "Schedule", ClientReports: "Reports", ClientPatrolReports: "Patrol Reports",
  ClientCommunicationHub: "Messages", ClientCredentials: "Credentials",
  ClientFeedback: "Feedback", ClientSiteMap: "Site Map", ClientSiteSettings: "Site Settings",
  ServiceRequests: "Service Requests", ClientProfile: "My Profile",
  ClientPortal: "Portal", ClientSecureDashboard: "Secure Dashboard",
  ArchivedRecords: "Archived Records", AdminAnalyticsDashboard: "Analytics",
  AnalyticsDashboard: "Analytics", AdminDMMonitor: "DM Monitor",
  PTORequest: "PTO Request", SupervisorMore: "More", EmployeeMore: "More",
  EmployeeAvailabilitySettings: "Availability", Invoices: "Invoices",
  InvoiceCreate: "Create Invoice", InvoiceDetail: "Invoice Detail",
  GPSViolations: "GPS Violations", LiveMap: "Live Map", PatrolReview: "Patrol Review",
};

const PARENT_MAP = {
  EmployeeDirectory: "AdminDashboard", UserManagement: "AdminDashboard", PositionManagement: "AdminDashboard",
  SiteManagement: "AdminDashboard", SiteDetails: "SiteManagement", ClientManagement: "AdminDashboard",
  ClientDetails: "ClientManagement", TimesheetsManagement: "AdminMore", PatrolReview: "AdminMore",
  PatrolPlayback: "PatrolReview", CredentialsManagement: "AdminMore", DocumentAdmin: "AdminMore",
  DocumentLibrary: "AdminMore", InvoicesAdmin: "AccountingDashboard", InvoiceCreate: "InvoicesAdmin",
  InvoiceDetail: "InvoicesAdmin", AccountingDashboard: "AdminMore", GPSViolations: "AdminMore",
  PTOApproval: "AdminMore", IncidentApproval: "AdminMore", IncidentManagement: "AdminMore",
  Training: "AdminMore", TrainingBuilder: "Training", TrainingAssignments: "Training",
  CompanySettings: "AdminMore", AuditLog: "AdminMore", RolesPermissions: "AdminMore",
  EmployeeProfile: "EmployeeDirectory", WeeklySiteReports: "Reports",
  TimekeepingSecuritySettings: "AdminMore", Chat: "AdminDashboard",
  Profile: "AdminDashboard", Settings: "AdminDashboard", Notifications: "AdminDashboard", Help: "AdminDashboard",
  MonthlySiteReport: "Reports", PatrolHistory: "PatrolReview", PatrolAnalytics: "AdminMore",
  OfficerAnalytics: "AdminMore", DeletedPatrolsReport: "AdminMore",
  SiteInspections: "SiteManagement", SiteInspectionForm: "SiteInspections",
  TrainingGeneratorAI: "Training", AIReportsNew: "ReportingDashboard",
  AIIncidentAnalysis: "IncidentManagement", IncidentReports: "IncidentManagement",
  IncidentForm: "OfficerDashboard", PTOCalendar: "AdminMore", PTOSettings: "AdminMore",
  RecognitionSystem: "AdminMore", RecognitionLeaderboard: "AdminMore",
  PerformanceReviews: "AdminMore", PerformanceReviewList: "PerformanceReviews",
  BulkEmployeeActions: "UserManagement", ProfilePhotoApproval: "AdminMore",
  DataImport: "AdminMore", RoleWorkspaceAdmin: "AdminMore", RoleWorkspaceView: "AdminMore",
  CertificateTemplates: "Training", BadgeManagement: "Training",
  Onboarding: "AdminMore", CredentialsDashboard: "AdminMore", Credentials: "EmployeeMore",
  UniformInventory: "AdminMore", StateLicensing: "AdminMore",
  PayrollExport: "Payroll", PayrollIntegration: "Payroll", Payroll: "AdminMore",
  InvoiceSettings: "InvoicesAdmin", TaxForms: "AdminMore",
  DocumentManagement: "AdminMore", PolicyManagement: "AdminMore",
  Announcements: "AdminMore", OnboardingDocuments: "AdminMore",
  Documents: "EmployeeMore", ReportAutomation: "ReportingDashboard",
  ReportingDashboard: "Reports", AIReports: "ReportingDashboard",
  SiteCheckInManagement: "AdminMore", SiteQRManagement: "SiteManagement",
  SiteCheckIn: "OfficerDashboard", SiteCheckInUser: "SiteCheckIn",
  ShiftBidding: "EmployeeMore", Schedule: "AdminMore",
  MyTrainings: "EmployeeMore", TrainingSuggestions: "Training",
  TrainingLeaderboard: "Training", AITrainingBuilder: "Training",
  NotificationPreferences: "Notifications", LanguageSettings: "Settings",
  UserPreferences: "Settings", InviteUser: "UserManagement", PendingInvites: "UserManagement",
  ClientOnboarding: "ClientManagement", ClientContracts: "ClientDetails",
  ClientSchedule: "ClientMore", ClientReports: "ClientMore", ClientPatrolReports: "ClientMore",
  ClientCommunicationHub: "ClientMore", ClientCredentials: "ClientMore",
  ClientFeedback: "ClientMore", ClientSiteMap: "ClientMore", ClientSiteSettings: "ClientMore",
  ServiceRequests: "ClientMore", ClientProfile: "ClientMore",
  ArchivedRecords: "AdminMore", AdminAnalyticsDashboard: "AdminMore",
  AnalyticsDashboard: "AdminMore", AdminDMMonitor: "AdminMore",
  PTORequest: "EmployeeMore", EmployeeAvailabilitySettings: "EmployeeMore",
  Invoices: "AccountingDashboard", InvoiceCreate: "InvoicesAdmin", InvoiceDetail: "InvoicesAdmin",
};

function buildCrumbs(currentPage) {
  const crumbs = [];
  let page = currentPage;
  while (page && PARENT_MAP[page]) { crumbs.unshift({ page, label: ROUTE_LABELS[page] || page }); page = PARENT_MAP[page]; }
  if (crumbs.length > 0) crumbs.unshift({ page, label: ROUTE_LABELS[page] || page, isRoot: true });
  return crumbs;
}

export default function Breadcrumb({ currentPage }) {
  const crumbs = buildCrumbs(currentPage);
  if (crumbs.length <= 1) return null;
  return (
    <nav className="bg-slate-50 border-b border-slate-100 px-4 py-1.5">
      <div className="max-w-7xl mx-auto">
        <ol className="flex items-center gap-1 text-sm flex-wrap">
          <li><Link to="/" className="text-slate-400 hover:text-[#c9a227] transition-colors flex items-center gap-1"><Home className="w-3.5 h-3.5" /></Link></li>
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1;
            return (
              <React.Fragment key={crumb.page}>
                <li className="text-slate-300"><ChevronRight className="w-3.5 h-3.5" /></li>
                <li>{isLast ? <span className="text-slate-700 font-medium">{crumb.label}</span> : <Link to={`/${crumb.page}`} className="text-slate-500 hover:text-[#c9a227] transition-colors">{crumb.label}</Link>}</li>
              </React.Fragment>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}