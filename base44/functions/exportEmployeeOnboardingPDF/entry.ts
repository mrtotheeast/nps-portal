import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import jsPDF from 'npm:jspdf@4.2.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { employee_id } = await req.json();

    if (!employee_id) {
      return Response.json({ error: 'Missing employee_id' }, { status: 400 });
    }

    // Fetch employee data
    const employee = await base44.entities.Employee.filter({ id: employee_id });
    if (!employee || employee.length === 0) {
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    const emp = employee[0];

    // Create PDF document
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Helper function to add text
    const addText = (text, size = 12, weight = 'normal', color = '#000000') => {
      doc.setFontSize(size);
      doc.setTextColor(color);
      if (weight === 'bold') doc.setFont(undefined, 'bold');
      else doc.setFont(undefined, 'normal');
      return text;
    };

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(26, 43, 74); // Navy color
    doc.text('Employee Onboarding Profile', margin, yPos);
    yPos += 12;

    // Separator
    doc.setDrawColor(201, 162, 39); // Gold color
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Section: Personal Information
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(26, 43, 74);
    doc.text('Personal Information', margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    const personalData = [
      ['Name:', `${emp.firstName || ''} ${emp.lastName || ''}`.trim()],
      ['Email:', emp.email || 'N/A'],
      ['Phone:', emp.phoneNumber || 'N/A'],
      ['Date of Birth:', emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString() : 'N/A'],
      ['Employee ID:', emp.employeeId || 'N/A'],
    ];

    personalData.forEach(([label, value]) => {
      doc.setFont(undefined, 'bold');
      doc.text(label, margin, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(value, margin + 40, yPos);
      yPos += 6;
    });

    yPos += 4;

    // Section: Residential Address
    if (emp.address && (emp.address.street || emp.address.city || emp.address.state || emp.address.zip)) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(26, 43, 74);
      doc.text('Residential Address', margin, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);

      if (emp.address.street) {
        doc.text(emp.address.street, margin, yPos);
        yPos += 5;
      }
      const cityStateZip = `${emp.address.city || ''} ${emp.address.state || ''} ${emp.address.zip || ''}`.trim();
      if (cityStateZip) {
        doc.text(cityStateZip, margin, yPos);
        yPos += 5;
      }
      yPos += 3;
    }

    // Section: Emergency Contact
    if (emp.emergencyContactName || emp.emergencyContactPhone || emp.emergencyContactEmail) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(26, 43, 74);
      doc.text('Emergency Contact', margin, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);

      const emergencyData = [
        ['Name:', emp.emergencyContactName || 'N/A'],
        ['Relationship:', emp.emergencyContactRelation || 'N/A'],
        ['Phone:', emp.emergencyContactPhone || 'N/A'],
        ['Email:', emp.emergencyContactEmail || 'N/A'],
      ];

      emergencyData.forEach(([label, value]) => {
        doc.setFont(undefined, 'bold');
        doc.text(label, margin, yPos);
        doc.setFont(undefined, 'normal');
        doc.text(value, margin + 40, yPos);
        yPos += 6;
      });
      yPos += 4;
    }

    // Section: Employment Information
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(26, 43, 74);
    doc.text('Employment Information', margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    const employmentData = [
      ['Position Title:', emp.positionTitle || 'N/A'],
      ['Role:', emp.role ? emp.role.toUpperCase() : 'N/A'],
      ['Status:', emp.status ? emp.status.replace('_', ' ').toUpperCase() : 'N/A'],
      ['Hire Date:', emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : 'N/A'],
      ['Employment Type:', emp.employmentType ? emp.employmentType.toUpperCase() : 'N/A'],
      ['Classification:', emp.employmentClassification || 'N/A'],
    ];

    employmentData.forEach(([label, value]) => {
      doc.setFont(undefined, 'bold');
      doc.text(label, margin, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(value, margin + 50, yPos);
      yPos += 6;
    });
    yPos += 4;

    // Section: Compensation & Hours
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(26, 43, 74);
    doc.text('Compensation & Hours', margin, yPos);
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    const compensationData = [
      ['Hourly Rate:', emp.baseHourlyRate ? `$${emp.baseHourlyRate.toFixed(2)}` : 'N/A'],
      ['Max Hours/Week:', emp.maxHours ? emp.maxHours.toString() : 'N/A'],
      ['PTO Balance:', emp.ptoBalance ? `${emp.ptoBalance} hours` : '0 hours'],
    ];

    compensationData.forEach(([label, value]) => {
      doc.setFont(undefined, 'bold');
      doc.text(label, margin, yPos);
      doc.setFont(undefined, 'normal');
      doc.text(value, margin + 50, yPos);
      yPos += 6;
    });

    // Footer with generation date
    yPos = pageHeight - 10;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPos);

    // Generate PDF as bytes
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=OnboardingProfile_${emp.firstName}_${emp.lastName}.pdf`
      }
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});