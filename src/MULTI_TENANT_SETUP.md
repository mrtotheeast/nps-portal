# Multi-Tenant System Implementation Guide

## Overview
NPS Portal now supports multiple independent companies (tenants) with complete data isolation. Each company has its own employees, clients, data, and branding.

## Architecture

### Core Components
1. **Company Entity** — Stores tenant metadata (name, logo, color, plan)
2. **CompanyContext** — Global context providing `companyId` to all pages
3. **useTenantFilter Hook** — Automatically filters queries by `company_id`
4. **SuperAdminDashboard** — Manages all companies (admin only)
5. **CompanySettings** — Per-tenant branding configuration

### Data Isolation
- **Every entity** now has a `company_id` field
- **Every query** uses `useTenantFilter()` to automatically scope data
- **Super admins** see all data across all companies (company_id validation bypassed)
- **Regular users** only see their company's data

---

## Phase 1: Initial Setup (Run Once)

### 1. Create NPS Company Record
Run the migration function to automatically assign all existing data to NPS:

```bash
# Invoke via dashboard or API:
POST /api/functions/migrateToTenant
```

This will:
- Create the "Nationwide Police Services" company with slug `nps`
- Assign all existing employees, sites, incidents, etc. to NPS
- Set NPS as the default company_id for backward compatibility

### 2. Mark Justin Ashe as Super Admin
In the dashboard database editor:
```
User entity → Find justin.ashe@nationwidepolice.com
Set role = "super_admin"
```

Or use the backend:
```bash
POST /api/functions/setSuperAdmin
{ "email": "justin.ashe@nationwidepolice.com" }
```

### 3. Verify Company Isolation
- Log in as an NPS admin → See all NPS data ✓
- Log in as Company B admin → See only Company B data ✓
- Log in as super admin → See cross-tenant dashboard ✓

---

## Phase 2: Add company_id to Existing Entities

Update your entity schemas to include:

```json
{
  "company_id": {
    "type": "string",
    "description": "Tenant company ID for data isolation"
  }
}
```

**Affected entities:**
- Employee, Shift, Site, Incident, Timesheet, PatrolSession
- TrainingAssignment, Announcement, Document, ChatChannel
- Client, Invoice, Credential, OnboardingDocument, etc.

**⚠️ IMPORTANT:** Add `company_id` to **every** entity that stores business data.

---

## Phase 3: Update Queries to Use Tenant Filter

### Before (Single Tenant)
```javascript
const { data: employees } = useQuery({
  queryKey: ["employees"],
  queryFn: () => base44.entities.Employee.list()
});
```

### After (Multi-Tenant)
```javascript
import { useTenantFilter } from '@/hooks/useTenantFilter';

const tenantFilter = useTenantFilter();
const { data: employees } = useQuery({
  queryKey: ["employees"],
  queryFn: () => base44.entities.Employee.filter(tenantFilter)
});
```

---

## Phase 4: Onboard a New Company

### Via Super Admin Dashboard
1. Navigate to `/SuperAdminDashboard`
2. Click "Create Company"
3. Enter company name, slug, owner email
4. Super admin creates the company and invites the owner

### Programmatically
```bash
POST /api/functions/initializeTenant
{
  "company_name": "Acme Security",
  "company_slug": "acme",
  "subscription_plan": "professional"
}
```

---

## Phase 5: Invite Users to a Company

### Option A: Admin Invites via App
When company admin logs in, they can:
1. Go to "Invite User" or "Employee Directory"
2. Select employees and send invitations
3. Invites automatically include their `company_id`

### Option B: Backend Function
```bash
POST /api/functions/inviteToTenant
{
  "email": "newuser@example.com",
  "role": "officer",
  "company_id": "acme_company_id"
}
```

### User Accept Flow
1. New user receives email with invite link
2. Email includes `company_id` in URL
3. User creates account and is automatically assigned to company
4. User sees only their company's data

