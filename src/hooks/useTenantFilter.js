import { useCompany } from '@/context/CompanyContext';

/**
 * Returns { company_id: companyId } for ALL users including super_admin.
 * Super admin gets their own company (NPS) unless impersonating another tenant.
 * This ensures strict tenant isolation at the query level.
 */
export function useTenantFilter() {
  const { companyId } = useCompany();
  if (!companyId) return {};
  return { company_id: companyId };
}

/**
 * Hook to get the company_id for mutations (create, update).
 * Always stamps company_id on new records.
 */
export function useTenantMutation() {
  const { companyId } = useCompany();

  return {
    addCompanyId: (data) => {
      if (!companyId) return data;
      return { ...data, company_id: companyId };
    }
  };
}