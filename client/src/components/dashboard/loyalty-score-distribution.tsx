import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Client } from "@shared/schema";

interface LoyaltyScoreDistributionProps {
  clients: Client[];
}

export function LoyaltyScoreDistribution({ clients }: LoyaltyScoreDistributionProps) {
  const distribution = useMemo(() => {
    const scores = clients.map(client => parseFloat(client.loyaltyScore));
    
    const buckets = {
      high: scores.filter(score => score >= 7).length,
      medium: scores.filter(score => score >= 4 && score < 7).length,
      low: scores.filter(score => score < 4).length,
    };

    const total = clients.length;
    
    return {
      high: {
        count: buckets.high,
        percentage: total > 0 ? Math.round((buckets.high / total) * 100) : 0,
        color: "bg-green-500",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
      },
      medium: {
        count: buckets.medium,
        percentage: total > 0 ? Math.round((buckets.medium / total) * 100) : 0,
        color: "bg-yellow-500",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-700",
      },
      low: {
        count: buckets.low,
        percentage: total > 0 ? Math.round((buckets.low / total) * 100) : 0,
        color: "bg-red-500",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
      },
    };
  }, [clients]);

  return (
    <div className="space-y-6">
      {/* Loyalty Score Distribution */}
      <Card className="w-full h-fit border-0 rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Loyalty Score Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className={`p-4 ${distribution.high.bgColor} rounded-lg`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-medium ${distribution.high.textColor}`}>
                  High Loyalty (7-10)
                </span>
                <span className={`font-semibold ${distribution.high.textColor}`}>
                  {distribution.high.count} clients
                </span>
              </div>
              <Progress 
                value={distribution.high.percentage} 
                className="h-2" 
              />
              <div className={`text-sm mt-1 ${distribution.high.textColor}`}>
                {distribution.high.percentage}% of total clients
              </div>
            </div>

            <div className={`p-4 ${distribution.medium.bgColor} rounded-lg`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-medium ${distribution.medium.textColor}`}>
                  Medium Loyalty (4-6.9)
                </span>
                <span className={`font-semibold ${distribution.medium.textColor}`}>
                  {distribution.medium.count} clients
                </span>
              </div>
              <Progress 
                value={distribution.medium.percentage} 
                className="h-2" 
              />
              <div className={`text-sm mt-1 ${distribution.medium.textColor}`}>
                {distribution.medium.percentage}% of total clients
              </div>
            </div>

            <div className={`p-4 ${distribution.low.bgColor} rounded-lg`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-medium ${distribution.low.textColor}`}>
                  Low Loyalty (0-3.9)
                </span>
                <span className={`font-semibold ${distribution.low.textColor}`}>
                  {distribution.low.count} clients
                </span>
              </div>
              <Progress 
                value={distribution.low.percentage} 
                className="h-2" 
              />
              <div className={`text-sm mt-1 ${distribution.low.textColor}`}>
                {distribution.low.percentage}% of total clients
              </div>
            </div>
          </div>

          {clients.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <div className="text-sm">No client data available</div>
              <div className="text-xs mt-1">Distribution will appear when you have clients</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {distribution.low.count > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="font-medium text-red-800 mb-1">
                  Focus on Low Loyalty Clients
                </div>
                <div className="text-red-600">
                  {distribution.low.count} clients have low loyalty scores. Consider reaching out with special offers.
                </div>
              </div>
            )}
            
            {distribution.high.count > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-medium text-green-800 mb-1">
                  Leverage High Loyalty Clients
                </div>
                <div className="text-green-600">
                  {distribution.high.count} clients are highly loyal. They're perfect candidates for referral programs.
                </div>
              </div>
            )}
            
            {distribution.medium.count > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-medium text-yellow-800 mb-1">
                  Nurture Medium Loyalty Clients
                </div>
                <div className="text-yellow-600">
                  {distribution.medium.count} clients show potential. Consistent service can boost their loyalty.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}