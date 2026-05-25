import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, Users, ChevronRight, BookOpen, Star, Shield, Award, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/user_6911511d11edb2138d9f9703/a7d6b44d2_NPS_BADGE_2021-removebg-preview.jpg";
const ACUITY_URL = "https://nationwidepoliceservicesllc.as.me/schedule/549dc3bd";
const CATALOG_URL = "https://www.nationwidepolice.com/training";

const NPS_COURSES = [
  { title: "Security Guard Entry Level (MPCTC)", duration: "40 hrs", description: "Maryland state-mandated entry-level security guard training. MPCTC-approved and state certified." },
  { title: "Special Police Officer Training", duration: "80 hrs", description: "Comprehensive SPO certification including law, patrol, and use of force." },
  { title: "Use of Force Training", duration: "8 hrs", description: "De-escalation techniques, force continuum, and legal considerations." },
  { title: "Firearms Qualification", duration: "8 hrs", description: "Range qualification and firearm safety for security personnel." },
  { title: "First Aid / CPR / AED", duration: "4 hrs", description: "American Heart Association-aligned CPR, AED, and first aid certification." },
  { title: "Active Threat / Shooter Response", duration: "4 hrs", description: "Response protocols and tactics for active threat situations." },
  { title: "De-escalation & Crisis Intervention", duration: "8 hrs", description: "Communication techniques and mental health crisis response." },
  { title: "Customer Service for Security", duration: "4 hrs", description: "Professional conduct, public interaction, and client relations." },
];

function openInAppBrowser(url, title) {
  window.location.href = `/InAppBrowser?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&back=${encodeURIComponent(window.location.href)}`;
}

async function notifyAdminOfBooking(user, courseName) {
  await base44.integrations.Core.SendEmail({ to: "Info@NationwidePolice.com", subject: `Training Booking Initiated — ${user?.full_name || "An employee"}`, body: `${user?.full_name} (${user?.email}) initiated a booking for: ${courseName}.\n\nNPS Portal` }).catch(() => {});
  await base44.entities.Notification.create({ user_id: "admin", title: "Training Booking Initiated", message: `${user?.full_name || "An employee"} initiated a booking for: ${courseName}.`, type: "training", is_read: false, created_at: new Date().toISOString() }).catch(() => {});
}

