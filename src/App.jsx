import React from "react"
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { DualViewProvider, useDualView } from '@/context/DualViewContext';
import { CompanyProvider } from '@/context/CompanyContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout, { LayoutOutlet } from './Layout';
import RoleBasedRoute from '@/components/RoleBasedRoute';
import ThemeManager from '@/components/shared/ThemeManager';

import LandingPage from './pages/LandingPage';
import CompanyOnboarding from './pages/CompanyOnboarding.jsx';
import Login from "./pages/Login";
import ForgotPassword from './pages/ForgotPassword';
import CCWReciprocityMapPublic from './pages/CCWReciprocityMapPublic';
import CCWMapEmbed from './pages/CCWMapEmbed';
import PublicAccessPage from './pages/PublicAccessPage';

// Add page imports here
import CheckInHistory from './pages/CheckInHistory';
import MyTimesheets from './pages/MyTimesheets';
import TeamAssignments from './pages/TeamAssignments';
import WeeklySiteReports from './pages/WeeklySiteReports';
import ArchivedRecords from './pages/ArchivedRecords';
import AdminDMMonitor from './pages/AdminDMMonitor';
import Chat from './pages/Chat';
import TimekeepingSecuritySettings from './pages/TimekeepingSecuritySettings';
import AdminAnalyticsDashboard from './pages/AdminAnalyticsDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminMore from './pages/AdminMore';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import InAppBrowser from './pages/InAppBrowser';
import SiteManagement from './pages/SiteManagement';
import SiteQRManagement from './pages/SiteQRManagement';
import StateLicensing from './pages/StateLicensing';
import StateLicensingSettings from './pages/StateLicensingSettings';
import SupervisorDashboard from './pages/SupervisorDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerMore from './pages/ManagerMore';
import TimesheetSummaryDashboard from './pages/TimesheetSummaryDashboard';
import SupervisorMore from './pages/SupervisorMore';
import CompanySettings from './pages/CompanySettings';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import TaxForms from './pages/TaxForms';
import SiteCheckInManagement from './pages/SiteCheckInManagement';
import SiteCheckInUser from './pages/SiteCheckInUser';
import SiteDetails from './pages/SiteDetails.jsx';
import SiteInspectionForm from './pages/SiteInspectionForm';
import SiteInspections from './pages/SiteInspections';
import Timesheet from './pages/Timesheet';
import TimesheetsManagement from './pages/TimesheetsManagement';
import Training from './pages/Training';
import TrainingAssignments from './pages/TrainingAssignments';
import TrainingBuilder from './pages/TrainingBuilder.jsx';
import TrainingGeneratorAI from './pages/TrainingGeneratorAI';
import TrainingLeaderboard from './pages/TrainingLeaderboard';
import TrainingSuggestions from './pages/TrainingSuggestions';
import UniformInventory from './pages/UniformInventory';
import UserManagement from './pages/UserManagement';
import UserPreferences from './pages/UserPreferences';

// Employee / Officer pages
import EmployeeDashboard from './pages/EmployeeDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import EmployeeHome from './pages/EmployeeHome';
import EmployeeMore from './pages/EmployeeMore';
import EmployeeDirectory from './pages/EmployeeDirectory';
import EmployeeProfile from './pages/EmployeeProfile';
import NewEmployee from './pages/NewEmployee';

// Client pages
import ClientDashboard from './pages/ClientDashboard.jsx';
import ClientPortal from './pages/ClientPortal';
import ClientSecureDashboard from './pages/ClientSecureDashboard';
import ClientMore from './pages/ClientMore';
import ServiceCoverageMap from './pages/ServiceCoverageMap';
import ClientManagement from './pages/ClientManagement.jsx';
import ClientDetails from './pages/ClientDetails.jsx';
import ClientOnboarding from './pages/ClientOnboarding';
import ClientProfile from './pages/ClientProfile';
import ClientContracts from './pages/ClientContracts';
import ClientSchedule from './pages/ClientSchedule';
import ClientReports from './pages/ClientReports';
import ClientPatrolReports from './pages/ClientPatrolReports';
import ClientCommunicationHub from './pages/ClientCommunicationHub';
import ClientCredentials from './pages/ClientCredentials';
import ClientFeedback from './pages/ClientFeedback';
import ClientInvoices from './pages/ClientInvoices';
import ClientSiteMap from './pages/ClientSiteMap';
import ClientSiteSettings from './pages/ClientSiteSettings';
import ServiceRequests from './pages/ServiceRequests';

