import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Official state-level firearm/AG source URLs for all 50 states + DC
const OFFICIAL_SOURCES = {
  AL: 'https://www.alea.gov/sbi/firearms',
  AK: 'https://dps.alaska.gov/statewide/concealed-handguns',
  AZ: 'https://www.azdps.gov/services/public/concealed_weapons',
  AR: 'https://www.asp.state.ar.us/divisions/regulatory/concealed-handgun-carry-licensing',
  CA: 'https://oag.ca.gov/firearms/ccw',
  CO: 'https://www.cbi.colorado.gov/sections/firearms-and-background-checks',
  CT: 'https://portal.ct.gov/DESPP/Division-of-State-Police/Firearms-Unit/Pistol-Permits',
  DC: 'https://mpdc.dc.gov/page/carry-handgun-permits',
  DE: 'https://dsp.delaware.gov/firearms/',
  FL: 'https://www.fdacs.gov/Consumer-Resources/Concealed-Weapon-License',
  GA: 'https://gspr.sos.ga.gov/',
  HI: 'https://www.honolulupd.org/information/firearms.php',
  ID: 'https://isp.idaho.gov/concealed-weapons/',
  IL: 'https://www.isp.state.il.us/firearms/fccl.cfm',
  IN: 'https://www.in.gov/isp/firearms-licensing/',
  IA: 'https://www.dps.state.ia.us/asd/weapon_permits.shtml',
  KS: 'https://www.ag.ks.gov/about-ag/bureaus/bureau-of-investigation/concealed-carry',
  KY: 'https://kentucky.gov/Pages/Activity.aspx?n=KSPConcealedCarry',
  LA: 'https://lsp.org/concealed-handguns.html',
  ME: 'https://www.maine.gov/dps/msp/licenses-permits/concealed-carry',
  MD: 'https://mdsp.maryland.gov/Organization/Pages/CriminalInvestigationBureau/LicensingDivision/Handguns/WeaponPermits.aspx',
  MA: 'https://www.mass.gov/firearm-licensing',
  MI: 'https://www.michigan.gov/msp/divisions/crd/concealed-pistol-licensing',
  MN: 'https://dps.mn.gov/divisions/bca/bca-divisions/administrative/Pages/firearms-information.aspx',
  MS: 'https://www.dps.state.ms.us/law-enforcement/Mississippi-Weapons-Permits-Office/',
  MO: 'https://www.mshp.dps.missouri.gov/MSHPWeb/SAC/concealedCarryOverview.html',
  MT: 'https://dojmt.gov/enforcement/concealed-weapons-permits/',
  NE: 'https://statepatrol.nebraska.gov/concealed-handgun-permit',
  NV: 'https://sheriff.clarkcounty.gov/gun-permit.aspx',
  NH: 'https://www.nh.gov/safety/divisions/nhsp/ssb/permitslicensing/handguns.html',
  NJ: 'https://www.njsp.org/firearms/index.shtml',
  NM: 'https://www.dps.nm.gov/home/divisions-bureaus/law-enforcement-programs-bureau/concealed-handgun-carry/',
  NY: 'https://www.criminaljustice.ny.gov/ops/gunpermit/',
  NC: 'https://www.ncsbi.gov/Licenses-Permits/Concealed-Handgun-Permit',
  ND: 'https://www.attorney-general.nd.gov/concealed-weapons-licenses',
  OH: 'https://www.ohioattorneygeneral.gov/Business/Services-for-Business/Concealed-Carry',
  OK: 'https://www.ok.gov/cleet/Firearms/index.html',
  OR: 'https://www.oregon.gov/osp/programs/chl/pages/default.aspx',
  PA: 'https://www.psp.pa.gov/firearms/Pages/License-to-Carry-Firearms.aspx',
  RI: 'https://www.riag.ri.gov/civil-rights/bureau-criminal-identification/firearms-licensing',
  SC: 'https://www.sled.sc.gov/CWP.aspx',
  SD: 'https://sdsos.gov/general-services/assets/ConcealedPistolPermit.pdf',
  TN: 'https://www.tn.gov/safety/driver-services/handgun-carry-permit.html',
  TX: 'https://www.dps.texas.gov/section/handgun-licensing',
  UT: 'https://bci.utah.gov/concealed-firearm/apply-for-a-utah-concealed-firearm-permit/',
  VT: 'https://www.vermontattorneygeneral.com/office-of-the-attorney-general/criminal-justice/firearms/',
  VA: 'https://www.vsp.virginia.gov/Firearms_ConceatedHandgunPermit.shtm',
  WA: 'https://www.dol.wa.gov/driver-licenses-and-permits/concealed-pistol-licenses',
  WV: 'https://www.wvsp.gov/Pages/Concealed-Weapons.aspx',
  WI: 'https://www.doj.state.wi.us/dles/cib/concealedCarry/default.aspx',
  WY: 'https://attorneygeneral.wyo.gov/concealed-weapons-permits',
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow scheduled (no auth header) or admin-triggered calls
  try {
    const user = await base44.auth.me();
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
  } catch (_) {
    // Scheduled call — no user context, proceed as service role
  }

  const results = { updated: [], created: [], errors: [] };
  const today = new Date().toISOString().split('T')[0];

  const statesToProcess = [
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

  // Step 1: Ask LLM with internet search for ALL 50 states full data + recent enacted changes
  let llmResult = null;
  try {
    llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a concealed carry law researcher. Today's date is ${today}.

Search the web for the CURRENT, ACCURATE concealed carry laws for ALL 50 US states plus Washington DC as of ${today}.

For EVERY state, return complete data. Additionally, identify any ENACTED law changes (signed into law and already in effect) in the past 90 days affecting:
- Constitutional/permitless carry adoption or repeal
- Shall-issue vs may-issue changes
- New or terminated reciprocity agreements
- Age requirement changes
- Red flag law additions or repeals

IMPORTANT: Only include recent_changes if a law has been SIGNED AND TAKEN EFFECT in the last 90 days. Do NOT include proposed, pending, or under-debate legislation. Leave recent_changes null or empty string if no enacted changes in 90 days.

For each state return:
- state_code (2-letter)
- constitutional_carry (boolean)
- permit_required (boolean)
- permit_type: one of "shall-issue", "may-issue", "no-issue", "permitless"
- open_carry (boolean)
- min_age (number, typically 18 or 21)
- red_flag_law (boolean)
- permit_fee (string, e.g. "$50")
- processing_time (string, e.g. "45-60 days")
- training_required (string description or null)
- summary (2-3 sentence plain-English summary of carry laws)
- self_defense_laws (1-2 sentences on stand-your-ground / castle doctrine)
- notes (key restrictions or noteworthy facts)
- recent_changes (string: ONLY enacted laws from past 90 days that are NOW IN EFFECT, or null if none)
- honors_these_states (array of 2-letter state codes this state honors for reciprocity)
- honored_by_these_states (array of 2-letter state codes that honor this state's permit)
- restricted_reciprocity_states (array of state codes with conditional/restricted reciprocity)

Return data for all 51 jurisdictions (50 states + DC).`,
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
                constitutional_carry: { type: 'boolean' },
                permit_required: { type: 'boolean' },
                permit_type: { type: 'string' },
                open_carry: { type: 'boolean' },
                min_age: { type: 'number' },
                red_flag_law: { type: 'boolean' },
                permit_fee: { type: 'string' },
                processing_time: { type: 'string' },
                training_required: { type: 'string' },
                summary: { type: 'string' },
                self_defense_laws: { type: 'string' },
                notes: { type: 'string' },
                recent_changes: { type: 'string' },
                honors_these_states: { type: 'array', items: { type: 'string' } },
                honored_by_these_states: { type: 'array', items: { type: 'string' } },
                restricted_reciprocity_states: { type: 'array', items: { type: 'string' } },
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

  const stateUpdates = llmResult?.states || [];
  console.log(`LLM returned data for ${stateUpdates.length} states`);

  // Step 2: Upsert each state record
  for (const stateUpdate of stateUpdates) {
    if (!stateUpdate.state_code) continue;
    const code = stateUpdate.state_code.toUpperCase();
    const stateInfo = statesToProcess.find(s => s.code === code);
    if (!stateInfo && code !== 'DC') continue;

    try {
      const existing = await base44.asServiceRole.entities.CCWStateData.filter({ state_code: code });

      const updateData = {
        constitutional_carry: stateUpdate.constitutional_carry,
        permit_required: stateUpdate.permit_required,
        permit_type: stateUpdate.permit_type,
        open_carry: stateUpdate.open_carry,
        min_age: stateUpdate.min_age,
        red_flag_law: stateUpdate.red_flag_law,
        permit_fee: stateUpdate.permit_fee,
        processing_time: stateUpdate.processing_time,
        training_required: stateUpdate.training_required,
        summary: stateUpdate.summary,
        self_defense_laws: stateUpdate.self_defense_laws,
        notes: stateUpdate.notes,
        recent_changes: stateUpdate.recent_changes || null,
        honors_these_states: stateUpdate.honors_these_states || [],
        honored_by_these_states: stateUpdate.honored_by_these_states || [],
        restricted_reciprocity_states: stateUpdate.restricted_reciprocity_states || [],
        last_updated: today,
        last_checked: new Date().toISOString(),
        official_source_url: OFFICIAL_SOURCES[code] || existing[0]?.official_source_url || null,
      };

      if (existing.length > 0) {
        await base44.asServiceRole.entities.CCWStateData.update(existing[0].id, updateData);
        results.updated.push(code);
      } else {
        await base44.asServiceRole.entities.CCWStateData.create({
          state_code: code,
          state_name: stateInfo?.name || code,
          ...updateData,
        });
        results.created.push(code);
      }
    } catch (e) {
      results.errors.push({ state: code, error: e.message });
      console.error(`Error upserting ${code}:`, e.message);
    }
  }

  console.log(`CCW Update complete: ${results.updated.length} updated, ${results.created.length} created, ${results.errors.length} errors`);

  return Response.json({
    success: true,
    date_checked: today,
    states_updated: results.updated.length,
    states_created: results.created.length,
    states_with_errors: results.errors.length,
    details: results
  });
});