import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Copy, CheckCircle, Edit, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Business {
  id: number;
  name: string;
  twilioPhoneNumber: string | null;
  selectedPhoneNumber: string | null;
  preferredAreaCode: string | null;
  businessZipCode: string | null;
}

interface PhoneNumberDisplayProps {
  business: Business;
  onEditRequest?: () => void;
}

export function PhoneNumberDisplay({ business, onEditRequest }: PhoneNumberDisplayProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const phoneNumber = business.selectedPhoneNumber || business.twilioPhoneNumber;

  const formatPhoneNumber = (phone: string) => {
    // Remove +1 and format as (XXX) XXX-XXXX
    const cleaned = phone.replace(/^\+1/, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };

  const copyToClipboard = async () => {
    if (!phoneNumber) return;
    
    try {
      await navigator.clipboard.writeText(phoneNumber);
      setCopied(true);
      toast({ title: "Phone number copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy phone number to clipboard",
        variant: "destructive",
      });
    }
  };

  if (!phoneNumber) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="w-5 h-5 text-orange-600" />
            Business SMS Number
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Phone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">No SMS number assigned</p>
            <p className="text-gray-400 text-xs mt-1 mb-4">
              Set up SMS messaging to communicate with your clients
            </p>
            <Button onClick={onEditRequest} className="mt-2">
              <Settings className="w-4 h-4 mr-2" />
              Set Up SMS Number
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="w-5 h-5 text-green-600" />
          Business SMS Number
          <Badge variant="secondary" className="ml-auto">
            Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Phone Number Display */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium mb-1">
                  Your Business SMS Number
                </p>
                <p className="text-2xl font-bold text-green-900 font-mono">
                  {formatPhoneNumber(phoneNumber)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Clients can text this number to reach you
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="h-8"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
                {onEditRequest && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onEditRequest}
                    className="h-8"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 font-medium">Area Code</p>
              <p className="text-gray-900">
                {business.preferredAreaCode || phoneNumber.replace(/^\+1(\d{3}).*/, '$1')}
              </p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">ZIP Code</p>
              <p className="text-gray-900">
                {business.businessZipCode || 'Not set'}
              </p>
            </div>
          </div>

          {/* Usage Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-2">SMS Usage Tips</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Share this number on your website and business cards</li>
              <li>• Clients can text you directly for quick questions</li>
              <li>• Use SMS templates for common responses</li>
              <li>• Monitor unread messages on your dashboard</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}