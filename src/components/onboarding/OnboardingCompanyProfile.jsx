import React, { useState } from "react";
import { base44 } from "@/api/base44Client";

const US_STATES = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming","District of Columbia"];

export default function OnboardingCompanyProfile({ onComplete, onBack, plan }) {
  const [form, setForm] = useState({
    companyName:"", address:"", city:"", state:"", zip:"",
    operatingStates:[], adminFirstName:"", adminLastName:"",
    adminEmail:"", adminPhone:"", password:"", confirmPassword:"",
    agreedToTerms:false, logoUrl:"",
  });
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));

  const toggleState = (s) => set("operatingStates", form.operatingStates.includes(s)
    ? form.operatingStates.filter(x => x !== s)
    : [...form.operatingStates, s]);

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("logoUrl", file_url);
    } catch (err) { console.error("Logo upload failed", err); }
    setUploading(false);
  };

  const validate = () => {
    const e = {};
    if (!form.companyName.trim()) e.companyName = "Required";
    if (!form.address.trim()) e.address = "Required";
    if (!form.city.trim()) e.city = "Required";
    if (!form.state.trim()) e.state = "Required";
    if (!form.zip.trim()) e.zip = "Required";
    if (form.operatingStates.length === 0) e.operatingStates = "Select at least one state";
    if (!form.adminFirstName.trim()) e.adminFirstName = "Required";
    if (!form.adminLastName.trim()) e.adminLastName = "Required";
    if (!form.adminEmail.trim() || !form.adminEmail.includes("@")) e.adminEmail = "Valid email required";
    if (!form.adminPhone.trim()) e.adminPhone = "Required";
    if (form.password.length < 8) e.password = "Minimum 8 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    if (!form.agreedToTerms) e.agreedToTerms = "You must agree to the terms";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onComplete(form);
  };

  return (
    <div style={{ minHeight:"calc(100vh - 54px)", padding:"40px 24px", background:"#FAFBFC" }}>
      <div style={{ maxWidth:640, margin:"0 auto" }}>
        <div style={labelStyle}>Step 4 of 7</div>
        <h2 style={titleStyle}>Company Profile Setup</h2>
        <p style={subStyle}>Tell us about your organization and create your administrator account.</p>

        {plan && (
          <div style={{ background:"rgba(201,168,76,0.06)", border:"1px solid rgba(201,168,76,0.22)", borderRadius:8, padding:"12px 18px", marginBottom:24, fontSize:13, color:"#5B6E84" }}>
            Selected plan: <strong style={{ color:"#0B1F3A" }}>{plan.tier === "multi" ? "Multiple Locations" : "Single Location"}</strong> at <strong style={{ color:"#0B1F3A" }}>${plan.pricePerUser?.toFixed(2)}/user/month</strong>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <section style={sectionStyle}>
            <h3 style={sectionTitle}>Company Information</h3>

            <Field label="Company Name" error={errors.companyName}>
              <input style={inputStyle} value={form.companyName} onChange={e => set("companyName", e.target.value)} placeholder="Acme Security LLC" />
            </Field>

            <Field label="Company Logo — square format, minimum 512x512 pixels (recommended)">
              <input type="file" accept="image/*" onChange={handleLogoChange} style={{ fontSize:13 }} />
              {uploading && <span style={{ color:"#C9A84C", fontSize:12, display:"block", marginTop:4 }}>Uploading...</span>}
              {form.logoUrl && (
                <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:12 }}>
                  <img src={form.logoUrl} alt="logo" style={{ width:64, height:64, objectFit:"cover", borderRadius:8, border:"1px solid #e2e8f0" }} />
                  <span style={{ fontSize:12, color:"#5B6E84" }}>This logo will appear on your dashboard, invoices, reports, and all generated documents.</span>
                </div>
              )}
            </Field>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Street Address" error={errors.address}>
                <input style={inputStyle} value={form.address} onChange={e => set("address", e.target.value)} placeholder="123 Main St" />
              </Field>
              <Field label="City" error={errors.city}>
                <input style={inputStyle} value={form.city} onChange={e => set("city", e.target.value)} placeholder="Baltimore" />
              </Field>
              <Field label="State" error={errors.state}>
                <select style={inputStyle} value={form.state} onChange={e => set("state", e.target.value)}>
                  <option value="">Select state</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="ZIP Code" error={errors.zip}>
                <input style={inputStyle} value={form.zip} onChange={e => set("zip", e.target.value)} placeholder="21236" />
              </Field>
            </div>

            <Field label="Operating States — select all that apply" error={errors.operatingStates}>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, maxHeight:180, overflowY:"auto", padding:"6px 0" }}>
                {US_STATES.map(s => (
                  <button key={s} type="button" onClick={() => toggleState(s)}
                    style={{ padding:"5px 11px", borderRadius:20, border:`1px solid ${form.operatingStates.includes(s) ? "#C9A84C" : "#e2e8f0"}`, background: form.operatingStates.includes(s) ? "rgba(201,168,76,0.1)" : "#fff", color: form.operatingStates.includes(s) ? "#8a6e2e" : "#5B6E84", fontSize:12, cursor:"pointer", fontWeight: form.operatingStates.includes(s) ? 600 : 400, transition:"all .15s" }}>
                    {s}
                  </button>
                ))}
              </div>
              {form.operatingStates.length > 0 && <p style={{ fontSize:12, color:"#5B6E84", marginTop:6 }}>{form.operatingStates.length} state(s) selected</p>}
            </Field>
          </section>

          <section style={sectionStyle}>
            <h3 style={sectionTitle}>Administrator Account</h3>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="First Name" error={errors.adminFirstName}>
                <input style={inputStyle} value={form.adminFirstName} onChange={e => set("adminFirstName", e.target.value)} placeholder="Jane" />
              </Field>
              <Field label="Last Name" error={errors.adminLastName}>
                <input style={inputStyle} value={form.adminLastName} onChange={e => set("adminLastName", e.target.value)} placeholder="Smith" />
              </Field>
            </div>
            <Field label="Email Address" error={errors.adminEmail}>
              <input type="email" style={inputStyle} value={form.adminEmail} onChange={e => set("adminEmail", e.target.value)} placeholder="jane@acmesecurity.com" />
            </Field>
            <Field label="Phone Number" error={errors.adminPhone}>
              <input style={inputStyle} value={form.adminPhone} onChange={e => set("adminPhone", e.target.value)} placeholder="(410) 555-0100" />
            </Field>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Password" error={errors.password}>
                <input type="password" style={inputStyle} value={form.password} onChange={e => set("password", e.target.value)} placeholder="Minimum 8 characters" />
              </Field>
              <Field label="Confirm Password" error={errors.confirmPassword}>
                <input type="password" style={inputStyle} value={form.confirmPassword} onChange={e => set("confirmPassword", e.target.value)} placeholder="Re-enter password" />
              </Field>
            </div>
          </section>

          <section style={{ ...sectionStyle, marginBottom:32 }}>
            <label style={{ display:"flex", alignItems:"flex-start", gap:12, cursor:"pointer" }}>
              <input type="checkbox" checked={form.agreedToTerms} onChange={e => set("agreedToTerms", e.target.checked)} style={{ marginTop:3, width:16, height:16, flexShrink:0 }} />
              <span style={{ fontSize:14, color:"#374151", lineHeight:1.65 }}>
                I agree to the{" "}
                <a href="https://nationwidepolice.com/nps-portal" target="_blank" rel="noopener noreferrer" style={{ color:"#C9A84C" }}>Terms of Service and Privacy Policy</a>.
                I understand that NPS Portal uses GPS location services during officer shifts for patrol tracking and site check-in verification.
              </span>
            </label>
            {errors.agreedToTerms && <p style={{ color:"#ef4444", fontSize:12, marginTop:6 }}>{errors.agreedToTerms}</p>}
          </section>

          <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
            <button type="button" onClick={onBack} style={secondaryBtn}>Back</button>
            <button type="submit" style={primaryBtn} disabled={uploading}>
              {uploading ? "Uploading logo..." : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:12, fontWeight:700, color:"#0B1F3A", marginBottom:6, fontFamily:"'Barlow Condensed',sans-serif", letterSpacing:".07em", textTransform:"uppercase" }}>{label}</label>
      {children}
      {error && <p style={{ color:"#ef4444", fontSize:12, marginTop:4 }}>{error}</p>}
    </div>
  );
}

