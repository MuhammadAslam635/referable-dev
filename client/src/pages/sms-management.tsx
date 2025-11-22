import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Phone,
  Send,
  Clock,
  CheckCircle,
  Settings,
  Search,
  History,
  Users,
  Plus,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Business {
  id: number;
  name: string;
  twilioPhoneNumber: string | null;
  selectedPhoneNumber: string | null;
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
  direction: "inbound" | "outbound";
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

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string;
  region: string;
}

export default function SmsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("setup");
  const [replyMessages, setReplyMessages] = useState<Record<number, string>>(
    {}
  );
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [bulkMessage, setBulkMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [businessZipCode, setBusinessZipCode] = useState("");
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>(
    []
  );
  const [selectedNumber, setSelectedNumber] = useState<string>("");
  const [searchStep, setSearchStep] = useState<
    "input" | "searching" | "selecting" | "purchasing"
  >("input");

  // Template management state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SmsTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(
    null
  );

  // Fetch business info to check if SMS is set up
  const { data: business } = useQuery<Business>({
    queryKey: ["/api/business/profile"],
  });

  // Fetch clients for messaging
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch SMS conversations
  const { data: conversations = [], isLoading: conversationsLoading } =
    useQuery<SmsConversation[]>({
      queryKey: ["/api/sms/conversations"],
    });

  // Fetch all SMS messages with client data
  const { data: allMessages = [], isLoading: messagesLoading } = useQuery<SmsMessage[]>({
    queryKey: ["/api/sms/messages"],
  });

  // // Fetch all clients for message history
  // const { data: clients = [] } = useQuery<Client[]>({
  //   queryKey: ["/api/clients"],
  // });

  // Fetch SMS templates
  const { data: templates = [] } = useQuery<SmsTemplate[]>({
    queryKey: ["/api/sms/templates"],
  });

  // Template mutations
  const createTemplate = useMutation({
    mutationFn: async (payload: { name: string; content: string }) => {
      return await apiRequest("POST", "/api/sms/templates", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/templates"] });
      setIsAddOpen(false);
      toast({ title: "Template added" });
    },
    onError: (e: any) =>
      toast({
        title: "Failed to add template",
        description: e.message,
        variant: "destructive",
      }),
  });

  const editTemplate = useMutation({
    mutationFn: async (payload: {
      id: number;
      name: string;
      content: string;
    }) => {
      return await apiRequest("PATCH", `/api/sms/templates/${payload.id}`, {
        name: payload.name,
        content: payload.content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/templates"] });
      setIsEditOpen(false);
      toast({ title: "Template updated" });
    },
    onError: (e: any) =>
      toast({
        title: "Failed to update template",
        description: e.message,
        variant: "destructive",
      }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/sms/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/templates"] });
      setPendingDelete(null);
      toast({ title: "Template deleted" });
    },
    onError: (e: any) =>
      toast({
        title: "Failed to delete template",
        description: e.message,
        variant: "destructive",
      }),
  });
  const resetTemplateForm = () => {
    setTemplateName("");
    setTemplateContent("");
    setEditingTemplate(null);
  };
  const handleOpenAdd = () => {
    resetTemplateForm();
    setIsAddOpen(true);
  };
  const handleSubmitAdd = () => {
    if (!templateName.trim() || !templateContent.trim()) {
      toast({ title: "Name and content are required", variant: "destructive" });
      return;
    }
    createTemplate.mutate({
      name: templateName.trim(),
      content: templateContent,
    });
  };
  const handleOpenEdit = (tpl: SmsTemplate) => {
    setEditingTemplate(tpl);
    setTemplateName(tpl.name);
    setTemplateContent(tpl.content);
    setIsEditOpen(true);
  };
  const handleSubmitEdit = () => {
    if (!editingTemplate) return;
    if (!templateName.trim() || !templateContent.trim()) {
      toast({ title: "Name and content are required", variant: "destructive" });
      return;
    }
    editTemplate.mutate({
      id: editingTemplate.id,
      name: templateName.trim(),
      content: templateContent,
    });
  };
  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    deleteTemplate.mutate(pendingDelete.id);
  };
  const useTemplate = (tpl: { content: string }) => {
    setBulkMessage(tpl.content);
    setSelectedTab("bulk");
    toast({ title: "Template applied to Bulk Messaging" });
  };

  // Search available phone numbers mutation
  const searchNumbersMutation = useMutation({
    mutationFn: (data: { areaCode?: string; businessZipCode?: string }) =>
    apiRequest("POST", "/api/sms/search-numbers", data),
    // mutationFn: async (data: {
    //   areaCode?: string;
    //   businessZipCode?: string;
    // }) => {
    //   // Mock response
    //   return {
    //     success: true,
    //     numbers: [
    //       {
    //         phoneNumber: "+14125577255",
    //         friendlyName: "(412) 557-7255",
    //         locality: "Oakmont",
    //         region: "PA",
    //       },
    //       {
    //         phoneNumber: "+14127649177",
    //         friendlyName: "(412) 764-9177",
    //         locality: "Local Area",
    //         region: "US",
    //       },
    //       {
    //         phoneNumber: "+14125955220",
    //         friendlyName: "(412) 595-5220",
    //         locality: "Bethel Park",
    //         region: "PA",
    //       },
    //       {
    //         phoneNumber: "+14128168065",
    //         friendlyName: "(412) 816-8065",
    //         locality: "Turtle Creek",
    //         region: "PA",
    //       },
    //       {
    //         phoneNumber: "+14126681211",
    //         friendlyName: "(412) 668-1211",
    //         locality: "Carrick",
    //         region: "PA",
    //       },
    //       {
    //         phoneNumber: "+14123124490",
    //         friendlyName: "(412) 312-4490",
    //         locality: "Pittsburgh Zone",
    //         region: "PA",
    //       },
    //       {
    //         phoneNumber: "+14127648505",
    //         friendlyName: "(412) 764-8505",
    //         locality: "Local Area",
    //         region: "US",
    //       },
    //       {
    //         phoneNumber: "+14122136971",
    //         friendlyName: "(412) 213-6971",
    //         locality: "Glenshaw",
    //         region: "PA",
    //       },
    //     ],
    //     searchedAreaCode: data.areaCode || "412",
    //     message: "Found 8 available numbers in area code 412",
    //   };
    // },
    onSuccess: (data: any) => {
      if (data.success && data.numbers?.length > 0) {
        setAvailableNumbers(data.numbers);
        setSearchStep("selecting");
        toast({
          title: "Numbers found!",
          description: `Found ${data.numbers.length} available numbers`,
        });
      } else {
        toast({
          title: "No numbers found",
          description: "No phone numbers available for the selected criteria",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error searching for numbers",
        description: error.message || "Failed to search for available numbers",
        variant: "destructive",
      });
      setSearchStep("input");
    },
  });

  // Purchase selected phone number mutation
  const purchaseNumberMutation = useMutation({
    mutationFn: (data: { phoneNumber: string; areaCode?: string }) =>
      apiRequest("POST", "/api/sms/purchase-number", data),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/profile"] });
      toast({
        title: "Success!",
        description: `Successfully set up ${data.twilioPhoneNumber} as your business SMS number`,
      });
      setSearchStep("input");
      setAreaCode("");
      setBusinessZipCode("");
      setAvailableNumbers([]);
      setSelectedNumber("");
    },
    onError: (error: any) => {
      toast({
        title: "Error purchasing number",
        description: error.message || "Failed to purchase the selected number",
        variant: "destructive",
      });
      setSearchStep("selecting");
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
    mutationFn: async (data: { clientIds: number[]; message: string }) => {
      const promises = data.clientIds.map((clientId) =>
        apiRequest("POST", "/api/sms/reply", {
          clientId,
          message: data.message,
        })
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

  const handleSearchNumbers = () => {
    if (!areaCode && !businessZipCode) {
      toast({
        title: "Area code or ZIP code required",
        description:
          "Please enter an area code or ZIP code to search for available numbers.",
        variant: "destructive",
      });
      return;
    }

    setSearchStep("searching");
    searchNumbersMutation.mutate({
      areaCode: areaCode || undefined,
      businessZipCode: businessZipCode || undefined,
    });
  };

  const handleSelectNumber = (phoneNumber: string) => {
    setSelectedNumber(phoneNumber);
    setSearchStep("purchasing");
    purchaseNumberMutation.mutate({
      phoneNumber,
      areaCode: areaCode || undefined,
    });
  };

  const handleBackToSearch = () => {
    setSearchStep("input");
    setAvailableNumbers([]);
    setSelectedNumber("");
  };

  const handleBulkSend = () => {
    if (selectedClients.length === 0 || !bulkMessage.trim()) return;
    sendBulkSmsMutation.mutate({
      clientIds: selectedClients,
      message: bulkMessage,
    });
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor(
      (now.getTime() - messageTime.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const unreadCount = allMessages.filter(
    (msg) => msg.direction === "inbound" && !msg.isRead
  ).length;
  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm)
  );

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.client?.phone?.includes(searchTerm)
  );

  return (
    <>
      <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
        <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  SMS Management
                </h1>
                <p className="text-gray-600 text-sm">
                  {business?.selectedPhoneNumber || business?.twilioPhoneNumber
                    ? `SMS number: ${business.selectedPhoneNumber?.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3") || business.twilioPhoneNumber}`
                    : "Choose your business SMS number"}
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
          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="h-full flex flex-col"
          >
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="setup" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Setup
                </TabsTrigger>
                <TabsTrigger
                  value="conversations"
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Conversations
                  {unreadCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-4 px-1 text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="bulk" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Bulk Messaging
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex items-center gap-2"
                >
                  <History className="w-4 h-4" />
                  Message History
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden px-6 pb-6">
              {/* SMS Setup Tab */}
              <TabsContent value="setup" className="h-full mt-4">
                {!business?.selectedPhoneNumber &&
                !business?.twilioPhoneNumber ? (
                  <div className="h-full flex items-center justify-center">
                    <Card className="w-full max-w-2xl">
                      <CardHeader className="text-center">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Phone className="w-8 h-8 text-purple-600" />
                        </div>
                        <CardTitle className="text-xl">
                          Choose Your Business SMS Number
                        </CardTitle>
                        <p className="text-gray-600 text-sm">
                          Select a local phone number for client communication
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {searchStep === "input" && (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label
                                  htmlFor="area-code"
                                  className="text-sm font-medium"
                                >
                                  Preferred Area Code
                                </Label>
                                <Input
                                  id="area-code"
                                  value={areaCode}
                                  onChange={(e) => setAreaCode(e.target.value)}
                                  placeholder="412"
                                  maxLength={3}
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor="zip-code"
                                  className="text-sm font-medium"
                                >
                                  Business ZIP Code
                                </Label>
                                <Input
                                  id="zip-code"
                                  value={businessZipCode}
                                  onChange={(e) =>
                                    setBusinessZipCode(e.target.value)
                                  }
                                  placeholder="15201"
                                  maxLength={5}
                                />
                              </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h4 className="font-medium text-blue-900 mb-2">
                                How It Works:
                              </h4>
                              <ul className="text-sm text-blue-800 space-y-1">
                                <li>
                                  • Enter your preferred area code or ZIP code
                                </li>
                                <li>• Browse available local numbers</li>
                                <li>• Select your favorite number</li>
                                <li>• Start messaging clients immediately</li>
                              </ul>
                            </div>

                            <Button
                              onClick={handleSearchNumbers}
                              disabled={searchNumbersMutation.isPending}
                              className="w-full"
                              size="lg"
                            >
                              {searchNumbersMutation.isPending
                                ? "Searching..."
                                : "Find Available Numbers"}
                            </Button>
                          </>
                        )}

                        {searchStep === "searching" && (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">
                              Searching for available numbers...
                            </p>
                          </div>
                        )}

                        {searchStep === "selecting" && (
                          <>
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium">Available Numbers</h4>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleBackToSearch}
                              >
                                Search Again
                              </Button>
                            </div>

                            <div className="grid gap-3 max-h-80 overflow-y-auto">
                              {availableNumbers.map((number) => (
                                <Card
                                  key={number.phoneNumber}
                                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                  <CardContent className="p-4">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="font-medium text-lg">
                                          {number.friendlyName}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          {number.locality}, {number.region}
                                        </p>
                                      </div>
                                      <Button
                                        onClick={() =>
                                          handleSelectNumber(number.phoneNumber)
                                        }
                                        disabled={
                                          purchaseNumberMutation.isPending &&
                                          selectedNumber === number.phoneNumber
                                        }
                                      >
                                        {purchaseNumberMutation.isPending &&
                                        selectedNumber === number.phoneNumber
                                          ? "Setting Up..."
                                          : "Select This Number"}
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </>
                        )}

                        {searchStep === "purchasing" && (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">
                              Setting up your SMS number...
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                              This will only take a moment
                            </p>
                          </div>
                        )}
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
                            <strong>Your Business SMS Number:</strong>{" "}
                            {business.selectedPhoneNumber?.replace(
                              /^\+1(\d{3})(\d{3})(\d{4})$/,
                              "($1) $2-$3"
                            ) || business.twilioPhoneNumber}
                          </p>
                          <p className="text-green-700 text-sm mt-2">
                            This is the number your clients will see when
                            receiving texts from you.
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle>SMS Templates</CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleOpenAdd}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Template
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {templates.length === 0 ? (
                          <div className="text-center py-8">
                            <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">No templates yet</p>
                            <p className="text-gray-400 text-sm mt-1">
                              Create your first SMS template to get started
                            </p>
                          </div>
                        ) : (
                          templates.map((template) => (
                            <div
                              key={template.id}
                              className="border rounded-lg p-4 hover:bg-gray-50"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-medium">{template.name}</h3>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">
                                    {template.variables.length} variables
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => useTemplate(template)}
                                  >
                                    Use Template
                                  </Button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-3 rounded border-l-4 border-purple-400">
                                {template.content}
                              </p>
                              <div className="flex flex-wrap gap-1 mb-3">
                                {template.variables.map((variable) => (
                                  <Badge
                                    key={variable}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {variable}
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>Template #{template.id}</span>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => handleOpenEdit(template)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-red-600"
                                    onClick={() => setPendingDelete(template)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}

                        {/* Pre-built Templates Section */}
                        <div className="mt-6 pt-6 border-t">
                          <h4 className="font-medium mb-4 flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Quick Start Templates
                          </h4>
                          <div className="grid gap-3">
                            <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="font-medium text-blue-900">
                                  Thank You + Referral Request
                                </h5>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() =>
                                    useTemplate({
                                      content:
                                        "Hi {clientName}! Thanks for choosing {businessName}. We'd love a referral if you were happy with our service. Share this link: {referralLink}",
                                    })
                                  }
                                >
                                  Use This
                                </Button>
                              </div>
                              <p className="text-sm text-blue-800 mb-2">
                                Hi &#123;clientName&#125;! Thanks for choosing
                                &#123;businessName&#125;. We'd love a referral
                                if you were happy with our service. Share this
                                link: &#123;referralLink&#125;
                              </p>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-xs">
                                  clientName
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  businessName
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  referralLink
                                </Badge>
                              </div>
                            </div>

                            <div className="border rounded-lg p-3 bg-green-50 border-green-200">
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="font-medium text-green-900">
                                  Follow-up & Review Request
                                </h5>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() =>
                                    useTemplate({
                                      content:
                                        "Hi {clientName}! How did we do with your recent cleaning? If you're happy, we'd appreciate a quick review: {reviewLink}",
                                    })
                                  }
                                >
                                  Use This
                                </Button>
                              </div>
                              <p className="text-sm text-green-800 mb-2">
                                Hi &#123;clientName&#125;! How did we do with
                                your recent cleaning? If you're happy, we'd
                                appreciate a quick review:
                                &#123;reviewLink&#125;
                              </p>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-xs">
                                  clientName
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  reviewLink
                                </Badge>
                              </div>
                            </div>

                            <div className="border rounded-lg p-3 bg-purple-50 border-purple-200">
                              <div className="flex justify-between items-start mb-2">
                                <h5 className="font-medium text-purple-900">
                                  Appointment Reminder
                                </h5>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() =>
                                    useTemplate({
                                      content:
                                        "Hi {clientName}! This is a reminder about your cleaning appointment tomorrow at {appointmentTime}. See you then!",
                                    })
                                  }
                                >
                                  Use This
                                </Button>
                              </div>
                              <p className="text-sm text-purple-800 mb-2">
                                Hi &#123;clientName&#125;! This is a reminder
                                about your cleaning appointment tomorrow at
                                &#123;appointmentTime&#125;. See you then!
                              </p>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-xs">
                                  clientName
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  appointmentTime
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
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
                        <p className="text-gray-500 mt-2">
                          Loading conversations...
                        </p>
                      </div>
                    ) : filteredConversations.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No conversations yet</p>
                        <p className="text-gray-400 text-sm mt-1">
                          Start messaging your clients to see conversations here
                        </p>
                      </div>
                    ) : (
                      filteredConversations.map((conversation) => (
                        <Card
                          key={conversation.clientId}
                          className="overflow-hidden"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                  <span className="text-purple-600 font-medium">
                                    {conversation.client?.name?.charAt(0) ||
                                      "?"}
                                  </span>
                                </div>
                                <div>
                                  <h3 className="font-medium">
                                    {conversation.client?.name ||
                                      "Unknown Client"}
                                  </h3>
                                  <p className="text-sm text-gray-500">
                                    {conversation.client?.phone}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">
                                  {getTimeAgo(
                                    conversation.lastMessage?.timestamp
                                  )}
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
                              {conversation.recentMessages
                                ?.slice(-3)
                                .map((message) => (
                                  <div
                                    key={message.id}
                                    className={`p-2 rounded-lg text-sm ${
                                      message.direction === "outbound"
                                        ? "bg-purple-100 text-purple-900 ml-8"
                                        : "bg-gray-100 text-gray-900 mr-8"
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
                                value={
                                  replyMessages[conversation.clientId] || ""
                                }
                                onChange={(e) =>
                                  setReplyMessages({
                                    ...replyMessages,
                                    [conversation.clientId]: e.target.value,
                                  })
                                }
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    handleSendReply(conversation.clientId);
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleSendReply(conversation.clientId)
                                }
                                disabled={
                                  sendReplyMutation.isPending ||
                                  !replyMessages[conversation.clientId]?.trim()
                                }
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            </div>

                            {conversation.unreadCount > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  markReadMutation.mutate(
                                    conversation.unreadMessageIds
                                  )
                                }
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
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Select Clients ({selectedClients.length} selected)
                          </Label>
                          <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2">
                            <div className="mb-2 pb-2 border-b">
                              <Checkbox
                                checked={
                                  selectedClients.length ===
                                  filteredClients.filter(
                                    (client) => client.phone
                                  ).length
                                }
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedClients(
                                      filteredClients
                                        .filter((client) => client.phone)
                                        .map((client) => client.id)
                                    );
                                  } else {
                                    setSelectedClients([]);
                                  }
                                }}
                              />
                              <span className="text-sm font-medium ml-2">
                                Select All
                              </span>
                            </div>
                            {filteredClients
                              .filter((client) => client.phone)
                              .map((client) => (
                                <div
                                  key={client.id}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    checked={selectedClients.includes(
                                      client.id
                                    )}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedClients([
                                          ...selectedClients,
                                          client.id,
                                        ]);
                                      } else {
                                        setSelectedClients(
                                          selectedClients.filter(
                                            (id) => id !== client.id
                                          )
                                        );
                                      }
                                    }}
                                  />
                                  <span className="text-sm">{client.name}</span>
                                  <span className="text-xs text-gray-500">
                                    {client.phone}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            Quick Templates
                          </Label>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {templates.slice(0, 3).map((template) => (
                              <div
                                key={template.id}
                                className={`p-2 border rounded cursor-pointer transition-colors ${
                                  selectedTemplate === template.content
                                    ? "bg-purple-50 border-purple-300"
                                    : "hover:bg-gray-50"
                                }`}
                                onClick={() => {
                                  setSelectedTemplate(template.content);
                                  setBulkMessage(template.content);
                                }}
                              >
                                <p className="text-sm font-medium">
                                  {template.name}
                                </p>
                                <p className="text-xs text-gray-600 truncate">
                                  {template.content}
                                </p>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setBulkMessage("");
                                setSelectedTemplate("");
                              }}
                            >
                              Clear Template
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label
                          htmlFor="bulk-message"
                          className="text-sm font-medium"
                        >
                          Message
                        </Label>
                        <Textarea
                          id="bulk-message"
                          placeholder="Type your message or select a template above..."
                          value={bulkMessage}
                          onChange={(e) => setBulkMessage(e.target.value)}
                          rows={4}
                          className={
                            selectedTemplate ? "border-purple-300" : ""
                          }
                        />
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">
                            {bulkMessage.length}/160 characters
                          </span>
                          {selectedTemplate && (
                            <Badge variant="secondary" className="text-xs">
                              Using template
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h4 className="font-medium text-blue-900 mb-1">
                          Bulk Messaging Preview
                        </h4>
                        <p className="text-sm text-blue-800">
                          Sending to {selectedClients.length} client
                          {selectedClients.length !== 1 ? "s" : ""} with{" "}
                          {
                            filteredClients.filter((client) => client.phone)
                              .length
                          }{" "}
                          total SMS-enabled contacts available.
                        </p>
                      </div>

                      <Button
                        onClick={handleBulkSend}
                        disabled={
                          sendBulkSmsMutation.isPending ||
                          selectedClients.length === 0 ||
                          !bulkMessage.trim()
                        }
                        className="w-full"
                        size="lg"
                      >
                        {sendBulkSmsMutation.isPending
                          ? "Sending Messages..."
                          : `Send SMS to ${selectedClients.length} Client${selectedClients.length !== 1 ? "s" : ""}`}
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
                      <p className="text-gray-500 mt-2">
                        Loading message history...
                      </p>
                    </div>
                  ) : allMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No message history</p>
                    </div>
                  ) : (
                    allMessages.map((message) => {
                      // Find the client for this message
                      const client = clients.find((c) => c.id === message.clientId) || message.client;
                      const displayName = client?.name || (message.direction === 'outbound' ? message.toNumber : message.fromNumber);
                      const displayPhone = client?.phone || (message.direction === 'outbound' ? message.toNumber : message.fromNumber);
                      const isOutbound = message.direction === 'outbound';
                      return (
                        <Card key={message.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isOutbound ? 'bg-purple-100' : 'bg-gray-100'
                                  }`}
                                >
                                  {message.direction === "outbound" ? (
                                    <Send className="w-4 h-4 text-purple-600" />
                                  ) : (
                                    <MessageSquare className="w-4 h-4 text-gray-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {client?.name ? client.name : (isOutbound ? 'To: ' : 'From: ')}
                                    <span className="text-sm font-normal text-gray-500 ml-2">
                                      {displayPhone}
                                    </span>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(message.timestamp).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs text-gray-400">
                                  {message.direction}
                                </span>
                              </div>
                            </div>
                            <div className={`mt-2 p-3 rounded-lg text-sm ${
                              isOutbound ? 'bg-purple-50 text-purple-900' : 'bg-gray-50 text-gray-800'
                            }`}>
                              {message.messageBody}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </main>
      </div>

      {/* Dialogs */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add SMS Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium" htmlFor="tpl-name">
                Template Name
              </Label>
              <Input
                id="tpl-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium" htmlFor="tpl-content">
                Template Content
              </Label>
              <Textarea
                id="tpl-content"
                rows={4}
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmitAdd}>
              Add Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit SMS Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium" htmlFor="tpl-name-edit">
                Template Name
              </Label>
              <Input
                id="tpl-name-edit"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium" htmlFor="tpl-content-edit">
                Template Content
              </Label>
              <Textarea
                id="tpl-content-edit"
                rows={4}
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmitEdit}>
              Update Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this template?
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
