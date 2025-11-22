import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getWebhookUrl, getZapierTemplateUrl } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Sparkles, 
  Zap, 
  Upload, 
  CheckCircle, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  Info,
  AlertCircle,
  Clock
} from "lucide-react";

export default function SetupSlideshow() {
  const { toast } = useToast();
  const { business } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [referralReward, setReferralReward] = useState<string>("$20");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Check if user has any data
  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  // Check if Zapier is connected by looking for webhook activity
  const { data: webhookLogs } = useQuery({
    queryKey: ["/api/webhook-logs"],
  });

  const hasData = stats && typeof stats === 'object' && 'totalClients' in stats && 'totalReferrals' in stats && 
    ((stats as any).totalClients > 0 || (stats as any).totalReferrals > 0);
  const hasZapierConnection = webhookLogs && Array.isArray(webhookLogs) && webhookLogs.length > 0;

  const slides = [
    {
      id: 'welcome',
      title: 'Welcome to Referable!',
      subtitle: 'Transform your service business with powerful referral tracking',
      content: 'welcome'
    },
    {
      id: 'data-connection',
      title: 'Connect Your Booking Data',
      subtitle: 'Choose at least one way to sync your client bookings',
      content: 'data-connection'
    },
    {
      id: 'referral-reward',
      title: 'Want More Referrals? Sweeten the Deal.',
      subtitle: 'Clients are far more likely to share their referral link when there\'s a simple reward involved.',
      content: 'referral-reward'
    },
    {
      id: 'sms-setup',
      title: 'Enable SMS Outreach',
      subtitle: 'Send thank you messages and referral invites automatically',
      content: 'sms-setup'
    },
    {
      id: 'review',
      title: 'Review & Complete Setup',
      subtitle: 'Your Referable account is ready to go!',
      content: 'review'
    }
  ];

  const webhookUrl = business?.webhookUrl ? getWebhookUrl(business.webhookUrl) : "";
  const zapierTemplateUrl = getZapierTemplateUrl(webhookUrl);

  // CSV Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("csv", file);
      
      const response = await fetch("/api/upload/csv", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setUploadResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Upload Successful",
        description: `Processed ${data.processed} clients from your booking history`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const helpRequestMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/support/setup-help', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to send help request');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Help request sent!",
        description: "Our team will contact you within 24 hours to assist with setup.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Request failed",
        description: error.message || "Failed to send help request",
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files?.[0]) {
      uploadMutation.mutate(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) {
      uploadMutation.mutate(files[0]);
    }
  };

  const copyWebhookUrl = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
    toast({
      title: "Copied!",
      description: "Webhook URL copied to clipboard",
    });
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentSlideData = slides[currentSlide];

  const renderSlideContent = () => {
    switch (currentSlideData.content) {
      case 'welcome':
        return (
          <div className="text-center space-y-8">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-gray-900">{currentSlideData.title}</h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">{currentSlideData.subtitle}</p>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-xl border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What you'll accomplish:</h3>
              <div className="grid md:grid-cols-2 gap-4 text-left">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Connect ZenMaid via Zapier for automatic syncing</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Import existing client data via CSV</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Start tracking loyalty scores automatically</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Access powerful analytics dashboard</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'zapier':
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">{currentSlideData.title}</h2>
              <p className="text-lg text-gray-600 max-w-xl mx-auto">{currentSlideData.subtitle}</p>
            </div>

            <Card className="max-w-3xl mx-auto">
              <CardContent className="p-8 space-y-8">
                <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Why Use Zapier?
                  </h3>
                  <p className="text-orange-800 text-sm mb-3">
                    Zapier automatically syncs your ZenMaid booking data with LoyalSweep in real-time. This means every time a client books a service, their loyalty information is instantly updated without any manual work from you.
                  </p>
                  <p className="text-orange-800 text-sm">
                    <strong>Benefits:</strong> No more manual CSV uploads, instant loyalty tracking, automatic client management, and real-time referral monitoring.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Create a Free Zapier Account</h4>
                      <p className="text-gray-600 text-sm mb-3">Sign up at zapier.com if you don't have an account yet.</p>
                      <Button asChild size="sm" variant="outline">
                        <a href="https://zapier.com/sign-up" target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Sign Up for Zapier
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Connect ZenMaid as a Trigger</h4>
                      <p className="text-gray-600 text-sm mb-3">
                        In Zapier, create a new Zap and select ZenMaid as your trigger app. Choose "New Booking" or "Updated Booking" as the trigger event.
                      </p>
                      <div className="bg-gray-50 p-3 rounded border text-xs">
                        <strong>Trigger:</strong> ZenMaid → New Booking Created
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Connect Your LoyalSweep Webhook</h4>
                      <p className="text-gray-600 text-sm mb-3">
                        Add a webhook action that sends booking data to LoyalSweep using your unique webhook URL below.
                      </p>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="font-medium text-blue-900 mb-2">Your LoyalSweep Webhook URL:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-white px-3 py-2 rounded border text-sm text-blue-800 break-all">
                            {webhookUrl || "Setting up..."}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={copyWebhookUrl}
                            disabled={!webhookUrl}
                          >
                            {copiedWebhook ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                      4
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Configure the Data Mapping</h4>
                      <p className="text-gray-600 text-sm mb-3">
                        Set up the webhook to send client and booking information in the correct format:
                      </p>
                      <div className="bg-gray-50 p-4 rounded border space-y-2 text-xs">
                        <div><strong>Method:</strong> POST</div>
                        <div><strong>URL:</strong> Your webhook URL from step 3</div>
                        <div><strong>Data to send:</strong></div>
                        <div className="ml-4 space-y-1">
                          <div>• Client Name (from ZenMaid)</div>
                          <div>• Client Email (from ZenMaid)</div>
                          <div>• Service Date (from ZenMaid)</div>
                          <div>• Service Type (from ZenMaid)</div>
                          <div>• Amount (from ZenMaid)</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      5
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Test and Activate</h4>
                      <p className="text-gray-600 text-sm mb-3">
                        Test your Zap with a sample booking, then turn it on to start automatically syncing data.
                      </p>
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <p className="text-green-800 text-sm">
                          <strong>Success!</strong> Your bookings will now automatically appear in LoyalSweep with client loyalty tracking.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Button asChild className="flex-1">
                      <a href="https://zapier.com/apps/zenmaid/integrations" target="_blank" rel="noopener noreferrer">
                        <Zap className="h-4 w-4 mr-2" />
                        Set Up ZenMaid Integration
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="flex-1">
                      <a href="https://help.zapier.com/hc/en-us/articles/8496309690637-How-to-use-webhooks-in-Zaps" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Webhook Setup Guide
                      </a>
                    </Button>
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-yellow-800 text-sm font-medium mb-1">Need Help Setting This Up?</p>
                        <p className="text-yellow-700 text-xs">Our team can guide you through the Zapier integration process</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => helpRequestMutation.mutate()}
                        disabled={helpRequestMutation.isPending}
                        className="ml-3"
                      >
                        {helpRequestMutation.isPending ? "Sending..." : "Request Help"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'csv':
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">{currentSlideData.title}</h2>
              <p className="text-lg text-gray-600 max-w-xl mx-auto">{currentSlideData.subtitle}</p>
            </div>

            <Card className="max-w-3xl mx-auto">
              <CardContent className="p-8 space-y-6">
                <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Why it matters:
                  </h3>
                  <p className="text-orange-800 text-sm mb-3">
                    Referable uses booking history to calculate loyalty scores, booking frequency, and identify your top clients and referrers.
                  </p>
                  <p className="text-orange-800 text-sm">
                    <strong>Uploading your past appointments gives you full insight from Day 1.</strong>
                  </p>
                </div>

                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-4">How to export your data from ZenMaid:</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        1
                      </div>
                      <p className="text-blue-800 text-sm">Log into your ZenMaid account</p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        2
                      </div>
                      <p className="text-blue-800 text-sm">Go to Calendar or Appointments</p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        3
                      </div>
                      <p className="text-blue-800 text-sm">Click Actions → Export Appointments</p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        4
                      </div>
                      <p className="text-blue-800 text-sm">Select a date range (12–24 months is best)</p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        5
                      </div>
                      <p className="text-blue-800 text-sm">Filter by <strong>Completed Jobs Only</strong></p>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        6
                      </div>
                      <p className="text-blue-800 text-sm">Click Export — the CSV will be emailed to you</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg border">
                  <h3 className="font-semibold text-gray-900 mb-4">What your file should include:</h3>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-gray-700">Client Name</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-gray-700">Client Email</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-gray-700">Client Phone</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-gray-700">Service Date</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-gray-700">Appointment Status = Completed</span>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="text-xs text-gray-600">
                      <strong>Optional:</strong> Service Type, Amount Charged
                    </div>
                    <div className="space-y-2">
                      <div className="p-2 bg-blue-50 rounded border border-blue-200">
                        <p className="text-xs text-blue-700">
                          <strong>Phone numbers are required for SMS automation:</strong> Enables automated referral messages, thank you texts, and follow-up outreach campaigns.
                        </p>
                      </div>
                      <div className="p-2 bg-green-50 rounded border border-green-200">
                        <p className="text-xs text-green-700">
                          <strong>Amounts are needed to calculate revenue:</strong> Include pricing data to track monthly revenue, average booking values, and ROI metrics.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {uploadMutation.isPending ? (
                    <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="text-blue-700 font-medium">Processing your file...</span>
                      </div>
                      <div className="space-y-2">
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
                        </div>
                        <p className="text-blue-600 text-sm text-center">
                          Reading file data and creating client records. This may take a moment for larger files.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <div className="text-2xl mb-2">📂</div>
                        <p className="text-lg font-medium text-gray-700 mb-2">
                          Upload your file below to unlock full loyalty analytics
                        </p>
                      </div>
                      <div className="flex gap-3 justify-center">
                        <Button
                          size="lg"
                          onClick={() => document.getElementById('csv-upload')?.click()}
                        >
                          Upload CSV
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => setCurrentSlide(3)}
                        >
                          Skip for now
                        </Button>
                      </div>
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'referral-reward':
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">{currentSlideData.title}</h2>
              <p className="text-lg text-gray-600 max-w-xl mx-auto">{currentSlideData.subtitle}</p>
            </div>

            <Card className="max-w-3xl mx-auto">
              <CardContent className="p-8 space-y-6">
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <p className="text-blue-800 text-sm mb-3">
                    You don't need to offer one — the system works either way.
                  </p>
                  <p className="text-blue-800 text-sm">
                    But even small incentives can boost sharing and conversion rates.
                  </p>
                </div>

                <div>
                  <label htmlFor="referral-reward-input" className="block text-lg font-semibold text-gray-900 mb-3">
                    Set your reward offer (optional)
                  </label>
                  <input
                    id="referral-reward-input"
                    type="text"
                    value={referralReward}
                    onChange={(e) => setReferralReward(e.target.value)}
                    placeholder="$20 off for both" 
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary focus:outline-none text-lg"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Example: "$20 off for both" or "Free fridge cleaning"
                  </p>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg border">
                  <h3 className="font-semibold text-gray-900 mb-4">Reward Ideas:</h3>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="text-gray-700">$25 off for both</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="text-gray-700">Free add-on service</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="text-gray-700">$10 gift card</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="text-gray-700">10% off their next booking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="text-gray-700">Free service upgrade</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-4">
                    Rewards can be updated later in settings.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-8">
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-gray-900">{currentSlideData.title}</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">{currentSlideData.subtitle}</p>
            </div>

            {/* Setup Status Cards */}
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Data Import Status */}
              <div className={`p-6 rounded-xl border ${hasData ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {hasData ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <Clock className="h-6 w-6 text-gray-400" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">Client Data Import</h3>
                </div>
                <p className={`text-sm mb-4 ${hasData ? 'text-green-700' : 'text-gray-600'}`}>
                  {hasData 
                    ? `Great! You have ${(stats as any)?.totalClients || 0} clients imported and ready to track.`
                    : 'Import your existing client data via CSV upload or add clients manually.'
                  }
                </p>
                {!hasData && (
                  <Button variant="outline" size="sm" onClick={() => goToSlide(2)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </Button>
                )}
              </div>

              {/* Zapier Integration Status */}
              <div className={`p-6 rounded-xl border ${hasZapierConnection ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {hasZapierConnection ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <Clock className="h-6 w-6 text-gray-400" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">Zapier Integration</h3>
                </div>
                <p className={`text-sm mb-4 ${hasZapierConnection ? 'text-green-700' : 'text-gray-600'}`}>
                  {hasZapierConnection 
                    ? 'Perfect! Zapier is connected and automatically syncing your booking data.'
                    : 'Connect your booking system via Zapier for automatic data syncing.'
                  }
                </p>
                {!hasZapierConnection && (
                  <Button variant="outline" size="sm" onClick={() => goToSlide(2)}>
                    <Zap className="h-4 w-4 mr-2" />
                    Set up Zapier
                  </Button>
                )}
              </div>

              {/* Dashboard Access */}
              {hasData ? (
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Ready to Go!</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Your Referable account is set up. Access your dashboard to start tracking loyalty and referrals.
                  </p>
                  <Button size="lg" asChild className="w-full">
                    <a href="/">
                      Access Your Dashboard
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Almost There!</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Complete at least one setup step above to unlock your dashboard.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-xl border border-blue-200 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What you can do next:</h3>
              <div className="grid md:grid-cols-2 gap-3 text-left text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Track client loyalty scores automatically</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Monitor referral performance</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Send targeted thank you messages</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">View detailed analytics</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Slide Navigation Dots */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200 shadow-sm">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide
                  ? "bg-primary scale-125"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-10">
        <div className="w-full bg-gray-200 h-1">
          <div 
            className="bg-primary h-1 transition-all duration-500 ease-out"
            style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-20 min-h-screen flex items-center">
        <div className="w-full max-w-4xl mx-auto">
          {renderSlideContent()}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex items-center gap-4 bg-white/95 backdrop-blur-sm px-6 py-3 rounded-full border border-gray-200 shadow-lg">
          <Button
            variant="outline"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <span className="text-sm text-gray-600 px-4 font-medium">
            {currentSlide + 1} of {slides.length}
          </span>

          <Button
            onClick={nextSlide}
            disabled={currentSlide === slides.length - 1}
            className="gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}