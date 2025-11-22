import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { getWebhookUrl, getZapierTemplateUrl } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Building2,
  DollarSign,
  MessageSquare,
  FileSpreadsheet
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function SetupReferable() {
  const { toast } = useToast();
  const { business } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [referralReward, setReferralReward] = useState<string>("$20");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [bookingTool, setBookingTool] = useState<string>("");
  const [googleReviewLink, setGoogleReviewLink] = useState<string>(business?.googleReviewLink || "");
  const [preferredAreaCode, setPreferredAreaCode] = useState<string>("");
  const [businessZipCode, setBusinessZipCode] = useState<string>("");
  const [forwardingNumber, setForwardingNumber] = useState<string>(business?.phone || "");
  const [enableForwarding, setEnableForwarding] = useState<boolean>(true);

  // Fetch business stats to check for existing data
  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: !!business?.id,
  });

  // Fetch webhook logs to check for Zapier connection
  const { data: webhookLogs } = useQuery({
    queryKey: ["/api/webhook-logs"],
    enabled: !!business?.id,
  });

  // Check if there's actual data
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
      title: 'Add Your Booking Data',
      subtitle: 'This is where the magic happens ✨',
      content: 'data-connection'
    },
    {
      id: 'sms-setup',
      title: 'Set Up SMS Communication',
      subtitle: 'Get a local phone number to automatically message your clients',
      content: 'sms-setup'
    },
    {
      id: 'referral-reward',
      title: 'Want More Referrals? Sweeten the Deal.',
      subtitle: 'Clients are far more likely to share their referral link when there\'s a simple reward involved.',
      content: 'referral-reward'
    },
    {
      id: 'google-review',
      title: 'Want More Reviews?',
      subtitle: 'Add your Google review link so you can easily share it with clients via text.',
      content: 'google-review'
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
  
  const currentSlideData = slides[currentSlide];

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

  // SMS phone number assignment mutation with forwarding settings
  const assignPhoneNumberMutation = useMutation({
    mutationFn: async (data: { 
      preferredAreaCode?: string; 
      businessZipCode?: string;
      forwardingNumber?: string;
      enableForwarding?: boolean;
    }) => {
      const response = await fetch("/api/sms/assign-local-number", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assign phone number");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/business/profile"] });
      toast({
        title: "SMS Number Assigned!",
        description: `Your new SMS number: ${data.twilioPhoneNumber}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "SMS Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Google review link mutation
  const saveGoogleReviewMutation = useMutation({
    mutationFn: async (reviewLink: string) => {
      const response = await fetch("/api/business/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ googleReviewLink: reviewLink }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save Google review link");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Review Link Saved",
        description: "Your Google review link has been saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      toast({ title: "Webhook URL copied to clipboard" });
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the URL manually",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (file: File) => {
    setCsvFile(file);
    uploadMutation.mutate(file);
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

  const canProceed = () => {
    switch (currentSlide) {
      case 1: // data-connection
        return uploadResult || true; // Allow skipping if they'll use Zapier
      default:
        return true;
    }
  };

  const renderSlideContent = () => {
    const slide = slides[currentSlide];

    switch (slide.content) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl mx-auto flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <div className="space-y-4">
              <p className="text-lg text-gray-600">
                Referable helps service businesses grow through referrals with:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Automatic referral tracking</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>SMS thank you messages</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Client loyalty insights</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Automated workflows</span>
                </div>
              </div>
            </div>
          </div>
        );



      case 'data-connection':
        return (
          <div className="space-y-8">
            {/* Booking Tool Input */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl">🧩</span>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">What booking tool do you use?</h3>
                      <p className="text-gray-600 mt-1">This helps us provide better setup instructions</p>
                    </div>
                    <Input
                      value={bookingTool}
                      onChange={(e) => setBookingTool(e.target.value)}
                      placeholder="e.g. ZenMaid, Jobber, Housecall Pro, ServiceTitan, etc."
                      className="text-lg py-3"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Content */}
            <div className="space-y-6">
              <div className="text-center space-y-3">
                <div className="space-y-2">
                  <p className="text-gray-700 text-lg leading-relaxed">
                    To help you track loyalty, trigger referral messages, and send follow-ups, we need access to your client appointment history and future bookings.
                  </p>
                  <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                    <span className="text-blue-500">✨</span>
                    <span className="font-medium">Upload CSV + connect Zapier for best results</span>
                  </div>
                </div>
              </div>

              {/* Personal Walkthrough Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    const phoneNumber = '4123703144';
                    const subject = 'Referable Personal Walkthrough Request';
                    const body = `Hi! I'd like to request a personal walkthrough for setting up Referable.

My business: ${business?.name || 'Not specified'}
My booking tool: ${bookingTool || 'Not specified'}
Request: Personal walkthrough for data connection setup

My webhook URL: ${webhookUrl}

Please schedule a time to walk me through the setup process.`;
                    
                    if (navigator.userAgent.includes('Mobile')) {
                      window.location.href = `tel:${phoneNumber}`;
                    } else {
                      window.location.href = `mailto:support@referable.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    }
                  }}
                  className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Request a Personal Walkthrough
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CSV Upload Section */}
                <Card className="relative overflow-hidden border-2 border-orange-200 hover:border-orange-300 transition-all duration-300 hover:shadow-lg">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-bl-full opacity-50"></div>
                  <CardHeader className="pb-3 relative">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileSpreadsheet className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-gray-900 mb-1">Upload Past Appointment History</CardTitle>
                        <CardDescription className="text-sm text-gray-600">
                          Drop in your file to get your client info into the system — quick and easy. Most booking systems can export data in these formats containing your appointment data in rows and columns.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {uploadResult ? (
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-500" />
                          <span className="text-green-700 font-semibold">
                            Successfully uploaded {uploadResult.processed} records
                          </span>
                        </div>
                        <p className="text-green-600 text-sm">Your appointment history is now connected!</p>
                      </div>
                    ) : uploadMutation.isPending ? (
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
                      <div className="relative">
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file);
                          }}
                          className="hidden"
                          id="csv-upload"
                          disabled={uploadMutation.isPending}
                        />
                        <label
                          htmlFor="csv-upload"
                          className={`group block w-full p-6 border-2 border-dashed border-orange-300 rounded-lg transition-all duration-300 ${
                            uploadMutation.isPending 
                              ? 'cursor-not-allowed opacity-50' 
                              : 'cursor-pointer hover:border-orange-400 hover:bg-orange-50/30'
                          }`}
                        >
                          <div className="text-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-yellow-100 rounded-full mx-auto mb-3 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <Upload className="w-6 h-6 text-orange-500" />
                            </div>
                            <p className="text-gray-700 font-medium mb-1">Click to upload CSV or Excel file</p>
                            <p className="text-gray-500 text-sm">or drag and drop here</p>
                            <p className="text-xs text-gray-400 mt-1">Supports .csv, .xlsx, .xls - Up to 10MB</p>
                          </div>
                        </label>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="font-medium text-gray-700 mb-1">✅ Required:</p>
                        <ul className="text-gray-600 space-y-0.5">
                          <li>• Client Name</li>
                          <li>• Client Email</li>
                          <li>• Appointment Date</li>
                          <li>• Status ("Completed")</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700 mb-1">➕ Optional:</p>
                        <ul className="text-gray-600 space-y-0.5">
                          <li>• Phone Number (needed for SMS)</li>
                          <li>• Service Type</li>
                          <li>• Amount Charged (needed for revenue & referral tracking)</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs bg-white hover:bg-orange-50 border-orange-200 text-orange-700 flex-1"
                        onClick={() => {
                          // Create sample CSV content
                          const csvContent = 'Client Name,Client Email,Service Date,Appointment Status,Phone Number,Service Type,Amount Charged\n' +
                            'John Smith,john@example.com,2024-01-15,Completed,555-123-4567,Deep Clean,150\n' +
                            'Sarah Johnson,sarah@example.com,2024-01-20,Completed,555-987-6543,Regular Clean,100';
                          
                          const blob = new Blob([csvContent], { type: 'text/csv' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'sample_appointments.csv';
                          a.click();
                          window.URL.revokeObjectURL(url);
                        }}
                      >
                        📄 Sample CSV
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs bg-white hover:bg-orange-50 border-orange-200 text-orange-700 flex-1"
                        onClick={() => {
                          const phoneNumber = '4123703144';
                          const subject = 'Referable CSV Upload Help';
                          const body = `Hi! I need help uploading my CSV file to Referable. 

My business: ${business?.name || 'Not specified'}
Issue: CSV upload assistance needed

Please help me get my appointment data connected.`;
                          
                          if (navigator.userAgent.includes('Mobile')) {
                            window.location.href = `tel:${phoneNumber}`;
                          } else {
                            window.location.href = `mailto:support@referable.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                          }
                        }}
                      >
                        🙋 Help
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Zapier Integration Section */}
                <Card className="relative overflow-hidden border-2 border-purple-200 hover:border-purple-300 transition-all duration-300 hover:shadow-lg">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-bl-full opacity-50"></div>
                  <CardHeader className="pb-3 relative">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-gray-900 mb-1">Connect Your Booking System</CardTitle>
                        <CardDescription className="text-sm text-gray-600">
                          Automatically sync future appointments via Zapier.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-gray-700 text-sm mb-1">Why connect?</p>
                        <p className="text-xs text-gray-600">This lets Referable automatically track your client appointments, send thank-you messages, and reward referrals — in real time.</p>
                      </div>
                      
                      <div>
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="setup-steps" className="border-0">
                            <AccordionTrigger className="text-sm font-medium text-blue-600 py-2 px-3 hover:no-underline hover:bg-blue-50 rounded-lg border border-blue-200 bg-blue-25 transition-colors cursor-pointer">
                              ⚙️ How to Set It Up (Takes 5 Minutes) - Click to expand
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 text-xs text-gray-600 pt-2">
                                <div>
                                  <p><span className="font-medium">1. Go to Zapier.com</span></p>
                                  <p className="text-gray-500 ml-2">→ Don't have an account? No worries — you can create one for free in just a minute.</p>
                                </div>
                                
                                <div>
                                  <p><span className="font-medium">2. Click "Create Zap"</span></p>
                                </div>
                                
                                <div>
                                  <p><span className="font-medium">3. Choose Your Booking Tool</span></p>
                                  <p className="text-gray-500 ml-2">→ Example: {bookingTool || "Jobber, Housecall Pro, ZenMaid"}</p>
                                  <p className="text-gray-500 ml-2">→ Set the trigger as: "New Booking" or "Job Completed"</p>
                                </div>
                                
                                <div>
                                  <p><span className="font-medium">4. Choose "Webhooks by Zapier" for the Action</span></p>
                                  <p className="text-gray-500 ml-2">→ Select POST</p>
                                </div>
                                
                                <div>
                                  <p><span className="font-medium">5. Paste Your Webhook URL from Referable</span></p>
                                  <p className="text-gray-500 ml-2">→ You'll find this below</p>
                                </div>
                                
                                <div>
                                  <p><span className="font-medium">6. Test It</span></p>
                                  <p className="text-gray-500 ml-2">Zapier will send a test booking to Referable</p>
                                </div>
                                
                                <div>
                                  <p><span className="font-medium">7. Turn Your Zap On</span></p>
                                  <p className="text-gray-500 ml-2">That's it! You're now live-syncing 🚀</p>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      </div>
                    </div>

                    <div className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                      <p className="text-xs font-medium text-purple-700 mb-2">Your webhook URL:</p>
                      <div className="bg-white p-2 rounded border text-xs">
                        <code className="font-mono text-gray-700 break-all">
                          {webhookUrl}
                        </code>
                      </div>
                    </div>

                    {/* Field Mapping Table */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700">How to Match Your Fields:</p>
                      <div className="bg-white border rounded-lg overflow-hidden">
                        <div className="grid grid-cols-2 text-xs">
                          <div className="p-2 bg-gray-50 font-medium border-b border-r">Referable Field</div>
                          <div className="p-2 bg-gray-50 font-medium border-b">What to Look for in Your Booking Tool</div>
                          
                          <div className="p-2 border-b border-r text-gray-700">client_name</div>
                          <div className="p-2 border-b text-gray-600">Client Name, Name, Customer Name</div>
                          
                          <div className="p-2 border-b border-r text-gray-700">client_email</div>
                          <div className="p-2 border-b text-gray-600">Email</div>
                          
                          <div className="p-2 border-b border-r text-gray-700">appointment_date</div>
                          <div className="p-2 border-b text-gray-600">Job Date, Visit Date, Service Date</div>
                          
                          <div className="p-2 border-b border-r text-gray-700">status</div>
                          <div className="p-2 border-b text-gray-600">Appointment Status (must be "Completed")</div>
                          
                          <div className="p-2 border-b border-r text-gray-700">phone (optional)</div>
                          <div className="p-2 border-b text-gray-600">Phone Number, Mobile</div>
                          
                          <div className="p-2 border-r text-gray-700">amount_charged (optional)</div>
                          <div className="p-2 text-gray-600">Price, Total, Amount</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-1 text-xs text-gray-600">
                        <span>💡</span>
                        <p>Your booking tool might use different names — just match the meaning. If you're not sure, we're happy to help.</p>
                      </div>
                      <div className="flex items-start gap-1 text-xs text-blue-600">
                        <span>📩</span>
                        <p>If Referable receives data that's missing key fields, we'll alert you and help you fix it.</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyWebhookUrl}
                        className="w-full justify-center bg-white hover:bg-purple-50 border-purple-200 text-purple-700 text-xs"
                      >
                        {copiedWebhook ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                        {copiedWebhook ? "Copied!" : "Copy URL"}
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(zapierTemplateUrl, '_blank')}
                          className="flex-1 justify-center bg-white hover:bg-purple-50 border-purple-200 text-purple-700 text-xs"
                        >
                          Setup Guide
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const phoneNumber = '4123703144';
                            const subject = 'Referable Zapier Integration Help';
                            const body = `Hi! I need help setting up Zapier integration with Referable.

My business: ${business?.name || 'Not specified'}
My booking tool: ${bookingTool || 'Not specified'}
Issue: Need assistance with Zapier webhook setup

My webhook URL: ${webhookUrl}

Please help me connect my booking system to Referable.`;
                            
                            if (navigator.userAgent.includes('Mobile')) {
                              window.location.href = `tel:${phoneNumber}`;
                            } else {
                              window.location.href = `mailto:support@referable.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                            }
                          }}
                          className="flex-1 justify-center bg-white hover:bg-purple-50 border-purple-200 text-purple-700 text-xs"
                        >
                          Get Help
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tip Callout */}
              <Alert className="bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 text-sm">💡</span>
                  <p className="text-blue-800 text-sm">
                    <span className="font-medium">Tip:</span> This step is optional — you can move forward and come back later. 
                    You can also manually add client information one by one from your dashboard if you prefer not to upload files or connect Zapier.
                    But once your data is connected, that's when Referable starts working its magic.
                  </p>
                </div>
              </Alert>
            </div>
          </div>
        );

      case 'sms-setup':
        return (
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="p-8">
                <div className="text-center space-y-4 mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Set Up Your Business Texting ✨</h3>
                    <p className="text-gray-600 mt-2 text-lg">Get a dedicated phone number to stay connected with your clients</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  <div className="text-center p-4 bg-white rounded-xl border border-gray-100">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <span className="text-blue-600 font-bold">1</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">Get Local Number</p>
                    <p className="text-xs text-gray-600 mt-1">We find numbers in your area</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-xl border border-gray-100">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <span className="text-purple-600 font-bold">2</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">Auto Messages</p>
                    <p className="text-xs text-gray-600 mt-1">Thank clients automatically</p>
                  </div>
                  <div className="text-center p-4 bg-white rounded-xl border border-gray-100">
                    <div className="w-10 h-10 bg-green-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <span className="text-green-600 font-bold">3</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">Two-Way Chat</p>
                    <p className="text-xs text-gray-600 mt-1">Clients can reply directly</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="area-code" className="text-sm font-medium text-gray-700 mb-2 block">
                        Preferred Area Code
                      </Label>
                      <Input
                        id="area-code"
                        value={preferredAreaCode}
                        onChange={(e) => setPreferredAreaCode(e.target.value)}
                        placeholder="412"
                        maxLength={3}
                        className="text-base py-3 bg-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave blank for any available number</p>
                    </div>
                    <div>
                      <Label htmlFor="zip-code" className="text-sm font-medium text-gray-700 mb-2 block">
                        Business ZIP Code
                      </Label>
                      <Input
                        id="zip-code"
                        value={businessZipCode}
                        onChange={(e) => setBusinessZipCode(e.target.value)}
                        placeholder="15201"
                        maxLength={5}
                        className="text-base py-3 bg-white"
                      />
                      <p className="text-xs text-gray-500 mt-1">Helps us find local numbers</p>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-900 mb-2">Smart Reply Forwarding</h4>
                        <p className="text-green-800 mb-4">
                          When clients text your business number, we can forward their messages to your personal phone. 
                          Reply directly and we'll send it back through your business number.
                        </p>
                        
                        <div className="flex items-center gap-3 mb-4">
                          <input
                            type="checkbox"
                            id="enable-forwarding"
                            checked={enableForwarding}
                            onChange={(e) => setEnableForwarding(e.target.checked)}
                            className="w-4 h-4 text-green-600 border-green-300 rounded focus:ring-green-500"
                          />
                          <label htmlFor="enable-forwarding" className="font-medium text-green-900 cursor-pointer">
                            Enable reply forwarding
                          </label>
                        </div>
                        
                        {enableForwarding && (
                          <div className="bg-white rounded-lg p-4 border border-green-200">
                            <Label htmlFor="forwarding-number" className="text-sm font-medium text-green-900 mb-2 block">
                              Your Personal Phone Number
                            </Label>
                            <Input
                              id="forwarding-number"
                              value={forwardingNumber}
                              onChange={(e) => setForwardingNumber(e.target.value)}
                              placeholder="(555) 123-4567"
                              className="bg-white border-green-200 focus:border-green-400"
                            />
                            <p className="text-xs text-green-700 mt-2">
                              Clients will only see your business number, keeping your personal number private.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold text-gray-900">Ready to get started?</h4>
                        <p className="text-sm text-gray-600">We'll set up everything automatically</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">Free</div>
                        <div className="text-xs text-gray-500">First 100 messages</div>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => {
                        assignPhoneNumberMutation.mutate({
                          preferredAreaCode: preferredAreaCode || undefined,
                          businessZipCode: businessZipCode || undefined,
                          forwardingNumber: enableForwarding ? forwardingNumber : undefined,
                          enableForwarding: enableForwarding
                        });
                      }}
                      disabled={assignPhoneNumberMutation.isPending || (enableForwarding && !forwardingNumber.trim())}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 text-lg"
                      size="lg"
                    >
                      {assignPhoneNumberMutation.isPending ? (
                        <div className="flex items-center gap-3">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                          Setting up your business texting...
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <MessageSquare className="w-5 h-5" />
                          Set Up Business Texting
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      )}
                    </Button>
                    
                    <div className="grid grid-cols-3 gap-4 mt-4 text-center text-xs text-gray-500">
                      <div>
                        <CheckCircle className="w-4 h-4 text-green-500 mx-auto mb-1" />
                        Instant setup
                      </div>
                      <div>
                        <CheckCircle className="w-4 h-4 text-green-500 mx-auto mb-1" />
                        Local numbers
                      </div>
                      <div>
                        <CheckCircle className="w-4 h-4 text-green-500 mx-auto mb-1" />
                        Two-way messaging
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'referral-reward':
        return (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full mx-auto flex items-center justify-center">
                <DollarSign className="w-10 h-10 text-white" />
              </div>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <p className="text-blue-800 text-sm mb-3">
                  You don't need to offer one — the system works either way.
                </p>
                <p className="text-blue-800 text-sm">
                  But even small incentives can boost sharing and conversion rates.
                </p>
              </div>

              <div>
                <Label htmlFor="referral-reward-input" className="block text-lg font-semibold text-gray-900 mb-3">
                  Set your reward offer (optional)
                </Label>
                <Input
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
                <h3 className="font-semibold text-gray-900 mb-4">Or choose from these popular ideas:</h3>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  {[
                    "$25 off for both",
                    "Free add-on service",
                    "$10 gift card",
                    "10% off their next booking",
                    "Free service upgrade"
                  ].map((reward) => (
                    <button
                      key={reward}
                      onClick={() => setReferralReward(reward)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${
                        referralReward === reward
                          ? 'border-blue-500 bg-blue-50 text-blue-900'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        referralReward === reward ? 'bg-blue-500' : 'bg-gray-400'
                      }`}></span>
                      <span className="text-gray-700">{reward}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-4">
                  Click any idea to use it, or create your own above. Rewards can be updated later in settings.
                </p>
              </div>
            </div>
          </div>
        );

      case 'google-review':
        return (
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xl">⭐</span>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">Google Review Link</h3>
                      <p className="text-gray-600 mt-1">Add your Google review link so you can easily share it with clients via text</p>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="google-review-link" className="text-sm font-medium">
                        Google Review Link (Optional)
                      </Label>
                      <Input
                        id="google-review-link"
                        value={googleReviewLink}
                        onChange={(e) => setGoogleReviewLink(e.target.value)}
                        placeholder="https://g.page/r/yourbusiness/review"
                        className="text-base py-3"
                      />
                      <p className="text-xs text-gray-500">
                        You can find this link in your Google Business Profile under "Get more reviews"
                      </p>
                    </div>
                    {googleReviewLink && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-700">Preview Message</span>
                        </div>
                        <p className="text-sm text-blue-600">
                          "Thanks again for choosing us! If you have a moment, we'd really appreciate a quick review: {googleReviewLink}"
                        </p>
                      </div>
                    )}
                    {googleReviewLink && (
                      <Button
                        onClick={() => saveGoogleReviewMutation.mutate(googleReviewLink)}
                        disabled={saveGoogleReviewMutation.isPending}
                        className="w-full"
                      >
                        {saveGoogleReviewMutation.isPending ? "Saving..." : "Save Review Link"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-center">Setup Summary</h3>
              <div className="grid grid-cols-1 gap-4">

                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span>Data Source:</span>
                  <Badge variant="outline">
                    {(() => {
                      const sources = [];
                      if (uploadResult || hasData) sources.push("CSV Data");
                      if (hasZapierConnection) sources.push("Zapier Connected");
                      if (sources.length === 0) return "No data connected";
                      return sources.join(" + ");
                    })()}
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span>Referral Reward:</span>
                  <Badge variant="outline">{referralReward}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span>Google Review Link:</span>
                  <Badge variant="outline">
                    {googleReviewLink ? "Added" : "Not set"}
                  </Badge>
                </div>
              </div>
              <p className="text-center text-gray-600">
                You're all set! You can customize SMS messages, add more data sources, 
                and adjust settings anytime from your dashboard.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-6">
            <div className="mb-4">
              <Progress value={((currentSlide + 1) / slides.length) * 100} className="w-full max-w-md mx-auto" />
              <p className="text-sm text-gray-500 mt-2">
                Step {currentSlide + 1} of {slides.length}
              </p>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900">
              {slides[currentSlide].title}
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              {slides[currentSlide].subtitle}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <div className="min-h-[400px] flex items-center justify-center">
              {renderSlideContent()}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevSlide}
                disabled={currentSlide === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>

              <div className="flex gap-2">
                {currentSlide < slides.length - 1 && (
                  <Button
                    variant="outline"
                    onClick={nextSlide}
                    disabled={!canProceed()}
                  >
                    Skip
                  </Button>
                )}
                <Button
                  onClick={currentSlide === slides.length - 1 ? () => window.location.href = "/" : nextSlide}
                  disabled={!canProceed()}
                  className="flex items-center gap-2"
                >
                  {currentSlide === slides.length - 1 ? "Go to Dashboard" : "Continue"}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}