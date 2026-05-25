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
    const assignment = payload.data;

    if (!assignment || !assignment.employee_id) {
      return Response.json({ skipped: "no assignment data" });
    }

    const base44 = createClientFromRequest(req);

    // Get the employee
    const employees = await base44.asServiceRole.entities.Employee.filter({
      id: assignment.employee_id,
    });
    const employee = employees[0];

    if (!employee || !employee.phoneNumber) {
      return Response.json({ skipped: "employee has no phone number" });
    }

    // Get the training details
    let trainingName = "a new training";
    if (assignment.training_id) {
      const trainings = await base44.asServiceRole.entities.Training.filter({
        id: assignment.training_id,
      });
      if (trainings[0]?.title) trainingName = trainings[0].title;
    }

    const dueDate = assignment.due_date
      ? ` Due by: ${assignment.due_date}.`
      : "";

    const message = `📚 NPS Training: You've been assigned "${trainingName}".${dueDate} Please log in to the NPS Portal to complete it.`;

    await sendSms(employee.phoneNumber, message);
    return Response.json({ success: true, sent_to: employee.phoneNumber });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});