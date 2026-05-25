import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, file_name = 'employees.csv' } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    const sessionId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Fetch the file
    const fileResponse = await fetch(file_url);
    const buffer = await fileResponse.arrayBuffer();
    let rows = [];

    // Handle XLSX files
    if (file_url.includes('.xlsx') || file_url.includes('.xls')) {
      // Use XLSX library to parse Excel files properly
      const XLSX = await import('npm:xlsx@0.18.5');
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws);
    } else {
      // Handle CSV format
      const text = new TextDecoder().decode(buffer);
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i]
          .split(',')
          .map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx];
        });
        rows.push(row);
      }
    }

    if (rows.length === 0) {
      return Response.json({ error: 'No data found in file' }, { status: 400 });
    }

    // Fetch existing employees to check for duplicates
    const existingEmployees = await base44.asServiceRole.entities.Employee.list();
    const existingEmails = new Set(existingEmployees.map(e => e.email.toLowerCase()));

    // Map file columns to Employee entity fields with validation
    const employees = [];
    const errorDetails = [];

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // +2 because idx is 0-indexed and row 1 is headers
      const firstName = String(row['First Name'] || '').trim();
      const lastName = String(row['Last Name'] || '').trim();
      const email = String(row['Email'] || '').trim().toLowerCase();
      const phone = row['Phone Number'] ? String(row['Phone Number']).replace(/[^\d]/g, '') : '';
      const rate = row['Base Hourly Rate'] ? parseFloat(row['Base Hourly Rate']) : 0;
      const hours = row['Max Hours'] ? parseFloat(row['Max Hours']) : 40;
      const position = String(row['Positions'] || '').trim();

      // Validation with detailed error tracking
      if (!firstName) {
        errorDetails.push({
          row_number: rowNum,
          error_type: 'missing_field',
          field_name: 'First Name',
          error_message: 'First name is required',
          row_data: JSON.stringify(row).substring(0, 500)
        });
        return;
      }
      if (!lastName) {
        errorDetails.push({
          row_number: rowNum,
          error_type: 'missing_field',
          field_name: 'Last Name',
          error_message: 'Last name is required',
          row_data: JSON.stringify(row).substring(0, 500)
        });
        return;
      }
      if (!email) {
        errorDetails.push({
          row_number: rowNum,
          error_type: 'missing_field',
          field_name: 'Email',
          error_message: `Email is required for ${firstName} ${lastName}`,
          row_data: JSON.stringify(row).substring(0, 500)
        });
        return;
      }
      if (existingEmails.has(email)) {
        errorDetails.push({
          row_number: rowNum,
          error_type: 'duplicate_email',
          field_name: 'Email',
          error_message: `Email "${email}" already exists in the system`,
          row_data: JSON.stringify(row).substring(0, 500)
        });
        return;
      }

      employees.push({
        firstName,
        lastName,
        email,
        phoneNumber: phone,
        employeeId: String(row['Employee ID'] || '').trim() || null,
        baseHourlyRate: rate > 0 ? rate : null,
        maxHours: hours > 0 ? hours : 40,
        positionTitle: position,
        status: 'active',
        role: 'employee',
      });
    });

    // Log import session to ImportErrorLog
    const importLog = {
      upload_session_id: sessionId,
      uploaded_by: user.id,
      uploaded_by_name: user.full_name,
      file_name: file_name,
      total_rows: rows.length,
      successful_imports: employees.length,
      failed_imports: errorDetails.length,
      import_date: new Date().toISOString(),
      errors: errorDetails,
      status: employees.length === 0 ? 'failed' : (errorDetails.length > 0 ? 'partially_failed' : 'completed')
    };

    await base44.asServiceRole.entities.ImportErrorLog.create(importLog);

    // Bulk create employees
    if (employees.length === 0) {
      const errorMsg = `Import failed: No valid employees to import. ${errorDetails.length} row(s) had issues:\n${errorDetails.slice(0, 5).map(e => `• Row ${e.row_number}: ${e.error_message}`).join('\n')}${errorDetails.length > 5 ? `\n... and ${errorDetails.length - 5} more issues` : ''}`;
      return Response.json({ 
        error: errorMsg, 
        sessionId: sessionId,
        validationErrors: errorDetails.slice(0, 10) 
      }, { status: 400 });
    }

    const result = await base44.asServiceRole.entities.Employee.bulkCreate(employees);

    return Response.json({
      count: employees.length,
      skipped: errorDetails.length,
      sessionId: sessionId,
      message: `Successfully imported ${employees.length} employees${errorDetails.length > 0 ? ` (${errorDetails.length} skipped due to validation errors)` : ''}`,
      validationErrors: errorDetails.slice(0, 10),
    });
  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});