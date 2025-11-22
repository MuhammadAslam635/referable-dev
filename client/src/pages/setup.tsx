import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { getWebhookUrl, getZapierTemplateUrl } from "@/lib/auth";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  Copy, 
  ExternalLink, 
  Zap, 
  Webhook,
  Play,
  Download,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Clock
} from "lucide-react";

export default function Setup() {
  const { toast } = useToast();
  const { business } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [currentSlide, setCurrentSlide] = useState(0);

  // Check if user has any data
  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const hasData = stats && (stats.totalClients > 0 || stats.totalReferrals > 0);

  const slides = [
    {
      id: 'welcome',
      title: 'Welcome to LoyalSweep!',
      subtitle: 'Transform your cleaning business with powerful loyalty tracking',
      content: 'welcome'
    },
    {
      id: 'zenmaid',
      title: 'Connect ZenMaid Integration',
      subtitle: 'Automatically sync your bookings and client data',
      content: 'zenmaid'
    },
    {
      id: 'csv',
      title: 'Import Your Client Data',
      subtitle: 'Upload existing client information to get started quickly',
      content: 'csv'
    },
    {
      id: 'complete',
      title: 'Setup Complete!',
      subtitle: 'You\'re ready to start tracking client loyalty',
      content: 'complete'
    }
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const webhookUrl = business?.webhookUrl ? getWebhookUrl(business.webhookUrl) : "";
  const zapierTemplateUrl = getZapierTemplateUrl(webhookUrl);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("csv", file);

      const response = await apiRequest("POST", "/api/admin/import", formData);
      return response.json();
    },
    onSuccess: (data) => {
      setCompletedSteps(prev => new Set([...Array.from(prev), "upload"]));
      toast({
        title: "CSV Upload Successful",
        description: `Processed ${data.processed} bookings, skipped ${data.skipped}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload CSV file.",
        variant: "destructive",
      });
    },
  });

  const testDataMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/webhook/test", {
        webhookId: business?.webhookUrl
      });
      return response.json();
    },
    onSuccess: () => {
      setCompletedSteps(prev => new Set([...Array.from(prev), "test"]));
      toast({
        title: "Test Data Created",
        description: "Sample client and booking data has been added to your account.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to create test data.",
        variant: "destructive",
      });
    },
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files?.[0]) {
      uploadMutation.mutate(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const downloadExampleCSV = () => {
    const csvContent = `name,email,serviceDate,serviceType,amount
John Doe,john@example.com,2024-01-15,Deep Clean,150
Jane Smith,jane@example.com,2024-01-14,Regular Clean,85
Bob Johnson,bob@example.com,2024-01-13,Window Clean,75`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'example-bookings.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const businessTypes = [
    { value: "cleaning", label: "Cleaning Services", icon: "🧽" },
    { value: "mobile-detailing", label: "Mobile Detailing", icon: "🚗" },
    { value: "landscaping", label: "Landscaping", icon: "🌿" },
    { value: "pool-cleaning", label: "Pool Cleaning", icon: "🏊‍♂️" },
    { value: "pressure-washing", label: "Pressure Washing", icon: "💧" },
    { value: "other", label: "Other Service Business", icon: "🛠️" }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Referable!</h1>
        <p className="text-gray-600 mt-2">Let's get your cleaning business set up in just a few steps</p>

        {/* Progress Indicator */}
        <div className="mt-6 max-w-md mx-auto">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Setup Progress</span>
            <span className="text-gray-500">
              {completedSteps.size + (hasData ? 1 : 0)}/3 steps
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((completedSteps.size + (hasData ? 1 : 0)) / 3) * 100}%` }}
            />
          </div>

          {/* Setup Required Notice */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-yellow-800 text-sm font-medium">
                Complete setup to access your dashboard
              </span>
            </div>
          </div>
        </div>

        {hasData && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200 max-w-md mx-auto">
            <div className="flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-700 font-medium">Great! You already have data in your account</span>
            </div>
          </div>
        )}
      </div>

      {/* Setup Steps */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Step 1: Webhook Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold mr-3">
                  1
                </div>
                <div>
                  <CardTitle className="flex items-center">
                    <Webhook className="h-5 w-5 mr-2" />
                    Connect ZenMaid
                  </CardTitle>
                  <CardDescription>
                    Automatically sync your bookings
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline">Recommended</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Your Webhook URL:
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-gray-100 p-2 rounded text-xs font-mono break-all">
                  {webhookUrl}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyWebhookUrl}
                  className="shrink-0"
                >
                  {copiedWebhook ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={() => window.open(zapierTemplateUrl, '_blank')}
            >
              <Zap className="h-4 w-4 mr-2" />
              Use This Zap
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>

            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-blue-900">How to set up ZenMaid integration:</h4>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>Click "Use This Zap" to open the pre-configured template</li>
                <li>Sign in to your Zapier account (or create one for free)</li>
                <li>Connect your ZenMaid account when prompted</li>
                <li>The webhook URL above will be automatically filled in</li>
                <li>Test the connection and turn on your Zap</li>
              </ol>
              <p className="text-xs text-blue-600 mt-2">
                This automation will send new booking data from ZenMaid directly to LoyalSweep in real-time.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Import Existing Data */}
        <Card>
          <CardHeader>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold mr-3">
                2
              </div>
              <div>
                <CardTitle className="flex items-center">
                  <Upload className="h-5 w-5 mr-2" />
                  Import Data
                </CardTitle>
                <CardDescription>
                  Upload your existing client data
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
            >
              <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="font-medium text-gray-900 mb-1">
                Drop CSV file here
              </p>
              <p className="text-sm text-gray-600 mb-3">
                or click to browse
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileInput}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button variant="outline" size="sm" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            </div>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={downloadExampleCSV}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Example CSV
            </Button>

            <div className="bg-green-50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-green-900">CSV file requirements:</h4>
              <div className="text-sm text-green-700 space-y-2">
                <p><strong>Required columns:</strong> name, email, phone, serviceDate, serviceType, amount</p>
                <p><strong>Date format:</strong> YYYY-MM-DD (e.g., 2024-01-15)</p>
                <p><strong>Phone format:</strong> Any format (555) 123-4567, +1-555-123-4567, 5551234567</p>
                <p><strong>Amount format:</strong> Numbers only or with $ (e.g., 150 or $150)</p>
                <div className="bg-white p-2 rounded border">
                  <p className="font-mono text-xs">
                    name,email,phone,serviceDate,serviceType,amount<br/>
                    "John Doe","john@example.com","(555) 123-4567","2024-01-15","Deep Clean","150"
                  </p>
                </div>
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-700">
                    <strong>SMS Required:</strong> Phone numbers enable automated referral messages and outreach campaigns.
                  </p>
                </div>
              </div>
              <p className="text-xs text-green-600">
                <strong>How to export from ZenMaid:</strong> Go to Reports → Export → Select date range → Include customer info, job details, and pricing
              </p>
            </div>

            {uploadMutation.isPending && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                  <span className="text-blue-700 text-sm">Processing your file...</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visual Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
          <CardDescription>
            Follow these steps to get the most out of LoyalSweep
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-medium mb-2">Connect ZenMaid</h3>
              <p className="text-sm text-gray-600">
                Set up automatic data sync with your booking system
              </p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Upload className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium mb-2">Import History</h3>
              <p className="text-sm text-gray-600">
                Upload past booking data to see loyalty trends
              </p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-medium mb-2">Track Loyalty</h3>
              <p className="text-sm text-gray-600">
                Watch client loyalty scores and referrals grow
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Data & Next Steps */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Play className="h-5 w-5 mr-2" />
              Try with Test Data
            </CardTitle>
            <CardDescription>
              Generate sample data to explore features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => testDataMutation.mutate()}
              disabled={testDataMutation.isPending}
              variant="outline"
              className="w-full"
            >
              {testDataMutation.isPending ? "Creating..." : "Add Test Data"}
            </Button>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Ready to Go?</CardTitle>
            <CardDescription>
              {hasData ? "Head to your dashboard to start tracking loyalty" : "Complete at least one setup step to unlock your dashboard"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              asChild={hasData} 
              className="w-full" 
              disabled={!hasData}
              variant={hasData ? "default" : "outline"}
            >
              {hasData ? (
                <a href="/">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </a>
              ) : (
                <span>
                  <Clock className="h-4 w-4 mr-2" />
                  Dashboard Locked
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}