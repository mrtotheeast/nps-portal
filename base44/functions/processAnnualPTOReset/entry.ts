import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch all active employees
    const employees = await base44.asServiceRole.entities.Employee.filter({ status: 'active' });
    
    // Get app settings
    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const carryoverPolicy = settings.find(s => s.setting_key === 'pto_carryover_policy')?.setting_value || 'none';
    const maxCarryover = parseFloat(settings.find(s => s.setting_key === 'pto_carryover_max')?.setting_value || '0');

    let processedCount = 0;

    for (const employee of employees) {
      const currentBalance = employee.ptoBalance || 0;
      let newBalance = 0;

      // Apply carryover rule
      if (carryoverPolicy === 'all') {
        newBalance = currentBalance;
      } else if (carryoverPolicy === 'custom' && maxCarryover > 0) {
        newBalance = Math.min(currentBalance, maxCarryover);
      }
      // 'none' means new balance starts at 0

      // Update employee
      await base44.asServiceRole.entities.Employee.update(employee.id, {
        ptoBalance: newBalance,
      });

      // Send notification email
      await base44.integrations.Core.SendEmail({
        to: employee.email,
        subject: 'Your PTO Balance for 2026',
        body: `
          <!DOCTYPE html>
          <html>
          <head><style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; }
            .header { background: linear-gradient(135deg, #1a2b4a 0%, #2d4a6f 100%); color: #c9a227; padding: 20px; text-align: center; border-radius: 4px; margin-bottom: 20px; }
            .content { line-height: 1.6; color: #333; }
            .balance { font-size: 24px; font-weight: bold; color: #1a2b4a; margin: 20px 0; }
          </style></head>
          <body>
            <div class="container">
              <div class="header"><h1>2026 PTO Balance</h1></div>
              <div class="content">
                <p>Hi ${employee.firstName},</p>
                <p>Your PTO balance has been reset for the new year.</p>
                <div class="balance">${newBalance.toFixed(2)} hours</div>
                <p>This balance is based on our carryover policy applied on January 1st.</p>
                <p>Questions? Contact HR at Info@NationwidePolice.com</p>
              </div>
            </div>
          </body>
          </html>
        `,
        from_name: 'Nationwide Police Services',
      });

      processedCount++;
    }

    return Response.json({ success: true, processed_count: processedCount });
  } catch (error) {
    console.error('Error processing annual PTO reset:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});