import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Use InvokeLLM to analyze image for inappropriate content
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this image for inappropriate or vulgar content. Check for:
1. Nudity or sexually explicit content
2. Violence or graphic imagery
3. Drug paraphernalia
4. Hateful symbols
5. Generally inappropriate workplace content

Respond with only JSON: { "is_safe": boolean, "reason": "brief description of issues if unsafe" }`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          is_safe: { type: "boolean" },
          reason: { type: "string" }
        },
        required: ["is_safe"]
      }
    });

    // Update employee record with photo and approval status
    const employees = await base44.asServiceRole.entities.Employee.filter({ email: user.email });
    if (employees.length === 0) {
      return Response.json({ error: 'Employee record not found' }, { status: 404 });
    }

    const employee = employees[0];
    const isApproved = result.is_safe === true;

    await base44.asServiceRole.entities.Employee.update(employee.id, {
      profilePhotoUrl: file_url,
      profilePhotoStatus: isApproved ? "approved" : "denied"
    });

    return Response.json({
      success: true,
      is_safe: isApproved,
      reason: result.reason || ""
    });
  } catch (error) {
    console.error('moderateProfilePhoto error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});