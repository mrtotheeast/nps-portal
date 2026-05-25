import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

async function sendSms(to, body) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: TWILIO_PHONE_NUMBER,
      To: to,
      Body: body,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Twilio error: ${data.message}`);
  return data;
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const incident = payload.data;

    if (!incident) {
      return Response.json({ skipped: "no incident data" });
    }

    const base44 = createClientFromRequest(req);

    // Get all admin/manager/supervisor employees with phone numbers
    const employees = await base44.asServiceRole.entities.Employee.filter({
      status: "active",
    });

    const recipients = employees.filter(emp =>
      emp.phoneNumber &&
      ["admin", "manager", "supervisor"].includes(emp.role)
    );

    const siteName = incident.site_id ? `Site ID: ${incident.site_id}` : "Unknown Site";
    const severity = incident.severity || "medium";
    const incidentType = incident.incident_type || "Incident";
    const message = `🚨 NPS ALERT: New ${severity.toUpperCase()} incident reported.\nType: ${incidentType}\nLocation: ${siteName}\nDescription: ${(incident.description || "").substring(0, 100)}\n\nPlease log in to review.`;

    const results = await Promise.allSettled(
      recipients.map(emp => sendSms(emp.phoneNumber, message))
    );

    const sent = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    return Response.json({ success: true, sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});