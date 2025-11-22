import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, ArrowUpRight, ArrowDownLeft, Clock, Filter, CheckCheck, MessageSquareText } from "lucide-react";

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
  isRead?: boolean;
  client?: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
}

interface RecentActivityProps {
  messages: SmsMessage[];
  isLoading?: boolean;
}

export function RecentActivity({ messages, isLoading }: RecentActivityProps) {
  const [filter, setFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("7");

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (message: SmsMessage) => {
    if (message.direction === 'inbound') {
      return message.isRead ? (
        <Badge variant="secondary" className="text-xs">
          <CheckCheck className="w-3 h-3 mr-1" />
          Read
        </Badge>
      ) : (
        <Badge variant="destructive" className="text-xs">
          Unread
        </Badge>
      );
    } else {
      const statusMap: Record<string, { variant: "default" | "secondary" | "destructive", text: string }> = {
        sent: { variant: "default", text: "Sent" },
        delivered: { variant: "secondary", text: "Delivered" },
        failed: { variant: "destructive", text: "Failed" },
      };
      const status = statusMap[message.status] || { variant: "secondary", text: "Unknown" };
      return (
        <Badge variant={status.variant} className="text-xs">
          {status.text}
        </Badge>
      );
    }
  };

  const filteredMessages = messages.filter(message => {
    // Apply direction filter
    if (filter === "inbound" && message.direction !== "inbound") return false;
    if (filter === "outbound" && message.direction !== "outbound") return false;
    if (filter === "unread" && (message.direction !== "inbound" || message.isRead)) return false;

    // Apply time filter
    const messageDate = new Date(message.timestamp);
    const now = new Date();
    const daysAgo = parseInt(timeFilter);
    const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    
    return messageDate >= cutoffDate;
  });

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            Recent SMS Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            Recent SMS Activity
            <Badge variant="outline" className="ml-2">
              {filteredMessages.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="inbound">Received</SelectItem>
                <SelectItem value="outbound">Sent</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredMessages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquareText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No messages found</p>
            <p className="text-gray-400 text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {filteredMessages.map((message) => (
              <div 
                key={message.id} 
                className={`border rounded-lg p-3 transition-all hover:shadow-sm ${
                  message.direction === 'inbound' 
                    ? 'bg-blue-50/50 border-blue-200' 
                    : 'bg-green-50/50 border-green-200'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.direction === 'inbound' 
                        ? 'bg-blue-100' 
                        : 'bg-green-100'
                    }`}>
                      {message.direction === 'inbound' ? (
                        <ArrowDownLeft className="w-3 h-3 text-blue-600" />
                      ) : (
                        <ArrowUpRight className="w-3 h-3 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {message.client?.name || "Unknown Client"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {message.direction === 'inbound' ? 'Received from' : 'Sent to'} {message.client?.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusBadge(message)}
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
                
                <div className="pl-8">
                  <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                    {message.messageBody}
                  </p>
                  
                  {message.messageType && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        {message.messageType.replace('_', ' ')}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {messages.length > 10 && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              View All Messages
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}