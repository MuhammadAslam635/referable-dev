import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, MessageSquare, Send, CheckCircle, Activity, Clock, Users, TrendingUp, Gift, Phone, Mail, Calendar, User, XCircle, Clock4, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UnreadReplies } from "@/components/sms/unread-replies";
import { RecentActivity } from "@/components/sms/recent-activity";
import { PhoneNumberDisplay } from "@/components/sms/phone-number-display";

interface DashboardStats {
  totalClients: number;
  totalReferrals: number;
  avgLoyaltyScore: number;
  monthlyRevenue: number;
  activeReferrals: number;
  referralRevenue: number;
  monthlyReferralRevenue: number;
  monthlyConvertedBookings: number;
  totalConvertedBookings: number;
}

interface SmsMessage {
  id: number;
  businessId: number;
  clientId: number;
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  toNumber: string;
  messageBody: string;
  messageType: string;
  twilioSid: string;
  status: string;
  timestamp: string;
  client?: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
}

interface SmsDashboardData {
  unreadCount: number;
  totalMessages: number;
  recentInbound: SmsMessage[];
  recentOutbound: SmsMessage[];
  hasBusinessNumber: boolean;
}

interface SmsReply {
  id: number;
  businessId: number;
  clientId: number;
  fromNumber: string;
  toNumber: string;
  messageBody: string;
  twilioSid: string;
  isRead: boolean;
  receivedAt: string;
  client?: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
}

