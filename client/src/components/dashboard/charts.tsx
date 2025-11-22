import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { generateInitials, getAvatarGradient, cn } from "@/lib/utils";
import type { Client } from "@shared/schema";

interface BookingTrend {
  date: string;
  count: number;
}

interface TopReferrer {
  client: Client;
  totalReferrals: number;
  convertedReferrals: number;
  conversionRate: number;
}

interface ChartsProps {
  bookingTrends: BookingTrend[];
  topReferrers: TopReferrer[];
  onViewAllReferrers: () => void;
  timePeriod: number;
  onTimePeriodChange: (days: number) => void;
}

export function Charts({ bookingTrends, topReferrers, onViewAllReferrers, timePeriod, onTimePeriodChange }: ChartsProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!chartRef.current || bookingTrends.length === 0) return;

    // Import Chart.js dynamically to avoid SSR issues
    import('chart.js/auto').then((Chart) => {
      const ctx = chartRef.current!.getContext('2d');
      if (!ctx) return;

      // Destroy existing chart if it exists
      Chart.default.getChart(ctx)?.destroy();

      const labels = bookingTrends.map(trend => {
        const date = new Date(trend.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      const data = bookingTrends.map(trend => trend.count);

      new Chart.default(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Bookings',
            data,
            borderColor: 'hsl(207, 90%, 54%)',
            backgroundColor: 'hsla(207, 90%, 54%, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#f3f4f6'
              },
              ticks: {
                stepSize: 1
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          },
          elements: {
            point: {
              radius: 4,
              hoverRadius: 6
            }
          }
        }
      });
    });
  }, [bookingTrends]);

  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Bookings Chart */}
      <Card className="lg:col-span-2 shadow-sm border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Bookings Over Time
            </CardTitle>
            <Select value={timePeriod.toString()} onValueChange={(value) => onTimePeriodChange(parseInt(value))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <canvas ref={chartRef} className="w-full h-full" />
          </div>
        </CardContent>
      </Card>

      {/* Top Referrers */}
      <Card className="shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Top Referrers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topReferrers.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  <div className="text-sm">No referrers yet</div>
                  <div className="text-xs mt-1">Referrals will appear here when clients start referring others</div>
                </div>
              </div>
            ) : (
              topReferrers.map((referrer) => (
                <div key={referrer.client.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-xs",
                      getAvatarGradient(referrer.client.name)
                    )}>
                      {generateInitials(referrer.client.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {referrer.client.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {referrer.client.referralCode}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {referrer.totalReferrals}
                    </p>
                    <p className="text-xs text-gray-500">referrals</p>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {topReferrers.length > 0 && (
            <Button 
              variant="ghost" 
              className="w-full mt-4 text-primary hover:text-primary/80"
              onClick={onViewAllReferrers}
            >
              View All Referrers
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
