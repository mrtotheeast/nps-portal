import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { employeeId, recipientEmail, recipientName, documentUrl, documentTitle } = await req.json();
    if (!recipientEmail || !documentUrl) {
      return Response.json({ error: 'Missing recipientEmail or documentUrl' }, { status: 400 });
    }

    // Fetch employee info if employeeId provided
    let empName = recipientName;
    if (employeeId && !empName) {
      const emp = await base44.asServiceRole.entities.Employee.get(employeeId);
      empName = `${emp.firstName} ${emp.lastName}`;
    }

    // Fetch the document as base64 for attachment
    let attachments = [];
    try {
      const docResponse = await fetch(documentUrl);
      if (docResponse.ok) {
        const buffer = await docResponse.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        const fileName = documentTitle ? `${documentTitle}.pdf` : 'onboarding_document.pdf';
        attachments = [{ filename: fileName, content: base64 }];
      }
    } catch (e) {
      console.warn('Could not attach document, sending link instead:', e.message);
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Nationwide Police Services <noreply@npsportal.app>',
        to: [recipientEmail],
        subject: `${documentTitle || 'Onboarding Document'} - Nationwide Police Services`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1a2b4a; padding: 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: #c9a227; margin: 0; font-size: 22px;">Nationwide Police Services</h1>
              <p style="color: #c8d2e6; margin: 4px 0 0;">Onboarding Document</p>
            </div>
            <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
              <p style="color: #1e293b;">Dear ${empName || 'New Team Member'},</p>
              <p style="color: #475569;">Please review the attached onboarding document: <strong>${documentTitle || 'Onboarding Document'}</strong>.</p>
              ${attachments.length === 0 ? `<p><a href="${documentUrl}" style="color: #1a2b4a; font-weight: bold;">Click here to view the document</a></p>` : ''}
              <p style="color: #475569;">If you have any questions about this document, please reach out to HR.</p>
              <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">Nationwide Police Services | (240) 749-1141<br>9920 Franklin Square Dr Ste 110, Nottingham, MD 21236</p>
            </div>
          </div>
        `,
        attachments,
      }),
    });

    if (!resendResponse.ok) {
      const err = await resendResponse.text();
      throw new Error(`Resend error: ${err}`);
    }

    return Response.json({ success: true, message: `Onboarding document emailed to ${recipientEmail}` });
  } catch (error) {
    console.error('emailOnboardingDocument error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});