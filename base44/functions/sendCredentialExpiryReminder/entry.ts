import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all credentials and employees
    const credentials = await base44.entities.Credential.list();
    const employees = await base44.entities.Employee.list();
    
    const today = new Date();
    const ninetyDaysFromNow = new Date(today);
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    
    // Find credentials expiring in 90 days
    const expiringCredentials = credentials.filter(cred => {
      if (!cred.expiry_date || cred.status === 'expired') return false;
      const expiryDate = new Date(cred.expiry_date);
      const daysUntilExpiry = (expiryDate - today) / (1000 * 60 * 60 * 24);
      return daysUntilExpiry > 0 && daysUntilExpiry <= 90;
    });
    
    let emailCount = 0;
    
    // Send emails for each expiring credential
    for (const cred of expiringCredentials) {
      const employee = employees.find(e => e.id === cred.employee_id);
      if (!employee || !employee.email) continue;
      
      const daysUntilExpiry = Math.floor((new Date(cred.expiry_date) - today) / (1000 * 60 * 60 * 24));
      
      const emailBody = `
        <p>Dear ${employee.firstName || 'Employee'},</p>
        
        <p>This is a reminder that your <strong>${cred.credential_name}</strong> credential is expiring soon.</p>
        
        <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #c9a227;">
          <p><strong>Credential Details:</strong></p>
          <ul style="margin: 10px 0;">
            <li>Credential Name: ${cred.credential_name}</li>
            <li>Credential Number: ${cred.credential_number || 'N/A'}</li>
            <li>Issuing Authority: ${cred.issuing_authority || 'N/A'}</li>
            <li>Expiration Date: ${new Date(cred.expiry_date).toLocaleDateString()}</li>
            <li>Days Remaining: <strong>${daysUntilExpiry}</strong></li>
          </ul>
        </div>
        
        <p>Please take action to renew your credential before it expires to maintain compliance.</p>
        
        <p>If you have any questions, please contact your supervisor or the HR department.</p>
        
        <p>Best regards,<br>NPS Administration</p>
      `;
      
      try {
        await base44.integrations.Core.SendEmail({
          to: employee.email,
          subject: `Credential Expiration Reminder - ${cred.credential_name}`,
          body: emailBody,
        });
        emailCount++;
        console.log(`Sent reminder to ${employee.email} for ${cred.credential_name}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${employee.email}:`, emailError);
      }
    }
    
    return Response.json({ 
      success: true, 
      message: `Sent ${emailCount} credential expiration reminders`,
      count: emailCount,
      totalExpiring: expiringCredentials.length
    });
  } catch (error) {
    console.error('Error in credential expiry check:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});