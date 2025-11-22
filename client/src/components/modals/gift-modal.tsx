import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import type { Client } from "@shared/schema";

interface GiftModalProps {
  client: Client;
  onClose: () => void;
}

const giftOptions = [
  { value: "discount", label: "Service Discount", amounts: [10, 25, 50, 100] },
  { value: "gift_card", label: "Gift Card", amounts: [25, 50, 100, 200] },
  { value: "free_service", label: "Free Service", amounts: [75, 150, 300] },
  { value: "custom", label: "Custom Amount", amounts: [] },
];

export function GiftModal({ client, onClose }: GiftModalProps) {
  const [giftType, setGiftType] = useState("");
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const selectedGiftOption = giftOptions.find(option => option.value === giftType);
  const finalAmount = giftType === "custom" ? customAmount : amount;

  const sendGiftMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/send-gift", {
        clientId: client.id,
        giftType,
        amount: parseFloat(finalAmount),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Gift sent successfully!",
        description: `${selectedGiftOption?.label} of ${formatCurrency(finalAmount)} has been sent to ${client.name}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send gift",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!giftType || !finalAmount) return;
    sendGiftMutation.mutate();
  };

  const canSend = giftType && finalAmount && parseFloat(finalAmount) > 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Send Gift</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="recipient">To:</Label>
            <div className="mt-1 p-2 bg-gray-50 rounded-md">
              <div className="font-medium">{client.name}</div>
              <div className="text-sm text-gray-500">{client.email}</div>
            </div>
          </div>
          
          <div>
            <Label htmlFor="giftType">Gift Type:</Label>
            <Select value={giftType} onValueChange={setGiftType}>
              <SelectTrigger className="mt-1 bg-white border-[#E5E7EB]">
                <SelectValue placeholder="Select gift type" />
              </SelectTrigger>
              <SelectContent>
                {giftOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {giftType && giftType !== "custom" && (
            <div>
              <Label htmlFor="amount">Amount:</Label>
              <Select value={amount} onValueChange={setAmount}>
                <SelectTrigger className="mt-1 bg-white border-[#E5E7EB]">
                  <SelectValue placeholder="Select amount" />
                </SelectTrigger>
                <SelectContent>
                  {selectedGiftOption?.amounts.map((amt) => (
                    <SelectItem key={amt} value={amt.toString()}>
                      {formatCurrency(amt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {giftType === "custom" && (
            <div>
              <Label htmlFor="customAmount">Custom Amount:</Label>
              <Input
                id="customAmount"
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="mt-1"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            onClick={handleSend} 
            disabled={sendGiftMutation.isPending || !canSend}
            className="w-full bg-[#E7A800] text-white font-bold px-4 py-2 text-xs sm:px-6 sm:py-2 sm:text-xl whitespace-nowrap"
          >
            {sendGiftMutation.isPending ? "Sending..." : "Send Gift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
