import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { ClientsTable } from "@/components/dashboard/clients-table";
import { BookingTrendsChart } from "@/components/dashboard/booking-trends-chart";
import { MostLoyalClients } from "@/components/dashboard/most-loyal-clients";
import { LoyaltyScoreDistribution } from "@/components/dashboard/loyalty-score-distribution";
import { apiRequest } from "@/lib/queryClient";
import { Download, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema } from "@shared/schema";
import { z } from "zod";
import { Trash2, Plus as PlusIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Form schema for adding clients
const addClientSchema = insertClientSchema.extend({
  phone: z.string().optional(),
  bookingHistory: z
    .array(
      z.object({
        date: z.string(),
        service: z.string(),
        amount: z.string().optional(),
      })
    )
    .optional(),
});

type AddClientFormData = z.infer<typeof addClientSchema>;

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [timePeriod, setTimePeriod] = useState(30);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: "",
    email: "",
    phone: "",
    serviceDate: "",
    serviceType: "Regular Clean",
    amount: "",
  });

  // Fetch dashboard data
  const {
    data: stats = {
      totalClients: 0,
      totalReferrals: 0,
      avgLoyaltyScore: 0,
      monthlyRevenue: 0,
      activeReferrals: 0,
      referralRevenue: 0,
    },
  } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
  });

  const { data: bookingTrends = [] } = useQuery({
    queryKey: ["/api/analytics/booking-trends", timePeriod],
    queryFn: () =>
      fetch(`/api/analytics/booking-trends?days=${timePeriod}`, {
        credentials: "include",
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch booking trends");
        return res.json();
      }),
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/export", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Export failed");
      }
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clients-export.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Your client data has been downloaded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export data.",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    exportMutation.mutate();
  };

  // Add client form
  const form = useForm<AddClientFormData>({
    resolver: zodResolver(addClientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      bookingHistory: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "bookingHistory",
  });

  const addClientMutation = useMutation({
    mutationFn: async (clientData: any) => {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clientData),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add client");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Client Added",
        description: "Client has been successfully added to your database.",
      });
      setIsAddClientOpen(false);
      setNewClientData({
        name: "",
        email: "",
        phone: "",
        serviceDate: "",
        serviceType: "Regular Clean",
        amount: "",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setShowAddClientModal(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddClient = () => {
    setIsAddClientOpen(true);
  };

  const onSubmitAddClient = (data: AddClientFormData) => {
    addClientMutation.mutate(data);
  };

  const handleSubmitNewClient = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !newClientData.name ||
      !newClientData.email ||
      !newClientData.serviceDate
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in name, email, and service date.",
        variant: "destructive",
      });
      return;
    }

    addClientMutation.mutate({
      ...newClientData,
      amount: parseFloat(newClientData.amount) || 0,
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="py-6 sm:py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="space-y-6">
                <h1 className="text-xl sm:text-5xl font-bold text-brand-slate">
                  Client Dashboard
                </h1>
                <p className="text-[#5F5F5F] mt-1 text-sm sm:text-xl">
                  Manage your client loyalty and referrals
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="py-4 sm:py-6 space-y-6 sm:space-y-8">
          {/* Stats */}
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl blur-xl"></div>
            <div className="relative">
              <StatsGrid stats={stats} />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              onClick={handleAddClient}
              className="bg-gradient-to-br from-blue-800 to-blue-600 hover:from-blue-900 hover:to-blue-700 text-white px-3 py-2 text-xs sm:px-6 sm:py-2 sm:text-base font-medium whitespace-nowrap"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
            <Button
              variant="ghost"
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className="bg-white border-brand-coolgray hover:bg-brand-lightgray text-brand-slate w-full sm:w-auto"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              {exportMutation.isPending ? "Exporting..." : "Export CSV"}
            </Button>
          </div>

          {/* Booking Trends Chart */}
          <div className="flex gap-7">
            <div className="relative w-1/2">
              <div className="absolute inset-0 rounded-2xl"></div>
              <div className="relative">
                <BookingTrendsChart
                  bookingTrends={bookingTrends}
                  timePeriod={timePeriod}
                  onTimePeriodChange={setTimePeriod}
                />
              </div>
            </div>

            {/* Clients Table */}
            <div className="relative w-1/2">
              <div className="absolute inset-0 rounded-2xl"></div>
              <div className="relative">
                <ClientsTable
                  clients={clients}
                  onExport={handleExport}
                  onAddClient={handleAddClient}
                />
              </div>
            </div>
          </div>

          {/* Most Loyal Clients */}
          {/* <div className="relative">
            <div className="absolute inset-0 rounded-2xl"></div>
            <div className="relative">
              <MostLoyalClients clients={clients} />
            </div>
          </div> */}

          {/* Loyalty Score Distribution */}
          {/* <div className="relative">
            <div className="absolute inset-0 rounded-2xl"></div>
            <div className="relative">
              <LoyaltyScoreDistribution clients={clients} />
            </div>
          </div> */}
        </div>
      </div>

      {/* Add Client Modal */}
      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <DialogContent className="sm:max-w-2xl bg-white max-h-[calc(100vh-10rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <span className="text-3xl font-bold">Add New Client</span>
            </DialogTitle>
            <DialogDescription className="text-xl font-medium text-[#5F5F5F] text-muted-foreground">
              Add a new client to your database with their service information.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmitNewClient}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                className="bg-white border-[#E5E7EB]"
                id="clientName"
                value={newClientData.name}
                onChange={(e) =>
                  setNewClientData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <Label htmlFor="clientEmail">Email Address *</Label>
              <Input
                className="bg-white border-[#E5E7EB]"
                id="clientEmail"
                type="email"
                value={newClientData.email}
                onChange={(e) =>
                  setNewClientData((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="john@example.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="clientPhone">Phone Number</Label>
              <Input
                className="bg-white border-[#E5E7EB]"
                id="clientPhone"
                type="tel"
                value={newClientData.phone}
                onChange={(e) =>
                  setNewClientData((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="serviceDate">Service Date *</Label>
              <Input
                className="bg-white border-[#E5E7EB]"
                id="serviceDate"
                type="date"
                value={newClientData.serviceDate}
                onChange={(e) =>
                  setNewClientData((prev) => ({
                    ...prev,
                    serviceDate: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="serviceType">Service Type</Label>
              <Select
                value={newClientData.serviceType}
                onValueChange={(value) =>
                  setNewClientData((prev) => ({ ...prev, serviceType: value }))
                }
              >
                <SelectTrigger className="bg-white border-[#E5E7EB]">
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Regular Clean">Regular Clean</SelectItem>
                  <SelectItem value="Deep Clean">Deep Clean</SelectItem>
                  <SelectItem value="Move-in Clean">Move-in Clean</SelectItem>
                  <SelectItem value="Move-out Clean">Move-out Clean</SelectItem>
                  <SelectItem value="One-time Clean">One-time Clean</SelectItem>
                  <SelectItem value="Post-construction">
                    Post-construction
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Service Amount ($)</Label>
              <Input
                className="bg-white border-[#E5E7EB]"
                id="amount"
                type="number"
                step="0.01"
                value={newClientData.amount}
                onChange={(e) =>
                  setNewClientData((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                placeholder="150.00"
              />
            </div>

            <div className="flex justify-center gap-3 pt-4 col-span-2 w-full">
              <Button
                className=" bg-[#E7A800] text-white font-bold w-[300px] px-4 py-2 text-xs sm:px-6 sm:py-2 sm:text-xl whitespace-nowrap"
                type="submit"
                disabled={addClientMutation.isPending}
              >
                {addClientMutation.isPending ? "Adding..." : "Add Client"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
