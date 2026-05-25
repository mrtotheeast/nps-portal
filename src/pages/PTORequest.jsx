import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Calendar, Plus, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import { toast } from "sonner";

export default function PTORequest() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    start_date: "",
    end_date: "",
    pto_type: "vacation",
    hours_requested: 8,
    reason: "",
  });

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const createMutation = useMutation({
    mutationFn: (data) =>
      base44.entities.PTORequest.create({
        ...data,
        employee_id: user?.id,
        request_date: new Date().toISOString(),
        status: "pending",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(["pto-requests"]);
      toast.success("PTO request submitted");
      setFormData({
        start_date: "",
        end_date: "",
        pto_type: "vacation",
        hours_requested: 8,
        reason: "",
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.start_date && formData.end_date) {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader title="Request PTO" subtitle="Submit a time off request" showBack />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              New PTO Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>End Date *</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>PTO Type *</Label>
                  <Select value={formData.pto_type} onValueChange={(value) => setFormData({ ...formData, pto_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Hours Requested</Label>
                  <Input
                    type="number"
                    value={formData.hours_requested}
                    onChange={(e) => setFormData({ ...formData, hours_requested: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
              </div>

              <div>
                <Label>Reason</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Reason for PTO request..."
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#1a2b4a]"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Send className="w-4 h-4 mr-2" />
                Submit Request
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}