export default function TrainingBookingTab({ user }) {
  const [notifiedCourses, setNotifiedCourses] = useState(new Set());

  const { data: advertisedClasses = [] } = useQuery({ queryKey: ["advertised-training-classes"], queryFn: () => base44.entities.AdvertisedTrainingClass.filter({ is_active: true }) });
  const { data: myAssignments = [] } = useQuery({ queryKey: ["my-training-assignments", user?.id], queryFn: () => base44.entities.TrainingAssignment.filter({ assigned_to: user?.id }), enabled: !!user?.id });
  const { data: allCourses = [] } = useQuery({ queryKey: ["training-courses"], queryFn: () => base44.entities.TrainingCourse.filter({ status: "published" }) });

  const handleBookNow = async (courseName, url = ACUITY_URL) => {
    if (!notifiedCourses.has(courseName)) { setNotifiedCourses(prev => new Set([...prev, courseName])); await notifyAdminOfBooking(user, courseName); toast.success("Opening booking page. Admin has been notified."); }
    openInAppBrowser(url, `Book: ${courseName}`);
  };

  const upcomingClasses = advertisedClasses.filter(c => c.is_active).sort((a, b) => new Date(a.date) - new Date(b.date));
  const requiredAssignments = myAssignments.filter(a => allCourses.find(c => c.id === a.training_course_id));

  const seatsLabel = (cls) => {
    if (!cls.max_seats) return null;
    const remaining = cls.max_seats - (cls.enrolled_count || 0);
    if (remaining <= 0) return <Badge className="bg-red-100 text-red-700">Full</Badge>;
    if (remaining <= 5) return <Badge className="bg-amber-100 text-amber-700">{remaining} seats left</Badge>;
    return <Badge className="bg-emerald-100 text-emerald-700">{remaining} seats available</Badge>;
  };

  const STATUS_MAP = { not_started: { label: "Not Started", cls: "bg-slate-100 text-slate-700" }, in_progress: { label: "In Progress", cls: "bg-blue-100 text-blue-700" }, completed: { label: "Completed", cls: "bg-emerald-100 text-emerald-700" }, overdue: { label: "Overdue", cls: "bg-red-100 text-red-700" } };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-[#1a2b4a] to-[#0d1a2e] text-white">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-5">
            <img src={LOGO_URL} alt="NPS Badge" className="w-16 h-16 object-contain rounded-full border-2 border-[#c9a227] shadow-lg" />
            <div>
              <div className="flex items-center gap-1.5 mb-1">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-[#c9a227] fill-[#c9a227]" />)}</div>
              <h2 className="text-lg font-bold leading-tight">Nationwide Police Services</h2>
              <p className="text-[#c9a227] text-sm font-semibold">Professional Training Programs</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm mb-5 leading-relaxed">Advance your career with MPCTC-approved, state-certified training programs. From entry-level security to Special Police Officer certification.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={() => openInAppBrowser(CATALOG_URL, "NPS Training Programs")} className="flex-1 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold"><BookOpen className="w-4 h-4 mr-2" />View All Training Courses</Button>
            <Button onClick={() => handleBookNow("General Training Booking", ACUITY_URL)} className="flex-1 bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-bold"><Calendar className="w-4 h-4 mr-2" />Schedule Training Now</Button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2"><Calendar className="w-5 h-5 text-[#c9a227]" />Upcoming NPS Training Classes</h3>
        {upcomingClasses.length === 0 ? (
          <Card><CardContent className="py-8 text-center"><GraduationCap className="w-10 h-10 mx-auto mb-3 text-slate-300" /><p className="text-slate-500 text-sm">No upcoming classes posted yet.</p><Button onClick={() => handleBookNow("General Training", ACUITY_URL)} className="mt-4 bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-semibold" size="sm"><Calendar className="w-4 h-4 mr-1.5" />Browse Available Dates</Button></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {upcomingClasses.map(cls => (
              <Card key={cls.id} className="shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-[#c9a227]">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1"><p className="font-bold text-[#1a2b4a]">{cls.course_name}</p>{seatsLabel(cls)}</div>
                      {cls.description && <p className="text-sm text-slate-600 mb-2 line-clamp-2">{cls.description}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#c9a227]" />{format(new Date(cls.date), "EEEE, MMM d, yyyy")}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#c9a227]" />{cls.time}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#c9a227]" />{cls.location}</span>
                        {cls.instructor_name && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-[#c9a227]" />{cls.instructor_name}</span>}
                        {cls.cost && <span className="font-semibold text-[#1a2b4a]">{cls.cost}</span>}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleBookNow(cls.course_name, cls.registration_link || ACUITY_URL)} className="bg-[#c9a227] hover:bg-[#b8922a] text-[#1a2b4a] font-bold shrink-0" disabled={cls.max_seats && (cls.enrolled_count || 0) >= cls.max_seats}>Register<ChevronRight className="w-3.5 h-3.5 ml-1" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2"><Shield className="w-5 h-5 text-[#c9a227]" />NPS Training Catalog</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {NPS_COURSES.map((course, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleBookNow(course.title)}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1a2b4a]/10 flex items-center justify-center shrink-0"><GraduationCap className="w-5 h-5 text-[#1a2b4a]" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1a2b4a] text-sm leading-tight">{course.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{course.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-[#c9a227] font-semibold flex items-center gap-1"><Clock className="w-3 h-3" />{course.duration}</span>
                      <span className="text-xs text-[#1a2b4a] font-semibold flex items-center gap-1">Book Now<ChevronRight className="w-3 h-3" /></span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {requiredAssignments.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2"><Award className="w-5 h-5 text-red-500" />Required Trainings<Badge className="bg-red-100 text-red-700">{requiredAssignments.filter(a => a.status !== "completed").length} pending</Badge></h3>
          <div className="space-y-2">
            {requiredAssignments.map(a => {
              const course = allCourses.find(c => c.id === a.training_course_id);
              if (!course) return null;
              const st = STATUS_MAP[a.status] || STATUS_MAP.not_started;
              return <Card key={a.id}><CardContent className="p-3 flex items-center justify-between gap-3"><div><p className="font-semibold text-sm text-[#1a2b4a]">{course.title}</p>{a.due_date && <p className="text-xs text-slate-500">Due: {format(new Date(a.due_date), "MMM d, yyyy")}</p>}</div><Badge className={st.cls}>{st.label}</Badge></CardContent></Card>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}