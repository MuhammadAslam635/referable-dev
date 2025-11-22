import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Copy, Link, ExternalLink, Globe } from "lucide-react";
import type { Client } from "@shared/schema";

interface ReferralLinkButtonsProps {
  client: Client;
}

export function ReferralLinkButtons({ client }: ReferralLinkButtonsProps) {
  const { business } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Generate referral links
  const referableLink = `${window.location.origin}/ref/${client.referralCode}`;
  const websiteLink = business?.websiteUrl 
    ? `${business.websiteUrl}?ref=${client.referralCode}`
    : null;

  const copyToClipboard = async (text: string, linkType: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Link copied!",
        description: `${linkType} referral link copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy link. Please try selecting and copying manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link className="h-3 w-3 mr-1" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Referral Links for {client.name}
          </DialogTitle>
          <DialogDescription>
            Choose how you want to share this referral link. Both options will track the referral and credit {client.name}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Referable Hosted Link */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Referable Hosted Form
              </CardTitle>
              <CardDescription>
                Direct link to Referable's hosted referral form - works immediately, no setup required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-gray-50 rounded border text-sm font-mono break-all">
                  {referableLink}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(referableLink, "Referable hosted")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Website Link */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Your Website Link
                {!websiteLink && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Setup Required</span>}
              </CardTitle>
              <CardDescription>
                {websiteLink 
                  ? "Direct link to your website with embedded Referable form - provides seamless branding experience."
                  : "Add your website URL in Settings → Business Profile to enable this option."
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {websiteLink ? (
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-gray-50 rounded border text-sm font-mono break-all">
                    {websiteLink}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(websiteLink, "Website")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Setup Instructions:</strong>
                  </p>
                  <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Go to Settings → Business Profile</li>
                    <li>Add your website URL (e.g., https://yourwebsite.com)</li>
                    <li>Embed a Referable form on your website</li>
                    <li>Use this link type to drive traffic to your site</li>
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Usage Tips */}
          <Card className="bg-gray-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Usage Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>Referable Link:</strong> Perfect for social media, email, or any quick sharing scenario.</p>
              <p><strong>Website Link:</strong> Best for maintaining your brand experience and keeping visitors on your domain.</p>
              <p><strong>Tracking:</strong> Both options automatically track referrals and credit {client.name} when someone submits the form.</p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}