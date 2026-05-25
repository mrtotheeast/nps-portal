import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const userAgent = body.userAgent || req.headers.get('user-agent') || '';

    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    
    return Response.json({
      device_type: isMobile ? 'mobile' : 'desktop',
      user_agent: userAgent
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});