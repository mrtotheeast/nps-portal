# Quick Reference: Tenant-Aware Queries

## Pattern 1: Reading Data with Tenant Filter

```javascript
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenantFilter } from '@/hooks/useTenantFilter';

export function EmployeeList() {
  const tenantFilter = useTenantFilter();
  
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.filter(tenantFilter)
  });

  return <div>{employees?.map(e => <p>{e.firstName}</p>)}</div>;
}
```

## Pattern 2: Creating Records with Company Assignment

```javascript
import { useTenantMutation } from '@/hooks/useTenantFilter';
import { base44 } from '@/api/base44Client';

export function AddEmployee() {
  const { addCompanyId } = useTenantMutation();

  const handleCreate = async (formData) => {
    const record = await base44.entities.Employee.create(
      addCompanyId({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: 'employee'
      })
    );
  };
}
```

## Pattern 3: Updating with Tenant Check

```javascript
import { useTenantMutation } from '@/hooks/useTenantFilter';
import { base44 } from '@/api/base44Client';

export function UpdateEmployee(employeeId) {
  const { addCompanyId } = useTenantMutation();

  const handleUpdate = async (updates) => {
    // The hook ensures only updating records in your company
    await base44.entities.Employee.update(
      employeeId,
      addCompanyId(updates)
    );
  };
}
```

## Pattern 4: Multi-Filter Queries

```javascript
import { useTenantFilter } from '@/hooks/useTenantFilter';

const tenantFilter = useTenantFilter();

// Combine tenant filter with other conditions
const { data: activeEmployees } = useQuery({
  queryKey: ['active-employees'],
  queryFn: () => base44.entities.Employee.filter({
    ...tenantFilter,
    status: 'active'
  })
});

// Or with parameters
const { data: filtered } = useQuery({
  queryKey: ['employees', status],
  queryFn: () => base44.entities.Employee.filter(
    { ...tenantFilter, status },
    '-created_date',
    100
  )
});
```

## Pattern 5: Mutations with React Query

```javascript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantMutation } from '@/hooks/useTenantFilter';

export function CreateEmployee() {
  const queryClient = useQueryClient();
  const { addCompanyId } = useTenantMutation();

  const mutation = useMutation({
    mutationFn: (formData) =>
      base44.entities.Employee.create(addCompanyId(formData)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee created');
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      mutation.mutate(formData);
    }}>
      {/* form fields */}
    </form>
  );
}
```

## Pattern 6: Checking Super Admin Status

```javascript
import { useCompany } from '@/context/CompanyContext';

export function AdminPanel() {
  const { companyId } = useCompany();

  if (companyId === 'super_admin') {
    return <SuperAdminContent />;
  }

  return <RegularAdminContent />;
}
```

## Pattern 7: Custom Hooks for Specific Entities

```javascript
// hooks/useEmployees.js
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useTenantFilter } from '@/hooks/useTenantFilter';

export function useEmployees() {
  const tenantFilter = useTenantFilter();
  
  return useQuery({
    queryKey: ['employees', tenantFilter],
    queryFn: () => base44.entities.Employee.filter(tenantFilter),
    staleTime: 5 * 60 * 1000
  });
}

// Usage
import { useEmployees } from '@/hooks/useEmployees';

export function EmployeeList() {
  const { data: employees, isLoading } = useEmployees();
  // ...
}
```

## Pattern 8: Backend Functions with Tenant Safety

```javascript
// functions/createBulkEmployees.js
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const { employees } = await req.json();

    // Get user's company_id
    const userEmps = await base44.entities.Employee.filter({
      email: user.email
    });
    const companyId = userEmps[0]?.company_id;

    if (!companyId) {
      return Response.json({ error: 'No company assigned' }, { status: 403 });
    }

    // Create all with company_id
    for (const emp of employees) {
      await base44.entities.Employee.create({
        ...emp,
        company_id: companyId
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

## Pattern 9: Conditional Rendering by Company

```javascript
import { useCompany } from '@/context/CompanyContext';

export function Dashboard() {
  const { company, companyId, loading } = useCompany();

  if (loading) return <LoadingScreen />;

  return (
    <div>
      <header style={{ backgroundColor: company?.primary_color }}>
        <img src={company?.logo_url} alt={company?.name} />
      </header>
      
      <h1>{company?.name} Portal</h1>
      
      {companyId === 'super_admin' && <SuperAdminMenu />}
      {['admin', 'manager'].includes(company?.role) && <AdminMenu />}
    </div>
  );
}
```

## Pattern 10: Defensive Queries (Super Admin Bypass)

```javascript
import { useCompany } from '@/context/CompanyContext';
import { useTenantFilter } from '@/hooks/useTenantFilter';

export function Reports() {
  const { companyId } = useCompany();
  const tenantFilter = useTenantFilter(); // empty for super_admin

  const { data: incidents } = useQuery({
    queryKey: ['incidents', companyId],
    queryFn: () => {
      // Super admin sees all incidents
      // Regular users see only their company's
      return base44.entities.Incident.filter(tenantFilter);
    }
  });

  return <IncidentList incidents={incidents} />;
}
```

---

## Common Mistakes to Avoid

❌ **Wrong:** Querying without tenant filter
```javascript
const { data } = useQuery({
  queryFn: () => base44.entities.Employee.list() // ❌ Gets all employees!
});
```

✅ **Right:** Using tenant filter
```javascript
const tenantFilter = useTenantFilter();
const { data } = useQuery({
  queryFn: () => base44.entities.Employee.filter(tenantFilter) // ✅ Only your company
});
```

---

❌ **Wrong:** Forgetting company_id in creates
```javascript
await base44.entities.Employee.create({ firstName: "John" }) // ❌ No company_id!
```

✅ **Right:** Using addCompanyId
```javascript
const { addCompanyId } = useTenantMutation();
await base44.entities.Employee.create(
  addCompanyId({ firstName: "John" }) // ✅ Includes company_id
);
```

---

❌ **Wrong:** Mixing company data in displays
```javascript
const allCompanies = await base44.entities.Company.list();
// Regular user now sees all companies!
```

✅ **Right:** Check user role before showing cross-tenant data
```javascript
if (companyId === 'super_admin') {
  const allCompanies = await base44.entities.Company.list();
}
``