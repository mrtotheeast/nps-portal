import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin/manager access
    const user = await base44.auth.me();
    if (!user || !['admin', 'manager', 'supervisor'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { site_id, start_date, end_date } = await req.json();

    // Fetch incidents filtered by site and date range
    const allIncidents = await base44.entities.Incident.list();
    
    const filteredIncidents = allIncidents.filter(inc => {
      const incDate = new Date(inc.incident_date);
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      
      const matchSite = !site_id || inc.site_id === site_id;
      const matchDate = incDate >= startDate && incDate <= endDate;
      
      return matchSite && matchDate;
    });

    // Fetch employee and site data for display
    const employees = await base44.entities.Employee.list();
    const sites = await base44.entities.Site.list();

    const getEmployeeName = (id) => {
      const emp = employees.find(e => e.id === id);
      return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';
    };

    const getSiteName = (id) => {
      const site = sites.find(s => s.id === id);
      return site?.name || 'Unknown Site';
    };

    // Create PDF
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(26, 43, 74); // Navy blue
    doc.text('Incident Report Summary', 20, 20);
    
    // Date range
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Report Period: ${new Date(start_date).toLocaleDateString()} - ${new Date(end_date).toLocaleDateString()}`, 20, 30);
    
    if (site_id) {
      doc.text(`Site: ${getSiteName(site_id)}`, 20, 38);
    }
    
    // Summary statistics
    doc.setFontSize(14);
    doc.setTextColor(26, 43, 74);
    doc.text('Summary Statistics', 20, 50);
    
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Incidents: ${filteredIncidents.length}`, 20, 60);
    
    const severityCounts = {
      low: filteredIncidents.filter(i => i.severity === 'low').length,
      medium: filteredIncidents.filter(i => i.severity === 'medium').length,
      high: filteredIncidents.filter(i => i.severity === 'high').length,
      critical: filteredIncidents.filter(i => i.severity === 'critical').length,
    };
    
    doc.text(`Low Severity: ${severityCounts.low}`, 20, 68);
    doc.text(`Medium Severity: ${severityCounts.medium}`, 20, 76);
    doc.text(`High Severity: ${severityCounts.high}`, 20, 84);
    doc.text(`Critical Severity: ${severityCounts.critical}`, 20, 92);
    
    // Incident details
    let yPos = 105;
    
    if (filteredIncidents.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(26, 43, 74);
      doc.text('Incident Details', 20, yPos);
      yPos += 10;
      
      filteredIncidents.forEach((incident, index) => {
        // Check if we need a new page
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        
        // Incident header
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 43, 74);
        doc.text(`Incident #${index + 1}`, 20, yPos);
        yPos += 6;
        
        // Incident details
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        
        const details = [
          `Date: ${new Date(incident.incident_date).toLocaleString()}`,
          `Type: ${incident.incident_type}`,
          `Severity: ${incident.severity.toUpperCase()}`,
          `Status: ${incident.status}`,
          `Site: ${getSiteName(incident.site_id)}`,
          `Reporter: ${getEmployeeName(incident.reporter_id)}`,
          `Description: ${incident.description}`,
        ];
        
        if (incident.rejection_reason) {
          details.push(`Notes: ${incident.rejection_reason}`);
        }
        
        details.forEach(line => {
          const splitLines = doc.splitTextToSize(line, 170);
          splitLines.forEach(textLine => {
            doc.text(textLine, 20, yPos);
            yPos += 5;
          });
        });
        
        yPos += 5; // Extra space between incidents
        
        // Draw separator line
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPos - 2, 190, yPos - 2);
        yPos += 3;
      });
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated on ${new Date().toLocaleDateString()} by ${user.full_name}`, 20, 285);
      doc.text(`Page ${i} of ${pageCount}`, 170, 285);
    }
    
    // Convert to blob and return
    const pdfBytes = doc.output('arraybuffer');
    
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="incident_report_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating incident report PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});