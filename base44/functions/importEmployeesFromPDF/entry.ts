import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role_type !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { file_url } = await req.json();

    const extractedData = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Extract employee information from this PDF. Return structured employee data.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          employees: {
            type: "array",
            items: {
              type: "object",
              properties: {
                first_name: { type: "string" },
                last_name: { type: "string" },
                email: { type: "string" },
                phone_number: { type: "string" },
                position: { type: "string" }
              }
            }
          }
        }
      }
    });

    const employees = extractedData.employees || [];
    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const emp of employees) {
      try {
        if (!emp.email || !emp.email.includes('@')) {
          results.skipped.push({ 
            name: `${emp.first_name} ${emp.last_name}`, 
            reason: 'Invalid email' 
          });
          continue;
        }

        let roleType = 'officer';
        if (emp.position?.toLowerCase().includes('admin')) {
          roleType = 'admin';
        } else if (emp.position?.toLowerCase().includes('supervisor')) {
          roleType = 'supervisor';
        }

        const existingUsers = await base44.asServiceRole.entities.User.filter({ email: emp.email });
        
        const userData = {
          full_name: `${emp.first_name} ${emp.last_name}`.trim(),
          phone: emp.phone_number || '',
          role_type: roleType,
          employee_status: 'active'
        };
        
        if (existingUsers.length > 0) {
          await base44.asServiceRole.entities.User.update(existingUsers[0].id, userData);
          results.skipped.push({ 
            name: userData.full_name,
            email: emp.email,
            reason: 'User already exists' 
          });
        } else {
          await base44.asServiceRole.entities.User.create({
            ...userData,
            email: emp.email
          });
          results.success.push({ 
            name: userData.full_name,
            email: emp.email,
            roleType
          });
        }
      } catch (error) {
        results.failed.push({ 
          name: `${emp.first_name} ${emp.last_name}`,
          email: emp.email,
          error: error.message 
        });
      }
    }

    return Response.json({
      success: true,
      total: employees.length,
      imported: results.success.length,
      updated: results.skipped.length,
      failed: results.failed.length,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});