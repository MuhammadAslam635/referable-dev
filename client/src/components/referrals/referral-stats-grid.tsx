import { Card, CardContent } from "@/components/ui/card";
import { Users, Share2, CheckCircle, Clock, TrendingUp, DollarSign, Award } from "lucide-react";

interface ReferralStatsGridProps {
  totalReferrals: number;
  convertedReferrals: number;
  pendingReferrals: number;
  conversionRate: number;
  referralRevenue: number;
}

export function ReferralStatsGrid({ 
  totalReferrals, 
  convertedReferrals, 
  pendingReferrals, 
  conversionRate,
  referralRevenue 
}: ReferralStatsGridProps) {
  const cards = [
    {
      title: "Total Referrals",
      value: totalReferrals.toString(),
      icon: Share2,
      color: "bg-[#0EA765] text-white",
      trend: `${convertedReferrals + pendingReferrals}`,
      trendLabel: "submissions received",
    },
    {
      title: "Converted Referrals",
      value: convertedReferrals.toString(),
      icon: CheckCircle,
      color: "bg-[#EA6A0A] text-white",
      trend: `${conversionRate.toFixed(1)}%`,
      trendLabel: "conversion rate",
    },
    {
      title: "Pending Referrals",
      value: pendingReferrals.toString(),
      icon: Clock,
      color: "bg-[#E32456] text-white",
      trend: `${totalReferrals - convertedReferrals}`,
      trendLabel: "awaiting conversion",
    },
    {
      title: "Referral Revenue",
      value: `$${referralRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "bg-[#9D4DF3] text-white",
      trend: `${convertedReferrals}`,
      trendLabel: "bookings completed",
    },
    {
      title: "Conversion Rate",
      value: `${conversionRate.toFixed(1)}%`,
      icon: Award,
      color: "bg-[#E7A800] text-white",
      trend: "+5%",
      trendLabel: "improvement",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="w-full h-fit border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#A0AEC0] font-bold truncate">{card.title}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
                <div className={`w-8 h-8 ${card.color} rounded-[12px] flex items-center justify-center`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}