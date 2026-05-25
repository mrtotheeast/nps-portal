import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Shield, Calendar, FileText, MapPin, MessageSquare, AlertTriangle, BarChart3, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import LoadingScreen from "@/components/shared/LoadingScreen";

export default function ClientPortal() {
  const navigate = useNavigate();

  const { data: user, isLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["client-incidents"],
    queryFn: () => base44.entities.Incident.filter({ status: "open" }, "-incident_date", 5),
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["client-invoices"],
    queryFn: () => base44.entities.Invoice?.filter?.({ status: "pending" }) || Promise.resolve([]),
  });

  if (isLoading) return <LoadingScreen />;

  const tiles = [
    { label: "Site Map", icon: MapPin, page: "ClientSiteMap", color: "bg-[#1a2b4a] text-white" },
    { label: "Schedule", icon: Calendar, page: "ClientSchedule", color: "bg-slate-100" },
    { label: "Reports", icon: BarChart3, page: "ClientReports", color: "bg-slate-100" },
    { label: "Incidents", icon: AlertTriangle, page: "ClientPortal", color: "bg-red-50 text-red-700" },
    { label: "Invoices", icon: FileText, page: "ClientInvoices", color: "bg-slate-100" },
    { label: "Documents", icon: FileText, page: "Documents", color: "bg-slate-100" },
    { label: "Messages", icon: MessageSquare, page: "Chat", color: "bg-slate-100" },
    { label: "Settings", icon: Settings, page: "ClientProfile", color: "bg-slate-100" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-[#1a2b4a] text-white px-6 pt-6 pb-12">
        <p className="text-slate-300 text-sm">Welcome back,</p>
        <h1 className="text-2xl font-bold">{user?.full_name}</h1>
        <p className="text-slate-300 text-sm mt-1">Client Security Portal</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-6 pb-24">
        {/* Alerts */}
        {(incidents.length > 0 || invoices.length > 0) && (
          <div className="space-y-2 mb-6">
            {incidents.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-700 font-medium">{incidents.length} open incident(s) at your site</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-600 text-xs" onClick={() => navigate(createPageUrl("ClientReports"))}>
                    View →
                  </Button>
                </CardContent>
              </Card>
            )}
            {invoices.length > 0 && (
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-600" />
                    <p className="text-sm text-amber-700 font-medium">{invoices.length} invoice(s) pending payment</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-amber-600 text-xs" onClick={() => navigate(createPageUrl("ClientInvoices"))}>
                    View →
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Quick Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tiles.map((tile) => (
            <Card
              key={tile.page}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(createPageUrl(tile.page))}
            >
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tile.color}`}>
                  <tile.icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium">{tile.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}