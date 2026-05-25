import { useCompany } from "@/context/CompanyContext";

/**
 * Hook to check if the current user's company is the platform owner (NPS)
 * Platform owner companies are exempt from all billing/subscription charges
 */
export function usePlatformOwnerCheck() {
  const { company, loading } = useCompany();

  const isPlatformOwner = company?.is_platform_owner === true;

  return {
    isPlatformOwner,
    company,
    isLoading: loading,
  };
}