---

## Usage Patterns

### 1. Query with Tenant Filter
```javascript
import { useTenantFilter } from '@/hooks/useTenantFilter';

export function MyComponent() {
  const tenantFilter = useTenantFilter();
  
  const { data } = useQuery({
    queryKey: ["data"],
    queryFn: () => base44.entities.MyEntity.filter(tenantFilter)
  });
}
```

### 2. Create with Tenant Assignment
```javascript
import { useTenantMutation } from '@/hooks/useTenantFilter';

const { addCompanyId } = useTenantMutation();

const newRecord = await base44.entities.Employee.create(
  addCompanyId({ firstName: "John", lastName: "Doe" })
);
// Automatically includes company_id
```

### 3. Super Admin Cross-Tenant Access
```javascript
// Super admins see all data
if (companyId === 'super_admin') {
  // Query without tenant filter
  const allCompanies = await base44.entities.Company.list();
}
```

### 4. Display Tenant Branding
```javascript
import { useCompany } from '@/context/CompanyContext';

export function Header() {
  const { company } = useCompany();
  
  return (
    <header style={{ backgroundColor: company?.primary_color }}>
      <img src={company?.logo_url} alt="Company" />
      <h1>{company?.name || "NPS Portal"}</h1>
    </header>
  );
}
```

---

## File Reference

### New Files Created
- `entities/Company.json` — Company entity schema
- `context/CompanyContext.jsx` — Global company context
- `hooks/useTenantFilter.js` — Tenant query helper
- `pages/CompanySettings.jsx` — Per-tenant branding
- `pages/SuperAdminDashboard.jsx` — Multi-tenant admin
- `functions/initializeTenant.js` — Create new company
- `functions/migrateToTenant.js` — One-time migration
- `functions/inviteToTenant.js` — Tenant-aware invitations

### Modified Files
- `App.jsx` — Added CompanyProvider wrapper, new routes
- `layout.js` — Display company branding
- `pages/EmployeeHome.jsx` — Already uses global context

---

## Migration Checklist

- [ ] Run `migrateToTenant` to create NPS company and assign existing data
- [ ] Mark Justin Ashe as super_admin
- [ ] Add `company_id` to all entity schemas
- [ ] Update all queries to use `useTenantFilter()`
- [ ] Update all mutations to use `addCompanyId()`
- [ ] Test NPS company still works (backward compatibility)
- [ ] Test multi-tenant isolation (data cannot cross companies)
- [ ] Test super admin can see all companies
- [ ] Test new company onboarding flow
- [ ] Deploy to production

---

## Troubleshooting

### Issue: "Unauthorized" when creating/updating
**Cause:** Not using `addCompanyId()` in mutations
**Fix:** Wrap payloads with `addCompanyId()` from `useTenantMutation`

### Issue: Employees see other company's data
**Cause:** Query not using tenant filter
**Fix:** Add `useTenantFilter()` and pass to `.filter()`

### Issue: Super admin can't see cross-tenant data
**Cause:** Query checking `if (companyId)` before filtering
**Fix:** Check `if (companyId === 'super_admin')` to skip filter

### Issue: Logo not showing in header
**Cause:** CompanyContext not initialized yet
**Fix:** Check `loading` state in CompanyProvider, show fallback UI

---

## Security Notes

1. **Never trust client-side filters** — Always validate company_id server-side
2. **Super admin role is sensitive** — Require extra verification for account changes
3. **Company ownership** — Record who created/owns each company for audit
4. **Data residency** — All company data is scoped by company_id, enforced at entity level
5. **Cross-company operations** — Block all cross-tenant mutations, log attempts

---

## Next Steps

1. Run the migration function
2. Verify data integrity (sample queries per company)
3. Test the new onboarding flow with a test company
4. Update all existing queries incrementally
5. Deploy with feature flag if needed
6. Monitor for data leaks or isolation violations