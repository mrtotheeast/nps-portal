import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, AlertTriangle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PayrollPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [payrollUrl, setPayrollUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPayrollUrl();
  }, []);

  const loadPayrollUrl = async () => {
    try {
      const settings = await base44.entities.AppSettings.filter({ setting_key: "employee_payroll_url" });
      if (settings.length > 0 && settings[0].setting_value) {
        setPayrollUrl(settings[0].setting_value);
      } else {
        setError("not_configured");
      }
    } catch (err) {
      console.error("Failed to load payroll URL:", err);
      setError("failed_to_load");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (error === "not_configured") {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="h-14 bg-white border-b flex items-center px-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-700 hover:text-slate-900">
            <ArrowLeft className="w-5 h-5" />
            Back to NPS Portal
          </button>
        </div>
        <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
          <Card className="max-w-md mx-4">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h2 className="font-semibold text-slate-900 mb-2">Payroll Portal Not Configured</h2>
              <p className="text-sm text-slate-600 mb-6">Your payroll portal has not been configured yet. Please contact your administrator to set up access.</p>
              <Button onClick={() => navigate("/Chat")} className="w-full bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a]">
                <Mail className="w-4 h-4 mr-2" />
                Contact Admin via WorkChat
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="h-14 bg-white border-b sticky top-0 z-10 flex items-center px-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-medium">
          <ArrowLeft className="w-5 h-5" />
          Back to NPS Portal
        </button>
      </div>
      {payrollUrl && <iframe src={payrollUrl} className="w-full" style={{ height: "calc(100vh - 56px)" }} />}
    </div>
  );
}