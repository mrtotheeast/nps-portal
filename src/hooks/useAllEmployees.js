import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useAllEmployees({ includeInactive = false } = {}) {
  const { data: employeeRecords = [], isLoading: empLoading, refetch: refetchEmployees } = useQuery({
    queryKey: ["all-employees"],
    queryFn: () => base44.entities.Employee.list(),
    staleTime: 30000,
  });

  const { data: userRecords = [], isLoading: userLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list(),
    staleTime: 30000,
  });

  const employees = useMemo(() => {
    const userByEmail = {};
    userRecords.forEach(u => { if (u.email) userByEmail[u.email.toLowerCase()] = u; });
    return employeeRecords
      .filter(emp => includeInactive || (emp.status !== "inactive" && emp.status !== "terminated"))
      .map(emp => {
        const matchedUser = emp.email ? userByEmail[emp.email.toLowerCase()] : null;
        return {
          id: emp.id, _empId: emp.id, _userId: matchedUser?.id || null,
          firstName: emp.firstName || "", lastName: emp.lastName || "",
          full_name: `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || matchedUser?.full_name || "",
          email: emp.email || matchedUser?.email || "", phoneNumber: emp.phoneNumber || "",
          role: emp.role || matchedUser?.role_type || "employee", positionId: emp.positionId || "",
          position: emp.position || "", employmentType: emp.employmentType || "officer",
          siteIds: emp.siteIds || [], clientId: emp.clientId || "",
          employeeId: emp.employeeId || "", paychexWorkerId: emp.paychexWorkerId || "",
          baseHourlyRate: emp.baseHourlyRate || 0, positionRates: emp.positionRates || [], maxHours: emp.maxHours || 40,
          status: emp.status || "active", isActive: emp.status !== "inactive" && emp.status !== "terminated",
          invitation_status: emp.invitation_status || (matchedUser ? "active" : "not_invited"),
          invitation_sent_at: emp.invitation_sent_at || null,
          profilePhotoUrl: emp.profilePhotoUrl || matchedUser?.profile_photo || null,
          hireDate: emp.hireDate || "",
        };
      });
  }, [employeeRecords, userRecords, includeInactive]);

  return {
    employees,
    isLoading: empLoading || userLoading,
    refetch: () => { refetchEmployees(); refetchUsers(); },
    activeEmployees: employees.filter(e => e.isActive),
    officerEmployees: employees.filter(e => e.isActive && (e.role === "officer" || e.employmentType === "officer")),
  };
}