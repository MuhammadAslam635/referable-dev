import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Standard",
    price: "$49/mo",
    features: [
      "Unlimited Referrals",
      "Automated SMS Outreach",
      "Customizable Campaigns",
      "Client Management",
      "Analytics Dashboard",
    ],
    priceId: "YOUR_STANDARD_PLAN_PRICE_ID", // TODO: Replace with your Stripe Price ID
  },
  {
    name: "Premium",
    price: "$99/mo",
    features: [
      "All features in Standard",
      "Zapier Integration",
      "Priority Support",
      "Advanced Analytics",
    ],
    priceId: "YOUR_PREMIUM_PLAN_PRICE_ID", // TODO: Replace with your Stripe Price ID
  },
];

const PricingPage = () => {
  const handleChoosePlan = async (priceId: string) => {
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">Pricing Plans</h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">Choose the plan that's right for your business.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {plans.map((plan) => (
          <Card key={plan.name} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-2xl font-semibold">{plan.name}</CardTitle>
              <CardDescription className="text-4xl font-bold">{plan.price}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <ul className="space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => handleChoosePlan(plan.priceId)}>
                Choose Plan
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PricingPage;
