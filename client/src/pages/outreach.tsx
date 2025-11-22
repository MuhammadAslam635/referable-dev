import { useState, useRef, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
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
  X,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { set } from "date-fns";
import { response } from "express";

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
  const [selectedTab, setSelectedTab] = useState("conversations");
  const [replyMessages, setReplyMessages] = useState<Record<number, string>>(
    {}
  );
  const [selectedClients, setSelectedClients] = useState<number[]>([]);
  const [bulkMessage, setBulkMessage] = useState("");
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [areaCode, setAreaCode] = useState("");
  const [businessZipCode, setBusinessZipCode] = useState("");
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>(
    []
  );
  const [selectedNumber, setSelectedNumber] = useState<string>("");
  const [searchStep, setSearchStep] = useState<
    "input" | "searching" | "selecting" | "purchasing" | "selected"
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

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10, // Default to 10 items per page
  });

  // Define response type for paginated conversations
  interface PaginatedResponse<T> {
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }

  // Define a stable query key for conversations
  const conversationsQueryKey = [
    "/api/sms/conversations",
    pagination.page,
    pagination.limit,
  ];

  // Fetch SMS conversations with pagination
  const {
    data: conversationsData,
    isLoading: conversationsLoading,
    isFetching: isFetchingConversations,
  } = useQuery<PaginatedResponse<SmsConversation>>({
    queryKey: conversationsQueryKey,
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/sms/conversations?page=${pagination.page}&limit=${pagination.limit}`
      );

      // Process conversations to ensure messages are in chronological order
      if (response.data) {
        response.data = response.data.map((conversation: SmsConversation) => ({
          ...conversation,
          recentMessages: [...(conversation.recentMessages || [])].sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          ),
        }));
      }

      return response;
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create a ref to store all message container refs
  const messageContainersRef = useRef<{ [key: number]: HTMLDivElement | null }>(
    {}
  );

  // Function to set a message container ref
  const setMessageContainerRef = (
    clientId: number,
    element: HTMLDivElement | null
  ) => {
    if (element) {
      messageContainersRef.current[clientId] = element;
      // Scroll to bottom when the ref is first set
      setTimeout(() => {
        if (element) {
          element.scrollTop = element.scrollHeight;
        }
      }, 0);
    }
  };

  useEffect(() => {
    if (business?.selectedPhoneNumber || business?.twilioPhoneNumber) {
      setSearchStep("selected");
    } else {
      setSearchStep("input");
    }
  }, [business]);

  // Scroll to bottom when conversations data changes
  useEffect(() => {
    const scrollAllToBottom = () => {
      Object.entries(messageContainersRef.current).forEach(
        ([clientId, element]) => {
          if (element) {
            element.scrollTop = element.scrollHeight;
          }
        }
      );
    };

    // Use requestAnimationFrame to ensure DOM is updated
    const timer = setTimeout(scrollAllToBottom, 100);
    return () => clearTimeout(timer);
  }, [conversationsData?.data]);

  const conversations = conversationsData?.data || [];
  const {
    page = 1,
    limit = 10,
    total = 0,
    totalPages = 1,
  } = conversationsData?.pagination || {};

  // Handle page change
  const handlePageChange = (newPage: number) => {
    // Ensure page is within valid range
    if (newPage < 1 || (totalPages > 0 && newPage > totalPages)) return;

    setPagination((prev) => ({
      ...prev,
      page: newPage,
    }));

    // Scroll to top of conversation list
    const conversationList = document.getElementById("conversation-list");
    if (conversationList) {
      conversationList.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Handle limit change
  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({
      ...prev,
      limit: newLimit,
      page: 1, // Reset to first page when changing limit
    }));
  };

  // Message history pagination and search state
  const [messagePagination, setMessagePagination] = useState({
    page: 1,
    limit: 20,
    direction: "",
    search: "",
  });

  // Fetch paginated SMS messages
  const {
    data: messagesData = {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    },
    isLoading: messagesLoading,
    isFetching: isFetchingMessages,
  } = useQuery({
    queryKey: [
      "/api/sms/messages",
      messagePagination.page,
      messagePagination.limit,
      messagePagination.direction,
      messagePagination.search,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: messagePagination.page.toString(),
        limit: messagePagination.limit.toString(),
        ...(messagePagination.direction && {
          direction: messagePagination.direction,
        }),
        ...(messagePagination.search && { search: messagePagination.search }),
      });

      const response = await apiRequest(
        "GET",
        `/api/sms/messages?${params.toString()}`
      );
      return response;
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const allMessages = messagesData.data || [];
  const {
    page: currentPage,
    limit: currentLimit,
    total: totalMessages,
    totalPages: totalMessagePages,
  } = messagesData.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  };

  // Handle message page change
  const handleMessagePageChange = (newPage: number) => {
    setMessagePagination((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  // Handle message limit change
  const handleMessageLimitChange = (newLimit: number) => {
    setMessagePagination((prev) => ({
      ...prev,
      limit: newLimit,
      page: 1, // Reset to first page when changing limit
    }));
  };

  // Handle direction filter change
  const handleDirectionFilter = (direction: string) => {
    setMessagePagination((prev) => ({
      ...prev,
      direction: prev.direction === direction ? "" : direction,
      page: 1, // Reset to first page when changing filter
    }));
  };

  // Handle search
  const handleMessageSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessagePagination((prev) => ({
      ...prev,
      search: e.target.value,
      page: 1, // Reset to first page when searching
    }));
  };

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

  const extractVariables = (content: string) => {
    const regex = /\{([^}]+)\}/g;
    const vars = new Set<string>();
    let match;
    while ((match = regex.exec(content)) !== null) {
      vars.add(match[1]);
    }
    return Array.from(vars);
  };

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
    mutationFn: async (data: {
      areaCode?: string;
      businessZipCode?: string;
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/sms/search-numbers",
        data
      );
      return response;

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
    },
    onSuccess: (data: any) => {
      console.log("Raw API response:", JSON.stringify(data, null, 2));
      console.log("Response type:", typeof data);
      console.log("Is data an object?", typeof data === "object");
      console.log("Data keys:", Object.keys(data || {}));

      // Force the selection step to test the interface
      if (
        data &&
        data.success === true &&
        data.numbers &&
        data.numbers.length > 0
      ) {
        console.log("SUCCESS: Setting available numbers:", data.numbers);
        setAvailableNumbers(data.numbers);
        setSearchStep("selecting");
        toast({
          title: "Numbers found!",
          description: `Found ${data.numbers.length} available numbers`,
        });
      } else {
        console.log("FAILED: Condition not met");
        console.log("- data.success:", data.success);
        console.log("- data.numbers exists:", !!data.numbers);
        console.log(
          "- data.numbers length:",
          data.numbers ? data.numbers.length : "N/A"
        );

        // For debugging, let's try to show what we got anyway
        if (data && data.numbers) {
          console.log("Forcing display despite condition failure");
          setAvailableNumbers(data.numbers);
          setSearchStep("selecting");
        } else {
          toast({
            title: "No numbers available",
            description:
              data.message ||
              "No available numbers in this area code. Please try a nearby one.",
            variant: "destructive",
          });
          setSearchStep("input");
        }
      }
    },
    onError: (error: any) => {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: error.message.message || "Failed to search for numbers",
        variant: "destructive",
      });
      setSearchStep("input");
    },
  });

  // Purchase selected phone number mutation
  const purchaseNumberMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; areaCode?: string }) => {
      const response = await apiRequest(
        "POST",
        "/api/sms/purchase-number",
        data
      );
      return response;
      // return Promise.resolve({
      //   friendlyNumber: "+1 (555) 123-4567",
      //   ...data,
      // });
    },
    onSuccess: (data: any) => {
      toast({
        title: "SMS number ready!",
        description: `Your business SMS number: ${data.friendlyNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/business/profile"] });
      setSelectedTab("conversations");
      setSearchStep("input");
      setSelectedNumber("");
      setAvailableNumbers([]);
    },
    onError: (error: any) => {
      console.log(error)
      toast({
        title: "Setup failed",
        description: error.message.message || "Failed to purchase number",
        variant: "destructive",
      });
      setSearchStep("selecting");
    },
  });

  // Send SMS reply mutation
  const sendReplyMutation = useMutation({
    mutationFn: (data: { clientId: number; message: string }) =>
      apiRequest("POST", "/api/sms/reply", data),
    onMutate: async (newReply: { clientId: number; message: string }) => {
      await queryClient.cancelQueries({ queryKey: conversationsQueryKey });

      const previousConversations = queryClient.getQueryData<
        PaginatedResponse<SmsConversation>
      >(conversationsQueryKey);

      if (previousConversations) {
        const newConversationsData = {
          ...previousConversations,
          data: previousConversations.data.map((conversation) => {
            if (conversation.clientId === newReply.clientId) {
              const newMessage: SmsMessage = {
                id: Date.now(),
                messageBody: newReply.message,
                direction: "outbound",
                timestamp: new Date().toISOString(),
                status: "sending",
                businessId: business?.id || 0,
                clientId: newReply.clientId,
                fromNumber: business?.twilioPhoneNumber || "",
                toNumber: conversation.client.phone || "",
                messageType: "sms",
                twilioSid: `temp-sid-${Date.now()}`,
              };
              return {
                ...conversation,
                recentMessages: [
                  ...(conversation.recentMessages || []),
                  newMessage,
                ],
              };
            }
            return conversation;
          }),
        };
        queryClient.setQueryData(conversationsQueryKey, newConversationsData);
      }

      setReplyMessages((prev) => ({ ...prev, [newReply.clientId]: "" }));

      return { previousConversations };
    },
    onError: (err, newReply, context) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(
          conversationsQueryKey,
          context.previousConversations
        );
      }
      toast({
        title: "Failed to send reply",
        description: "An error occurred while sending the message.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/messages"] });
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
        description: error.message.error || "Failed to send messages",
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

    console.log("Searching with:", { areaCode, businessZipCode }); // Debug log
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

  const handleBackToSelected = () => {
    setSearchStep("selected");
  };

  const handleBackToSearch = () => {
    setSearchStep("input");
    setAreaCode("");
    setBusinessZipCode("");
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

  // Get unread count from the server instead of filtering all messages
  const { data: unreadData } = useQuery({
    queryKey: ["/api/sms/unread-count"],
    queryFn: () => apiRequest("GET", "/api/sms/unread-count"),
  });

  const unreadCount = unreadData?.unreadCount || 0;
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
      <div className="flex-1 flex flex-col">
        <header className="px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3 w-full">
              <div className="space-y-6 w-full">
                <h1 className="text-5xl font-bold text-gray-900">
                  SMS Management
                </h1>
                {business?.selectedPhoneNumber ||
                business?.twilioPhoneNumber ? (
                  <div className="flex items-center justify-between gap-7 py-[35px] px-7 rounded-2xl shadow-[0px_7px_23px_0px_#0000000D] bg-white w-fit">
                    <div className="py-1 px-2 w-max">
                      <p className="text-[#000000] text-sm sm:text-2xl font-bold">
                        {business.selectedPhoneNumber?.replace(
                          /^(\+1)?\D*(\d{3})\D*(\d{3})\D*(\d{4})\D*$/,
                          (_, p1, p2, p3, p4) => `(${p2}) ${p3}-${p4}`
                        ) ||
                          business.twilioPhoneNumber?.replace(
                            /^(\+1)?\D*(\d{3})\D*(\d{3})\D*(\d{4})\D*$/,
                            (_, p1, p2, p3, p4) => `(${p2}) ${p3}-${p4}`
                          )}
                      </p>
                    </div>
                    {true &&
                      (searchStep === "selected" ? (
                        <Button
                          className="bg-[#EA6A0A] hover:bg-[#EA6A0A]/80 text-lg text-white h-full font-bold"
                          onClick={handleBackToSearch}
                        >
                          Reselect
                        </Button>
                      ) : (
                        <Button
                          className="bg-[#EA6A0A] hover:bg-[#EA6A0A]/80 text-lg text-white h-full font-bold"
                          onClick={handleBackToSelected}
                        >
                          Return
                        </Button>
                      ))}
                  </div>
                ) : (
                  <div className="py-1 px-2 w-fit mt-2">
                    <p className="font-semibold text-2xl ">
                      Set Up Your Business SMS number
                    </p>
                  </div>
                )}
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

            <div className="flex-1 overflow-hidden px-6">
              {/* SMS Setup Tab */}
              <TabsContent value="setup" className="h-full mt-4">
                {searchStep !== "selected" ? (
                  <div className="h-full flex justify-between gap-12">
                    {/* <div className="h-[388px] w-[672px]">.</div>
                    <Card className="w-full h-fit border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D] fixed bottom-12 z-10 bg-white"> */}
                    <Card className="w-full h-fit border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
                      <CardHeader className="text-start">
                        <CardTitle className="text-4xl font-bold">
                          Choose Your Business SMS Number
                        </CardTitle>
                        <p className="text-gray-600 text-xl font-medium">
                          Select a local phone number for client communication
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-1 space-y-6">
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
                                  className="bg-white border-[#E2E8F0] rounded-2xl"
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
                                  className="bg-white border-[#E2E8F0] rounded-2xl"
                                />
                              </div>
                            </div>

                            <div className="border border-black border-dashed rounded-lg p-4">
                              <h4 className="font-bold text-lg mb-2">
                                How It Works:
                              </h4>
                              <ul className="text-sm space-y-1">
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
                              className="w-full bg-[#E7A800] hover:bg-[#E7A800]/80 text-xl font-bold"
                              size="lg"
                            >
                              {searchNumbersMutation.isPending
                                ? "Searching..."
                                : "Find Available Numbers"}
                            </Button>
                          </div>
                        }

                        {searchStep === "searching" && (
                          <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">
                              Searching for available numbers...
                            </p>
                          </div>
                        )}

                        {/* {searchStep === "selecting" && (
                        <>
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">Available Numbers</h4>
                            <Button variant="ghost" className="bg-[#E7A800] hover:bg-[#E7A800]/80 text-xl text-white font-bold" size="sm" onClick={handleBackToSearch}>
                              Search Again
                            </Button>
                          </div>
                          
                          <div className="grid gap-3 max-h-80 overflow-y-auto">
                            {availableNumbers.map((number) => (
                              <Card key={number.phoneNumber} className="hover:bg-gray-50 cursor-pointer transition-colors">
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="font-medium text-lg">{number.friendlyName}</p>
                                      <p className="text-sm text-gray-600">{number.locality}, {number.region}</p>
                                    </div>
                                    <Button 
                                      onClick={() => handleSelectNumber(number.phoneNumber)}
                                      className="bg-[#0EA765] hover:bg-[#0EA765]/80 text-lg text-white font-bold"
                                      disabled={purchaseNumberMutation.isPending && selectedNumber === number.phoneNumber}
                                    >
                                      {purchaseNumberMutation.isPending && selectedNumber === number.phoneNumber 
                                        ? "Setting Up..." 
                                        : "Select"
                                      }
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </>
                      )} */}

                        {searchStep === "purchasing" && (
                          <div className="text-center py-2">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">
                              Setting up your SMS number...
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    {availableNumbers && (
                      <div className="grid max-h-[calc(100vh_-_296px)] overflow-y-auto w-2/5 gap-5">
                        {availableNumbers.map((number) => (
                          <Card
                            key={number.phoneNumber}
                            className="hover:bg-gray-50 border-0 rounded-2xl cursor-pointer shadow-[0px_7px_23px_0px_#0000000D] transition-colors"
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-xl font-bold">
                                    {number.friendlyName}
                                  </p>
                                  <p className="font-medium text-gray-600">
                                    {number.locality}, {number.region}
                                  </p>
                                </div>
                                <Button
                                  onClick={() =>
                                    handleSelectNumber(number.phoneNumber)
                                  }
                                  className="bg-[#0EA765] hover:bg-[#0EA765]/80 text-lg text-white font-bold"
                                  disabled={
                                    purchaseNumberMutation.isPending &&
                                    selectedNumber === number.phoneNumber
                                  }
                                >
                                  {purchaseNumberMutation.isPending &&
                                  selectedNumber === number.phoneNumber
                                    ? "Setting Up..."
                                    : "Select"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-10">
                    <Card className="border-0 shadow-[0px_7px_23px_0px_#0000000D] rounded-2xl">
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle>SMS Templates</CardTitle>
                          <Button
                            variant="ghost"
                            className="w-fit bg-[#E7A800] hover:bg-[#E7A800]/80 text-white text-xl font-bold"
                            size="sm"
                            onClick={handleOpenAdd}
                          >
                            <Plus className="w-4 h-4 text-white mr-2" />
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
                                    className="bg-[#0EA765] hover:bg-[#0EA765]/80 text-lg text-white font-bold"
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
                                  variant="ghost"
                                  className="bg-[#0EA765] hover:bg-[#0EA765]/80 text-lg text-white font-bold"
                                  size="sm"
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
                                  variant="ghost"
                                  className="bg-[#0EA765] hover:bg-[#0EA765]/80 text-lg text-white font-bold"
                                  size="sm"
                                  onClick={() =>
                                    useTemplate({
                                      content:
                                        "Hi {clientName}! How did we do with your recent cleaning? If you're happy, we'd appreciate a quick review: {referralLink}",
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
                                  variant="ghost"
                                  className="bg-[#0EA765] hover:bg-[#0EA765]/80 text-lg text-white font-bold"
                                  size="sm"
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
                <div className="flex gap-5 h-[calc(100dvh_-_25rem)]">
                  {/* Left sidebar with clients list */}
                  <Card className="w-1/3 h-full p-5 border-0 max-w-2xl rounded-2xl pb-10 overflow-hidden shadow-[0px_7px_23px_0px_#0000000D]">
                    <div className="border-b border-[#0000000A] pb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search by Name or Number..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 bg-white border-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                        />
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm("")}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <span className="text-lg">×</span>
                          </button>
                        )}
                      </div>
                      {searchTerm && (
                        <p className="text-sm text-gray-500 mt-2">
                          Showing {filteredConversations.length} conversation
                          {filteredConversations.length !== 1 ? "s" : ""}{" "}
                          matching "{searchTerm}"
                        </p>
                      )}
                    </div>

                    <div className="overflow-y-auto h-[calc(100%-80px)]">
                      {filteredConversations.length === 0 ? (
                        <div className="text-center py-12">
                          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500">
                            No conversations found
                          </p>
                        </div>
                      ) : (
                        filteredConversations.map((conversation) => (
                          <div key={conversation.clientId}>
                            <div
                              className={`p-4 my-2 rounded-2xl cursor-pointer hover:bg-gray-50 ${selectedClient === conversation.clientId ? "bg-blue-50" : ""}`}
                              onClick={() =>
                                setSelectedClient(conversation.clientId)
                              }
                            >
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
                                    <Badge
                                      variant="destructive"
                                      className="mt-1"
                                    >
                                      {conversation.unreadCount}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="px-6 ">
                              <div className="border-t w-full border-[#0000000A]"></div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>

                  {/* Right side with chat */}
                  <div className="w-2/3 flex flex-col">
                    {selectedClient ? (
                      <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                          {conversations
                            .find((c) => c.clientId === selectedClient)
                            ?.recentMessages?.map((message) => (
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

                        <div className="p-4">
                          <div className="relative">
                            <Input
                              placeholder="Type your message..."
                              value={replyMessages[selectedClient] || ""}
                              className="bg-white border-0 p-6 pr-12 shadow-[0px_7px_23px_0px_#0000000D] focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                              onChange={(e) =>
                                setReplyMessages({
                                  ...replyMessages,
                                  [selectedClient]: e.target.value,
                                })
                              }
                              onKeyPress={(e) => {
                                if (e.key === "Enter") {
                                  handleSendReply(selectedClient);
                                }
                              }}
                            />
                            <Button
                              onClick={() => handleSendReply(selectedClient)}
                              disabled={!replyMessages[selectedClient]?.trim()}
                              className="absolute bg-transparent text-black right-2 top-1/2 transform -translate-y-1/2 p-2 "
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        Select a conversation to start messaging
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Bulk Messaging Tab */}
              <TabsContent value="bulk" className="h-full mt-4">
                <div className="h-full flex flex-col space-y-4">
                  <Card className="border-none rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
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
                            {searchTerm && (
                              <span className="text-gray-500 font-normal ml-2">
                                -{" "}
                                {
                                  filteredClients.filter(
                                    (client) => client.phone
                                  ).length
                                }{" "}
                                found
                              </span>
                            )}
                          </Label>

                          {/* Search Input */}
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                              placeholder="Search clients by name or phone..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="bg-white pl-10 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                            />
                            {searchTerm && (
                              <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                <span className="text-lg">×</span>
                              </button>
                            )}
                          </div>

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
                            {filteredClients.filter((client) => client.phone)
                              .length === 0 ? (
                              <div className="text-center py-4">
                                {searchTerm ? (
                                  <div>
                                    <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">
                                      No clients found matching "{searchTerm}"
                                    </p>
                                    <p className="text-gray-400 text-xs mt-1">
                                      Try a different search term
                                    </p>
                                  </div>
                                ) : (
                                  <div>
                                    <Phone className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">
                                      No clients with phone numbers
                                    </p>
                                    <p className="text-gray-400 text-xs mt-1">
                                      Add phone numbers to clients to send SMS
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              filteredClients
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
                                    <span className="text-sm">
                                      {client.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {client.phone}
                                    </span>
                                  </div>
                                ))
                            )}
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
                          className="bg-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
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

                        {/* Personalization Helper */}
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <h4 className="text-sm font-medium text-amber-900 mb-2">
                            💡 Personalization Tip
                          </h4>
                          <p className="text-xs text-amber-800 mb-2">
                            Make your messages personal! Use these placeholders
                            to automatically include client-specific
                            information:
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="outline"
                                className="text-xs font-mono"
                              >{`{clientName}`}</Badge>
                              <span className="text-amber-700">
                                Client's name
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="outline"
                                className="text-xs font-mono"
                              >{`{referralCode}`}</Badge>
                              <span className="text-amber-700">
                                Their referral code
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="outline"
                                className="text-xs font-mono"
                              >{`{referralLink}`}</Badge>
                              <span className="text-amber-700">
                                Sharing link
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="outline"
                                className="text-xs font-mono"
                              >{`{referralDiscount}`}</Badge>
                              <span className="text-amber-700">
                                Discount amount
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-amber-700 mt-2">
                            Example: "Hi {`{clientName}`}! Your referral code{" "}
                            {`{referralCode}`} gives friends{" "}
                            {`{referralDiscount}`} off!"
                          </p>
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
                        className="w-full bg-[#EA6A0A] hover:bg-[#EA6A0A]/80 text-white"
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
              <TabsContent
                value="history"
                className="h-full  mt-4 flex flex-col"
              >
                <div className="mb-4 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search messages..."
                      className="pl-10 bg-white border-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                      value={messagePagination.search}
                      onChange={handleMessageSearch}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDirectionFilter("inbound")}
                      className={
                        messagePagination.direction === "inbound"
                          ? "bg-green-700 text-white"
                          : "bg-[#EA6A0A] text-white hover:bg-[#EA6A0A]/80"
                      }
                    >
                      Inbound
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDirectionFilter("outbound")}
                      className={
                        messagePagination.direction === "outbound"
                          ? "bg-green-700 text-white"
                          : "bg-[#E7A800] text-white hover:bg-[#E7A800]/80"
                      }
                    >
                      Outbound
                    </Button>
                    {messagePagination.direction && (
                      <Button
                        size="sm"
                        onClick={() => handleDirectionFilter("")}
                        className="bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-6 overflow-y-auto space-y-5">
                  {isFetchingMessages && !messagesLoading ? (
                    <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                  ) : null}

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
                    allMessages.map((message: any) => {
                      // Find the client for this message
                      const client =
                        clients.find((c) => c.id === message.clientId) ||
                        message.client;
                      const isOutbound = message.direction === "outbound";
                      const displayName =
                        client?.name ||
                        (isOutbound ? message.toNumber : message.fromNumber);
                      const displayPhone = isOutbound
                        ? message.toNumber
                        : message.fromNumber;

                      return (
                        <Card
                          key={message.id}
                          className="mb-3 border-none rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]"
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center space-x-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isOutbound ? "bg-purple-100" : "bg-gray-100"
                                  }`}
                                >
                                  {isOutbound ? (
                                    <Send className="w-4 h-4 text-purple-600" />
                                  ) : (
                                    <MessageSquare className="w-4 h-4 text-gray-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">
                                    {client?.name
                                      ? client.name
                                      : isOutbound
                                        ? "To: "
                                        : "From: "}
                                    {!client?.name && (
                                      <span className="text-sm font-normal text-gray-500 ml-1">
                                        {displayPhone}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(
                                      message.timestamp
                                    ).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge
                                  variant={isOutbound ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {isOutbound ? "Sent" : "Received"}
                                </Badge>
                              </div>
                            </div>
                            <div
                              className={`mt-2 p-3 rounded-lg text-sm ${
                                isOutbound
                                  ? "bg-purple-50 text-purple-900"
                                  : "bg-gray-50 text-gray-800"
                              }`}
                            >
                              {message.messageBody}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}

                  {/* Message History Pagination */}
                  {totalMessagePages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="text-sm text-gray-500">
                        Showing {allMessages.length} of {totalMessages} messages
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleMessagePageChange(messagePagination.page - 1)
                          }
                          disabled={messagePagination.page === 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {messagePagination.page} of {totalMessagePages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleMessagePageChange(messagePagination.page + 1)
                          }
                          disabled={messagePagination.page >= totalMessagePages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </main>
      </div>

      {/* Dialogs for Add/Edit and Confirm Delete */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add SMS Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium" htmlFor="template-name">
                Template Name
              </Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium" htmlFor="template-content">
                Template Content
              </Label>
              <Textarea
                id="template-content"
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                rows={4}
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
              <Label className="text-sm font-medium" htmlFor="template-name">
                Template Name
              </Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium" htmlFor="template-content">
                Template Content
              </Label>
              <Textarea
                id="template-content"
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                rows={4}
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
