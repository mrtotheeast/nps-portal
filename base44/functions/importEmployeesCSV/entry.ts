import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { csv_data } = await req.json();

    if (!csv_data) {
      return Response.json({ error: 'No CSV data provided' }, { status: 400 });
    }

    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    };

    const lines = csv_data.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      return Response.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 });
    }

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim());

    const [existingEmployees, positions] = await Promise.all([
      base44.asServiceRole.entities.Employee.list(),
      base44.asServiceRole.entities.Position.list()
    ]);

    const employeeByEmail = {};
    existingEmployees.forEach(e => {
      if (e.email) employeeByEmail[e.email.toLowerCase()] = e;
    });

    const positionByName = {};
    positions.forEach(p => {
      if (p.name) positionByName[p.name.toLowerCase()] = p;
    });

    let imported = 0;
    let updated = 0;
    const errors = [];

    const getField = (row, ...possibleNames) => {
      for (const name of possibleNames) {
        const idx = headers.indexOf(name.toLowerCase());
        if (idx !== -1 && row[idx]) return String(row[idx]).trim();
      }
      return '';
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      
      const firstName = getField(values, 'first name', 'firstname', 'first_name');
      const lastName = getField(values, 'last name', 'lastname', 'last_name');
      const email = getField(values, 'email', 'email address');
      const phone = getField(values, 'phone number', 'phone', 'phone_number');
      const positionName = getField(values, 'position', 'role', 'job title');

      if (!firstName && !lastName) {
        errors.push({ row: i + 1, error: 'Missing name — skipped' });
        continue;
      }

      try {
        let positionId = null;
        if (positionName && positionByName[positionName.toLowerCase()]) {
          positionId = positionByName[positionName.toLowerCase()].id;
        }

        const employeeData = {
          firstName,
          lastName,
          ...(email ? { email } : {}),
          ...(phone ? { phoneNumber: phone } : {}),
          ...(positionId ? { positionId } : {}),
          ...(positionName ? { position: positionName } : {}),
          status: 'active',
          invitation_status: 'not_invited'
        };

        const existing = email && employeeByEmail[email.toLowerCase()];
        if (existing) {
          await base44.asServiceRole.entities.Employee.update(existing.id, employeeData);
          updated++;
        } else {
          await base44.asServiceRole.entities.Employee.create(employeeData);
          imported++;
        }
      } catch (rowError) {
        errors.push({ row: i + 1, error: rowError.message });
      }
    }

    return Response.json({
      success: true,
      imported,
      updated,
      errors,
      total_processed: imported + updated
    });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});