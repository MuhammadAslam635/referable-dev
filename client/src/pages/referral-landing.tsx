import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Check, Heart, Gift } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ReferralInfo {
  referrerName: string;
  referralCode: string;
  businessId: number;
}

export default function ReferralLanding() {
  const [location] = useLocation();
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);

  // Extract referral code from URL
  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('code');

  // Fetch referral information
  useEffect(() => {
    if (!referralCode) {
      setError("Invalid referral link");
      setLoading(false);
      return;
    }

    fetch(`/api/public/referral/${referralCode}`)
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          setError(data.message);
        } else {
          setReferralInfo(data);
        }
      })
      .catch(() => {
        setError("Failed to load referral information");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [referralCode]);

  // Submit referral form
  const submitReferral = useMutation({
    mutationFn: async (data: { name: string; email: string; phone: string }) => {
      const response = await fetch("/api/public/referral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          referralCode,
          name: data.name,
          email: data.email,
          phone: data.phone,
          businessId: referralInfo?.businessId
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit referral");
      }
      
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: any) => {
      setError(error.message || "Failed to submit referral");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setError("Please fill in all fields");
      return;
    }
    setError("");
    submitReferral.mutate(formData);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !referralInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Referral Submitted!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You'll both get $25 off when you book your first cleaning service!
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Watch your email for booking instructions and reward details.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            You've Been Referred!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {referralInfo?.referrerName} wants to share something special with you
          </p>
        </div>

        {/* Referral Info */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <Gift className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Special Offer</CardTitle>
                <CardDescription>Exclusive referral reward</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300 mb-1">
                  $25 OFF
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  Your first cleaning service
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Plus, {referralInfo?.referrerName} gets $25 off too when you book!
            </p>
          </CardContent>
        </Card>

        {/* Sign-up Form */}
        <Card>
          <CardHeader>
            <CardTitle>Claim Your Reward</CardTitle>
            <CardDescription>
              Enter your details to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <p>{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={submitReferral.isPending}
              >
                {submitReferral.isPending ? "Submitting..." : "Claim My $25 Reward"}
              </Button>
            </form>

            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                By submitting, you agree to be contacted about booking your cleaning service. 
                No spam, unsubscribe anytime.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Referral Code: <span className="font-mono font-medium">{referralCode}</span>
          </p>
        </div>
      </div>
    </div>
  );
}