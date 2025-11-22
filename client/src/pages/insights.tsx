import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  AlertTriangle,
  Star,
  BarChart3,
  XCircle,
  Clock,
  Target,
  MessageSquare
} from "lucide-react";

interface InsightsData {
  // Customer Loyalty & Retention
  repeatBookingRate: number;
  avgTimeBetweenBookings: number;
  inactiveButLoyalClients: Array<{
    id: number;
    name: string;
    email: string;
    daysSinceLastBooking: number;
    avgTimeBetweenBookings: number;
    overdueByDays: number;
    totalBookings: number;
  }>;
  
  // Client Value Insights
  topClientsByLTV: Array<{
    id: number;
    name: string;
    email: string;
    totalRevenue: number;
    totalBookings: number;
  }>;
  avgBookingValue: number;
  
  // Operational Trends
  bookingsThisWeek: number;
  bookingsThisMonth: number;
  bookingsLastWeek: number;
  bookingsLastMonth: number;
  cancellationRate: number;
  
  // Data availability
  hasData: boolean;
  totalBookings: number;
  totalClients: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export default function Insights() {
  const [smsDialog, setSmsDialog] = useState<{
    open: boolean;
    clientId: number | null;
    clientName: string;
    message: string;
  }>({
    open: false,
    clientId: null,
    clientName: '',
    message: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: insights, isLoading, error } = useQuery<InsightsData>({
    queryKey: ["/api/insights"],
  });

  // Get outreach settings for default follow-up message
  const { data: outreachSettings } = useQuery({
    queryKey: ["/api/outreach/settings"],
  });

  const sendSMSMutation = useMutation({
    mutationFn: async ({ clientId, message }: { clientId: number; message: string }) => {
      return apiRequest(`/api/outreach/send-sms`, "POST", {
        clientId,
        messageType: "followUp",
        messageContent: message
      });
    },
    onSuccess: () => {
      toast({
        title: "SMS sent successfully",
        description: "Follow-up message has been sent to the client.",
      });
      setSmsDialog({ open: false, clientId: null, clientName: '', message: '' });
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/sms-logs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send SMS",
        description: error.message || "There was an error sending the message.",
        variant: "destructive",
      });
    },
  });

  const handleSendFollowUpSMS = (clientId: number, clientName: string) => {
    const defaultMessage = (outreachSettings as any)?.customMessages?.followUp 
      ?.replace('{clientName}', clientName)
      || `Hi ${clientName}, hope you loved your last cleaning! Ready to book another session?`;

    setSmsDialog({
      open: true,
      clientId,
      clientName,
      message: defaultMessage
    });
  };

