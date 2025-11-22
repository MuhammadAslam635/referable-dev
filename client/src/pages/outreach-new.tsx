import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Settings, Phone, Send, History, Users, CheckCircle, Search, X } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  referralCode: string;
  loyaltyScore: number;
}

interface OutreachSettings {
  id?: number;
  businessId: number;
  referralDiscount: string;
  customMessages: {
    referral: string;
    thankYou: string;
    followUp: string;
  };
}

interface SmsLog {
  id: number;
  phoneNumber: string;
  messageType: string;
  messageContent: string;
  status: string;
  sentAt: string;
}

export default function Outreach() {
  const { toast } = useToast();
  const [selectedClients, setSelectedClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMessageType, setSelectedMessageType] = useState<"referral" | "thankYou" | "followUp">("referral");
  const [customMessage, setCustomMessage] = useState("");

  // Fetch outreach settings
  const { data: settings, isLoading: settingsLoading } = useQuery<OutreachSettings>({
    queryKey: ["/api/outreach/settings"],
  });

  // Fetch clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch SMS logs
  const { data: smsLogs = [], isLoading: logsLoading } = useQuery<SmsLog[]>({
    queryKey: ["/api/outreach/sms-logs"],
  });

  // Bulk SMS sending mutation
  const sendBulkSmsMutation = useMutation({
    mutationFn: async (data: { clientIds: number[]; messageType: string; customMessage?: string }) => {
      const promises = data.clientIds.map(clientId => 
        fetch("/api/outreach/send-sms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            messageType: data.messageType,
            customMessage: data.customMessage
          }),
        }).then(res => {
          if (!res.ok) throw new Error(`Failed for client ${clientId}`);
          return res.json();
        })
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { successful, failed, total: data.clientIds.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/sms-logs"] });
      setSelectedClients([]);
      setCustomMessage("");

      if (result.failed > 0) {
        toast({ 
          title: `Sent ${result.successful}/${result.total} messages`, 
          description: `${result.failed} messages failed to send`,
          variant: "default"
        });
      } else {
        toast({ title: `Successfully sent ${result.successful} messages` });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to send SMS messages", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Helper functions for client selection
  const toggleClientSelection = (client: Client) => {
    setSelectedClients(prev => {
      const isSelected = prev.some(c => c.id === client.id);
      if (isSelected) {
        return prev.filter(c => c.id !== client.id);
      } else {
        return [...prev, client];
      }
    });
  };

  const selectAllClients = () => {
    setSelectedClients(filteredClients);
  };

  const clearSelection = () => {
    setSelectedClients([]);
  };

  const handleSendSms = () => {
    if (selectedClients.length === 0) {
      toast({ title: "Please select at least one client", variant: "destructive" });
      return;
    }

    sendBulkSmsMutation.mutate({
      clientIds: selectedClients.map(c => c.id),
      messageType: selectedMessageType,
      customMessage: customMessage || undefined,
    });
  };

  const getMessagePreview = () => {
    if (!settings || selectedClients.length === 0) return "";

    const firstClient = selectedClients[0];
    let template = customMessage;
    if (!template && settings.customMessages) {
      template = settings.customMessages[selectedMessageType];
    }

    if (!template) return "";

    return template
      .replace(/\{clientName\}/g, firstClient.name)
      .replace(/\{referralDiscount\}/g, settings.referralDiscount || "$25")
      .replace(/\{referralLink\}/g, `https://yourapp.com/ref/${firstClient.referralCode}`)
      .replace(/\{referralCode\}/g, firstClient.referralCode);
  };

  // Filter clients with phone numbers and apply search
  const clientsWithPhone = clients.filter((client: Client) => client.phone);
  const filteredClients = clientsWithPhone.filter((client: Client) => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.phone && client.phone.includes(searchTerm))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">SMS Outreach</h1>
          <p className="text-lg text-gray-600">Connect with clients through automated and manual messaging campaigns</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Clients with Phone</p>
                  <p className="text-3xl font-bold text-blue-600">{clientsWithPhone.length}</p>
                </div>
                <Phone className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Messages Sent</p>
                  <p className="text-3xl font-bold text-green-600">{smsLogs.length}</p>
                </div>
                <Send className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Selected</p>
                  <p className="text-3xl font-bold text-purple-600">{selectedClients.length}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="send" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send">Send Messages</TabsTrigger>
            <TabsTrigger value="history">Message History</TabsTrigger>
          </TabsList>

          {/* Send Messages Tab */}
          <TabsContent value="send" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Client Selection */}
              <Card className="bg-white border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Select Clients ({selectedClients.length} selected)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {clientsLoading ? (
                    <div className="text-center py-8 text-gray-500">Loading clients...</div>
                  ) : clientsWithPhone.length === 0 ? (
                    <Alert>
                      <Phone className="h-4 w-4" />
                      <AlertDescription>
                        No clients with phone numbers found. Add phone numbers to your clients to send SMS messages.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search clients by name, email, or phone..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {/* Selection Controls */}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={selectAllClients}
                          disabled={filteredClients.length === 0}
                        >
                          Select All ({filteredClients.length})
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={clearSelection}
                          disabled={selectedClients.length === 0}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Clear
                        </Button>
                      </div>

                      {/* Client List */}
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filteredClients.map((client: Client) => {
                          const isSelected = selectedClients.some(c => c.id === client.id);
                          return (
                            <div
                              key={client.id}
                              className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                isSelected
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                              onClick={() => toggleClientSelection(client)}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => toggleClientSelection(client)}
                                />
                                <div className="flex-1">
                                  <h3 className="font-medium text-gray-900">{client.name}</h3>
                                  <p className="text-sm text-gray-600">{client.email}</p>
                                  <p className="text-sm text-gray-500">{client.phone}</p>
                                </div>
                                <Badge variant="outline">{client.loyaltyScore}/100</Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {filteredClients.length === 0 && searchTerm && (
                        <div className="text-center py-4 text-gray-500">
                          No clients found matching "{searchTerm}"
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Message Composition */}
              <Card className="bg-white border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    Compose Message
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="messageType">Message Type</Label>
                    <Select value={selectedMessageType} onValueChange={(value: any) => setSelectedMessageType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="referral">Referral Message</SelectItem>
                        <SelectItem value="thankYou">Thank You</SelectItem>
                        <SelectItem value="followUp">Follow Up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customMessage">Custom Message</Label>
                    <Textarea
                      id="customMessage"
                      placeholder="Enter your message here..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={4}
                    />
                  </div>

                  {selectedClients.length > 0 && (
                    <div className="space-y-2">
                      <Label>Message Preview ({selectedClients.length} recipients)</Label>
                      <div className="p-3 bg-gray-50 rounded-lg text-sm">
                        {getMessagePreview() || "Enter a custom message or select a template"}
                      </div>
                      {selectedClients.length > 1 && (
                        <p className="text-xs text-gray-500">
                          Preview shows message for {selectedClients[0].name}. Each recipient will get a personalized version.
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={handleSendSms}
                    disabled={selectedClients.length === 0 || sendBulkSmsMutation.isPending}
                    className="w-full"
                  >
                    {sendBulkSmsMutation.isPending 
                      ? `Sending to ${selectedClients.length} clients...` 
                      : `Send SMS to ${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''}`
                    }
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Message History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="bg-white border-0 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-600" />
                  SMS Message History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading message history...</div>
                ) : smsLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No SMS messages sent yet. Send your first message above!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {smsLogs.map((log: SmsLog) => (
                      <div key={log.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>
                              {log.status}
                            </Badge>
                            <span className="text-sm text-gray-600">{log.phoneNumber}</span>
                            <span className="text-sm text-gray-500">{log.messageType}</span>
                          </div>
                          <span className="text-sm text-gray-500">{formatDate(log.sentAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700">{log.messageContent}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}