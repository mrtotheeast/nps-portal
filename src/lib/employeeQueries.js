// ─── 4-TIER ROLE SYSTEM ────────────────────────────────────────────────────────
// Roles: officer | employee | supervisor | admin
// Source of truth: Employee.role field

// ─── PREDICATES ───────────────────────────────────────────────────────────────

export const isOfficer      = (emp) => !!emp && emp.role === "officer";
export const isEmployee     = (emp) => !!emp && emp.role === "employee";
export const isSupervisor   = (emp) => !!emp && emp.role === "supervisor";
export const isAdminRole    = (emp) => !!emp && emp.role === "admin";
export const isOfficeStaff  = (emp) => !!emp && emp.role === "employee"; // alias

export const isActive       = (emp) => !!emp && emp.status !== "inactive" && emp.status !== "terminated";
export const isNotInvited   = (emp) => !!emp && (emp.invitation_status === "not_invited" || emp.invitation_status === "pending");

// ─── CATEGORY GETTERS ─────────────────────────────────────────────────────────

export const getOfficers        = (employees = []) => employees.filter(e => isActive(e) && isOfficer(e));
export const getEmployees       = (employees = []) => employees.filter(e => isActive(e) && isEmployee(e));
export const getOfficeStaff     = (employees = []) => employees.filter(e => isActive(e) && isEmployee(e)); // alias
export const getSupervisors     = (employees = []) => employees.filter(e => isActive(e) && isSupervisor(e));
export const getAdmins          = (employees = []) => employees.filter(e => isActive(e) && isAdminRole(e));
export const getActiveEmployees = (employees = []) => employees.filter(e => isActive(e));
export const getNotInvitedEmployees = (employees = []) => employees.filter(e => isNotInvited(e));

// ─── COUNTS (all non-terminated employees, regardless of invitation status) ───

export function getCategorizedCounts(employees = []) {
  // Count by role field directly — all employees except terminated/inactive
  const active = employees.filter(e => isActive(e));
  return {
    officers:    active.filter(e => e.role === "officer").length,
    employees:   active.filter(e => e.role === "employee").length,
    supervisors: active.filter(e => e.role === "supervisor").length,
    admins:      active.filter(e => e.role === "admin").length,
    total:       active.length,
  };
}

// ─── DIRECTORY ROLE FILTER ────────────────────────────────────────────────────

export function matchesRoleFilter(emp, roleFilter) {
  if (!emp || roleFilter === "all") return true;
  if (roleFilter === "officer")    return isOfficer(emp);
  if (roleFilter === "employee")   return isEmployee(emp);
  if (roleFilter === "supervisor") return isSupervisor(emp);
  if (roleFilter === "admin")      return isAdminRole(emp);
  return false;
}