  const handleSendSMS = () => {
    if (!smsDialog.clientId || !smsDialog.message.trim()) {
      toast({
        title: "Invalid input",
        description: "Please ensure all fields are filled out.",
        variant: "destructive",
      });
      return;
    }

    sendSMSMutation.mutate({
      clientId: smsDialog.clientId,
      message: smsDialog.message.trim()
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-500">Failed to load insights</p>
        </div>
      </div>
    );
  }

  if (!insights?.hasData) {
    return (
      <div className="flex-1 p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-2">Insights</h1>
          <p className="text-[#5F5F5F] text-xl font-medium">Advanced performance metrics and client behavior trends</p>
        </div>
        
        <Card className="max-w-2xl mx-auto text-center p-8">
          <CardContent className="pt-6">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Upload your booking data to unlock insights
            </h3>
            <p className="text-gray-600 mb-6">
              Connect your scheduling system or upload CSV files to see detailed analytics about your client loyalty, retention rates, and business performance.
            </p>
            <Button className="bg-gradient-to-br from-blue-800 to-blue-600 hover:from-blue-900 hover:to-blue-700 text-white font-medium px-3 py-2 text-xs sm:px-6 sm:py-2 sm:text-sm whitespace-nowrap" asChild>
              <a href="/data-sources">Connect Data Sources</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const weeklyChange = calculatePercentageChange(insights.bookingsThisWeek, insights.bookingsLastWeek);
  const monthlyChange = calculatePercentageChange(insights.bookingsThisMonth, insights.bookingsLastMonth);

  return (
    <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-5xl font-bold text-gray-900 mb-2">Insights</h1>
          <p className="text-[#5F5F5F] text-xl font-medium">Advanced performance metrics and client behavior trends</p>
      </div>

      {/* Section 1: Customer Loyalty & Retention */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          <Users className="h-6 w-6 mr-3 text-blue-600" />
          Customer Loyalty & Retention
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Repeat Booking Rate */}
          <Card className="w-full h-fit border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                Repeat Booking Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatPercentage(insights.repeatBookingRate)}
              </div>
              <p className="text-sm text-gray-600">
                Shows how many clients come back — a key loyalty signal
              </p>
            </CardContent>
          </Card>

          {/* Average Time Between Bookings */}
          <Card className="w-full border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                Avg Time Between Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {Math.round(insights.avgTimeBetweenBookings)} days
              </div>
              <p className="text-sm text-gray-600">
                Use this to time follow-up messages and rebooking reminders
              </p>
            </CardContent>
          </Card>

          {/* Inactive but Loyal Clients Count */}
          <Card className="w-full border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                Overdue Loyal Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {insights.inactiveButLoyalClients.length}
              </div>
              <p className="text-sm text-gray-600">
                Clients past their normal rebooking schedule
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Inactive but Loyal Clients Details */}
        {insights.inactiveButLoyalClients.length > 0 && (
          <Card className="w-full border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Clock className="h-5 w-5 mr-2 text-orange-600" />
                Clients Worth Checking In With
              </CardTitle>
              <p className="text-sm text-gray-600">
                These clients are overdue based on their normal schedule
              </p>
            </CardHeader>
            <CardContent>
              <div className="max-h-80 overflow-y-auto space-y-3">
                {insights.inactiveButLoyalClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div>
                      <p className="font-medium text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-600">
                        {client.daysSinceLastBooking} days since last booking • 
                        Usually books every {Math.round(client.avgTimeBetweenBookings)} days
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
                        ⚠️ Overdue by {client.overdueByDays} days
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleSendFollowUpSMS(client.id, client.name)}
                        className="flex items-center space-x-1 h-8 sm:h-6 px-3 sm:px-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Contact</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Section 2: Client Value Insights */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          <DollarSign className="h-6 w-6 mr-3 text-green-600" />
          Client Value Insights
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Clients by LTV */}
          <Card className="w-full border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Star className="h-5 w-5 mr-2 text-amber-600" />
                Top Clients by Lifetime Value
              </CardTitle>
              <p className="text-sm text-gray-600">
                These VIPs generate the most value — consider rewarding them
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.topClientsByLTV.slice(0, 5).map((client, index) => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <p className="text-sm text-gray-600">{client.totalBookings} bookings</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(client.totalRevenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Average Booking Value */}
          <Card className="w-full border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Target className="h-4 w-4 mr-2 text-blue-600" />
                Average Booking Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {formatCurrency(insights.avgBookingValue)}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Shows how much you earn from the average service
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  Based on {insights.totalBookings} completed bookings
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Section 3: Operational Trends */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          <BarChart3 className="h-6 w-6 mr-3 text-purple-600" />
          Operational Trends
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Bookings This Week */}
          <Card className="w-full border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                Bookings This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {insights.bookingsThisWeek}
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={weeklyChange >= 0 ? "default" : "destructive"}
                  className={weeklyChange >= 0 ? "bg-green-100 text-green-700" : ""}
                >
                  {weeklyChange >= 0 ? "+" : ""}{weeklyChange.toFixed(1)}% vs last week
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Track trends in demand and seasonal volume
              </p>
            </CardContent>
          </Card>

          {/* Bookings This Month */}
          <Card className="w-full border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-green-600" />
                Bookings This Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {insights.bookingsThisMonth}
              </div>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={monthlyChange >= 0 ? "default" : "destructive"}
                  className={monthlyChange >= 0 ? "bg-green-100 text-green-700" : ""}
                >
                  {monthlyChange >= 0 ? "+" : ""}{monthlyChange.toFixed(1)}% vs last month
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Monthly performance compared to previous period
              </p>
            </CardContent>
          </Card>

          {/* Cancellation Rate */}
          <Card className="w-full border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <XCircle className="h-4 w-4 mr-2 text-red-600" />
                Cancellation Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatPercentage(insights.cancellationRate)}
              </div>
              <p className="text-sm text-gray-600">
                High rates could signal issues in scheduling or client experience
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SMS Dialog */}
      <Dialog open={smsDialog.open} onOpenChange={(open) => setSmsDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Follow-Up SMS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="client-name">Client</Label>
              <div className="text-sm text-gray-600 mt-1">{smsDialog.clientName}</div>
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={smsDialog.message}
                onChange={(e) => setSmsDialog(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Enter your follow-up message..."
                rows={4}
                className="mt-1"
              />
              <div className="text-xs text-gray-500 mt-1">
                {smsDialog.message.length}/160 characters
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setSmsDialog({ open: false, clientId: null, clientName: '', message: '' })}
                className="h-10 sm:h-9 px-4 sm:px-3"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendSMS}
                disabled={sendSMSMutation.isPending || !smsDialog.message.trim()}
                className="flex items-center space-x-2 h-10 sm:h-9 px-4 sm:px-3"
              >
                {sendSMSMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    <span>Send SMS</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}