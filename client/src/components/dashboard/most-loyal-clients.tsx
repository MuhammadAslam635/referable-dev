import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoyaltyScoreColor } from "@/lib/utils";
import type { Client } from "@shared/schema";

interface MostLoyalClientsProps {
  clients: Client[];
}

export function MostLoyalClients({ clients }: MostLoyalClientsProps) {
  const topLoyalClients = useMemo(() => {
    return clients
      .sort((a, b) => parseFloat(b.loyaltyScore) - parseFloat(a.loyaltyScore))
      .slice(0, 5);
  }, [clients]);

  return (
    <Card className="w-full h-fit border-0 rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">
          Most Loyal Clients
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topLoyalClients.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <div className="text-sm">No clients yet</div>
              <div className="text-xs mt-1">Your most loyal clients will appear here</div>
            </div>
          ) : (
            topLoyalClients.map((client, index) => {
              const loyaltyScore = parseFloat(client.loyaltyScore);
              const scoreColor = getLoyaltyScoreColor(loyaltyScore);
              
              return (
                <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {client.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {client.totalBookings} bookings
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      scoreColor === "high" ? "bg-green-500" :
                      scoreColor === "medium" ? "bg-yellow-500" : "bg-red-500"
                    }`}></div>
                    <span className="text-sm font-semibold text-gray-900">
                      {loyaltyScore.toFixed(1)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}