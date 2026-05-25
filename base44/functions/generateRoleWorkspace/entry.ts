import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || !['admin', 'manager'].includes(user.role_type)) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { roleType, customPrompt } = await req.json();

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Design a workspace for the role: "${roleType}". 

Generate a complete workspace configuration with:
- display_name: role display name
- description: brief role description  
- color: hex color (e.g., #6366f1)
- icon: lucide-react icon name
- department: string
- modules: array of {id, title, type, description, page_link, icon, position}
- quick_actions: array of {label, icon, page_link}
- permissions: object with keys for incident_reports, scheduling, payroll, hr_documents, training, etc. - each value one of: "hidden", "view", "edit", "full"

Make the workspace practical for security company operations.`,
      response_json_schema: {
        type: "object",
        properties: {
          display_name: { type: "string" },
          description: { type: "string" },
          color: { type: "string" },
          icon: { type: "string" },
          department: { type: "string" },
          modules: { type: "array", items: { type: "object" } },
          quick_actions: { type: "array", items: { type: "object" } },
          permissions: { type: "object" }
        }
      }
    });

    const workspace = {
      role_type: roleType,
      ...aiResult,
      is_system_role: false,
      ai_generated: true,
      created_by: user.email
    };

    const existing = await base44.asServiceRole.entities.RoleWorkspace.filter({ role_type: roleType });
    let result;
    if (existing.length > 0) {
      result = await base44.asServiceRole.entities.RoleWorkspace.update(existing[0].id, workspace);
    } else {
      result = await base44.asServiceRole.entities.RoleWorkspace.create(workspace);
    }

    return Response.json({ workspace: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});