import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const configs = await base44.asServiceRole.entities.ReportConfig.filter({ config_type: "pto_settings" });
    const settings = configs[0]?.config_data || { hoursPerWeek: 2.5, maxAccrualHours: 200 };
    
    const employees = await base44.asServiceRole.entities.Employee.filter({ status: "active" });
    
    let updated = 0;
    
    for (const employee of employees) {
      const currentBalance = employee.ptoBalance || 0;
      const newBalance = Math.min(
        currentBalance + settings.hoursPerWeek,
        settings.maxAccrualHours
      );
      
      if (newBalance !== currentBalance) {
        await base44.asServiceRole.entities.Employee.update(employee.id, {
          ptoBalance: newBalance
        });
        updated++;
      }
    }
    
    return Response.json({ 
      success: true,
      message: `Updated ${updated} employees`,
      employeesUpdated: updated
    });
  } catch (error) {
    console.error("PTO update error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});