// Operations
import Schedule from './pages/Schedule';
import Scheduling from './pages/Scheduling';
import Reports from './pages/Reports';
import Patrol from './pages/Patrol';
import LiveMap from './pages/LiveMap';
import PatrolReview from './pages/PatrolReview';
import PatrolPlayback from './pages/PatrolPlayback';
import PatrolHistory from './pages/PatrolHistory';
import PatrolAnalytics from './pages/PatrolAnalytics';
import OfficerAnalytics from './pages/OfficerAnalytics';
import GPSViolations from './pages/GPSViolations';
import DeletedPatrolsReport from './pages/DeletedPatrolsReport';
import SiteCheckIn from './pages/SiteCheckIn';
import ShiftBidding from './pages/ShiftBidding';

// Incidents
import IncidentForm from './pages/IncidentForm';
import IncidentFormAI from './pages/IncidentFormAI';
import IncidentManagement from './pages/IncidentManagement';
import IncidentApproval from './pages/IncidentApproval';
import IncidentReports from './pages/IncidentReports';
import IncidentAnalysis from './pages/IncidentAnalysis';
import AIIncidentAnalysis from './pages/AIIncidentAnalysis';
import IncidentSummaryReport from './pages/IncidentSummaryReport';

// Training extras
import MyTrainings from './pages/MyTrainings.jsx';
import AITrainingBuilder from './pages/AITrainingBuilder';
import BadgeManagement from './pages/BadgeManagement';
import CertificateTemplates from './pages/CertificateTemplates';

// Billing / Payroll
import Invoices from './pages/Invoices';
import InvoicesAdmin from './pages/InvoicesAdmin';
import InvoiceCreate from './pages/InvoiceCreate';
import InvoiceDetail from './pages/InvoiceDetail';
import InvoiceSettings from './pages/InvoiceSettings';
import AccountingDashboard from './pages/AccountingDashboard';
import Payroll from './pages/Payroll';
import PayrollIntegration from './pages/PayrollIntegration';
import PayrollExport from './pages/PayrollExport';
import PayrollSettings from './pages/PayrollSettings';
import PayrollPortal from './pages/PayrollPortal';
import PTORequest from './pages/PTORequest';
import PTOApproval from './pages/PTOApproval';
import PTOApprovalDashboard from './pages/PTOApprovalDashboard';
import PTOCalendar from './pages/PTOCalendar';
import PTOSettings from './pages/PTOSettings';

// Documents & Communication
import DocumentAdmin from './pages/DocumentAdmin';
import DocumentLibrary from './pages/DocumentLibrary';
import Documents from './pages/Documents';
import DocumentManagement from './pages/DocumentManagement';
import OnboardingDocuments from './pages/OnboardingDocuments';
import OnboardingTask from './pages/OnboardingTask';
import PolicyManagement from './pages/PolicyManagement';
import Announcements from './pages/Announcements';

// Reports & Analytics
import MonthlySiteReport from './pages/MonthlySiteReport';
import ReportingDashboard from './pages/ReportingDashboard';
import ReportAutomation from './pages/ReportAutomation';
import AIReports from './pages/AIReports';
import AIReportsNew from './pages/AIReportsNew';

// Recognition & Performance
import RecognitionSystem from './pages/RecognitionSystem';
import RecognitionLeaderboard from './pages/RecognitionLeaderboard';
import PerformanceReviews from './pages/PerformanceReviews';
import PerformanceReviewList from './pages/PerformanceReviewList';

// Settings & System
import Settings from './pages/Settings';
import Accessibility from './pages/Accessibility';
import RolesPermissions from './pages/RolesPermissions';
import AuditLog from './pages/AuditLog';
import AuditReport from './pages/AuditReport';
import DataImport from './pages/DataImport';
import RoleWorkspaceAdmin from './pages/RoleWorkspaceAdmin';
import RoleWorkspaceView from './pages/RoleWorkspaceView';
import RoleAudit from './pages/RoleAudit';

// People
import InviteUser from './pages/InviteUser.jsx';
import PendingInvites from './pages/PendingInvites';
import ProfilePhotoApproval from './pages/ProfilePhotoApproval';
import BulkEmployeeActions from './pages/BulkEmployeeActions';
import PositionManagement from './pages/PositionManagement';
import Onboarding from './pages/Onboarding';
import OnboardingManagement from './pages/OnboardingManagement.jsx';
import EmployeeAvailabilitySettings from './pages/EmployeeAvailabilitySettings';
import EmployeeImportSettings from './pages/EmployeeImportSettings';

// Credentials
import Credentials from './pages/Credentials';
import CredentialsDashboard from './pages/CredentialsDashboard';
import CredentialsManagement from './pages/CredentialsManagement';

// Profile & Preferences
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import NotificationPreferences from './pages/NotificationPreferences';
import LanguageSettings from './pages/LanguageSettings';
import Help from './pages/Help';

// Stub pages
import ScanPatrol from './pages/ScanPatrol';
import SiteCheckInConfig from './pages/SiteCheckInConfig';
import ClientInviteAccept from './pages/ClientInviteAccept';



