import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { Building, Save, SquarePen } from "lucide-react";

const fetchBusinessProfile = async () => {
  const response = await fetch("/api/business/profile");
  if (!response.ok) {
    throw new Error("Failed to fetch business profile");
  }
  return response.json();
};

const businessUpdateSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  email: z.string().email("Invalid email address"),
  websiteUrl: z
    .string()
    .optional()
    .refine((val) => {
      if (!val || val.trim() === "") return true;
      try {
        const url = new URL(val);
        return url.protocol === "https:";
      } catch {
        return false;
      }
    }, "Website URL must be a valid HTTPS URL (e.g., https://yourwebsite.com)"),
});

type BusinessUpdateData = z.infer<typeof businessUpdateSchema>;

const plans = [
  {
    name: "Starter",
    price: "$38/month",
    features: [
      "Up to 50 referrals per month",
      "Basic referral tracking",
      "Standard email notifications",
    ],
    priceId: "price_1SHCLwLxln8mNVYpQZkZTVjK", // Your Starter Price ID
  },
  {
    name: "Pro",
    price: "$58/month",
    features: [
      "Unlimited referrals",
      "Advanced analytics & reporting",
      "Custom branding",
      "API & webhook access",
    ],
    priceId: "price_1SHCMRLxln8mNVYpwDZB6wOY", // Your Pro Price ID
  },
];

export function BusinessProfile() {
  const { business } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<BusinessUpdateData>({
    resolver: zodResolver(businessUpdateSchema),
    defaultValues: {
      name: business?.name || "",
      email: business?.email || "",
      websiteUrl: business?.websiteUrl || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: BusinessUpdateData) => {
      return await apiRequest("PATCH", "/api/business/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your business settings have been updated successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update settings.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BusinessUpdateData) => {
    if (!isEditing) {
      return;
    }
    updateMutation.mutate(data);
  };

  const handleEdit = () => {
    setIsEditing(true);
    form.reset({
      name: business?.name || "",
      email: business?.email || "",
      websiteUrl: business?.websiteUrl || "",
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.reset({
      name: business?.name || "",
      email: business?.email || "",
      websiteUrl: business?.websiteUrl || "",
    });
  };

  return (
    <Card className="w-full h-fit border-0 max-w-3xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
      <CardHeader>
        <div className="flex justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span className="text-3xl font-bold">Business Profile</span>
            </CardTitle>
            <CardDescription className="text-[#5F5F5F] text-xl font-medium">
              Update your business information and contact details
            </CardDescription>
          </div>
          <div className="flex items-center space-x-3 pt-4">
            {!isEditing ? (
              <Button
                className="bg-transparent text-[#EA6A0A] hover:text-[#EA6A0A] hover:bg-white"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleEdit();
                }}
              >
                <SquarePen className="w-8 h-8" />
              </Button>
            ) : (
              <>
                <Button
                  className="bg-gradient-to-br from-blue-800 to-blue-600 hover:from-blue-900 hover:to-blue-700 text-white px-3 py-2 text-xs sm:px-6 sm:py-2 sm:text-base font-medium whitespace-nowrap"
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input
                        className="bg-white"
                        placeholder="Enter business name"
                        disabled={!isEditing}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        className="bg-white"
                        type="email"
                        placeholder="Enter email address"
                        disabled={!isEditing}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="websiteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      className="bg-white"
                      placeholder="https://yourwebsite.com"
                      disabled={!isEditing}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-sm text-gray-500">
                    Set your website URL to create referral links that direct to
                    your site instead of Referable's hosted forms.
                    <strong>Important:</strong> Make sure you've embedded a
                    Referable form on your website first, or referral links will
                    show "Invalid referral code."
                  </p>
                </FormItem>
              )}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export function AccountInformation() {
  const { business } = useAuth();

  console.log(business);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["businessProfile"],
    queryFn: fetchBusinessProfile,
  });

  const currentPlan = profile?.subscriptionPlan
    ? plans.find((p) => p.priceId === profile.subscriptionPlan)
    : null;

  return (
    <Card className="w-full border-0 max-w-md rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">
          Account Information
        </CardTitle>
        <CardDescription className="text-[#5F5F5F] text-xl font-medium">
          View your account details and manage your subscription
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xl font-semibold text-gray-700">
                Account Created
              </label>
              <div className="text-sm text-[#A0AEC0] mt-1">
                {business?.createdAt
                  ? new Date(business.createdAt).toLocaleDateString()
                  : "N/A"}
              </div>
            </div>
            <div>
              <label className="text-xl font-semibold text-gray-700">
                Account Status
              </label>
              <div className="text-sm text-green-600 mt-1 font-medium">
                Active
              </div>
            </div>
          </div>

          <div>
            <label className="text-xl font-semibold text-gray-700">Plan</label>
            <div className="text-sm text-[#A0AEC0] mt-1">
              {currentPlan?.name || "Setting Up!"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DangerZone() {
  const { logout } = useAuth();
  const { toast } = useToast();

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/business/account");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account has been deleted successfully.",
      });
      logout();
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete account.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAccount = () => {
    if (
      window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    ) {
      deleteAccountMutation.mutate();
    }
  };

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="text-red-600">Danger Zone</CardTitle>
        <CardDescription>Irreversible and destructive actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Delete Account</h4>
            <p className="text-sm text-gray-600 mb-4">
              Once you delete your account, there is no going back. Please be
              certain. All your data including clients, referrals, and analytics
              will be permanently deleted.
            </p>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending
                ? "Deleting..."
                : "Delete Account"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Keep the original export for backwards compatibility
export function BusinessSettings() {
  return (
    <div className="space-y-6">
      <BusinessProfile />
      <AccountInformation />
      <DangerZone />
    </div>
  );
}
