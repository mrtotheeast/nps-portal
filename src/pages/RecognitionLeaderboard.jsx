import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, Star, TrendingUp, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import LoadingScreen from "@/components/shared/LoadingScreen";
import { Button } from "@/components/ui/button";

export default function RecognitionLeaderboard() {
  const navigate = useNavigate();
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["leaderboard-employees"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: recognitions = [], isLoading: recognitionsLoading } = useQuery({
    queryKey: ["leaderboard-recognitions"],
    queryFn: () => base44.entities.Recognition.list(),
  });

  const { data: badges = [] } = useQuery({
    queryKey: ["leaderboard-badges"],
    queryFn: () => base44.entities.RecognitionBadge.list(),
  });

  const getEmployeeStats = () => {
    const stats = {};

    employees.forEach(emp => {
      stats[emp.id] = {
        employee: emp,
        total_points: 0,
        recognition_count: 0,
        badges: {},
        total_bonuses: 0,
        recent_recognitions: []
      };
    });

    recognitions.forEach(rec => {
      if (stats[rec.recipient_id]) {
        stats[rec.recipient_id].total_points += rec.points_awarded || 0;
        stats[rec.recipient_id].recognition_count += 1;
        stats[rec.recipient_id].total_bonuses += rec.bonus_amount || 0;
        stats[rec.recipient_id].recent_recognitions.push(rec);

        if (rec.badge_id) {
          stats[rec.recipient_id].badges[rec.badge_id] = 
            (stats[rec.recipient_id].badges[rec.badge_id] || 0) + 1;
        }
      }
    });

    return Object.values(stats)
      .sort((a, b) => b.total_points - a.total_points);
  };

  const stats = getEmployeeStats();
  const topBadgeRecipients = Object.entries(
    recognitions.reduce((acc, rec) => {
      if (rec.badge_id) {
        acc[rec.badge_id] = (acc[rec.badge_id] || 0) + 1;
      }
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (employeesLoading || recognitionsLoading) return <LoadingScreen />;

  const getMedalColor = (position) => {
    if (position === 0) return "text-yellow-500";
    if (position === 1) return "text-gray-400";
    if (position === 2) return "text-orange-600";
    return "";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Recognition Leaderboard"
        subtitle="Celebrate top performers"
        showBack
        action={() => navigate(createPageUrl("RecognitionSystem"))}
        actionLabel="Give Recognition"
        actionIcon={Star}
      />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="points">
          <TabsList>
            <TabsTrigger value="points">Points Leaderboard</TabsTrigger>
            <TabsTrigger value="badges">Badge History</TabsTrigger>
          </TabsList>

          <TabsContent value="points">
            <div className="space-y-4">
              {stats.slice(0, 3).map((stat, idx) => (
                stat.total_points > 0 && (
                  <Card key={stat.employee.id} className={idx === 0 ? "border-2 border-yellow-500" : ""}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className={`text-4xl font-bold ${getMedalColor(idx)}`}>
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                        </div>
                        <Avatar className="w-16 h-16">
                          <AvatarImage src={stat.employee.profile_photo} />
                          <AvatarFallback className="bg-[#c9a227] text-white text-lg">
                            {stat.employee.full_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold">{stat.employee.full_name}</h3>
                          <p className="text-sm text-slate-600">{stat.employee.role_type?.replace("_", " ")}</p>
                          <div className="flex gap-2 mt-2">
                            <Badge className="bg-[#c9a227] text-[#1a2b4a]">
                              {stat.total_points} points
                            </Badge>
                            <Badge variant="outline">{stat.recognition_count} recognitions</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-[#c9a227]">{stat.total_points}</div>
                          <p className="text-xs text-slate-600">Total Points</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              ))}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Full Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.filter(s => s.total_points > 0).slice(3).map((stat, idx) => (
                      <div key={stat.employee.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-400 w-8">#{idx + 4}</span>
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={stat.employee.profile_photo} />
                            <AvatarFallback>{stat.employee.full_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{stat.employee.full_name}</p>
                            <p className="text-xs text-slate-600">{stat.recognition_count} recognitions</p>
                          </div>
                        </div>
                        <Badge className="bg-[#c9a227] text-[#1a2b4a]">
                          {stat.total_points} pts
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="badges">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {badges.filter(b => b.status === "active").map(badge => {
                const count = recognitions.filter(r => r.badge_id === badge.id).length;
                return (
                  <Card key={badge.id}>
                    <CardContent className="p-6 text-center">
                      <div className="text-5xl mb-2">{badge.icon_emoji}</div>
                      <h3 className="font-bold text-lg">{badge.name}</h3>
                      <p className="text-sm text-slate-600 mb-2">{badge.description}</p>
                      <Badge className="bg-slate-100 text-slate-700">
                        Awarded {count} times
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {topBadgeRecipients.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Most Popular Badges</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topBadgeRecipients.map((item, idx) => {
                      const badge = badges.find(b => b.id === item[0]);
                      return (
                        <div key={item[0]} className="flex items-center justify-between p-2">
                          <span className="text-xl">{badge?.icon_emoji}</span>
                          <span className="font-semibold">{badge?.name}</span>
                          <Badge>{item[1]} times</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}