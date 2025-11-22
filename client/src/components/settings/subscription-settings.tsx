import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const fetchBusinessProfile = async () => {
  const response = await fetch("/api/business/profile");
  if (!response.ok) {
    throw new Error("Failed to fetch business profile");
  }
  return response.json();
};

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

export const SubscriptionSettings = () => {
  const [isManaging, setIsManaging] = useState(false);
  const { toast } = useToast();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["businessProfile"],
    queryFn: fetchBusinessProfile,
  });

  const currentPlan = profile?.subscriptionPlan
    ? plans.find(p => p.priceId === profile.subscriptionPlan)
    : null;

  const handleSubscribe = async (priceId: string) => {
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId }),
      });
      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
    }
  };

  const handleManageSubscription = async () => {
    setIsManaging(true);
    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Error creating portal session:", error);
      toast({
        title: "Error",
        description: "Could not open the customer portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsManaging(false);
    }
  };

  return (
    <Card className="w-full h-fit border-0 rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Manage your subscription plan and billing details.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-6">
            {profile?.stripeCustomerId && currentPlan && (
              <div>
                <h3 className="text-lg font-medium mb-4">Current Plan</h3>
                <Card className="border-0 rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{currentPlan.name}</CardTitle>
                        <CardDescription>{currentPlan.price}</CardDescription>
                      </div>
                      {profile.subscriptionStatus && (
                        <Badge variant={profile.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                          {profile.subscriptionStatus}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 flex flex-col justify-center">
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {currentPlan.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                    <Button onClick={handleManageSubscription} className="bg-gradient-to-br from-blue-800 to-blue-600 hover:from-blue-900 hover:to-blue-700 text-white font-medium px-3 py-2 text-xs sm:px-6 sm:py-2 sm:text-sm whitespace-nowrap" disabled={isManaging}>
                      {isManaging ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</>
                      ) : (
                        "Manage Subscription"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {profile?.subscriptionStatus !== "active" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {plans.map((plan) => (
                  <Card key={plan.name} className="border-0 rounded-2xl shadow-[0px_7px_23px_0px_#0000000D] h-full">
                    <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>{plan.price}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 h-[calc(100%-98px)] flex flex-col justify-between">
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {plan.features.map((feature) => (
                          <li key={feature}>{feature}</li>
                        ))}
                      </ul>
                      <Button onClick={() => handleSubscribe(plan.priceId)} className="bg-gradient-to-br from-blue-800 to-blue-600 hover:from-blue-900 hover:to-blue-700 text-white font-medium px-3 py-2 text-xs sm:px-6 sm:py-2 sm:text-sm whitespace-nowrap">
                        Choose Plan
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
