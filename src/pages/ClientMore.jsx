import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, BarChart3, MapPin, Calendar, MessageSquare, Settings, HelpCircle, Shield, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const MENU_ITEMS = [
  { label: "Sign Up for Training", icon: GraduationCap, url: "https://www.nationwidepolice.com/training", color: "bg-purple-100 text-purple-700" },
  { label: "Site Map", icon: MapPin, page: "ClientSiteMap", color: "bg-[#1a2b4a] text-white" },
  { label: "Schedule", icon: Calendar, page: "ClientSchedule", color: "bg-slate-100" },
  { label: "Reports", icon: BarChart3, page: "ClientReports", color: "bg-slate-100" },
  { label: "Invoices", icon: FileText, page: "ClientInvoices", color: "bg-amber-50 text-amber-700" },
  { label: "Documents", icon: FileText, page: "Documents", color: "bg-slate-100" },
  { label: "Messages", icon: MessageSquare, page: "ClientCommunicationHub", color: "bg-blue-50 text-blue-700" },
  { label: "My Profile", icon: Settings, page: "ClientProfile", color: "bg-slate-100" },
  { label: "Help", icon: HelpCircle, page: "Help", color: "bg-slate-100" },
].map(item => ({ ...item, key: item.url || item.page }));

export default function ClientMore() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-[#1a2b4a] text-white p-6">
        <h1 className="text-2xl font-bold">More</h1>
        <p className="text-slate-300 text-sm mt-1">Client portal tools</p>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {MENU_ITEMS.map((item) => (
            <Card
              key={item.key}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => item.url ? window.open(item.url, "_blank") : navigate(createPageUrl(item.page))}
            >
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}