import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employee_id, employee_name } = await req.json();

    const profileUrl = `https://${Deno.env.get('BASE44_APP_ID')}.base44.com/EmployeeProfile?id=${employee_id}`;

    const qrImage = await base44.asServiceRole.integrations.Core.GenerateImage({
      prompt: `A professional, high-contrast QR code that encodes the URL: ${profileUrl}. Below the QR code, include the text "${employee_name}" in a clean, professional font. White background, black QR code, centered layout, 512x512 pixels.`
    });

    return Response.json({
      success: true,
      qr_code_url: qrImage.url,
      profile_url: profileUrl
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});