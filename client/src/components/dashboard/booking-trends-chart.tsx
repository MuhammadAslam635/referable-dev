import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BookingTrend {
  date: string;
  count: number;
}

interface BookingTrendsChartProps {
  bookingTrends: BookingTrend[];
  timePeriod: number;
  onTimePeriodChange: (days: number) => void;
}

export function BookingTrendsChart({ bookingTrends, timePeriod, onTimePeriodChange }: BookingTrendsChartProps) {
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
    <Card className="w-full h-fit border-0 rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Bookings Over Time
          </CardTitle>
          <Select value={timePeriod.toString()} onValueChange={(value) => onTimePeriodChange(parseInt(value))}>
            <SelectTrigger className="w-[140px] bg-white">
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
  );
}