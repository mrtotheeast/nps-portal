import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { email, phoneNumber, method = 'email' } = await req.json();

        if (!email && !phoneNumber) {
            return Response.json({ error: 'Email or phone number required' }, { status: 400 });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        if (method === 'sms' && phoneNumber) {
            const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
            const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
            const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

            if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
                return Response.json({ error: 'SMS not configured' }, { status: 500 });
            }

            const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
            const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
            const message = `Your NPS password reset code is: ${code}. Valid for 10 minutes.`;

            const formData = new URLSearchParams();
            formData.append('To', phoneNumber);
            formData.append('From', TWILIO_PHONE_NUMBER);
            formData.append('Body', message);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            });

            if (!response.ok) {
                return Response.json({ error: 'Failed to send SMS code' }, { status: 500 });
            }

            return Response.json({ success: true, message: 'Password reset code sent via SMS', method: 'sms' });
        } else {
            const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
            
            if (!SENDGRID_API_KEY) {
                return Response.json({ error: 'Email not configured' }, { status: 500 });
            }

            const body = `Your NPS Portal password reset code is: ${code}. This code expires in 10 minutes.`;

            await base44.asServiceRole.integrations.Core.SendEmail({
                to: email,
                subject: 'Password Reset Code',
                body
            });

            return Response.json({ success: true, message: 'Password reset code sent via email', method: 'email' });
        }

    } catch (error) {
        console.error('Error sending password reset code:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});