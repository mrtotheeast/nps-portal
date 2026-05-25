import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useDualView } from "@/context/DualViewContext";
import {
  User, Calendar, FileText, MessageSquare, GraduationCap, Award, Clock,
  Settings, LogOut, ChevronRight, Globe, Shield, Bell, HelpCircle, Search,
  Repeat, Map, Shirt, BookOpen, DollarSign
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// Exact employee/officer More tab contents per spec
const SECTIONS = [
  {
    title: "My Work",
    color: "bg-blue-100 text-blue-700",
    items: [
      { icon: Calendar, label: "My Schedule", page: "Schedule", description: "View upcoming and past shifts" },
      { icon: Clock, label: "My Timesheet", page: "MyTimesheets", description: "View clock in and out history" },
      { icon: Repeat, label: "Shift Requests", page: "ShiftBidding", description: "Swap, drop, or bid on open shifts" },
      { icon: Calendar, label: "My PTO", page: "PTORequest", description: "PTO balance, requests and history" },
    ]
  },
  {
    title: "My Development",
    color: "bg-purple-100 text-purple-700",
    items: [
      { icon: GraduationCap, label: "My Training", page: "MyTrainings", description: "Assigned courses, completions, certificates" },
      { icon: Award, label: "My Credentials", page: "Credentials", description: "View credentials and expiry dates" },
      { icon: Map, label: "CCW Reciprocity Map", page: "CCWReciprocityMap", description: "Concealed carry laws by state" },
    ]
  },
  {
    title: "My Documents",
    color: "bg-amber-100 text-amber-700",
    items: [
      { icon: FileText, label: "My Documents", page: "Documents", description: "Documents assigned to me including onboarding" },
      { icon: Shirt, label: "Uniform Request", page: "UniformInventory", description: "Request uniform items or replacements" },
      { icon: BookOpen, label: "Company Policies", page: "PolicyManagement", description: "View company policy documents" },
    ]
  },
  {
    title: "Communication",
    color: "bg-emerald-100 text-emerald-700",
    items: [
      { icon: MessageSquare, label: "WorkChat", page: "Chat", description: "Team messaging" },
      { icon: Bell, label: "Announcements", page: "Announcements", description: "View company announcements" },
    ]
  },
  {
    title: "My Account",
    color: "bg-slate-100 text-slate-700",
    items: [
      { icon: User, label: "My Profile", page: "Profile", description: "View and edit personal information" },
      { icon: Settings, label: "Settings", page: "Settings", description: "Employee settings" },
      { icon: HelpCircle, label: "Help", page: "Help", description: "Help and support information" },
    ]
  }
];

export default function EmployeeMore() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { activeView } = useDualView();
  const navigate = useNavigate();

  const { data: appSettings = [] } = useQuery({
    queryKey: ["app-settings"],
    queryFn: () => base44.entities.AppSettings.list(),
  });

  const payrollUrl = appSettings.find(s => s.setting_key === "employee_payroll_url")?.setting_value;

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const sectionsWithPayroll = SECTIONS.map(section => {
    if (section.title === "My Account" && payrollUrl) {
      return {
        ...section,
        items: [
          section.items[0],
          { icon: DollarSign, label: "My Payroll", url: payrollUrl, description: "View pay stubs, tax documents, and payroll information" },
          ...section.items.slice(1)
        ]
      };
    }
    return section;
  });

  const filteredSections = searchQuery.trim()
    ? sectionsWithPayroll.map(s => ({ ...s, items: s.items.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()) || item.description.toLowerCase().includes(searchQuery.toLowerCase())) })).filter(s => s.items.length > 0)
    : sectionsWithPayroll;

  // Handle navigation
  const handleNavClick = (page) => {
    navigate(createPageUrl(page));
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      <div className="bg-[#1a2b4a] text-white px-4 pt-6 pb-4">
        <Link to={createPageUrl("Profile")}>
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-16 h-16 border-2 border-[#c9a227]">
              <AvatarImage src={user?.profile_photo} />
              <AvatarFallback className="bg-[#c9a227] text-[#1a2b4a] text-xl font-bold">{user?.full_name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{user?.full_name || "Loading..."}</h2>
              <p className="text-slate-300 text-sm">{user?.email}</p>
              <Badge className="mt-1 bg-[#c9a227] text-[#1a2b4a] text-xs capitalize">{(user?.role || "employee").replace("_", " ")}</Badge>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </div>
        </Link>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search features..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-slate-400" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {filteredSections.map((section) => (
          <div key={section.title}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">{section.title}</h3>
            <Card className="shadow-sm overflow-hidden">
              <CardContent className="p-0 divide-y divide-slate-100">
                {section.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => item.url ? window.open(item.url, "_blank") : handleNavClick(item.page)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors w-full text-left"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${section.color}`}><item.icon className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0"><p className="font-medium text-sm text-slate-900">{item.label}</p><p className="text-xs text-slate-500 truncate">{item.description}</p></div>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <button onClick={() => base44.auth.logout()} className="flex items-center gap-3 px-4 py-3 w-full hover:bg-red-50 transition-colors text-red-600 rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center"><LogOut className="w-4 h-4 text-red-600" /></div>
              <span className="font-medium text-sm">Sign Out</span>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}