import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCompany } from '@/context/CompanyContext';

/**
 * Returns { hasAccess, isLoading, subscription }
 * Platform owner (NPS) always has access.
 * Other companies need an active AISubscription that hasn't expired.
 */
export function useAIAccess() {
  const { company, companyId, loading: companyLoading } = useCompany();

  const isPlatformOwner = company?.is_platform_owner === true || companyId === 'super_admin';

  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ['ai-subscription', companyId],
    queryFn: async () => {
      if (!companyId || companyId === 'super_admin') return null;
      const results = await base44.entities.AISubscription.filter({ company_id: companyId });
      return results[0] || null;
    },
    enabled: !isPlatformOwner && !!companyId && !companyLoading,
    staleTime: 5 * 60 * 1000
  });

  const isLoading = companyLoading || (!isPlatformOwner && subLoading);

  if (isPlatformOwner) {
    return { hasAccess: true, isLoading: false, subscription: null, isPlatformOwner: true };
  }

  const isActive =
    subscription?.status === 'active' &&
    subscription?.expiry_date &&
    new Date(subscription.expiry_date) > new Date();

  return {
    hasAccess: isActive,
    isLoading,
    subscription: subscription || null,
    isPlatformOwner: false
  };
}