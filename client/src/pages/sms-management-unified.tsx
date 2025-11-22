import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Phone, Send, Clock, CheckCircle, Settings, Plus, Search, History, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Business {
  id: number;
  name: string;
  twilioPhoneNumber: string | null;
  preferredAreaCode: string | null;
  businessZipCode: string | null;
}

interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  referralCode: string;
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
  isRead?: boolean;
  client?: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
}

interface SmsTemplate {
  id: number;
  name: string;
  content: string;
  variables: string[];
}

interface SmsConversation {
  clientId: number;
  client: {
    id: number;
    name: string;
    phone: string;
  };
  unreadCount: number;
  lastMessage: SmsMessage;
  recentMessages: SmsMessage[];
  unreadMessageIds: number[];
}

export default function SmsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("setup");
  const [replyMessages, setReplyMessages] = useState<Record<number, string>>({});
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [bulkMessage, setBulkMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [preferredAreaCode, setPreferredAreaCode] = useState("");
  const [businessZipCode, setBusinessZipCode] = useState("");

  // Fetch business info to check if SMS is set up
  const { data: business } = useQuery<Business>({
    queryKey: ["/api/business/profile"],
  });

  // Fetch clients for messaging
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch SMS conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<SmsConversation[]>({
    queryKey: ["/api/sms/conversations"],
  });

  // Fetch all SMS messages
  const { data: allMessages = [], isLoading: messagesLoading } = useQuery<SmsMessage[]>({
    queryKey: ["/api/sms/messages"],
  });

  // Fetch SMS templates
  const { data: templates = [] } = useQuery<SmsTemplate[]>({
    queryKey: ["/api/sms/templates"],
  });

  // Auto-assign phone number mutation
  const assignNumberMutation = useMutation({
    mutationFn: (data: { preferredAreaCode?: string; businessZipCode?: string }) =>
      apiRequest("POST", "/api/sms/assign-local-number", data),
    onSuccess: (data: any) => {
      toast({
        title: "Phone number assigned!",
        description: `Your new SMS number: ${data.twilioPhoneNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/business/profile"] });
      setSelectedTab("conversations");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to assign phone number",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send SMS reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: (data: { clientId: number; message: string }) =>
      apiRequest("POST", "/api/sms/reply", data),
    onSuccess: () => {
      toast({ title: "Reply sent successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/messages"] });
      setReplyMessages({});
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send reply",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send bulk SMS mutation
  const sendBulkSmsMutation = useMutation({
    mutationFn: async (data: { clientIds: number[]; message: string; templateId?: number }) => {
      const promises = data.clientIds.map(clientId =>
        apiRequest("POST", "/api/sms/reply", { clientId, message: data.message })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({ title: "Messages sent successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/messages"] });
      setSelectedClients([]);
      setBulkMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send messages",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark messages as read mutation
  const markReadMutation = useMutation({
    mutationFn: (messageIds: number[]) =>
      apiRequest("POST", "/api/sms/mark-read", { messageIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/messages"] });
    },
  });

  const handleSendReply = (clientId: number) => {
    const message = replyMessages[clientId];
    if (!message?.trim()) return;
    sendReplyMutation.mutate({ clientId, message });
  };

  const handleAssignNumber = () => {
    assignNumberMutation.mutate({
      preferredAreaCode: preferredAreaCode || undefined,
      businessZipCode: businessZipCode || undefined,
    });
  };

  const handleBulkSend = () => {
    if (selectedClients.length === 0 || !bulkMessage.trim()) return;
    sendBulkSmsMutation.mutate({
      clientIds: selectedClients,
      message: bulkMessage,
      templateId: selectedTemplate || undefined,
    });
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const unreadCount = allMessages.filter(msg => msg.direction === 'inbound' && !msg.isRead).length;
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  );

  const filteredConversations = conversations.filter(conv =>
    conv.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.client?.phone?.includes(searchTerm)
  );

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">SMS Management</h1>
              <p className="text-gray-600 text-sm">
                {business?.twilioPhoneNumber 
                  ? `SMS number: ${business.twilioPhoneNumber}`
                  : "Set up SMS communication with your clients"
                }
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full flex flex-col">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="setup" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Setup
              </TabsTrigger>
              <TabsTrigger value="conversations" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Conversations
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Bulk Messaging
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Message History
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden px-6 pb-6">
            {/* SMS Setup Tab */}
            <TabsContent value="setup" className="h-full mt-4">
              {!business?.twilioPhoneNumber ? (
                <div className="h-full flex items-center justify-center">
                  <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Phone className="w-8 h-8 text-purple-600" />
                      </div>
                      <CardTitle className="text-xl">Set Up SMS</CardTitle>
                      <p className="text-gray-600 text-sm">
                        Get a local phone number to start messaging your clients
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="area-code" className="text-sm font-medium">
                            Preferred Area Code
                          </Label>
                          <Input
                            id="area-code"
                            value={preferredAreaCode}
                            onChange={(e) => setPreferredAreaCode(e.target.value)}
                            placeholder="412"
                            maxLength={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="zip-code" className="text-sm font-medium">
                            Business ZIP Code
                          </Label>
                          <Input
                            id="zip-code"
                            value={businessZipCode}
                            onChange={(e) => setBusinessZipCode(e.target.value)}
                            placeholder="15201"
                            maxLength={5}
                          />
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Auto-Assignment Features:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Local number based on your area code/ZIP</li>
                          <li>• SMS-enabled for client communication</li>
                          <li>• Automatic webhook configuration</li>
                          <li>• Ready in under 30 seconds</li>
                        </ul>
                      </div>

                      <Button 
                        onClick={handleAssignNumber}
                        disabled={assignNumberMutation.isPending}
                        className="w-full"
                        size="lg"
                      >
                        {assignNumberMutation.isPending ? "Assigning..." : "Get My SMS Number"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        SMS Setup Complete
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-green-800">
                          <strong>Your SMS Number:</strong> {business.twilioPhoneNumber}
                        </p>
                        <p className="text-green-700 text-sm mt-2">
                          Your SMS system is active and ready to send messages to your clients.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>SMS Templates</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {templates.map((template) => (
                        <div key={template.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium">{template.name}</h3>
                            <Badge variant="outline">{template.variables.length} variables</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{template.content}</p>
                          <div className="flex flex-wrap gap-1">
                            {template.variables.map((variable) => (
                              <Badge key={variable} variant="secondary" className="text-xs">
                                {variable}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Conversations Tab */}
            <TabsContent value="conversations" className="h-full mt-4">
              <div className="h-full flex flex-col">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search conversations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4">
                  {conversationsLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading conversations...</p>
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No conversations yet</p>
                      <p className="text-gray-400 text-sm mt-1">Start messaging your clients to see conversations here</p>
                    </div>
                  ) : (
                    filteredConversations.map((conversation) => (
                      <Card key={conversation.clientId} className="overflow-hidden">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-600 font-medium">
                                  {conversation.client?.name?.charAt(0) || '?'}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-medium">{conversation.client?.name || 'Unknown Client'}</h3>
                                <p className="text-sm text-gray-500">{conversation.client?.phone}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">
                                {getTimeAgo(conversation.lastMessage?.timestamp)}
                              </p>
                              {conversation.unreadCount > 0 && (
                                <Badge variant="destructive" className="mt-1">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="max-h-32 overflow-y-auto space-y-2">
                            {conversation.recentMessages?.slice(-3).map((message) => (
                              <div
                                key={message.id}
                                className={`p-2 rounded-lg text-sm ${
                                  message.direction === 'outbound'
                                    ? 'bg-purple-100 text-purple-900 ml-8'
                                    : 'bg-gray-100 text-gray-900 mr-8'
                                }`}
                              >
                                <p>{message.messageBody}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {getTimeAgo(message.timestamp)}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className="flex space-x-2">
                            <Input
                              placeholder="Type your reply..."
                              value={replyMessages[conversation.clientId] || ''}
                              onChange={(e) => setReplyMessages({
                                ...replyMessages,
                                [conversation.clientId]: e.target.value
                              })}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleSendReply(conversation.clientId);
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSendReply(conversation.clientId)}
                              disabled={sendReplyMutation.isPending || !replyMessages[conversation.clientId]?.trim()}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>

                          {conversation.unreadCount > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markReadMutation.mutate(conversation.unreadMessageIds)}
                              disabled={markReadMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Mark as Read
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Bulk Messaging Tab */}
            <TabsContent value="bulk" className="h-full mt-4">
              <div className="h-full flex flex-col space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Send Bulk Messages
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Select Clients</Label>
                      <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
                        {filteredClients.filter(client => client.phone).map((client) => (
                          <div key={client.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedClients.includes(client.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedClients([...selectedClients, client.id]);
                                } else {
                                  setSelectedClients(selectedClients.filter(id => id !== client.id));
                                }
                              }}
                            />
                            <span className="text-sm">{client.name}</span>
                            <span className="text-xs text-gray-500">{client.phone}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="bulk-message" className="text-sm font-medium">
                        Message
                      </Label>
                      <Textarea
                        id="bulk-message"
                        placeholder="Type your message..."
                        value={bulkMessage}
                        onChange={(e) => setBulkMessage(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <Button
                      onClick={handleBulkSend}
                      disabled={sendBulkSmsMutation.isPending || selectedClients.length === 0 || !bulkMessage.trim()}
                      className="w-full"
                    >
                      {sendBulkSmsMutation.isPending 
                        ? "Sending..." 
                        : `Send to ${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''}`
                      }
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Message History Tab */}
            <TabsContent value="history" className="h-full mt-4">
              <div className="h-full overflow-y-auto space-y-3">
                {messagesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading message history...</p>
                  </div>
                ) : allMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No message history</p>
                  </div>
                ) : (
                  allMessages.map((message) => (
                    <Card key={message.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              message.direction === 'outbound' ? 'bg-purple-100' : 'bg-gray-100'
                            }`}>
                              {message.direction === 'outbound' ? (
                                <Send className="w-4 h-4 text-purple-600" />
                              ) : (
                                <MessageSquare className="w-4 h-4 text-gray-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {message.client?.name || (message.direction === 'outbound' ? 'To Client' : 'From Client')}
                              </p>
                              <p className="text-xs text-gray-500">
                                {message.direction === 'outbound' ? message.toNumber : message.fromNumber}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">{getTimeAgo(message.timestamp)}</p>
                            <Badge variant={message.direction === 'outbound' ? 'default' : 'secondary'} className="mt-1">
                              {message.direction}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-900 bg-gray-50 rounded p-2">
                          {message.messageBody}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}