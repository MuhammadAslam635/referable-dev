import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  UserPlus,
  MessageSquare,
  Mail,
  Phone,
  Calendar,
  Filter,
  Search,
  MoreHorizontal,
  TrendingUp,
  Users,
  Target,
  Star,
  Send,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Lead, InsertLead, LeadCommunication } from "@shared/schema";

const statusColors = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  converted: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
};

const sourceColors = {
  referral: "bg-purple-100 text-purple-800",
  website: "bg-blue-100 text-blue-800",
  manual: "bg-gray-100 text-gray-800",
  form: "bg-indigo-100 text-indigo-800",
};

interface LeadWithDetails extends Lead {
  referrerName: string | null;
  formName: string | null;
}

interface LeadStats {
  totalLeadsThisWeek: number;
  conversionRate: number;
  referralPercentage: number;
  topReferrers: Array<{ name: string; count: number }>;
}

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<LeadWithDetails | null>(
    null
  );
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isSmsOpen, setIsSmsOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch lead stats
  const { data: stats } = useQuery<LeadStats>({
    queryKey: ["/api/leads/stats"],
  });

  // Fetch leads
  const { data: leads = [], isLoading } = useQuery<LeadWithDetails[]>({
    queryKey: ["/api/leads"],
  });

  // Fetch lead communications for selected lead
  const { data: communications = [] } = useQuery<LeadCommunication[]>({
    queryKey: ["/api/leads", selectedLead?.id, "communications"],
    enabled: !!selectedLead,
  });

  // Add lead mutation
  const addLeadMutation = useMutation({
    mutationFn: async (leadData: InsertLead) => {
      return apiRequest("POST", "/api/leads", leadData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      setIsAddLeadOpen(false);
      toast({ title: "Lead added successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update lead status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      leadId,
      status,
    }: {
      leadId: number;
      status: string;
    }) => {
      return apiRequest("PATCH", `/api/leads/${leadId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      toast({ title: "Lead status updated" });
    },
  });

  // Send SMS mutation
  const sendSmsMutation = useMutation({
    mutationFn: async ({
      leadId,
      message,
    }: {
      leadId: number;
      message: string;
    }) => {
      return apiRequest("POST", `/api/leads/${leadId}/sms`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/leads", selectedLead?.id, "communications"],
      });
      setIsSmsOpen(false);
      setSmsMessage("");
      toast({ title: "SMS sent successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send SMS",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send Email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async ({
      leadId,
      subject,
      message,
    }: {
      leadId: number;
      subject: string;
      message: string;
    }) => {
      return apiRequest("POST", `/api/leads/${leadId}/email`, {
        subject,
        message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/leads", selectedLead?.id, "communications"],
      });
      setIsEmailOpen(false);
      setEmailSubject("");
      setEmailMessage("");
      toast({ title: "Email sent successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm);
    const matchesStatus =
      statusFilter === "all" || lead.status === statusFilter;
    const matchesSource =
      sourceFilter === "all" || lead.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const handleAddLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const leadData: InsertLead = {
      businessId: 0, // Will be set by backend
      name: formData.get("name") as string,
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      source: "manual",
      notes: (formData.get("notes") as string) || undefined,
    };
    addLeadMutation.mutate(leadData);
  };

  return (
    <div className="space-y-6 py-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-6">
          <h1 className="text-5xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-[#5F5F5F] text-xl font-medium">
            Track and manage all your leads in one place
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="w-full h-fit border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4">
            <div className="flex flex-col">
              <span className="text-sm text-[#A0AEC0] font-bold">
                Total Leads This Week
              </span>
              <div className="text-2xl font-bold">
                {stats?.totalLeadsThisWeek || 0}
              </div>
            </div>
            <svg
              width="48"
              height="47"
              viewBox="0 0 48 47"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g filter="url(#filter0_d_38_1276)">
                <rect
                  x="6.4082"
                  y="2.71564"
                  width="35.2687"
                  height="35.2687"
                  rx="12"
                  fill="#0EA765"
                />
              </g>
              <g clip-path="url(#clip0_38_1276)">
                <path
                  d="M32.125 15.9414L25.1448 22.9217L21.4709 19.2479L15.9602 24.7586M32.125 15.9414H27.7165M32.125 15.9414V20.35"
                  stroke="white"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
              <defs>
                <filter
                  id="filter0_d_38_1276"
                  x="0.908203"
                  y="0.715637"
                  width="46.2688"
                  height="46.2688"
                  filterUnits="userSpaceOnUse"
                  color-interpolation-filters="sRGB"
                >
                  <feFlood flood-opacity="0" result="BackgroundImageFix" />
                  <feColorMatrix
                    in="SourceAlpha"
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                    result="hardAlpha"
                  />
                  <feOffset dy="3.5" />
                  <feGaussianBlur stdDeviation="2.75" />
                  <feColorMatrix
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.02 0"
                  />
                  <feBlend
                    mode="normal"
                    in2="BackgroundImageFix"
                    result="effect1_dropShadow_38_1276"
                  />
                  <feBlend
                    mode="normal"
                    in="SourceGraphic"
                    in2="effect1_dropShadow_38_1276"
                    result="shape"
                  />
                </filter>
                <clipPath id="clip0_38_1276">
                  <rect
                    width="17.6344"
                    height="17.6344"
                    fill="white"
                    transform="translate(15.2253 11.5328)"
                  />
                </clipPath>
              </defs>
            </svg>
          </CardHeader>
        </Card>
        <Card className="w-full h-fit border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4">
            <div className="flex flex-col">
              <span className="text-sm text-[#A0AEC0] font-bold">
                Conversion Rate
              </span>
              <div className="text-2xl font-bold">
                {stats?.conversionRate || 0}%
              </div>
            </div>
            <svg
              width="47"
              height="47"
              viewBox="0 0 47 47"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g filter="url(#filter0_d_38_1268)">
                <rect
                  x="5.6106"
                  y="2.71561"
                  width="35.2687"
                  height="35.2687"
                  rx="12"
                  fill="#EA6A0A"
                />
              </g>
              <g clip-path="url(#clip0_38_1268)">
                <path
                  d="M23.2446 27.6976C27.3026 27.6976 30.5923 24.408 30.5923 20.35C30.5923 16.292 27.3026 13.0023 23.2446 13.0023C19.1866 13.0023 15.897 16.292 15.897 20.35C15.897 24.408 19.1866 27.6976 23.2446 27.6976Z"
                  stroke="white"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M23.2446 24.7586C25.6794 24.7586 27.6532 22.7848 27.6532 20.35C27.6532 17.9152 25.6794 15.9414 23.2446 15.9414C20.8098 15.9414 18.836 17.9152 18.836 20.35C18.836 22.7848 20.8098 24.7586 23.2446 24.7586Z"
                  stroke="white"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M23.2446 21.8195C24.0562 21.8195 24.7142 21.1616 24.7142 20.35C24.7142 19.5384 24.0562 18.8804 23.2446 18.8804C22.433 18.8804 21.7751 19.5384 21.7751 20.35C21.7751 21.1616 22.433 21.8195 23.2446 21.8195Z"
                  stroke="white"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
              <defs>
                <filter
                  id="filter0_d_38_1268"
                  x="0.110595"
                  y="0.715606"
                  width="46.2688"
                  height="46.2688"
                  filterUnits="userSpaceOnUse"
                  color-interpolation-filters="sRGB"
                >
                  <feFlood flood-opacity="0" result="BackgroundImageFix" />
                  <feColorMatrix
                    in="SourceAlpha"
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                    result="hardAlpha"
                  />
                  <feOffset dy="3.5" />
                  <feGaussianBlur stdDeviation="2.75" />
                  <feColorMatrix
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.02 0"
                  />
                  <feBlend
                    mode="normal"
                    in2="BackgroundImageFix"
                    result="effect1_dropShadow_38_1268"
                  />
                  <feBlend
                    mode="normal"
                    in="SourceGraphic"
                    in2="effect1_dropShadow_38_1268"
                    result="shape"
                  />
                </filter>
                <clipPath id="clip0_38_1268">
                  <rect
                    width="17.6344"
                    height="17.6344"
                    fill="white"
                    transform="translate(14.4275 11.5328)"
                  />
                </clipPath>
              </defs>
            </svg>
          </CardHeader>
        </Card>
        <Card className="w-full h-fit border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4">
            <div className="flex flex-col">
              <span className="text-sm text-[#A0AEC0] font-bold">
                % from Referrals
              </span>
              <div className="text-2xl font-bold">
                {stats?.referralPercentage || 0}%
              </div>
            </div>
            <svg
              width="47"
              height="47"
              viewBox="0 0 47 47"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g filter="url(#filter0_d_38_1260)">
                <rect
                  x="5.81299"
                  y="2.71561"
                  width="35.2687"
                  height="35.2687"
                  rx="12"
                  fill="#E32456"
                />
              </g>
              <g clip-path="url(#clip0_38_1260)">
                <path
                  d="M27.1215 26.9629V25.4933C27.1215 24.7138 26.8118 23.9663 26.2607 23.4151C25.7095 22.8639 24.9619 22.5543 24.1824 22.5543H18.3043C17.5248 22.5543 16.7772 22.8639 16.2261 23.4151C15.6749 23.9663 15.3652 24.7138 15.3652 25.4933V26.9629M31.5301 26.9629V25.4933C31.5296 24.8421 31.3128 24.2095 30.9139 23.6949C30.5149 23.1802 29.9563 22.8126 29.3258 22.6498M26.3867 13.8326C27.0189 13.9945 27.5793 14.3621 27.9794 14.8777C28.3796 15.3932 28.5968 16.0272 28.5968 16.6798C28.5968 17.3324 28.3796 17.9664 27.9794 18.482C27.5793 18.9975 27.0189 19.3652 26.3867 19.527M24.1824 16.6761C24.1824 18.2993 22.8666 19.6152 21.2434 19.6152C19.6202 19.6152 18.3043 18.2993 18.3043 16.6761C18.3043 15.0529 19.6202 13.7371 21.2434 13.7371C22.8666 13.7371 24.1824 15.0529 24.1824 16.6761Z"
                  stroke="white"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
              <defs>
                <filter
                  id="filter0_d_38_1260"
                  x="0.312988"
                  y="0.715606"
                  width="46.2688"
                  height="46.2688"
                  filterUnits="userSpaceOnUse"
                  color-interpolation-filters="sRGB"
                >
                  <feFlood flood-opacity="0" result="BackgroundImageFix" />
                  <feColorMatrix
                    in="SourceAlpha"
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                    result="hardAlpha"
                  />
                  <feOffset dy="3.5" />
                  <feGaussianBlur stdDeviation="2.75" />
                  <feColorMatrix
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.02 0"
                  />
                  <feBlend
                    mode="normal"
                    in2="BackgroundImageFix"
                    result="effect1_dropShadow_38_1260"
                  />
                  <feBlend
                    mode="normal"
                    in="SourceGraphic"
                    in2="effect1_dropShadow_38_1260"
                    result="shape"
                  />
                </filter>
                <clipPath id="clip0_38_1260">
                  <rect
                    width="17.6344"
                    height="17.6344"
                    fill="white"
                    transform="translate(14.6304 11.5328)"
                  />
                </clipPath>
              </defs>
            </svg>
          </CardHeader>
        </Card>
        <Card className="w-full h-fit border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4">
            <div className="flex flex-col">
              <span className="text-sm text-[#A0AEC0] font-bold">
                Top Referrer
              </span>
              <div className="text-lg font-medium">
                {stats?.topReferrers?.[0]?.name || "None"}
              </div>
              {stats?.topReferrers?.[0] && (
                <div className="text-sm text-muted-foreground">
                  {stats.topReferrers[0].count} leads
                </div>
              )}
            </div>
            <svg
              width="47"
              height="47"
              viewBox="0 0 47 47"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g filter="url(#filter0_d_38_1252)">
                <rect
                  x="6.01562"
                  y="2.71561"
                  width="35.2687"
                  height="35.2687"
                  rx="12"
                  fill="#9D4DF3"
                />
              </g>
              <path
                d="M23.6499 13.0023L25.9203 17.6019L30.9976 18.3441L27.3237 21.9224L28.1908 26.9775L23.6499 24.5896L19.1091 26.9775L19.9761 21.9224L16.3022 18.3441L21.3795 17.6019L23.6499 13.0023Z"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <defs>
                <filter
                  id="filter0_d_38_1252"
                  x="0.515625"
                  y="0.715606"
                  width="46.2688"
                  height="46.2688"
                  filterUnits="userSpaceOnUse"
                  color-interpolation-filters="sRGB"
                >
                  <feFlood flood-opacity="0" result="BackgroundImageFix" />
                  <feColorMatrix
                    in="SourceAlpha"
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                    result="hardAlpha"
                  />
                  <feOffset dy="3.5" />
                  <feGaussianBlur stdDeviation="2.75" />
                  <feColorMatrix
                    type="matrix"
                    values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.02 0"
                  />
                  <feBlend
                    mode="normal"
                    in2="BackgroundImageFix"
                    result="effect1_dropShadow_38_1252"
                  />
                  <feBlend
                    mode="normal"
                    in="SourceGraphic"
                    in2="effect1_dropShadow_38_1252"
                    result="shape"
                  />
                </filter>
              </defs>
            </svg>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap justify-between gap-4 items-center">
        <Dialog open={isAddLeadOpen} onOpenChange={setIsAddLeadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-br from-blue-800 to-blue-600 hover:from-blue-900 hover:to-blue-700 text-white font-medium px-3 py-2 text-xs sm:px-6 sm:py-2 sm:text-sm whitespace-nowrap">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm bg-white">
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold">Add New Lead</DialogTitle>
              <DialogDescription className="text-xl font-medium text-[#5F5F5F] text-muted-foreground">
                Enter the lead's information to add them to your pipeline
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input className="border-[#E2E8F0] bg-white" placeholder="Enter name" id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input className="border-[#E2E8F0] bg-white" placeholder="Enter email" id="email" name="email" type="email" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input className="border-[#E2E8F0] bg-white" placeholder="Enter phone" id="phone" name="phone" type="tel" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea className="border-[#E2E8F0] bg-white" placeholder="Enter notes" id="notes" name="notes" rows={3} />
              </div>
              <div className="w-full gap-2">
                <Button className="w-full bg-[#E7A800] text-white font-bold px-3 py-2 text-xs sm:px-6 sm:py-2 sm:text-xl whitespace-nowrap" type="submit" disabled={addLeadMutation.isPending}>
                  {addLeadMutation.isPending ? "Adding..." : "Add Lead"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <div className="w-[390px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search leads by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white border-[#E2E8F0]"
            />
          </div>
        </div>
        {/* <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-40 bg-white">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="form">Form</SelectItem>
          </SelectContent>
        </Select> */}
      </div>

      {/* Leads Table */}
      <Card className="bg-transparent w-full h-fit border-0 px-0">
        <CardHeader className="px-0">
          <CardTitle className="text-[35px]">Lead Inbox</CardTitle>
          <CardDescription className="text-xl font-medium text-[#5F5F5F]">
            Manage your leads and track communication history
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-white hover:bg-white rounded-2xl">
                  <TableHead className="rounded-tl-2xl">
                    <span className="text-sm font-bold text-black">Name</span>
                  </TableHead>
                  <TableHead className="text-sm font-bold text-black">
                    Contact
                  </TableHead>
                  <TableHead className="text-sm font-bold text-black">
                    Source
                  </TableHead>
                  <TableHead className="text-sm font-bold text-black">
                    Referrer
                  </TableHead>
                  <TableHead className="text-sm font-bold text-black">
                    Status
                  </TableHead>
                  <TableHead className="text-sm font-bold text-black">
                    Date Added
                  </TableHead>
                  <TableHead className="text-sm font-bold text-black rounded-tr-2xl">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {lead.email && (
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1" />
                            {lead.email}
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="h-3 w-3 mr-1" />
                            {lead.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          sourceColors[lead.source as keyof typeof sourceColors]
                        }
                      >
                        {lead.source}
                      </Badge>
                    </TableCell>
                    <TableCell>{lead.referrerName || "-"}</TableCell>
                    <TableCell>
                      <Select
                        value={lead.status}
                        onValueChange={(status) =>
                          updateStatusMutation.mutate({
                            leadId: lead.id,
                            status,
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <Badge
                            className={
                              statusColors[
                                lead.status as keyof typeof statusColors
                              ]
                            }
                          >
                            {lead.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="converted">Converted</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(lead.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {lead.phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsSmsOpen(true);
                            }}
                          >
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                        )}
                        {lead.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsEmailOpen(true);
                            }}
                          >
                            <Mail className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLead(lead)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* SMS Dialog */}
      <Dialog open={isSmsOpen} onOpenChange={setIsSmsOpen}>
        <DialogContent className="sm:max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold">Send SMS to {selectedLead?.name}</DialogTitle>
            <DialogDescription className="text-xl font-medium text-[#5F5F5F] text-muted-foreground">
              Send a text message to {selectedLead?.phone}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sms-message">Message</Label>
              <Textarea
                id="sms-message"
                className="border-[#E2E8F0] bg-white"
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
              />
            </div>
            <div className="w-full gap-2">
              <Button
                className="w-full bg-[#E7A800] text-white font-bold px-3 py-2 text-xs sm:px-6 sm:py-2 sm:text-xl whitespace-nowrap"
                onClick={() =>
                  selectedLead &&
                  sendSmsMutation.mutate({
                    leadId: selectedLead.id,
                    message: smsMessage,
                  })
                }
                disabled={!smsMessage.trim() || sendSmsMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {sendSmsMutation.isPending ? "Sending..." : "Send SMS"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold">Send Email to {selectedLead?.name}</DialogTitle>
            <DialogDescription className="text-xl font-medium text-[#5F5F5F] text-muted-foreground">
              Send an email to {selectedLead?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                className="border-[#E2E8F0] bg-white"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject..."
              />
            </div>
            <div>
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                className="border-[#E2E8F0] bg-white"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Type your email message..."
                rows={6}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                className="w-full bg-[#E7A800] text-white font-bold px-3 py-2 text-xs sm:px-6 sm:py-2 sm:text-xl whitespace-nowrap"
                onClick={() =>
                  selectedLead &&
                  sendEmailMutation.mutate({
                    leadId: selectedLead.id,
                    subject: emailSubject,
                    message: emailMessage,
                  })
                }
                disabled={
                  !emailSubject.trim() ||
                  !emailMessage.trim() ||
                  sendEmailMutation.isPending
                }
              >
                <Send className="h-4 w-4 mr-2" />
                {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
