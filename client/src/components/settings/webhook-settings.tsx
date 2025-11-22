import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getWebhookUrl, getZapierTemplateUrl } from "@/lib/auth";
import { 
  Copy, 
  ExternalLink, 
  Zap, 
  Activity, 
  CheckCircle, 
  XCircle,
  RefreshCw 
} from "lucide-react";

export function WebhookSettings() {
  const { business } = useAuth();
  const { toast } = useToast();
  const [testingWebhook, setTestingWebhook] = useState(false);

  const webhookUrl = business ? getWebhookUrl(business.webhookUrl) : "";
  const zapierUrl = getZapierTemplateUrl(webhookUrl);

  // Fetch webhook logs
  const { data: webhookLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["/api/webhook/logs"],
    enabled: !!business,
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Webhook URL copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please manually copy the webhook URL.",
        variant: "destructive",
      });
    }
  };

  const testWebhook = async () => {
    setTestingWebhook(true);
    try {
      const testPayload = {
        client: {
          name: "Test Client",
          email: "test@example.com",
        },
        job: {
          date: new Date().toISOString(),
          service: "Test Cleaning Service",
          amount: 150,
        },
      };

      const response = await fetch(`/api/webhook/${business?.webhookUrl}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        toast({
          title: "Test successful!",
          description: "Test webhook data has been processed successfully.",
        });
        refetchLogs();
      } else {
        throw new Error("Webhook test failed");
      }
    } catch (error: any) {
      toast({
        title: "Test failed",
        description: error.message || "Webhook test failed.",
        variant: "destructive",
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const regenerateWebhook = () => {
    toast({
      title: "Feature coming soon",
      description: "Webhook URL regeneration will be available soon.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Webhook Configuration</span>
          </CardTitle>
          <CardDescription>
            Configure your webhook URL for ZenMaid integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <div className="flex mt-2">
              <Input
                id="webhook-url"
                value={webhookUrl}
                readOnly
                className="flex-1 font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={() => copyToClipboard(webhookUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use this URL in your Zapier webhook configuration
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a href={zapierUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Setup Zapier Integration
              </a>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={testWebhook}
              disabled={testingWebhook}
            >
              <Activity className="h-4 w-4 mr-2" />
              {testingWebhook ? "Testing..." : "Test Webhook"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={regenerateWebhook}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate URL
            </Button>
          </div>

          {/* Webhook Status */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Integration Status</h4>
                <p className="text-sm text-gray-600">Current webhook configuration status</p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Webhook Activity</span>
          </CardTitle>
          <CardDescription>
            Monitor recent webhook requests and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {webhookLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No webhook activity</h3>
                <p className="text-sm">
                  Webhook requests will appear here when your integration is active
                </p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {webhookLogs.slice(0, 10).map((log: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {log.status === "success" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <div className="text-sm font-medium">
                          {log.payload?.client?.name || "Unknown Client"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={log.status === "success" ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {log.status}
                      </Badge>
                      {log.errorMessage && (
                        <div className="text-xs text-red-500 mt-1">
                          {log.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Integration Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Setup Guide</CardTitle>
          <CardDescription>
            Step-by-step instructions for setting up ZenMaid integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Zapier Setup</h4>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>Click "Setup Zapier Integration" above</li>
                  <li>Choose ZenMaid as your trigger app</li>
                  <li>Select the events you want to sync</li>
                  <li>Add Webhook as your action app</li>
                  <li>Paste your webhook URL</li>
                  <li>Test the connection</li>
                </ol>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Expected Data Format</h4>
                <div className="text-xs text-gray-500 font-mono bg-gray-50 p-3 rounded">
                  {`{
  "client": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "job": {
    "date": "2024-01-15",
    "service": "Deep Clean",
    "amount": 150
  }
}`}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
