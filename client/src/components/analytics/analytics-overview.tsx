import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { 
  Users, 
  Share2, 
  Star, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Target,
  Award 
} from "lucide-react";

interface AnalyticsOverviewProps {
  stats: {
    totalClients: number;
    totalReferrals: number;
    avgLoyaltyScore: number;
    monthlyRevenue: number;
    activeReferrals: number;
    referralRevenue: number;
  };
}

export function AnalyticsOverview({ stats }: AnalyticsOverviewProps) {
  const cards = [
    {
      title: "Monthly Revenue",
      value: formatCurrency(stats.monthlyRevenue),
      icon: DollarSign,
      color: "bg-green-100 text-green-600",
      trend: "+18%",
      trendLabel: "vs last month",
      description: "Total revenue this month",
    },
    {
      title: "Referral Revenue",
      value: formatCurrency(stats.referralRevenue),
      icon: Share2,
      color: "bg-emerald-100 text-emerald-600",
      trend: `${stats.totalReferrals - stats.activeReferrals}`,
      trendLabel: "converted bookings",
      description: "Revenue from referred clients",
    },
    {
      title: "Total Referrals",
      value: stats.totalReferrals.toString(),
      icon: Users,
      color: "bg-blue-100 text-blue-600",
      trend: "+25%",
      trendLabel: "this month",
      description: "Referrals generated",
    },

    {
      title: "Active Referrals",
      value: stats.activeReferrals.toString(),
      icon: Target,
      color: "bg-orange-100 text-orange-600",
      trend: "Pending",
      trendLabel: "conversions",
      description: "Awaiting conversion",
    },
    {
      title: "Avg Loyalty Score",
      value: stats.avgLoyaltyScore.toFixed(1),
      icon: Star,
      color: "bg-yellow-100 text-yellow-600",
      trend: "+0.3",
      trendLabel: "improvement",
      description: "Client loyalty rating",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="group bg-white shadow-lg border border-gray-200/60 hover:shadow-xl hover:border-gray-300/60 transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      {card.value}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 text-lg">{card.title}</h3>
                  <p className="text-sm text-gray-600">{card.description}</p>
                  
                  <div className="flex items-center space-x-2 pt-2">
                    <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 rounded-full">
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-green-600 text-xs font-semibold">{card.trend}</span>
                    </div>
                    <span className="text-gray-500 text-xs">{card.trendLabel}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Indicators */}
      <Card className="bg-white shadow-lg border border-gray-200/60">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Star className="h-4 w-4 text-white" />
            </div>
            <span>Performance Indicators</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="group bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/60 rounded-xl p-4 hover:shadow-md transition-all duration-300">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700 mb-1">
                  {Math.round(stats.totalClients / 30 * 7)} 
                </div>
                <div className="text-xs text-blue-600 font-medium">Weekly Avg Bookings</div>
              </div>
            </div>
            
            <div className="group bg-gradient-to-br from-green-50 to-green-100/50 border border-green-200/60 rounded-xl p-4 hover:shadow-md transition-all duration-300">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700 mb-1">
                  {stats.totalReferrals > 0 ? Math.round(stats.totalClients / stats.totalReferrals * 100) / 100 : 0}x
                </div>
                <div className="text-xs text-green-600 font-medium">Referral Multiplier</div>
              </div>
            </div>
            
            <div className="group bg-gradient-to-br from-yellow-50 to-yellow-100/50 border border-yellow-200/60 rounded-xl p-4 hover:shadow-md transition-all duration-300">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-700 mb-1">
                  ${stats.totalClients > 0 ? Math.round((stats.monthlyRevenue / stats.totalClients)) : 0}
                </div>
                <div className="text-xs text-yellow-600 font-medium">Revenue Per Client</div>
              </div>
            </div>
            
            <div className="group bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200/60 rounded-xl p-4 hover:shadow-md transition-all duration-300">
              <div className="text-center">
                <div className={`text-2xl font-bold mb-1 ${
                  stats.avgLoyaltyScore >= 7 ? 'text-green-700' : 
                  stats.avgLoyaltyScore >= 4 ? 'text-yellow-700' : 'text-red-700'
                }`}>
                  {stats.avgLoyaltyScore >= 7 ? "High" : stats.avgLoyaltyScore >= 4 ? "Medium" : "Low"}
                </div>
                <div className="text-xs text-purple-600 font-medium">Loyalty Level</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
