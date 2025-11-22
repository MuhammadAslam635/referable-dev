import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ReferralsTable } from "@/components/referrals/referrals-table";
import { ReferralStatsGrid } from "@/components/referrals/referral-stats-grid";
import { apiRequest } from "@/lib/queryClient";
import { Download } from "lucide-react";
import type { Referral, Client } from "@shared/schema";

interface TopReferrer {
  client: Client;
  totalReferrals: number;
  convertedReferrals: number;
  conversionRate: number;
}

export default function Referrals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch referrals data
  const { data: referrals = [], isLoading: referralsLoading } = useQuery<
    Referral[]
  >({
    queryKey: ["/api/referrals"],
  });

  const { data: topReferrers = [] } = useQuery<TopReferrer[]>({
    queryKey: ["/api/analytics/top-referrers"],
  });

  const {
    data: stats = {
      totalClients: 0,
      totalReferrals: 0,
      avgLoyaltyScore: 0,
      monthlyRevenue: 0,
      activeReferrals: 0,
      referralRevenue: 0,
    },
  } = useQuery<{
    totalClients: number;
    totalReferrals: number;
    avgLoyaltyScore: number;
    monthlyRevenue: number;
    activeReferrals: number;
    referralRevenue: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/export", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Export failed");
      }
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "referrals-export.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Your referral data has been downloaded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export data.",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    exportMutation.mutate();
  };

  // Calculate referral conversion stats
  const convertedReferrals = referrals.filter(
    (referral: Referral) => referral.converted
  ).length;
  const pendingReferrals = referrals.filter(
    (referral: Referral) => !referral.converted
  ).length;
  const conversionRate =
    stats.totalReferrals > 0
      ? (convertedReferrals / stats.totalReferrals) * 100
      : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className=" px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="space-y-6">
                <h2 className="text-5xl font-bold bg-clip-text">
                  Referral Tracker
                </h2>
                <p className="text-[#5F5F5F] text-xl font-medium">
                  Track and manage client referrals and conversions
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                onClick={handleExport}
                disabled={exportMutation.isPending}
                className="bg-[#F3F3F3] backdrop-blur-sm hover:text-black hover:bg-[#d3d2d2]"
              >
                <Download className="h-4 w-4 mr-2" />
                {exportMutation.isPending ? "Exporting..." : "Export CSV"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto pt-6 px-6 space-y-8">
          {/* Stats */}
          <div className="relative">
            <div className="absolute inset-0"></div>
            <div className="relative">
              <ReferralStatsGrid
                totalReferrals={stats.totalReferrals}
                convertedReferrals={convertedReferrals}
                pendingReferrals={pendingReferrals}
                conversionRate={conversionRate}
                referralRevenue={stats.referralRevenue}
              />
            </div>
          </div>

          {/* Referrals Table */}
          <div className="relative">
            <div className="absolute inset-0"></div>
            <div className="relative">
              <ReferralsTable
                referrals={referrals}
                topReferrers={topReferrers}
                isLoading={referralsLoading}
                onExport={handleExport}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
