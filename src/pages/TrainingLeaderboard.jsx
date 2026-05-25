import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Award, Star, Medal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PageHeader from "@/components/shared/PageHeader";

export default function TrainingLeaderboard() {
  const { data: userPoints = [] } = useQuery({
    queryKey: ['user-training-points'],
    queryFn: async () => {
      const points = await base44.entities.UserTrainingPoints.list();
      return points.sort((a, b) => b.total_points - a.total_points);
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const enrichedLeaderboard = userPoints.map((points, index) => {
    const user = users.find(u => u.id === points.user_id);
    return { ...points, user, rank: index + 1 };
  });

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-700" />;
    return <Star className="w-6 h-6 text-slate-300" />;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        title="Training Leaderboard"
        subtitle="Top performers in training completion"
        showBack
      />

      <div className="max-w-5xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#c9a227]" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {enrichedLeaderboard.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-lg border ${
                    entry.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-white border-yellow-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 text-center">{getRankIcon(entry.rank)}</div>
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={entry.user?.profile_photo} />
                        <AvatarFallback className="bg-[#c9a227] text-white">
                          {entry.user?.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{entry.user?.full_name || "Unknown User"}</p>
                        <p className="text-sm text-slate-600">{entry.user?.role_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#c9a227]">{entry.total_points}</p>
                      <p className="text-xs text-slate-500">points</p>
                    </div>
                  </div>
                </div>
              ))}

              {enrichedLeaderboard.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p>No training points earned yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}