const labelStyle = { fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, letterSpacing:".2em", textTransform:"uppercase", color:"#C9A84C", marginBottom:6 };
const titleStyle = { fontFamily:"'Bebas Neue',sans-serif", fontSize:40, color:"#0B1F3A", letterSpacing:".03em", marginBottom:8 };
const subStyle = { fontSize:15, color:"#5B6E84", lineHeight:1.7, marginBottom:24 };
const sectionStyle = { background:"#fff", border:"1px solid rgba(11,31,58,0.08)", borderRadius:12, padding:"24px", marginBottom:16 };
const sectionTitle = { fontFamily:"'Barlow Condensed',sans-serif", fontSize:14, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", color:"#0B1F3A", marginBottom:20 };
const inputStyle = { width:"100%", padding:"10px 12px", border:"1px solid #e2e8f0", borderRadius:6, fontSize:14, color:"#0B1F3A", background:"#fff", outline:"none", fontFamily:"'Barlow',sans-serif" };
const primaryBtn = { background:"#0B1F3A", color:"#C9A84C", padding:"14px 40px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700, letterSpacing:".12em", textTransform:"uppercase", clipPath:"polygon(8px 0%,100% 0%,calc(100% - 8px) 100%,0% 100%)" };
const secondaryBtn = { background:"#f1f5f9", color:"#0B1F3A", padding:"14px 28px", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"'Barlow Condensed',sans-serif", fontSize:15, fontWeight:700, letterSpacing:".1em", textTransform:"uppercase" };