import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, TrendingUp, Clock, CheckCircle, Phone, DollarSign, Activity, Calendar, AlertCircle, Sparkles, Users, Star, Target, ArrowUp, ArrowDown, Zap, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Type definitions
interface Conversation {
  clientId: number;
  client: {
    id: number;
    name: string;
    phone: string;
  };
  unreadCount: number;
  lastMessage: {
    id: number;
    messageBody: string;
    timestamp: string;
    direction: 'inbound' | 'outbound';
    status: string;
  };
  unreadMessageIds: number[];
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
  };
}

interface RecentBooking {
  id: number;
  businessId: number;
  clientId: number;
  clientName: string;
  clientEmail: string;
  serviceDate: string;
  serviceType: string;
  amount: number;
  amountCharged: number;
  status: string;
  createdAt: string;
}

interface PendingReferral {
  id: number;
  businessId: number;
  referrerCode: string;
  refereeName: string;
  refereeEmail: string;
  refereePhone: string | null;
  converted: boolean;
  convertedAt: string | null;
  createdAt: string;
  daysSinceShared: number;
}

interface ActivityLog {
  id: number;
  businessId: number;
  type: string;
  description: string;
  metadata: any;
  timestamp: string;
}

export default function ActivitiesPage() {
  const { toast } = useToast();
  const [replyMessage, setReplyMessage] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [rewardAmount, setRewardAmount] = useState("");
  const [rewardNotes, setRewardNotes] = useState("");

  // Fetch SMS conversations
  const { data: conversationsData, isLoading: repliesLoading } = useQuery<{
    data: Conversation[];
    pagination: any;
  }>({
    queryKey: ["/api/sms/conversations"],
    queryFn: () => apiRequest("GET", "/api/sms/conversations?limit=50"),
  });
  const smsReplies = conversationsData?.data?.filter(c => c.unreadCount > 0) || [];

  // Fetch referral conversions
  const { data: conversions = [], isLoading: conversionsLoading } = useQuery<ReferralConversion[]>({
    queryKey: ["/api/activities/conversions"],
  });

  // Fetch recent bookings
  const { data: recentBookings = [], isLoading: bookingsLoading } = useQuery<RecentBooking[]>({
    queryKey: ["/api/activities/recent-bookings"],
  });

  // Fetch pending referrals
  const { data: pendingReferrals = [], isLoading: pendingLoading } = useQuery<PendingReferral[]>({
    queryKey: ["/api/activities/pending-referrals"],
  });

  // Fetch activity feed
  const { data: activityFeed = [], isLoading: feedLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activities/feed"],
  });

  // Mark reply as read mutation
  const markReplyReadMutation = useMutation({
    mutationFn: (messageId: number) => 
      apiRequest("POST", `/api/sms/mark-read/${messageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/conversations"] });
    }
  });

  // Send SMS reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: ({ clientId, message }: { clientId: number; message: string }) =>
      apiRequest("POST", `/api/sms/reply`, { clientId, message }),
    onSuccess: () => {
      setReplyMessage("");
      setSelectedClientId(null);
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

  // Mark reward given mutation
  const markRewardMutation = useMutation({
    mutationFn: ({ referralId, rewardAmount, notes }: { referralId: number; rewardAmount: string; notes: string }) =>
      apiRequest("POST", `/api/activities/mark-reward-given/${referralId}`, { rewardAmount, notes }),
    onSuccess: () => {
      setRewardAmount("");
      setRewardNotes("");
      toast({ title: "Reward marked as given" });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/conversions"] });
    }
  });

  // Send thank you SMS mutation
  const sendThankYouMutation = useMutation({
    mutationFn: (clientId: number) =>
      apiRequest("POST", `/api/sms/send-thank-you/${clientId}`),
    onSuccess: () => {
      toast({ title: "Thank you SMS sent successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/recent-bookings"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to send thank you SMS",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Send referral reminder mutation
  const sendReferralReminderMutation = useMutation({
    mutationFn: (referralId: number) =>
      apiRequest("POST", `/api/sms/send-referral-reminder/${referralId}`),
    onSuccess: () => {
      toast({ title: "Referral reminder sent successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/activities/pending-referrals"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to send referral reminder",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSendReply = () => {
    if (!selectedClientId || !replyMessage.trim()) return;
    sendReplyMutation.mutate({ clientId: selectedClientId, message: replyMessage });
  };

  const handleMarkReward = (referralId: number) => {
    markRewardMutation.mutate({ referralId, rewardAmount, notes: rewardNotes });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "sms_sent":
        return <MessageSquare className="h-4 w-4" />;
      case "referral_converted":
        return <TrendingUp className="h-4 w-4" />;
      case "booking_completed":
        return <CheckCircle className="h-4 w-4" />;
      case "client_created":
        return <Users className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  // Quick stats
  const unreadReplies = smsReplies.length;
  const pendingRewards = conversions.filter(c => !c.referralReward?.rewardGiven).length;
  const totalConversions = conversions.length;
  const recentBookingsCount = recentBookings.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Header */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            <Sparkles className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold">Business Dashboard</h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Monitor your customer interactions, track referral success, and manage all business activities from one beautiful dashboard.
          </p>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">SMS Replies</p>
                  <p className="text-3xl font-bold">{unreadReplies}</p>
                  <p className="text-blue-100 text-xs">Unread messages</p>
                </div>
                <MessageSquare className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Conversions</p>
                  <p className="text-3xl font-bold">{totalConversions}</p>
                  <p className="text-green-100 text-xs">This month</p>
                </div>
                <TrendingUp className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Pending Rewards</p>
                  <p className="text-3xl font-bold">{pendingRewards}</p>
                  <p className="text-orange-100 text-xs">Need attention</p>
                </div>
                <DollarSign className="h-12 w-12 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Recent Bookings</p>
                  <p className="text-3xl font-bold">{recentBookingsCount}</p>
                  <p className="text-purple-100 text-xs">Last 7 days</p>
                </div>
                <Calendar className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* SMS Text Replies */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/80 backdrop-blur">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5" />
                SMS Replies
                {unreadReplies > 0 && (
                  <Badge className="bg-red-500 text-white ml-auto">
                    {unreadReplies} new
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-blue-100">
                Customer messages requiring response
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 max-h-96 overflow-y-auto">
              {repliesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : smsReplies.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No SMS replies yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {smsReplies.slice(0, 5).map((reply) => (
                    <div 
                      key={reply.clientId} 
                      className='bg-blue-50 border-blue-200 border rounded-lg p-3 transition-colors'
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{reply.client.name}</p>
                          <p className="text-xs text-gray-500">{formatDate(reply.lastMessage.timestamp)}</p>
                        </div>
                        {reply.unreadCount > 0 && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-3">{reply.lastMessage.messageBody}</p>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedClientId(reply.clientId);
                            reply.unreadMessageIds.forEach(id => markReplyReadMutation.mutate(id));
                          }}
                        >
                          Reply
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => reply.unreadMessageIds.forEach(id => markReplyReadMutation.mutate(id))}
                        >
                          Mark Read
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referral Conversions */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/80 backdrop-blur">
            <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="h-5 w-5" />
                Referral Success
                {pendingRewards > 0 && (
                  <Badge className="bg-orange-500 text-white ml-auto">
                    {pendingRewards} pending
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-green-100">
                Successful referrals and rewards
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 max-h-96 overflow-y-auto">
              {conversionsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : conversions.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No conversions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {conversions.slice(0, 5).map((conversion) => (
                    <div key={conversion.id} className="border rounded-lg p-3 bg-green-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{conversion.refereeName}</p>
                          <p className="text-xs text-gray-500">Code: {conversion.referrerCode}</p>
                        </div>
                        <span className="text-xs text-green-600 font-medium">
                          {formatDate(conversion.convertedAt || conversion.createdAt)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox 
                          checked={conversion.referralReward?.rewardGiven || false}
                          onCheckedChange={() => {
                            if (!conversion.referralReward?.rewardGiven) {
                              handleMarkReward(Number(conversion.id));
                            }
                          }}
                        />
                        <span className="text-sm">Reward Given?</span>
                      </div>
                      
                      {!conversion.referralReward?.rewardGiven && (
                        <div className="space-y-2 pt-2 border-t">
                          <Input
                            placeholder="Reward amount (e.g., $25)"
                            value={rewardAmount}
                            onChange={(e) => setRewardAmount(e.target.value)}
                          />
                          <Input
                            placeholder="Notes (optional)"
                            value={rewardNotes}
                            onChange={(e) => setRewardNotes(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Bookings */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/80 backdrop-blur">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="h-5 w-5" />
                Recent Bookings
              </CardTitle>
              <CardDescription className="text-purple-100">
                Latest completed services
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 max-h-96 overflow-y-auto">
              {bookingsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : recentBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No recent bookings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="border rounded-lg p-3 bg-purple-50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-sm">{booking.clientName}</p>
                          <p className="text-xs text-gray-500">{booking.serviceType}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">${booking.amountCharged || booking.amount}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(booking.serviceDate)}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 hover:from-purple-600 hover:to-purple-700"
                        onClick={() => sendThankYouMutation.mutate(booking.clientId)}
                        disabled={sendThankYouMutation.isPending}
                      >
                        {sendThankYouMutation.isPending ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Sending...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Heart className="h-4 w-4" />
                            Send Thank You SMS
                          </div>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Referrals */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/80 backdrop-blur">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5" />
                Pending Referrals
              </CardTitle>
              <CardDescription className="text-orange-100">
                Referrals shared but not yet converted
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 max-h-96 overflow-y-auto">
              {pendingLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : pendingReferrals.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No pending referrals</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReferrals.slice(0, 5).map((referral) => (
                    <div key={referral.id} className="border rounded-lg p-3 bg-orange-50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-sm">{referral.refereeName}</p>
                          <p className="text-xs text-gray-500">from {referral.referrerCode}</p>
                        </div>
                        <span className="text-xs text-orange-600 font-medium">
                          {referral.daysSinceShared}d ago
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 hover:from-orange-600 hover:to-orange-700"
                          onClick={() => sendReferralReminderMutation.mutate(referral.id)}
                          disabled={sendReferralReminderMutation.isPending}
                        >
                          {sendReferralReminderMutation.isPending ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Sending...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4" />
                              Send Reminder
                            </div>
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-gray-500">
                          Mark Lost
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Recent Activity Feed
            </CardTitle>
            <CardDescription className="text-gray-200">
              Chronological log of all recent business activity
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {feedLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 animate-pulse">
                    <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activityFeed.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No activity to show yet</p>
                <p className="text-gray-400">Activity will appear here as you use the platform</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activityFeed.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}