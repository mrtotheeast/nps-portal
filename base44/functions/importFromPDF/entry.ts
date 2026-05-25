import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role_type !== 'super_admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { fileUrl, type } = await req.json();

    if (type === 'employees') {
      const extractResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Extract employee data from this PDF.`,
        file_urls: [fileUrl],
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
                  phone: { type: "string" },
                  position: { type: "string" }
                }
              }
            }
          }
        }
      });

      const employees = extractResult.employees || [];
      const invited = [];

      for (const emp of employees) {
        try {
          let role = 'employee';
          if (emp.position?.toLowerCase().includes('admin') || emp.position?.toLowerCase().includes('supervisor')) {
            role = 'admin';
          }

          await base44.asServiceRole.users.inviteUser(emp.email, role);
          invited.push(emp.email);
        } catch (error) {
          console.log(`Failed to invite ${emp.email}: ${error.message}`);
        }
      }

      return Response.json({
        success: true,
        imported: invited.length,
        emails: invited
      });

    } else if (type === 'sites') {
      const extractResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Extract site data from this PDF.`,
        file_urls: [fileUrl],
        response_json_schema: {
          type: "object",
          properties: {
            sites: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  address: { type: "string" },
                  description: { type: "string" }
                }
              }
            }
          }
        }
      });

      const sites = extractResult.sites || [];
      const created = [];

      for (const site of sites) {
        try {
          await base44.asServiceRole.entities.Site.create({
            name: site.name,
            address: site.address,
            notes: site.description || '',
            status: 'active'
          });
          created.push(site.name);
        } catch (error) {
          console.log(`Failed to create ${site.name}: ${error.message}`);
        }
      }

      return Response.json({
        success: true,
        imported: created.length,
        sites: created
      });
    }

    return Response.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});