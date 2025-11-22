import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Info, User, Link, DollarSign, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const smsSettingsSchema = z.object({
  referralDiscount: z.string().min(1, "Referral discount is required"),
  customMessages: z.object({
    referral: z.string().min(10, "Referral message must be at least 10 characters"),
    thankYou: z.string().min(10, "Thank you message must be at least 10 characters"),
    followUp: z.string().min(10, "Follow up message must be at least 10 characters"),
    review: z.string().min(10, "Review request message must be at least 10 characters"),
  }),
  googleReviewLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type SmsSettingsData = z.infer<typeof smsSettingsSchema>;

interface OutreachSettings {
  id?: number;
  businessId: number;
  referralDiscount: string;
  googleReviewLink?: string;
  customMessages: {
    referral: string;
    thankYou: string;
    followUp: string;
    review: string;
  };
}

const placeholderExplanations = [
  {
    placeholder: "{clientName}",
    description: "Replaced with the client's actual name (e.g., 'John Smith')",
    icon: User,
    example: "Hi John Smith!"
  },
  {
    placeholder: "{referralCode}",
    description: "Replaced with the client's unique referral code (e.g., 'REF-ABC123')",
    icon: Link,
    example: "Your code is REF-ABC123"
  },
  {
    placeholder: "{referralLink}",
    description: "Replaced with a personalized referral link for sharing",
    icon: Link,
    example: "https://yourapp.com/ref/REF-ABC123"
  },
  {
    placeholder: "{referralDiscount}",
    description: "Replaced with your referral discount amount",
    icon: DollarSign,
    example: "$25"
  },
  {
    placeholder: "{googleReviewLink}",
    description: "Replaced with your Google Business review link",
    icon: Star,
    example: "https://g.page/r/..."
  }
];

export function SmsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: settings, isLoading } = useQuery<OutreachSettings>({
    queryKey: ["/api/outreach/settings"],
  });

  const form = useForm<SmsSettingsData>({
    resolver: zodResolver(smsSettingsSchema),
    defaultValues: {
      referralDiscount: settings?.referralDiscount || "$25",
      googleReviewLink: settings?.googleReviewLink || "",
      customMessages: {
        referral: settings?.customMessages?.referral || "Hi {clientName}! Refer a friend and both get {referralDiscount} off your next cleaning! Use link: {referralLink}",
        thankYou: settings?.customMessages?.thankYou || "Thanks, {clientName}! We appreciate your business! Your referral code is {referralCode}",
        followUp: settings?.customMessages?.followUp || "Hi {clientName}, hope you loved your last cleaning! Ready to book another session?",
        review: settings?.customMessages?.review || "Thanks again for choosing us, {clientName}! If you have a moment, we'd really appreciate a quick review: {googleReviewLink}",
      },
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SmsSettingsData) => {
      const response = await apiRequest("POST", "/api/outreach/settings", data);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "SMS settings updated",
        description: "Your message templates and settings have been saved successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update SMS settings.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SmsSettingsData) => {
    updateMutation.mutate(data);
  };

  const handleEdit = () => {
    setIsEditing(true);
    if (settings) {
      form.reset({
        referralDiscount: settings.referralDiscount,
        googleReviewLink: settings.googleReviewLink || "",
        customMessages: settings.customMessages,
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (settings) {
      form.reset({
        referralDiscount: settings.referralDiscount,
        googleReviewLink: settings.googleReviewLink || "",
        customMessages: settings.customMessages,
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            SMS Message Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            SMS Message Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Personalization Placeholders:</strong> Use the placeholders below in your messages to automatically include client-specific information when sending SMS messages.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {placeholderExplanations.map((item) => (
              <div key={item.placeholder} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <item.icon className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <Badge variant="secondary" className="font-mono text-xs mb-1">
                    {item.placeholder}
                  </Badge>
                  <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                  <p className="text-xs text-gray-500 font-mono bg-white px-2 py-1 rounded">
                    Example: {item.example}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="referralDiscount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referral Discount Amount</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} placeholder="$25" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="googleReviewLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Business Review Link</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} placeholder="https://g.page/r/..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="customMessages.referral"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referral Message Template</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          disabled={!isEditing}
                          rows={3}
                          placeholder="Hi {clientName}! Refer a friend and both get {referralDiscount} off your next cleaning! Use link: {referralLink}"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customMessages.thankYou"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Thank You Message Template</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          disabled={!isEditing}
                          rows={3}
                          placeholder="Thanks, {clientName}! We appreciate your business! Your referral code is {referralCode}"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customMessages.followUp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow-up Message Template</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          disabled={!isEditing}
                          rows={3}
                          placeholder="Hi {clientName}, hope you loved your last cleaning! Ready to book another session?"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customMessages.review"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Request Message Template</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          disabled={!isEditing}
                          rows={3}
                          placeholder="Thanks again for choosing us, {clientName}! If you have a moment, we'd really appreciate a quick review: {googleReviewLink}"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2">
                {isEditing ? (
                  <>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <Button type="button" onClick={handleEdit}>
                    Edit Templates
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}