import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Building2, AlertTriangle, FileText, Calendar, Shield, LogOut, User, Menu, X, Trash2, ChevronRight, MessageSquare, Receipt, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import LoadingScreen from "@/components/shared/LoadingScreen";
import ClientPortalFeeNotice from "@/components/clients/ClientPortalFeeNotice";

const SHIELD_URL = "https://media.base44.com/images/public/69fa7d4550030ecc751dd742/841c55b47_IMG_2356.png";

const NAV_ITEMS = [
  { label: "Dashboard",     path: "/ClientDashboard" },
  { label: "Schedule",      path: "/ClientSchedule" },
  { label: "Reports",       path: "/ClientReports" },
  { label: "Credentials",   path: "/ClientCredentials" },
  { label: "Contact Us",    path: "/ClientCommunicationHub" },
  { label: "More",          path: "/ClientMore" },
];

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();

  const currentUser = user;
  const loadingUser = isLoadingAuth;

  // Find the ClientContact record for this user, then look up their client
  const { data: myContact } = useQuery({
    queryKey: ["myClientContact", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const contacts = await base44.entities.ClientContact.filter({ email: currentUser.email });
      return contacts[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  const { data: myClient } = useQuery({
    queryKey: ["myClient", myContact?.client_id],
    queryFn: () => base44.entities.Client.get(myContact.client_id),
    enabled: !!myContact?.client_id,
  });

  const isDeleted = myClient?.status === "deleted";

  const { data: sites = [] } = useQuery({
    queryKey: ["clientSites", myClient?.id],
    queryFn: () => base44.entities.Site.filter({ client_id: myClient?.id }),
    enabled: !!myClient?.id && !isDeleted,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["clientIncidents", myClient?.id],
    queryFn: async () => {
      if (!sites.length) return [];
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 24);
      const all = await Promise.all(sites.map((s) => base44.entities.Incident.filter({ site_id: s.id })));
      return all.flat().filter((inc) => !inc.archived && new Date(inc.incident_date) >= cutoff);
    },
    enabled: sites.length > 0 && !isDeleted,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ["clientSchedules", myClient?.id],
    queryFn: async () => {
      if (!sites.length) return [];
      const all = await Promise.all(sites.map((s) => base44.entities.Schedule?.filter({ site_id: s.id }).catch(() => [])));
      return all.flat();
    },
    enabled: sites.length > 0 && !isDeleted,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["myClientContacts", myClient?.id],
    queryFn: () => base44.entities.ClientContact.filter({ client_id: myClient?.id, invite_status: "active" }),
    enabled: !!myClient?.id && !isDeleted,
  });

  if (loadingUser) return <LoadingScreen />;

  if (isDeleted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Account Deleted</h2>
          <p className="text-slate-600 mb-6">
            Your account has been deleted. Thank you for using NPS Portal. Please contact Nationwide
            Police Services if you need assistance.
          </p>
          <div className="text-sm text-slate-500 space-y-1 mb-6">
            <p>Email: Info@NationwidePolice.com</p>
            <p>Phone: (240) 749-1141</p>
          </div>
          <Button className="bg-[#1a2b4a]" onClick={() => base44.auth.logout()}>
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  const openIncidents = incidents.filter((i) => !["resolved", "closed"].includes(i.status));
  const clientName = myClient?.name || currentUser?.full_name || "Welcome";
  const currentPath = window.location.pathname;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top navigation header */}
      <header className="bg-[#1a2b4a] text-white sticky top-0 z-50 shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/ClientDashboard" className="flex items-center gap-2">
            <img src={SHIELD_URL} alt="NPS Logo" className="w-9 h-9 object-contain" />
            <div className="hidden sm:block">
              <div className="text-sm font-bold leading-tight">NPS Client Portal</div>
              <div className="text-[10px] text-slate-400">Nationwide Police Services</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  currentPath === item.path
                    ? "bg-[#c9a227] text-[#1a2b4a]"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User + Sign Out */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-300">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="bg-[#c9a227] text-[#1a2b4a] text-xs font-bold">
                  {currentUser?.full_name?.charAt(0) || "C"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden lg:inline">{currentUser?.full_name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-300 hover:text-white hover:bg-white/10 gap-1.5"
              onClick={() => base44.auth.logout()}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-white/10 px-4 py-2 flex gap-2 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                currentPath === item.path
                  ? "bg-[#c9a227] text-[#1a2b4a]"
                  : "text-slate-300 hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </header>

      {/* Page hero */}
      <div className="bg-[#1a2b4a] text-white px-4 py-6 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#c9a227] text-sm font-medium mb-1">Client Portal</p>
          <h1 className="text-2xl font-bold">{clientName}</h1>
          <p className="text-slate-300 text-sm mt-1">Security Services Overview</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Portal Fee Notice */}
        {contacts.length > 0 && (
          <ClientPortalFeeNotice 
            activeContactCount={contacts.length} 
            billingFrequency="monthly"
            clientName={myClient?.name}
          />
        )}

        {/* Stats — all tiles clickable */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Active Sites",
              value: sites.filter((s) => s.status === "active").length,
              icon: Building2,
              iconColor: "text-[#1a2b4a]",
              bgColor: "bg-[#1a2b4a]/5",
              onClick: () => navigate("/ClientSiteMap"),
            },
            {
              label: "Open Incidents",
              value: openIncidents.length,
              icon: AlertTriangle,
              iconColor: openIncidents.length > 0 ? "text-red-600" : "text-slate-400",
              bgColor: openIncidents.length > 0 ? "bg-red-50" : "bg-slate-50",
              onClick: () => navigate("/ClientReports?status=open"),
            },
            {
              label: "Total Incidents",
              value: incidents.length,
              icon: FileText,
              iconColor: "text-slate-600",
              bgColor: "bg-slate-50",
              onClick: () => navigate("/ClientReports"),
            },
            {
              label: "Scheduled Shifts",
              value: schedules.length,
              icon: Calendar,
              iconColor: "text-blue-600",
              bgColor: "bg-blue-50",
              onClick: () => navigate("/ClientSchedule"),
            },
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={stat.onClick}
              className="group relative rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 active:scale-[0.97] transition-all cursor-pointer text-center p-4 min-h-[88px] flex flex-col items-center justify-center gap-1"
            >
              <div className={`w-9 h-9 rounded-lg ${stat.bgColor} flex items-center justify-center mb-1`}>
                <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
              <ChevronRight className="w-3 h-3 text-slate-300 absolute bottom-2 right-2 group-hover:text-slate-500 transition-colors" />
            </button>
          ))}
        </div>

        {/* Extra quick-stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/ClientInvoices?status=unpaid")}
            className="group relative rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 active:scale-[0.97] transition-all cursor-pointer text-center p-4 min-h-[80px] flex flex-col items-center justify-center gap-1"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center mb-1">
              <Receipt className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-sm font-semibold text-slate-900">Invoices</div>
            <div className="text-xs text-slate-500">View unpaid invoices</div>
            <ChevronRight className="w-3 h-3 text-slate-300 absolute bottom-2 right-2 group-hover:text-slate-500 transition-colors" />
          </button>
          <button
            onClick={() => navigate("/ClientCommunicationHub")}
            className="group relative rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 active:scale-[0.97] transition-all cursor-pointer text-center p-4 min-h-[80px] flex flex-col items-center justify-center gap-1"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center mb-1">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-sm font-semibold text-slate-900">Messages</div>
            <div className="text-xs text-slate-500">Contact & communicate</div>
            <ChevronRight className="w-3 h-3 text-slate-300 absolute bottom-2 right-2 group-hover:text-slate-500 transition-colors" />
          </button>
          <button
            onClick={() => navigate("/ServiceRequests")}
            className="group relative rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-slate-300 active:scale-[0.97] transition-all cursor-pointer text-center p-4 min-h-[80px] flex flex-col items-center justify-center gap-1"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center mb-1">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-sm font-semibold text-slate-900">Service Requests</div>
            <div className="text-xs text-slate-500">Open &amp; pending requests</div>
            <ChevronRight className="w-3 h-3 text-slate-300 absolute bottom-2 right-2 group-hover:text-slate-500 transition-colors" />
          </button>
        </div>

        {/* Sites */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />My Sites</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/ClientSiteMap")} className="text-[#c9a227] text-xs">
              View Map →
            </Button>
          </CardHeader>
          <CardContent>
            {sites.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No sites assigned</p>
            ) : (
              <div className="space-y-2">
                {sites.map((site) => (
                  <button
                    key={site.id}
                    onClick={() => navigate("/ClientSiteMap")}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer text-left min-h-[52px]"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{site.name}</p>
                      <p className="text-sm text-slate-500">{site.address}, {site.city}, {site.state}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={site.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}>
                        {site.status}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        {incidents.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Recent Incidents</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/ClientReports")} className="text-[#c9a227] text-xs">
                View All →
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {incidents.slice(0, 5).map((inc) => (
                  <button
                    key={inc.id}
                    onClick={() => navigate("/ClientReports?status=open")}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer text-left min-h-[52px]"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{inc.incident_type}</p>
                      <p className="text-sm text-slate-500">{new Date(inc.incident_date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={
                        inc.severity === "critical" ? "bg-red-100 text-red-700" :
                        inc.severity === "high" ? "bg-orange-100 text-orange-700" :
                        "bg-yellow-100 text-yellow-700"
                      }>{inc.severity}</Badge>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-16 flex-col gap-1 min-h-[64px]" onClick={() => navigate("/ClientReports")}>
            <FileText className="w-5 h-5" /><span className="text-xs">Incident Reports</span>
          </Button>
          <Button variant="outline" className="h-16 flex-col gap-1 min-h-[64px]" onClick={() => navigate("/ClientSchedule")}>
            <Calendar className="w-5 h-5" /><span className="text-xs">Schedule</span>
          </Button>
          <Button variant="outline" className="h-16 flex-col gap-1 min-h-[64px]" onClick={() => navigate("/ClientPatrolReports")}>
            <Shield className="w-5 h-5" /><span className="text-xs">Patrol Reports</span>
          </Button>
          <Button variant="outline" className="h-16 flex-col gap-1 min-h-[64px]" onClick={() => navigate("/ClientContracts")}>
            <FileText className="w-5 h-5" /><span className="text-xs">My Contract</span>
          </Button>
        </div>
      </div>
    </div>
  );
}