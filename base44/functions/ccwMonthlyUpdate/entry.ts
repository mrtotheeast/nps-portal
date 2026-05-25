import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * CCW Monthly Update Function
 * Runs on the 1st of each month (scheduled) or can be triggered manually by admins.
 * Searches for CCW law changes across all 50 states + DC, updates the DB,
 * notifies admins, and logs to the AuditLog entity.
 */

const STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DC', name: 'Washington DC' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const nowISO = now.toISOString();

  // Determine if this is a manual trigger (authenticated admin) or a scheduled run
  let triggeredBy = 'scheduled';
  let triggerUser = null;
  try {
    triggerUser = await base44.auth.me();
    if (triggerUser) {
      if (!['admin', 'super_admin'].includes(triggerUser.role) && triggerUser.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
      triggeredBy = `manual:${triggerUser.email}`;
    }
  } catch (_) {
    // Scheduled — no user context, continue as service role
  }

  console.log(`CCW Monthly Update started — triggered by: ${triggeredBy} at ${nowISO}`);

  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthLabel = prevMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // --- Step 1: LLM web search for CCW changes ---
  let llmResult = null;
  try {
    llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a concealed carry law researcher for Nationwide Police Services. Today's date is ${today}. The previous month was ${monthLabel}.

Search the web comprehensively for ALL concealed carry law changes across all 50 US states and Washington DC that TOOK EFFECT or were ENACTED during ${monthLabel}.

Search these specific topics:
- "concealed carry law changes ${monthLabel}"
- "permitless carry new state ${now.getFullYear()}"
- "CCW reciprocity changes ${monthLabel}"
- "state gun law update ${monthLabel}"
- "red flag law new state ${now.getFullYear()}"
- "constitutional carry ${now.getFullYear()} new"
- "CCW permit reciprocity agreement ${monthLabel}"

Check these authoritative sources:
- usconcealedcarry.com/resources/ccw_reciprocity_map
- handgunlaw.us
- nraila.org/gun-laws
- giffords.org/lawcenter/state-gun-laws
- Official state police/attorney general websites for any changed states

For EVERY state (all 51 jurisdictions), return whether anything changed last month. For states with changes, describe exactly what changed. Only report ENACTED laws that are NOW IN EFFECT — not pending or proposed legislation.

Return for each state:
- state_code (2-letter)
- state_name
- changed (boolean — true if any law change detected this month)
- constitutional_carry (boolean — current value)
- permit_required (boolean — current value)
- permit_type: "shall-issue" | "may-issue" | "no-issue" | "permitless"
- open_carry (boolean)
- min_age (number)
- red_flag_law (boolean)
- honors_these_states (array of state codes)
- honored_by_these_states (array of state codes)
- restricted_reciprocity_states (array of state codes)
- recent_changes (string describing what changed THIS MONTH, or null if no changes)
- change_summary (brief 1-line human readable summary of change, or null)
`,
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
      response_json_schema: {
        type: 'object',
        properties: {
          states: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                state_code: { type: 'string' },
                state_name: { type: 'string' },
                changed: { type: 'boolean' },
                constitutional_carry: { type: 'boolean' },
                permit_required: { type: 'boolean' },
                permit_type: { type: 'string' },
                open_carry: { type: 'boolean' },
                min_age: { type: 'number' },
                red_flag_law: { type: 'boolean' },
                honors_these_states: { type: 'array', items: { type: 'string' } },
                honored_by_these_states: { type: 'array', items: { type: 'string' } },
                restricted_reciprocity_states: { type: 'array', items: { type: 'string' } },
                recent_changes: { type: 'string' },
                change_summary: { type: 'string' },
              }
            }
          }
        }
      }
    });
  } catch (e) {
    console.error('LLM search failed:', e.message);
    return Response.json({ error: 'LLM search failed: ' + e.message }, { status: 500 });
  }

  const stateResults = llmResult?.states || [];
  console.log(`LLM returned data for ${stateResults.length} states`);

  // --- Step 2: Upsert changed state records ---
  const changedStates = [];
  const checkedCount = stateResults.length;

  for (const s of stateResults) {
    if (!s.state_code) continue;
    const code = s.state_code.toUpperCase();

    try {
      const existing = await base44.asServiceRole.entities.CCWStateData.filter({ state_code: code });

      const updatePayload = {
        last_checked: nowISO,
      };

      if (s.changed) {
        // Build the update with changed fields
        if (s.constitutional_carry !== undefined) updatePayload.constitutional_carry = s.constitutional_carry;
        if (s.permit_required !== undefined) updatePayload.permit_required = s.permit_required;
        if (s.permit_type) updatePayload.permit_type = s.permit_type;
        if (s.open_carry !== undefined) updatePayload.open_carry = s.open_carry;
        if (s.min_age !== undefined) updatePayload.min_age = s.min_age;
        if (s.red_flag_law !== undefined) updatePayload.red_flag_law = s.red_flag_law;
        if (s.honors_these_states) updatePayload.honors_these_states = s.honors_these_states;
        if (s.honored_by_these_states) updatePayload.honored_by_these_states = s.honored_by_these_states;
        if (s.restricted_reciprocity_states) updatePayload.restricted_reciprocity_states = s.restricted_reciprocity_states;
        if (s.recent_changes) updatePayload.recent_changes = s.recent_changes;
        updatePayload.last_updated = today;

        // Append to notes
        if (existing.length > 0 && s.recent_changes) {
          const prevNotes = existing[0].notes || '';
          updatePayload.notes = `[${today}] ${s.recent_changes}\n\n${prevNotes}`.trim();
        }

        changedStates.push({
          code,
          name: s.state_name || code,
          summary: s.change_summary || s.recent_changes || 'Data updated',
        });
      }

      if (existing.length > 0) {
        await base44.asServiceRole.entities.CCWStateData.update(existing[0].id, updatePayload);
      } else {
        const stateInfo = STATES.find(st => st.code === code);
        await base44.asServiceRole.entities.CCWStateData.create({
          state_code: code,
          state_name: s.state_name || stateInfo?.name || code,
          ...updatePayload,
        });
      }
    } catch (e) {
      console.error(`Error upserting ${code}:`, e.message);
    }
  }

  console.log(`Changes detected in ${changedStates.length} states: ${changedStates.map(s => s.code).join(', ')}`);

  // --- Step 2b: Verify official_source_url for all states ---
  const urlUpdates = [];
  try {
    const urlCheckResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a government website researcher. Today is ${today}.

For each of the following US states/jurisdictions, find the CURRENT official government URL (.gov domain only) for their concealed carry weapon (CCW) permit / license program. This must be the official state police, attorney general, department of public safety, or department of justice page — no third-party sites.

Search the web now and confirm whether each URL below is still valid and correct, or if it has changed. Return the best current official .gov URL for each state.

States to verify:
AL, AK, AZ, AR, CA, CO, CT, DC, DE, FL, GA, HI, ID, IL, IN, IA, KS, KY, LA, ME, MD, MA, MI, MN, MS, MO, MT, NE, NV, NH, NJ, NM, NY, NC, ND, OH, OK, OR, PA, RI, SC, SD, TN, TX, UT, VT, VA, WA, WV, WI, WY

For each state return:
- state_code: 2-letter code
- official_source_url: the best current official .gov URL for CCW permits
- url_changed: boolean — true if this URL differs from what was previously recorded
- note: brief note if the URL changed or if there was any issue finding a valid .gov page`,
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
      response_json_schema: {
        type: 'object',
        properties: {
          states: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                state_code: { type: 'string' },
                official_source_url: { type: 'string' },
                url_changed: { type: 'boolean' },
                note: { type: 'string' },
              }
            }
          }
        }
      }
    });

    const urlResults = urlCheckResult?.states || [];
    console.log(`URL verification returned data for ${urlResults.length} states`);

    for (const s of urlResults) {
      if (!s.state_code || !s.official_source_url) continue;
      // Only accept .gov URLs
      if (!s.official_source_url.includes('.gov') && !s.official_source_url.includes('dc.gov') && !s.official_source_url.includes('mpdc.dc')) continue;
      const code = s.state_code.toUpperCase();
      try {
        const existing = await base44.asServiceRole.entities.CCWStateData.filter({ state_code: code });
        if (existing.length > 0) {
          const currentUrl = existing[0].official_source_url || '';
          if (s.official_source_url && s.official_source_url !== currentUrl) {
            await base44.asServiceRole.entities.CCWStateData.update(existing[0].id, {
              official_source_url: s.official_source_url,
              last_checked: nowISO,
            });
            urlUpdates.push({ code, old_url: currentUrl, new_url: s.official_source_url, note: s.note || '' });
            console.log(`URL updated for ${code}: ${currentUrl} → ${s.official_source_url}`);
          }
        }
      } catch (e) {
        console.warn(`URL update failed for ${code}:`, e.message);
      }
    }
  } catch (e) {
    console.warn('URL verification step failed:', e.message);
  }

  console.log(`Source URL verification complete. ${urlUpdates.length} URLs updated.`);

  // --- Step 3: Build notification content ---
  const changeCount = changedStates.length;
  const urlChangeCount = urlUpdates.length;
  let notificationBody;
  if (changeCount === 0) {
    notificationBody = `No law changes detected this month. All state data verified current as of ${today}.`;
  } else {
    const stateLines = changedStates.map(s => `• ${s.name} (${s.code}): ${s.summary}`).join('\n');
    const urlLines = urlUpdates.length > 0 ? `\n\nSource URL corrections (${urlUpdates.length}):\n` + urlUpdates.map(u => `• ${u.code}: ${u.new_url}${u.note ? ' (' + u.note + ')' : ''}`).join('\n') : '';
    notificationBody = `The CCW Reciprocity Map was automatically updated on ${today}.\n\nStates checked: ${checkedCount}\nLaw changes detected: ${changeCount}\nSource URLs corrected: ${urlChangeCount}\nStates updated: ${changedStates.map(s => s.name).join(', ')}\nLast verified: ${today}\n\nLaw change details:\n${stateLines}${urlLines}`;
  }

  const emailBody = notificationBody.replace(/\n/g, '<br>');

  // --- Step 4: Notify all admin users ---
  try {
    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const superAdminUsers = await base44.asServiceRole.entities.User.filter({ role: 'super_admin' });
    const allAdmins = [...adminUsers, ...superAdminUsers];

    for (const admin of allAdmins) {
      if (!admin.email) continue;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: 'CCW Reciprocity Map — Monthly Update Complete',
          body: `<p>Hello ${admin.full_name || admin.email},</p><p>${emailBody}</p><p>You can view the updated map at <a href="https://npsportal.app/CCWReciprocityMap">CCW Reciprocity Map</a>.</p><hr><p style="font-size:11px;color:#64748b;">This is an automated message from NPS Portal.</p>`,
          from_name: 'NPS Portal — CCW Monitor',
        });
      } catch (emailErr) {
        console.warn(`Failed to email ${admin.email}:`, emailErr.message);
      }
    }

    // Super admin notice about standalone HTML if there were changes
    if (changeCount > 0) {
      const htmlNotice = `STANDALONE WEBSITE HTML FILE NEEDS UPDATE: The NationwidePolice.com standalone CCW HTML file contains hardcoded state data and must be manually updated. States changed this month: ${changedStates.map(s => `${s.name} (${s.code}): ${s.summary}`).join(' | ')}. Please regenerate or manually update the website file.`;
      for (const admin of superAdminUsers) {
        if (!admin.email) continue;
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            subject: 'ACTION REQUIRED: CCW Website HTML File Needs Update',
            body: `<p><strong>Super Admin Action Required</strong></p><p>${htmlNotice}</p><p>To update: Go to NPS Portal → CCW Map → Refresh Data, then manually update the standalone HTML on NationwidePolice.com.</p>`,
            from_name: 'NPS Portal — CCW Monitor',
          });
        } catch (_) {}
      }
    }
  } catch (e) {
    console.warn('Admin notification failed:', e.message);
  }

  // --- Step 5: Log to AuditLog entity ---
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'ccw_map_update',
      action: 'ccw_map_update',
      entity_type: 'CCWStateData',
      timestamp: nowISO,
      performed_by: triggerUser?.email || 'system',
      details: JSON.stringify({
        triggered_by: triggeredBy,
        month_checked: monthLabel,
        states_checked: checkedCount,
        states_updated: changeCount,
        changed_states: changedStates,
        url_updates: urlUpdates,
        url_updates_count: urlChangeCount,
        run_type: triggeredBy === 'scheduled' ? 'scheduled' : 'manual',
      }),
      description: `CCW Monthly Update (${triggeredBy === 'scheduled' ? 'Scheduled' : 'Manual'}): Checked ${checkedCount} states, law changes: ${changeCount}, URL corrections: ${urlChangeCount}. ${changeCount > 0 ? 'Changed: ' + changedStates.map(s => s.code).join(', ') : 'No law changes detected.'}${urlChangeCount > 0 ? ' URL fixes: ' + urlUpdates.map(u => u.code).join(', ') : ''}`,
    });
  } catch (e) {
    console.warn('AuditLog write failed:', e.message);
  }

  return Response.json({
    success: true,
    triggered_by: triggeredBy,
    month_checked: monthLabel,
    date_run: today,
    states_checked: checkedCount,
    changes_detected: changeCount,
    changed_states: changedStates,
    url_corrections: urlChangeCount,
    url_updates: urlUpdates,
    notification_sent: true,
  });
});