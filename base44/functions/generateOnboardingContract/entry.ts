import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clientId, billingPrefs } = await req.json();

    const client = await base44.asServiceRole.entities.Client.get(clientId);

    const contractData = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Generate a professional security services contract for a new client onboarding.

Client Information:
- Company Name: ${client.name}
- Contact Person: ${client.contact_person || 'N/A'}
- Email: ${client.email}
- Phone: ${client.phone || 'N/A'}

Billing Preferences:
- Preferred Payment Method: ${billingPrefs.preferred_payment_method || 'Check'}
- Payment Terms: ${billingPrefs.payment_terms || 'Net 30'}
- Tax Rate: ${billingPrefs.tax_rate || 0}%
- Service Type: ${billingPrefs.service_type || 'Security Patrol Services'}
- Monthly Rate: ${billingPrefs.monthly_rate ? '$' + billingPrefs.monthly_rate : 'To be negotiated'}

Generate a professional service contract with these sections:
1. AGREEMENT HEADER - parties, effective date placeholder, agreement type
2. SCOPE OF SERVICES - detailed security services description
3. TERM AND RENEWAL - initial term, auto-renewal, notice periods
4. FEES AND PAYMENT - rates, payment terms, late fees, tax details
5. INSURANCE AND LIABILITY - required insurance, liability limits
6. CONFIDENTIALITY - data protection obligations
7. TERMINATION - conditions, notice requirements
8. GENERAL PROVISIONS - governing law, entire agreement
9. SIGNATURE BLOCK - signature lines for both parties

Make it professional, thorough, and specific to security services.`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          sections: {
            type: "array",
            items: {
              type: "object",
              properties: {
                heading: { type: "string" },
                content: { type: "string" }
              }
            }
          }
        }
      }
    });

    return Response.json({ success: true, contract: contractData });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});