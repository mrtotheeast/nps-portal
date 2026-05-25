import React from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDualView } from "@/context/DualViewContext";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";

const DASHBOARD_PAGES = [
  "AdminDashboard", "ManagerDashboard", "SupervisorDashboard",
  "OfficerDashboard", "EmployeeDashboard", "EmployeeHome",
];

export default function DualViewToggle() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeView, setActiveView } = useDualView();

  const userRole = user?.role;
  const currentPage = window.location.pathname.replace(/^\//, "") || "";

  const shouldShow =
    ["supervisor", "manager", "admin", "super_admin"].includes(userRole) &&
    DASHBOARD_PAGES.includes(currentPage);

  if (!shouldShow) return null;

  const isEmployeeView = activeView === "employee";
  const isAdminRole = userRole === "super_admin" || userRole === "admin";

  const handleToggle = () => {
    const newView = isEmployeeView ? "management" : "employee";
    setActiveView(newView);

    if (newView === "management") {
      const mgmtPage = userRole === "manager" ? "ManagerDashboard"
        : isAdminRole ? "AdminDashboard"
        : "SupervisorDashboard";
      navigate(createPageUrl(mgmtPage));
    } else {
      navigate(createPageUrl("EmployeeHome"));
    }
  };

  return (
    <Button
      onClick={handleToggle}
      className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg transition-all border-2 ${
        isEmployeeView
          ? "bg-[#c9a227] hover:bg-[#e6c35c] text-[#1a2b4a] border-[#1a2b4a]"
          : "bg-[#1a2b4a] hover:bg-[#2d4a6f] text-[#c9a227] border-[#c9a227]"
      }`}
      title={isEmployeeView
        ? (isAdminRole ? "Switch to Admin View" : "Switch to Supervisor View")
        : "Switch to Employee View"
      }
    >
      <div className="flex items-center gap-2">
        {isEmployeeView ? (
          <>
            <Briefcase className="w-4 h-4" />
            <span className="hidden sm:inline">{isAdminRole ? "Admin" : "Supervisor"}</span>
          </>
        ) : (
          <>
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Employee</span>
          </>
        )}
      </div>
    </Button>
  );
}