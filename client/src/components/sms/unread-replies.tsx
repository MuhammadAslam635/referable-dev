import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Clock, Send, Check, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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

interface UnreadRepliesProps {
  messages: SmsMessage[];
  isLoading?: boolean;
}

export function UnreadReplies({ messages, isLoading }: UnreadRepliesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());

  const sendReplyMutation = useMutation({
    mutationFn: (data: { clientId: number; message: string }) =>
      apiRequest("POST", "/api/sms/reply", data),
    onSuccess: (_, variables) => {
      toast({ title: "Reply sent successfully" });
      setReplyTexts(prev => ({ ...prev, [variables.clientId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["/api/sms/conversations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send reply",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (messageIds: number[]) =>
      apiRequest("POST", "/api/sms/mark-read", { messageIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/conversations"] });
    },
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleSendReply = (clientId: number) => {
    const message = replyTexts[clientId]?.trim();
    if (!message) return;
    sendReplyMutation.mutate({ clientId, message });
  };

  const toggleExpanded = (messageId: number) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Unread SMS Replies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Unread SMS Replies
            <Badge variant="outline" className="ml-auto">0</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No unread messages</p>
            <p className="text-gray-400 text-xs mt-1">You're all caught up!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Unread SMS Replies
          <Badge variant="destructive" className="ml-auto">
            {messages.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {messages.map((message) => {
          const isExpanded = expandedMessages.has(message.id);
          const previewText = message.messageBody.length > 60 
            ? message.messageBody.substring(0, 60) + "..."
            : message.messageBody;

          return (
            <div key={message.id} className="border rounded-lg p-3 bg-blue-50/50 border-blue-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {message.client?.name || "Unknown Client"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {message.client?.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {formatTime(message.timestamp)}
                  </div>
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                </div>
              </div>

              <div 
                className="cursor-pointer mb-3"
                onClick={() => toggleExpanded(message.id)}
              >
                <p className="text-sm text-gray-700 leading-relaxed">
                  {isExpanded ? message.messageBody : previewText}
                </p>
                {message.messageBody.length > 60 && (
                  <button className="text-xs text-blue-600 hover:text-blue-700 mt-1">
                    {isExpanded ? "Show less" : "Show more"}
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <Textarea
                  placeholder="Type your reply..."
                  value={replyTexts[message.clientId] || ""}
                  onChange={(e) => setReplyTexts(prev => ({
                    ...prev,
                    [message.clientId]: e.target.value
                  }))}
                  className="min-h-[60px] text-sm resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSendReply(message.clientId)}
                    disabled={!replyTexts[message.clientId]?.trim() || sendReplyMutation.isPending}
                    className="flex-1"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    {sendReplyMutation.isPending ? "Sending..." : "Send Reply"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markReadMutation.mutate([message.id])}
                    disabled={markReadMutation.isPending}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Mark Read
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}