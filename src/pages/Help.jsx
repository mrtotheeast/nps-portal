import React, { useState } from "react";
import { HelpCircle, ChevronDown, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";

export default function Help() {
  const [expandedFaq, setExpandedFaq] = useState(0);

  const faqs = [
    {
      question: "How do I clock in and out?",
      answer: "Go to the Timesheet page, then click Clock In when you arrive at your location. Click Clock Out when you leave. You must be within the geofence radius of your assigned site.",
    },
    {
      question: "How can I request PTO?",
      answer: "Navigate to PTO Request, fill in your requested dates, select the type of leave, and submit. Your supervisor will review and approve or deny your request.",
    },
    {
      question: "How do I view my schedule?",
      answer: "Check the Schedule page to see your upcoming shifts. If you want to bid on available shifts, use the Shift Bidding feature.",
    },
    {
      question: "What trainings are required for my role?",
      answer: "Go to My Trainings to see all assigned courses. Complete them before the due date to maintain your certifications.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Help & Support" subtitle="Get answers to common questions" showBack />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="grid gap-4 mb-8 md:grid-cols-2">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Mail className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <h3 className="font-semibold text-sm mb-1">Email Support</h3>
              <p className="text-xs text-slate-600">info@nationwidepolice.com</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Phone className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <h3 className="font-semibold text-sm mb-1">Phone Support</h3>
              <p className="text-xs text-slate-600">(240) 740-1141</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg"
                  onClick={() => setExpandedFaq(expandedFaq === idx ? -1 : idx)}
                >
                  <button className="w-full p-4 flex items-center justify-between hover:bg-slate-50">
                    <span className="font-medium text-left">{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 transition-transform ${expandedFaq === idx ? "rotate-180" : ""}`}
                    />
                  </button>
                  {expandedFaq === idx && <div className="px-4 pb-4 text-slate-600 text-sm">{faq.answer}</div>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}