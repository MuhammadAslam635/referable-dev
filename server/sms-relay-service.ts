import { db } from "./db";
import { businesses, clients, smsMessages, smsReplies, smsReplyContext } from "../shared/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import { sendSms } from "./twilio-service";

/**
 * SMS Relay Service
 * Handles two-way SMS forwarding between clients and business owners' personal phones
 */

interface ForwardingResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Formats a phone number to E.164 format
 */
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  return `+1${cleaned}`;
}

/**
 * Creates or updates SMS reply context for a business-client conversation
 */
async function createReplyContext(
  businessId: number,
  clientId: number,
  clientPhone: string,
  forwardingNumber: string,
  twilioNumber: string,
  messageId: string
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 60); // 60-minute expiry

  // Remove any existing context for this business-client pair
  await db.delete(smsReplyContext).where(
    and(
      eq(smsReplyContext.businessId, businessId),
      eq(smsReplyContext.clientId, clientId)
    )
  );

  // Create new context
  await db.insert(smsReplyContext).values({
    businessId,
    clientId,
    clientPhone: formatPhoneNumber(clientPhone),
    forwardingNumber: formatPhoneNumber(forwardingNumber),
    twilioNumber: formatPhoneNumber(twilioNumber),
    lastMessageId: messageId,
    expiresAt,
  });
}

/**
 * Forwards a client's SMS reply to the business owner's personal phone
 */
export async function forwardClientReplyToOwner(
  fromNumber: string,
  toNumber: string,
  messageBody: string,
  twilioSid: string
): Promise<ForwardingResult> {
  try {
    // Find the business by their Twilio number
    const business = await db.query.businesses.findFirst({
      where: eq(businesses.selectedPhoneNumber, formatPhoneNumber(toNumber)),
    });

    if (!business) {
      return { success: false, error: "Business not found for Twilio number" };
    }

    // Check if forwarding is enabled
    if (!business.enableForwarding || !business.forwardingNumber) {
      return { success: false, error: "Forwarding not enabled or number not set" };
    }

    // Find the client by their phone number
    const client = await db.query.clients.findFirst({
      where: and(
        eq(clients.businessId, business.id),
        eq(clients.phone, formatPhoneNumber(fromNumber))
      ),
    });

    if (!client) {
      return { success: false, error: "Client not found" };
    }

    // Create forwarding message
    const forwardingMessage = `📩 SMS from ${client.name} (${fromNumber}): "${messageBody}"\n\nReply here within 60 minutes to respond.`;

    // Send forwarding message to business owner's phone
    const result = await sendSms({
      to: business.forwardingNumber,
      from: business.selectedPhoneNumber!,
      message: forwardingMessage
    });

    if (result.success) {
      // Create reply context for potential responses
      await createReplyContext(
        business.id,
        client.id,
        fromNumber,
        business.forwardingNumber,
        business.selectedPhoneNumber!,
        result.messageSid!
      );

      // Store the original client message in smsReplies
      await db.insert(smsReplies).values({
        businessId: business.id,
        clientId: client.id,
        fromNumber: formatPhoneNumber(fromNumber),
        toNumber: formatPhoneNumber(toNumber),
        messageBody,
        twilioSid,
        isRead: false,
      });

      return { success: true, message: "Client reply forwarded to owner" };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("Error forwarding client reply:", error);
    return { success: false, error: "Failed to forward client reply" };
  }
}

/**
 * Routes a reply from the business owner's phone back to the client
 */
export async function routeOwnerReplyToClient(
  fromNumber: string,
  toNumber: string,
  messageBody: string,
  twilioSid: string
): Promise<ForwardingResult> {
  try {
    const now = new Date();

    // Find active reply context for this forwarding number
    const context = await db.query.smsReplyContext.findFirst({
      where: and(
        eq(smsReplyContext.forwardingNumber, formatPhoneNumber(fromNumber)),
        gt(smsReplyContext.expiresAt, now)
      ),
    });

    if (!context) {
      // No valid context found - send timeout message
      const business = await db.query.businesses.findFirst({
        where: eq(businesses.forwardingNumber, formatPhoneNumber(fromNumber)),
      });

      if (business && business.selectedPhoneNumber) {
        await sendSms({
          to: formatPhoneNumber(fromNumber),
          from: business.selectedPhoneNumber,
          message: "⚠️ We couldn't route your reply — the 60-minute window to respond has expired. Please reply through the Referable app."
        });
      }

      return { success: false, error: "Reply context expired or not found" };
    }

    // Route the reply to the client using the business Twilio number
    const result = await sendSms({
      to: context.clientPhone,
      from: context.twilioNumber,
      message: messageBody
    });

    if (result.success) {
      // Log the outbound message
      await db.insert(smsMessages).values({
        businessId: context.businessId,
        clientId: context.clientId,
        direction: "outbound",
        fromNumber: context.twilioNumber,
        toNumber: context.clientPhone,
        messageBody,
        messageType: "reply",
        twilioSid: result.messageSid!,
        status: "sent",
      });

      // Update the context with new expiry time
      const newExpiresAt = new Date();
      newExpiresAt.setMinutes(newExpiresAt.getMinutes() + 60);
      
      await db.update(smsReplyContext)
        .set({ 
          expiresAt: newExpiresAt,
          lastMessageId: result.messageSid!
        })
        .where(eq(smsReplyContext.id, context.id));

      return { success: true, message: "Owner reply routed to client" };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("Error routing owner reply:", error);
    return { success: false, error: "Failed to route owner reply" };
  }
}

/**
 * Cleans up expired SMS reply contexts
 */
export async function cleanupExpiredContexts(): Promise<void> {
  try {
    const now = new Date();
    await db.delete(smsReplyContext).where(
      lt(smsReplyContext.expiresAt, now)
    );
  } catch (error) {
    console.error("Error cleaning up expired contexts:", error);
  }
}

/**
 * Processes an incoming SMS webhook and determines if it should be forwarded or routed
 */
export async function processSmsWebhook(
  fromNumber: string,
  toNumber: string,
  messageBody: string,
  twilioSid: string
): Promise<ForwardingResult> {
  try {
    // Check if this is a reply from a business owner's forwarding number
    const isOwnerReply = await db.query.businesses.findFirst({
      where: eq(businesses.forwardingNumber, formatPhoneNumber(fromNumber)),
    });

    if (isOwnerReply) {
      // Route owner reply back to client
      return await routeOwnerReplyToClient(fromNumber, toNumber, messageBody, twilioSid);
    } else {
      // Forward client reply to owner
      return await forwardClientReplyToOwner(fromNumber, toNumber, messageBody, twilioSid);
    }
  } catch (error) {
    console.error("Error processing SMS webhook:", error);
    return { success: false, error: "Failed to process SMS webhook" };
  }
}