import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Client } from "@shared/schema";

interface ThanksModalProps {
  client: Client;
  onClose: () => void;
}

export function ThanksModal({ client, onClose }: ThanksModalProps) {
  const [message, setMessage] = useState(
    `Hi ${client.name.split(" ")[0]},\n\nThank you for being such a loyal client! Your continued trust in our cleaning services means the world to us.\n\nWe truly appreciate your business.\n\nBest regards,\nYour Cleaning Team`
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendThanksMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/send-thanks", {
        clientId: client.id,
        message,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Thank you message sent!",
        description: `Your message has been sent to ${client.name}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    sendThanksMutation.mutate();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Send Thank You Message
          </DialogTitle>
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
            <Label htmlFor="message">Message:</Label>
            <Textarea
              className="bg-white border-[#E5E7EB] mt-1"
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              placeholder="Write your thank you message..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full bg-[#E7A800] text-white font-bold px-4 py-2 text-xs sm:px-6 sm:py-2 sm:text-xl whitespace-nowrap"
            onClick={handleSend}
            disabled={sendThanksMutation.isPending || !message.trim()}
          >
            {sendThanksMutation.isPending ? "Sending..." : "Send Thank You"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