const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, user, getRoleDashboard } = useAuth();
  const { syncViewForRole } = useDualView();

  // Ensure admins always start in management view — clear any stale "employee" state from localStorage
  React.useEffect(() => {
    if (user?.role) syncViewForRole(user.role);
  }, [user?.role]);

  // Check if we're on a public route that should never be blocked by auth loading
  const isPublicRoute = ['/Login', '/ForgotPassword', '/PublicAccess'].some(
    r => window.location.pathname === r || window.location.pathname.startsWith(r)
  );

  if (!isPublicRoute && (isLoadingPublicSettings || isLoadingAuth)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  return (
    <Routes>
      {/* Landing page - always visible to all users */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Public access page for uninvited users */}
      <Route path="/PublicAccess" element={<PublicAccessPage />} />

      {/* Standalone bare embed — no auth, no layout, no branding, iframe-safe */}
      <Route path="/embed/ccw-map" element={<CCWMapEmbed />} />

      {/* Company onboarding flow — redirect authenticated admins to OnboardingManagement */}
      <Route path="/onboarding" element={isLoadingAuth ? (
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      ) : user && ["admin", "super_admin"].includes(user.role) ? <Navigate to="/OnboardingManagement" replace /> : <CompanyOnboarding />} />
      
      {/* Password Reset (unauthenticated) */}
      <Route path="/Login" element={<Login />} />
      <Route path="/ForgotPassword" element={<ForgotPassword />} />

      {/* Client Invite Acceptance */}
      <Route path="/accept-invite" element={<ClientInviteAccept />} />

      {/* Public CCW Reciprocity Map — accessible from public access page */}
      <Route path="/CCWReciprocityMap" element={user ? <CCWReciprocityMapPublic /> : <Navigate to="/Login" replace />} />

      {/* === All layout-wrapped routes share a single Layout instance via LayoutOutlet === */}
      <Route element={<LayoutOutlet />}>

      {/* Admin */}
      <Route path="/AdminDashboard" element={<RoleBasedRoute pageName="AdminDashboard"><AdminDashboard /></RoleBasedRoute>} />
      <Route path="/AdminMore" element={<RoleBasedRoute pageName="AdminMore"><AdminMore /></RoleBasedRoute>} />
      <Route path="/AdminAnalyticsDashboard" element={<RoleBasedRoute pageName="AdminAnalyticsDashboard"><AdminAnalyticsDashboard /></RoleBasedRoute>} />
      <Route path="/AnalyticsDashboard" element={<RoleBasedRoute pageName="AnalyticsDashboard"><AnalyticsDashboard /></RoleBasedRoute>} />
      <Route path="/AdminDMMonitor" element={<RoleBasedRoute pageName="AdminDMMonitor"><AdminDMMonitor /></RoleBasedRoute>} />

      {/* Supervisor */}
      <Route path="/SupervisorDashboard" element={<RoleBasedRoute pageName="SupervisorDashboard"><SupervisorDashboard /></RoleBasedRoute>} />
      <Route path="/SupervisorMore" element={<RoleBasedRoute pageName="SupervisorMore"><SupervisorMore /></RoleBasedRoute>} />
      <Route path="/ManagerDashboard" element={<RoleBasedRoute allowedRoles={["manager", "admin", "super_admin"]}><ManagerDashboard /></RoleBasedRoute>} />
      <Route path="/ManagerMore" element={<RoleBasedRoute allowedRoles={["manager"]}><ManagerMore /></RoleBasedRoute>} />
      <Route path="/TimesheetSummaryDashboard" element={<RoleBasedRoute pageName="TimesheetSummaryDashboard"><TimesheetSummaryDashboard /></RoleBasedRoute>} />

      {/* Officer / Employee */}
      <Route path="/EmployeeDashboard" element={<RoleBasedRoute pageName="EmployeeDashboard"><EmployeeDashboard /></RoleBasedRoute>} />
      <Route path="/OfficerDashboard" element={<RoleBasedRoute pageName="OfficerDashboard"><OfficerDashboard /></RoleBasedRoute>} />
      <Route path="/EmployeeHome" element={<RoleBasedRoute allowedRoles={["employee", "officer", "supervisor", "manager", "admin", "super_admin"]}><EmployeeHome /></RoleBasedRoute>} />
      <Route path="/EmployeeMore" element={<RoleBasedRoute allowedRoles={["employee", "officer", "supervisor", "manager", "admin", "super_admin"]}><EmployeeMore /></RoleBasedRoute>} />
      <Route path="/EmployeeDirectory" element={<RoleBasedRoute pageName="EmployeeDirectory"><EmployeeDirectory /></RoleBasedRoute>} />
      <Route path="/NewEmployee" element={<RoleBasedRoute pageName="NewEmployee"><NewEmployee /></RoleBasedRoute>} />
      <Route path="/EmployeeProfile" element={<RoleBasedRoute pageName="EmployeeProfile"><EmployeeProfile /></RoleBasedRoute>} />

      {/* Client */}
      <Route path="/ClientPortal" element={<RoleBasedRoute pageName="ClientPortal"><ClientPortal /></RoleBasedRoute>} />
      <Route path="/ClientSecureDashboard" element={<RoleBasedRoute pageName="ClientSecureDashboard"><ClientSecureDashboard /></RoleBasedRoute>} />
      <Route path="/ClientMore" element={<RoleBasedRoute pageName="ClientMore"><ClientMore /></RoleBasedRoute>} />
      <Route path="/ClientManagement" element={<RoleBasedRoute pageName="ClientManagement"><ClientManagement /></RoleBasedRoute>} />
      <Route path="/ClientDetails" element={<RoleBasedRoute pageName="ClientDetails"><ClientDetails /></RoleBasedRoute>} />
      <Route path="/ClientOnboarding" element={<RoleBasedRoute pageName="ClientOnboarding"><ClientOnboarding /></RoleBasedRoute>} />
      <Route path="/ClientProfile" element={<RoleBasedRoute pageName="ClientProfile"><ClientProfile /></RoleBasedRoute>} />
      <Route path="/ClientContracts" element={<RoleBasedRoute pageName="ClientContracts"><ClientContracts /></RoleBasedRoute>} />
      <Route path="/ClientSchedule" element={<RoleBasedRoute pageName="ClientSchedule"><ClientSchedule /></RoleBasedRoute>} />
      <Route path="/ClientReports" element={<RoleBasedRoute pageName="ClientReports"><ClientReports /></RoleBasedRoute>} />
      <Route path="/ClientPatrolReports" element={<RoleBasedRoute pageName="ClientPatrolReports"><ClientPatrolReports /></RoleBasedRoute>} />
      <Route path="/ClientCommunicationHub" element={<RoleBasedRoute pageName="ClientCommunicationHub"><ClientCommunicationHub /></RoleBasedRoute>} />
      <Route path="/ClientCredentials" element={<RoleBasedRoute pageName="ClientCredentials"><ClientCredentials /></RoleBasedRoute>} />
      <Route path="/ClientFeedback" element={<RoleBasedRoute pageName="ClientFeedback"><ClientFeedback /></RoleBasedRoute>} />
      <Route path="/ClientInvoices" element={<RoleBasedRoute pageName="ClientInvoices"><ClientInvoices /></RoleBasedRoute>} />
      <Route path="/ClientSiteMap" element={<RoleBasedRoute pageName="ClientSiteMap"><ClientSiteMap /></RoleBasedRoute>} />
      <Route path="/ClientSiteSettings" element={<RoleBasedRoute pageName="ClientSiteSettings"><ClientSiteSettings /></RoleBasedRoute>} />
      <Route path="/ServiceRequests" element={<RoleBasedRoute pageName="ServiceRequests"><ServiceRequests /></RoleBasedRoute>} />

      {/* Operations */}
      <Route path="/Schedule" element={<RoleBasedRoute pageName="Schedule"><Schedule /></RoleBasedRoute>} />
      <Route path="/Scheduling" element={<RoleBasedRoute pageName="Scheduling"><Scheduling /></RoleBasedRoute>} />
      <Route path="/Reports" element={<RoleBasedRoute pageName="Reports"><Reports /></RoleBasedRoute>} />
      <Route path="/Patrol" element={<RoleBasedRoute pageName="Patrol"><Patrol /></RoleBasedRoute>} />
      <Route path="/LiveMap" element={<RoleBasedRoute pageName="LiveMap"><LiveMap /></RoleBasedRoute>} />
      <Route path="/PatrolReview" element={<RoleBasedRoute pageName="PatrolReview"><PatrolReview /></RoleBasedRoute>} />
      <Route path="/PatrolPlayback" element={<RoleBasedRoute pageName="PatrolPlayback"><PatrolPlayback /></RoleBasedRoute>} />
      <Route path="/PatrolHistory" element={<RoleBasedRoute pageName="PatrolHistory"><PatrolHistory /></RoleBasedRoute>} />
      <Route path="/PatrolAnalytics" element={<RoleBasedRoute pageName="PatrolAnalytics"><PatrolAnalytics /></RoleBasedRoute>} />
      <Route path="/OfficerAnalytics" element={<RoleBasedRoute pageName="OfficerAnalytics"><OfficerAnalytics /></RoleBasedRoute>} />
      <Route path="/GPSViolations" element={<RoleBasedRoute pageName="GPSViolations"><GPSViolations /></RoleBasedRoute>} />
      <Route path="/DeletedPatrolsReport" element={<RoleBasedRoute pageName="DeletedPatrolsReport"><DeletedPatrolsReport /></RoleBasedRoute>} />
      <Route path="/SiteCheckIn" element={<RoleBasedRoute pageName="SiteCheckIn"><SiteCheckIn /></RoleBasedRoute>} />
      <Route path="/ShiftBidding" element={<RoleBasedRoute pageName="ShiftBidding"><ShiftBidding /></RoleBasedRoute>} />

      {/* Team Assignments */}
      <Route path="/TeamAssignments" element={<RoleBasedRoute pageName="TeamAssignments"><TeamAssignments /></RoleBasedRoute>} />

      {/* Timekeeping */}
      <Route path="/CheckInHistory" element={<RoleBasedRoute pageName="CheckInHistory"><CheckInHistory /></RoleBasedRoute>} />
      <Route path="/MyTimesheets" element={<RoleBasedRoute pageName="MyTimesheets"><MyTimesheets /></RoleBasedRoute>} />
      <Route path="/Timesheet" element={<RoleBasedRoute pageName="Timesheet"><Timesheet /></RoleBasedRoute>} />
      <Route path="/TimesheetsManagement" element={<RoleBasedRoute pageName="TimesheetsManagement"><TimesheetsManagement /></RoleBasedRoute>} />
      <Route path="/TimekeepingSecuritySettings" element={<RoleBasedRoute pageName="TimekeepingSecuritySettings"><TimekeepingSecuritySettings /></RoleBasedRoute>} />

      {/* Sites */}
      <Route path="/SiteManagement" element={<RoleBasedRoute pageName="SiteManagement"><SiteManagement /></RoleBasedRoute>} />
      <Route path="/SiteQRManagement" element={<RoleBasedRoute pageName="SiteQRManagement"><SiteQRManagement /></RoleBasedRoute>} />
      <Route path="/SiteCheckInManagement" element={<RoleBasedRoute pageName="SiteCheckInManagement"><SiteCheckInManagement /></RoleBasedRoute>} />
      <Route path="/SiteCheckInUser" element={<RoleBasedRoute pageName="SiteCheckInUser"><SiteCheckInUser /></RoleBasedRoute>} />
      <Route path="/SiteDetails" element={<RoleBasedRoute pageName="SiteDetails"><SiteDetails /></RoleBasedRoute>} />
      <Route path="/SiteInspectionForm" element={<RoleBasedRoute pageName="SiteInspectionForm"><SiteInspectionForm /></RoleBasedRoute>} />
      <Route path="/SiteInspections" element={<RoleBasedRoute pageName="SiteInspections"><SiteInspections /></RoleBasedRoute>} />

      {/* Incidents */}
      <Route path="/IncidentForm" element={<RoleBasedRoute pageName="IncidentForm"><IncidentForm /></RoleBasedRoute>} />
      <Route path="/IncidentFormAI" element={<RoleBasedRoute pageName="IncidentFormAI"><IncidentFormAI /></RoleBasedRoute>} />
      <Route path="/IncidentManagement" element={<RoleBasedRoute pageName="IncidentManagement"><IncidentManagement /></RoleBasedRoute>} />
      <Route path="/IncidentApproval" element={<RoleBasedRoute pageName="IncidentApproval"><IncidentApproval /></RoleBasedRoute>} />
      <Route path="/IncidentReports" element={<RoleBasedRoute pageName="IncidentReports"><IncidentReports /></RoleBasedRoute>} />
      <Route path="/IncidentAnalysis" element={<RoleBasedRoute pageName="IncidentAnalysis"><IncidentAnalysis /></RoleBasedRoute>} />
      <Route path="/AIIncidentAnalysis" element={<RoleBasedRoute pageName="AIIncidentAnalysis"><AIIncidentAnalysis /></RoleBasedRoute>} />
      <Route path="/IncidentSummaryReport" element={<RoleBasedRoute pageName="IncidentSummaryReport"><IncidentSummaryReport /></RoleBasedRoute>} />

      {/* Training */}
      <Route path="/Training" element={<RoleBasedRoute pageName="Training"><Training /></RoleBasedRoute>} />
      <Route path="/MyTrainings" element={<RoleBasedRoute pageName="MyTrainings"><MyTrainings /></RoleBasedRoute>} />
      <Route path="/TrainingAssignments" element={<RoleBasedRoute pageName="TrainingAssignments"><TrainingAssignments /></RoleBasedRoute>} />
      <Route path="/TrainingBuilder" element={<RoleBasedRoute pageName="TrainingBuilder"><TrainingBuilder /></RoleBasedRoute>} />
      <Route path="/TrainingGeneratorAI" element={<RoleBasedRoute pageName="TrainingGeneratorAI"><TrainingGeneratorAI /></RoleBasedRoute>} />
      <Route path="/TrainingLeaderboard" element={<RoleBasedRoute pageName="TrainingLeaderboard"><TrainingLeaderboard /></RoleBasedRoute>} />
      <Route path="/TrainingSuggestions" element={<RoleBasedRoute pageName="TrainingSuggestions"><TrainingSuggestions /></RoleBasedRoute>} />
      <Route path="/AITrainingBuilder" element={<RoleBasedRoute pageName="AITrainingBuilder"><AITrainingBuilder /></RoleBasedRoute>} />
      <Route path="/BadgeManagement" element={<RoleBasedRoute pageName="BadgeManagement"><BadgeManagement /></RoleBasedRoute>} />
      <Route path="/CertificateTemplates" element={<RoleBasedRoute pageName="CertificateTemplates"><CertificateTemplates /></RoleBasedRoute>} />

      {/* Billing / Payroll */}
      <Route path="/Invoices" element={<RoleBasedRoute pageName="Invoices"><Invoices /></RoleBasedRoute>} />
      <Route path="/InvoicesAdmin" element={<RoleBasedRoute pageName="InvoicesAdmin"><InvoicesAdmin /></RoleBasedRoute>} />
      <Route path="/InvoiceCreate" element={<RoleBasedRoute pageName="InvoiceCreate"><InvoiceCreate /></RoleBasedRoute>} />
      <Route path="/InvoiceDetail" element={<RoleBasedRoute pageName="InvoiceDetail"><InvoiceDetail /></RoleBasedRoute>} />
      <Route path="/InvoiceSettings" element={<RoleBasedRoute pageName="InvoiceSettings"><InvoiceSettings /></RoleBasedRoute>} />
      <Route path="/ClientInvoices" element={<RoleBasedRoute pageName="ClientInvoices"><ClientInvoices /></RoleBasedRoute>} />
      <Route path="/AccountingDashboard" element={<RoleBasedRoute pageName="AccountingDashboard"><AccountingDashboard /></RoleBasedRoute>} />
      <Route path="/Payroll" element={<RoleBasedRoute pageName="Payroll"><Payroll /></RoleBasedRoute>} />
      <Route path="/PayrollIntegration" element={<RoleBasedRoute pageName="PayrollIntegration"><PayrollIntegration /></RoleBasedRoute>} />
      <Route path="/PayrollExport" element={<RoleBasedRoute pageName="PayrollExport"><PayrollExport /></RoleBasedRoute>} />
      <Route path="/PayrollSettings" element={<RoleBasedRoute pageName="PayrollSettings"><PayrollSettings /></RoleBasedRoute>} />
      <Route path="/PayrollPortal" element={<RoleBasedRoute pageName="PayrollPortal"><PayrollPortal /></RoleBasedRoute>} />
      <Route path="/CredentialsDashboard" element={<RoleBasedRoute pageName="CredentialsDashboard"><CredentialsDashboard /></RoleBasedRoute>} />
      <Route path="/TaxForms" element={<RoleBasedRoute pageName="TaxForms"><TaxForms /></RoleBasedRoute>} />
      <Route path="/PTORequest" element={<RoleBasedRoute pageName="PTORequest"><PTORequest /></RoleBasedRoute>} />
      <Route path="/PTOApproval" element={<RoleBasedRoute pageName="PTOApproval"><PTOApproval /></RoleBasedRoute>} />
      <Route path="/PTOApprovalDashboard" element={<RoleBasedRoute pageName="PTOApprovalDashboard"><PTOApprovalDashboard /></RoleBasedRoute>} />
      <Route path="/PTOCalendar" element={<RoleBasedRoute pageName="PTOCalendar"><PTOCalendar /></RoleBasedRoute>} />
      <Route path="/PTOSettings" element={<RoleBasedRoute pageName="PTOSettings"><PTOSettings /></RoleBasedRoute>} />

      {/* Documents & Communication */}
      <Route path="/DocumentAdmin" element={<RoleBasedRoute pageName="DocumentAdmin"><DocumentAdmin /></RoleBasedRoute>} />
      <Route path="/DocumentLibrary" element={<RoleBasedRoute pageName="DocumentLibrary"><DocumentLibrary /></RoleBasedRoute>} />
      <Route path="/Documents" element={<RoleBasedRoute pageName="Documents"><Documents /></RoleBasedRoute>} />
      <Route path="/DocumentManagement" element={<RoleBasedRoute pageName="DocumentManagement"><DocumentManagement /></RoleBasedRoute>} />
      <Route path="/OnboardingDocuments" element={<RoleBasedRoute pageName="OnboardingDocuments"><OnboardingDocuments /></RoleBasedRoute>} />
      <Route path="/OnboardingTask" element={<RoleBasedRoute pageName="OnboardingTask"><OnboardingTask /></RoleBasedRoute>} />
      <Route path="/PolicyManagement" element={<RoleBasedRoute pageName="PolicyManagement"><PolicyManagement /></RoleBasedRoute>} />
      <Route path="/Announcements" element={<RoleBasedRoute pageName="Announcements"><Announcements /></RoleBasedRoute>} />
      <Route path="/Chat" element={<RoleBasedRoute pageName="Chat"><Chat /></RoleBasedRoute>} />

      {/* Reports & Analytics */}
      <Route path="/ReportingDashboard" element={<RoleBasedRoute pageName="ReportingDashboard"><ReportingDashboard /></RoleBasedRoute>} />
      <Route path="/ReportAutomation" element={<RoleBasedRoute pageName="ReportAutomation"><ReportAutomation /></RoleBasedRoute>} />
      <Route path="/AIReports" element={<RoleBasedRoute pageName="AIReports"><AIReports /></RoleBasedRoute>} />
      <Route path="/AIReportsNew" element={<RoleBasedRoute pageName="AIReportsNew"><AIReportsNew /></RoleBasedRoute>} />
      <Route path="/WeeklySiteReports" element={<RoleBasedRoute pageName="WeeklySiteReports"><WeeklySiteReports /></RoleBasedRoute>} />
      <Route path="/MonthlySiteReport" element={<RoleBasedRoute pageName="MonthlySiteReport"><MonthlySiteReport /></RoleBasedRoute>} />

      {/* Recognition & Performance */}
      <Route path="/RecognitionSystem" element={<RoleBasedRoute pageName="RecognitionSystem"><RecognitionSystem /></RoleBasedRoute>} />
      <Route path="/RecognitionLeaderboard" element={<RoleBasedRoute pageName="RecognitionLeaderboard"><RecognitionLeaderboard /></RoleBasedRoute>} />
      <Route path="/PerformanceReviews" element={<RoleBasedRoute pageName="PerformanceReviews"><PerformanceReviews /></RoleBasedRoute>} />
      <Route path="/PerformanceReviewList" element={<RoleBasedRoute pageName="PerformanceReviewList"><PerformanceReviewList /></RoleBasedRoute>} />

      {/* Settings & System */}
      <Route path="/CompanySettings" element={<RoleBasedRoute allowedRoles={["admin", "super_admin"]}><CompanySettings /></RoleBasedRoute>} />
      <Route path="/SuperAdminDashboard" element={<RoleBasedRoute allowedRoles={["super_admin"]}><SuperAdminDashboard /></RoleBasedRoute>} />
      <Route path="/Settings" element={<RoleBasedRoute pageName="Settings"><Settings /></RoleBasedRoute>} />
      <Route path="/Accessibility" element={<RoleBasedRoute pageName="Accessibility"><Accessibility /></RoleBasedRoute>} />
      <Route path="/RolesPermissions" element={<RoleBasedRoute pageName="RolesPermissions"><RolesPermissions /></RoleBasedRoute>} />
      <Route path="/AuditLog" element={<RoleBasedRoute pageName="AuditLog"><AuditLog /></RoleBasedRoute>} />
      <Route path="/AuditReport" element={<RoleBasedRoute allowedRoles={["super_admin"]}><AuditReport /></RoleBasedRoute>} />
      <Route path="/DataImport" element={<RoleBasedRoute pageName="DataImport"><DataImport /></RoleBasedRoute>} />
      <Route path="/RoleWorkspaceAdmin" element={<RoleBasedRoute pageName="RoleWorkspaceAdmin"><RoleWorkspaceAdmin /></RoleBasedRoute>} />
      <Route path="/RoleWorkspaceView" element={<RoleBasedRoute pageName="RoleWorkspaceView"><RoleWorkspaceView /></RoleBasedRoute>} />
      <Route path="/RoleAudit" element={<RoleBasedRoute pageName="RoleAudit"><RoleAudit /></RoleBasedRoute>} />
      <Route path="/StateLicensing" element={<RoleBasedRoute pageName="StateLicensing"><StateLicensing /></RoleBasedRoute>} />
      <Route path="/StateLicensingSettings" element={<RoleBasedRoute pageName="StateLicensingSettings"><StateLicensingSettings /></RoleBasedRoute>} />
      <Route path="/UniformInventory" element={<RoleBasedRoute pageName="UniformInventory"><UniformInventory /></RoleBasedRoute>} />
      <Route path="/ArchivedRecords" element={<RoleBasedRoute pageName="ArchivedRecords"><ArchivedRecords /></RoleBasedRoute>} />

      {/* People */}
      <Route path="/UserManagement" element={<RoleBasedRoute pageName="UserManagement"><UserManagement /></RoleBasedRoute>} />
      <Route path="/InviteUser" element={<RoleBasedRoute pageName="InviteUser"><InviteUser /></RoleBasedRoute>} />
      <Route path="/PendingInvites" element={<RoleBasedRoute pageName="PendingInvites"><PendingInvites /></RoleBasedRoute>} />
      <Route path="/ProfilePhotoApproval" element={<RoleBasedRoute pageName="ProfilePhotoApproval"><ProfilePhotoApproval /></RoleBasedRoute>} />
      <Route path="/BulkEmployeeActions" element={<RoleBasedRoute pageName="BulkEmployeeActions"><BulkEmployeeActions /></RoleBasedRoute>} />
      <Route path="/PositionManagement" element={<RoleBasedRoute pageName="PositionManagement"><PositionManagement /></RoleBasedRoute>} />
      <Route path="/Onboarding" element={<RoleBasedRoute pageName="Onboarding"><Onboarding /></RoleBasedRoute>} />
      <Route path="/OnboardingManagement" element={<RoleBasedRoute pageName="OnboardingManagement"><OnboardingManagement /></RoleBasedRoute>} />
      <Route path="/OnboardingDocuments" element={<Navigate to="/OnboardingManagement" replace />} />
      <Route path="/OnboardingTask" element={<Navigate to="/OnboardingManagement" replace />} />
      <Route path="/EmployeeAvailabilitySettings" element={<RoleBasedRoute pageName="EmployeeAvailabilitySettings"><EmployeeAvailabilitySettings /></RoleBasedRoute>} />
      <Route path="/EmployeeImportSettings" element={<RoleBasedRoute pageName="EmployeeImportSettings"><EmployeeImportSettings /></RoleBasedRoute>} />

      {/* Credentials */}
      <Route path="/Credentials" element={<RoleBasedRoute pageName="Credentials"><Credentials /></RoleBasedRoute>} />
      <Route path="/CredentialsDashboard" element={<RoleBasedRoute pageName="CredentialsDashboard"><CredentialsDashboard /></RoleBasedRoute>} />
      <Route path="/CredentialsManagement" element={<RoleBasedRoute pageName="CredentialsManagement"><CredentialsManagement /></RoleBasedRoute>} />

      {/* Profile & Preferences */}
      <Route path="/Profile" element={<RoleBasedRoute pageName="Profile"><Profile /></RoleBasedRoute>} />
      <Route path="/UserPreferences" element={<RoleBasedRoute pageName="UserPreferences"><UserPreferences /></RoleBasedRoute>} />
      <Route path="/Notifications" element={<RoleBasedRoute pageName="Notifications"><Notifications /></RoleBasedRoute>} />
      <Route path="/NotificationPreferences" element={<RoleBasedRoute pageName="NotificationPreferences"><NotificationPreferences /></RoleBasedRoute>} />
      <Route path="/LanguageSettings" element={<RoleBasedRoute pageName="LanguageSettings"><LanguageSettings /></RoleBasedRoute>} />
      <Route path="/Help" element={<RoleBasedRoute pageName="Help"><Help /></RoleBasedRoute>} />
      <Route path="/nps-portal-support" element={<RoleBasedRoute pageName="Help"><Help /></RoleBasedRoute>} />

      {/* Misc / Utility & Aliases */}
      <Route path="/ClockIn" element={<RoleBasedRoute pageName="SiteCheckIn"><SiteCheckIn /></RoleBasedRoute>} />
      <Route path="/TimeClockIn" element={<RoleBasedRoute pageName="SiteCheckIn"><SiteCheckIn /></RoleBasedRoute>} />
      <Route path="/QRCode" element={<Navigate to="/SiteQRManagement" replace />} />
      <Route path="/QRCodeManagement" element={<Navigate to="/SiteQRManagement" replace />} />
      <Route path="/ScanPatrol" element={<RoleBasedRoute pageName="ScanPatrol"><ScanPatrol /></RoleBasedRoute>} />
      <Route path="/SiteCheckInConfig" element={<RoleBasedRoute pageName="SiteCheckInConfig"><SiteCheckInConfig /></RoleBasedRoute>} />

      </Route> {/* end LayoutOutlet wrapper */}

      {/* Routes outside the layout */}
      <Route path="/InAppBrowser" element={<InAppBrowser />} />
      <Route path="/ClientDashboard" element={<RoleBasedRoute allowedRoles={["client"]}><ClientDashboard /></RoleBasedRoute>} />
      <Route path="/ServiceCoverageMap" element={<RoleBasedRoute pageName="ServiceCoverageMap"><ServiceCoverageMap /></RoleBasedRoute>} />

      {/* Catch all unauthenticated access to portal routes → PublicAccess */}
      <Route path="*" element={!user ? <Navigate to="/Login" replace /> : <PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <CompanyProvider>
        <DualViewProvider>
          <QueryClientProvider client={queryClientInstance}>
            <ThemeManager />
            <Router>
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </DualViewProvider>
      </CompanyProvider>
    </AuthProvider>
  )
}

export default App