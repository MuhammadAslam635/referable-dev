/**
 * Twilio SMS Webhook Handler
 * Processes inbound SMS messages and stores them in the database
 */

import { Request, Response } from 'express';
import { DatabaseStorage } from './storage.js';
import { formatPhoneNumber } from './twilio-service.js';
import { processSmsWebhook, cleanupExpiredContexts } from './sms-relay-service.js';
import { validateRequest } from 'twilio';
import { getWebhookUrl } from './webhook-config.js';

const storage = new DatabaseStorage();

interface TwilioWebhookPayload {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  AccountSid?: string;
  MessageStatus?: string;
  ApiVersion?: string;
  SmsSid?: string;
  SmsStatus?: string;
  SmsMessageSid?: string;
}

/**
 * Find business by Twilio phone number
 */
async function findBusinessByPhoneNumber(toNumber: string): Promise<{ businessId: number; clientId: number | null }> {
  // Search for business with this Twilio number
  const businesses = await storage.getAllBusinesses();
  
  for (const business of businesses) {
    if (business.selectedPhoneNumber === toNumber) {
      // Find client by phone number
      const clients = await storage.getClientsByBusinessId(business.id);
      const fromNumber = formatPhoneNumber(toNumber);
      const client = clients.find(c => c.phone && formatPhoneNumber(c.phone) === fromNumber);
      
      return {
        businessId: business.id,
        clientId: client?.id || null
      };
    }
  }
  
  throw new Error(`No business found for phone number: ${toNumber}`);
}

/**
 * Find client by phone number within a business
 */
async function findClientByPhoneNumber(businessId: number, fromNumber: string): Promise<number | null> {
  const clients = await storage.getClientsByBusinessId(businessId);
  const formattedFrom = formatPhoneNumber(fromNumber);
  
  const client = clients.find(c => 
    c.phone && formatPhoneNumber(c.phone) === formattedFrom
  );
  
  return client?.id || null;
}

/**
 * Detect SMS opt-out messages (STOP, UNSUBSCRIBE, etc.)
 */
function isOptOutMessage(messageBody: string): boolean {
  const optOutKeywords = [
    'STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'
  ];
  
  const upperBody = messageBody.trim().toUpperCase();
  return optOutKeywords.includes(upperBody);
}

/**
 * Handle Twilio SMS webhook
 */
export async function handleSmsWebhook(req: Request, res: Response): Promise<void> {
  try {
    // Validate Twilio webhook signature (skip in development)
    if (process.env.NODE_ENV === 'production' && process.env.TWILIO_AUTH_TOKEN) {
      const twilioSignature = req.headers['x-twilio-signature'] as string;
      const webhookUrl = getWebhookUrl('/api/sms/inbound');

      const isValid = validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        twilioSignature,
        webhookUrl,
        req.body
      );

      if (!isValid) {
        console.error('Invalid Twilio webhook signature');
        res.status(403).send('Forbidden');
        return;
      }
    }

    const payload: TwilioWebhookPayload = req.body;

    console.log('SMS webhook received:', {
      from: payload.From,
      to: payload.To,
      body: payload.Body?.substring(0, 50) + '...',
      messageSid: payload.MessageSid
    });

    // Check for duplicate messages using MessageSid
    const existingMessage = await storage.getSmsMessageByTwilioSid(payload.MessageSid);
    if (existingMessage) {
      console.log('Duplicate message detected, skipping:', payload.MessageSid);
      res.status(200).send('OK');
      return;
    }

    // Find business and client
    let businessId: number;
    let clientId: number | null = null;
    
    try {
      // Try to find business by the "To" number (business's Twilio number)
      const businesses = await storage.getAllBusinesses();
      const business = businesses.find(b => b.selectedPhoneNumber === payload.To);
      
      if (!business) {
        console.error('No business found for Twilio number:', payload.To);
        res.status(404).send('Business not found');
        return;
      }
      
      businessId = business.id;
      
      // Find client by "From" number
      clientId = await findClientByPhoneNumber(businessId, payload.From);
      
    } catch (error) {
      console.error('Error finding business/client:', error);
      res.status(404).send('Business not found');
      return;
    }

    // Handle opt-out messages
    if (isOptOutMessage(payload.Body)) {
      console.log('Opt-out message received from:', payload.From);
      
      // Log the opt-out
      await storage.createActivityLog({
        businessId,
        type: 'sms_opt_out',
        description: `Client opted out of SMS: ${payload.From}`,
        metadata: {
          phoneNumber: payload.From,
          message: payload.Body,
          twilioSid: payload.MessageSid
        }
      });
      
      // Could implement opt-out list management here
      // For now, just log and continue processing
    }

    // Process SMS through relay service for forwarding
    const relayResult = await processSmsWebhook(
      payload.From,
      payload.To,
      payload.Body,
      payload.MessageSid
    );

    if (relayResult.success) {
      console.log('SMS relay processed successfully:', relayResult.message);
    } else {
      console.log('SMS relay failed:', relayResult.error);
      // Continue with normal processing if relay fails
    }

    // Create SMS message record
    await storage.createSmsMessage({
      businessId,
      clientId,
      direction: 'inbound',
      fromNumber: payload.From,
      toNumber: payload.To,
      messageBody: payload.Body,
      messageType: 'reply',
      twilioSid: payload.MessageSid,
      status: 'unread'
    });

    // Log activity
    await storage.createActivityLog({
      businessId,
      type: 'sms_received',
      description: clientId 
        ? `SMS reply received from client`
        : `SMS received from unknown number: ${payload.From}`,
      metadata: {
        clientId,
        fromNumber: payload.From,
        messagePreview: payload.Body.substring(0, 100),
        twilioSid: payload.MessageSid
      }
    });

    console.log('SMS webhook processed successfully');
    res.status(200).send('OK');

  } catch (error) {
    console.error('SMS webhook error:', error);
    res.status(500).send('Error processing SMS webhook');
  }
}

/**
 * Validate Twilio webhook signature (optional security enhancement)
 */
export function validateTwilioSignature(req: Request): boolean {
  // Implementation would use Twilio's webhook signature validation
  // For now, return true (implement later with proper security)
  return true;
}