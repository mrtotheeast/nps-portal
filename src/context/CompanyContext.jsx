import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const CompanyContext = createContext(null);

// The NPS platform owner — hardcoded for zero extra API calls
const NPS_EMAIL = 'justin.ashe@nationwidepolice.com';
const NPS_COMPANY_ID = '6a0a3c7db844b65098df468a';

const SESSION_KEY = 'nps_company_id';

export function CompanyProvider({ children }) {
  const [company, setCompany] = useState(null);
  const [companyId, setCompanyId] = useState(() => sessionStorage.getItem(SESSION_KEY) || null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(!sessionStorage.getItem(SESSION_KEY));

  useEffect(() => {
    // If already cached in session, just fetch company details without re-resolving
    const cached = sessionStorage.getItem(SESSION_KEY);
    if (cached) {
      base44.entities.Company.filter({ id: cached })
        .then(companies => { if (companies.length > 0) setCompany(companies[0]); })
        .catch(() => {})
        .finally(() => setLoading(false));
      return;
    }

    const loadCompany = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) { setLoading(false); return; }

        const isSuper = (user.role === 'super_admin' || user.role_type === 'super_admin') &&
                        user.email?.toLowerCase() === NPS_EMAIL;
        setIsSuperAdmin(isSuper);

        // Super admin impersonation
        const impersonatingId = isSuper ? sessionStorage.getItem('impersonating_company') : null;

        // Fast path: NPS admin — no extra API calls needed
        if (!impersonatingId && user.email?.toLowerCase() === NPS_EMAIL) {
          sessionStorage.setItem(SESSION_KEY, NPS_COMPANY_ID);
          setCompanyId(NPS_COMPANY_ID);
          const companies = await base44.entities.Company.filter({ id: NPS_COMPANY_ID });
          if (companies.length > 0) setCompany(companies[0]);
          setLoading(false);
          return;
        }

        let userCompanyId = impersonatingId || user.company_id;

        // Fallback: try Employee entity (single call, avoids hitting User entity)
        if (!userCompanyId && user.email) {
          try {
            const employees = await base44.entities.Employee.filter({ email: user.email });
            if (employees.length > 0) userCompanyId = employees[0].company_id;
          } catch (e) {
            console.warn('Could not fetch employee company_id:', e.message);
          }
        }

        if (!userCompanyId) userCompanyId = NPS_COMPANY_ID;

        sessionStorage.setItem(SESSION_KEY, userCompanyId);
        setCompanyId(userCompanyId);

        try {
          const companies = await base44.entities.Company.filter({ id: userCompanyId });
          if (companies.length > 0) setCompany(companies[0]);
        } catch (e) {
          console.warn('Could not fetch company details:', e.message);
        }
      } catch (error) {
        console.error('Failed to load company context:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, []);

  // Super admin impersonation helpers
  const startImpersonating = (targetCompanyId) => {
    sessionStorage.setItem('impersonating_company', targetCompanyId);
    sessionStorage.removeItem(SESSION_KEY); // clear cache so it re-resolves
    window.location.reload();
  };

  const stopImpersonating = () => {
    sessionStorage.removeItem('impersonating_company');
    sessionStorage.removeItem(SESSION_KEY); // clear cache so it re-resolves to NPS
    window.location.reload();
  };

  const isImpersonating = !!sessionStorage.getItem('impersonating_company');

  return (
    <CompanyContext.Provider value={{
      company,
      companyId,
      loading,
      isSuperAdmin,
      isImpersonating,
      startImpersonating,
      stopImpersonating,
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) throw new Error('useCompany must be used within CompanyProvider');
  return context;
}