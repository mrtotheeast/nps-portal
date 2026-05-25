import React from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ClientPortalFeeNotice({ activeContactCount = 0, billingFrequency = "monthly", clientName = "" }) {
  // Calculate portal fee
  const mainFee = 10;
  const additionalFee = 5;
  const totalMonthly = mainFee + (Math.max(0, activeContactCount - 1) * additionalFee);

  // Calculate based on billing frequency
  const billingMap = {
    monthly: { divisor: 1, label: "month" },
    "bi-weekly": { divisor: 2, label: "bi-weekly period" },
    weekly: { divisor: 4, label: "week" },
  };

  const freq = billingMap[billingFrequency] || billingMap.monthly;
  const amountPerPeriod = (totalMonthly / freq.divisor).toFixed(2);

  return (
    <Card className="border-2 border-[#c9a227] bg-[#fffbf0]">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-[#c9a227] flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-slate-900 mb-1">
              NPS Portal Access Fee
            </p>
            <p className="text-slate-700 mb-2">
              Your NPS Portal access includes <strong>{activeContactCount}</strong> user account{activeContactCount !== 1 ? "s" : ""}. 
              Current portal fee: <strong>${amountPerPeriod}/{freq.label}</strong>.
            </p>
            <p className="text-xs text-slate-600">
              To add or remove portal users, contact your NPS account manager.
              <br />
              <span className="text-slate-500">
                (Main contact: $10/month • Each additional contact: $5/month)
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}