interface ReferralConversion {
  id: number;
  businessId: number;
  referrerCode: string;
  refereeName: string;
  refereeEmail: string;
  refereePhone: string | null;
  converted: boolean;
  convertedAt: string | null;
  createdAt: string;
  referralReward?: {
    id: number;
    businessId: number;
    referralId: number;
    rewardGiven: boolean;
    rewardAmount: string | null;
    notes: string | null;
    markedAt: string;
  } | null;
  referrerClient?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

interface PendingReferral {
  id: number;
  businessId: number;
  referrerCode: string;
  refereeName: string;
  refereeEmail: string;
  refereePhone: string | null;
  converted: boolean;
  createdAt: string;
  daysSinceShared: number;
  referrerClient: {
    id: number;
    name: string;
    email: string;
  } | null;
}

interface ActivityLog {
  id: number;
  businessId: number;
  type: string;
  description: string;
  metadata: any;
  timestamp: string;
}

interface BusinessProfile {
  id: number;
  name: string;
  email: string;
  webhookUrl: string;
  googleReviewLink?: string;
  twilioPhoneNumber?: string;
  preferredAreaCode?: string;
  businessZipCode?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInMinutes / 1440);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

function BusinessDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replyMessages, setReplyMessages] = useState<{ [key: number]: string }>({});
  const [rewardStatuses, setRewardStatuses] = useState<{ [key: number]: boolean }>({});

  // Fetch dashboard data
  const { data: statsData } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const stats: DashboardStats = statsData || {
    totalClients: 0,
    totalReferrals: 0,
    avgLoyaltyScore: 0,
    monthlyRevenue: 0,
    activeReferrals: 0,
    referralRevenue: 0,
    monthlyReferralRevenue: 0,
    monthlyConvertedBookings: 0,
    totalConvertedBookings: 0,
  };

  // Fetch unread SMS conversations
  const { data: conversationsData, isLoading: smsRepliesLoading } = useQuery<{
    data: any[];
    pagination: any;
  }>({
    queryKey: ["/api/sms/conversations"],
    queryFn: () => apiRequest("GET", "/api/sms/conversations?limit=10"),
  });
  const smsReplies = conversationsData?.data?.filter(c => c.unreadCount > 0) || [];

  // Fetch recent conversions
  const { data: conversions = [] } = useQuery<ReferralConversion[]>({
    queryKey: ["/api/activities/conversions"],
  });

  // Fetch pending referrals
  const { data: pendingReferrals = [] } = useQuery<PendingReferral[]>({
    queryKey: ["/api/activities/pending-referrals"],
  });

  // Fetch activity feed for recent SMS sent
  const { data: activityFeed = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activities/feed"],
  });

  // Fetch business profile to check SMS setup
  const { data: businessProfile } = useQuery<BusinessProfile>({
    queryKey: ["/api/business/profile"],
  });

  // Send SMS reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: ({ clientId, message }: { clientId: number; message: string }) =>
      apiRequest("POST", `/api/sms/reply/${clientId}`, { message }),
    onSuccess: (_, { clientId }) => {
      setReplyMessages({ ...replyMessages, [clientId]: "" });
      toast({ title: "Reply sent successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/conversations"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to send reply",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mark reply as read mutation
  const markReplyReadMutation = useMutation({
    mutationFn: (messageId: number) => 
      apiRequest("POST", `/api/sms/mark-read/${messageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/conversations"] });
    }
  });

  // Send reminder mutation for pending referrals
  const sendReminderMutation = useMutation({
    mutationFn: (referralId: number) =>
      apiRequest("POST", `/api/referrals/send-reminder/${referralId}`),
    onSuccess: () => {
      toast({ title: "Reminder sent successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/pending-referrals"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to send reminder",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSendReply = (clientId: number) => {
    const message = replyMessages[clientId];
    if (!message?.trim()) return;
    sendReplyMutation.mutate({ clientId, message });
  };

  const handleRewardToggle = (conversionId: number, checked: boolean) => {
    setRewardStatuses({ ...rewardStatuses, [conversionId]: checked });
  };

  // Filter unread replies
  const unreadReplies = smsReplies.filter(reply => !reply.isRead);

  // Filter recent SMS sent from activity feed
  const recentSmsActivity = activityFeed
    .filter(activity => activity.type === "sms_sent")
    .slice(0, 10);

  // Get recent conversions (last 10)
  const recentConversions = conversions.slice(0, 10);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Compact Header - Mobile Optimized */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 text-xs sm:text-sm hidden sm:block">Referral Business Overview</p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm text-gray-500">Last updated</p>
              <p className="text-sm font-medium text-gray-900">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Optimized Grid Layout */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          {/* SMS Setup Notification Banner */}
          {businessProfile && !businessProfile.twilioPhoneNumber && (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-sm p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">SMS Not Set Up</h3>
                      <p className="text-sm text-white/90">Get a local phone number to start messaging clients automatically</p>
                    </div>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => window.location.href = '/sms'}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    Set Up SMS
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Top Stats Row - Compact Revenue Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.referralRevenue)}</p>
                  <p className="text-xs text-emerald-600 mt-1">{stats.totalConvertedBookings} bookings</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.monthlyReferralRevenue)}</p>
                  <p className="text-xs text-emerald-600 mt-1">{stats.monthlyConvertedBookings} bookings</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Referrals</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingReferrals.length}</p>
                  <p className="text-xs text-orange-600 mt-1">Awaiting conversion</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid - 2x2 Layout for Desktop, Stacked for Mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 lg:h-[calc(100vh-280px)]">
            
            {/* 1. Unread SMS Replies (Top-Left) - Modern Component */}
            <UnreadReplies 
              messages={unreadReplies.map(reply => ({
                id: reply.id,
                businessId: reply.businessId,
                clientId: reply.clientId,
                direction: 'inbound' as const,
                fromNumber: reply.fromNumber,
                toNumber: reply.toNumber,
                messageBody: reply.messageBody,
                messageType: 'inbound_reply',
                twilioSid: reply.twilioSid,
                status: 'received',
                timestamp: reply.receivedAt,
                isRead: reply.isRead,
                client: reply.client
              }))} 
              isLoading={smsRepliesLoading}
            />

            {/* 2. Recent Conversions (Top-Right) */}
            <Card className="shadow-sm border border-gray-200 bg-white rounded-xl overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-lg">Recent Conversions</CardTitle>
                  </div>
                  <span className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full font-medium">
                    {recentConversions.length}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 h-80 overflow-y-auto">
                {recentConversions.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No recent conversions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentConversions.map((conversion) => (
                      <div key={conversion.id} className="border-l-4 border-green-500 bg-green-50 rounded-r-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm text-gray-900">
                              {conversion.refereeName}
                            </p>
                            <p className="text-xs text-gray-500">
                              Referred by {conversion.referrerClient?.name || conversion.referrerCode}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {conversion.convertedAt ? getTimeAgo(conversion.convertedAt) : 'Just now'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                              Converted
                            </span>
                            {conversion.referralReward && (
                              <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                                {conversion.referralReward.rewardAmount || '$25 off'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            <Checkbox
                              checked={rewardStatuses[conversion.id] || conversion.referralReward?.rewardGiven || false}
                              onCheckedChange={(checked) => handleRewardToggle(conversion.id, checked as boolean)}
                            />
                            <span className="text-xs text-gray-600">Reward Given</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. Recent SMS Activity (Bottom-Left) - Modern Component */}
            <RecentActivity 
              messages={recentSmsActivity.map(activity => ({
                id: activity.id,
                businessId: activity.businessId,
                clientId: 0,
                direction: 'outbound' as const,
                fromNumber: businessProfile?.twilioPhoneNumber || '',
                toNumber: activity.metadata?.phone_number || '',
                messageBody: activity.description,
                messageType: activity.metadata?.message_type || 'outbound',
                twilioSid: activity.metadata?.twilio_sid || '',
                status: 'sent',
                timestamp: activity.timestamp,
                isRead: true,
                client: {
                  id: activity.metadata?.client_id || 0,
                  name: activity.metadata?.client_name || 'Unknown',
                  email: '',
                  phone: activity.metadata?.phone_number || ''
                }
              }))} 
              isLoading={false}
            />

            {/* 4. Pending Referrals (Bottom-Right) */}
            <Card className="shadow-sm border border-gray-200 bg-white rounded-xl overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-lg">Pending Referrals</CardTitle>
                  </div>
                  {pendingReferrals.length > 0 && (
                    <span className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-full font-medium">
                      {pendingReferrals.length}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 h-80 overflow-y-auto">
                {pendingReferrals.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No pending referrals</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingReferrals.slice(0, 5).map((referral) => (
                      <div key={referral.id} className="border-l-4 border-orange-500 bg-orange-50 rounded-r-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm text-gray-900">
                              {referral.refereeName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {referral.referrerClient?.name ? `Referred by ${referral.referrerClient.name}` : `Code: ${referral.referrerCode}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {referral.daysSinceShared}d ago
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                              Pending
                            </span>
                            {referral.refereePhone && (
                              <Phone className="h-3 w-3 text-blue-600" />
                            )}
                            {referral.refereeEmail && (
                              <Mail className="h-3 w-3 text-green-600" />
                            )}
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 sm:h-6 text-xs px-3 sm:px-2"
                            onClick={() => sendReminderMutation.mutate(referral.id)}
                            disabled={sendReminderMutation.isPending || !referral.refereePhone}
                          >
                            {sendReminderMutation.isPending ? "Sending..." : "Follow Up"}
                          </Button>
                        </div>
                      </div>
                    ))}
                    {pendingReferrals.length > 5 && (
                      <p className="text-xs text-gray-500 text-center py-2">
                        +{pendingReferrals.length - 5} more pending
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
}

export default BusinessDashboard;