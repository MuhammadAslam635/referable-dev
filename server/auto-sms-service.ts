import { storage } from "./storage.js";
import { sendSms } from "./twilio-service.js";

/**
 * Sends automated thank-you SMS when an appointment is completed
 * @param clientId - ID of the client who had the appointment
 * @param businessId - ID of the business
 */
export async function sendAutoThankYouSMS(clientId: number, businessId: number): Promise<void> {
  try {
    // Get client and business settings
    const [client, settings] = await Promise.all([
      storage.getClientById(clientId, businessId),
      storage.getOutreachSettings(businessId)
    ]);

    if (!client) {
      console.log(`❌ Client ${clientId} not found for business ${businessId}`);
      return;
    }

    if (!client.phone) {
      console.log(`⚠️ No phone number for client ${client.name} (ID: ${clientId})`);
      return;
    }

    // Check if auto-send is enabled
    const autoSettings = settings?.autoMessageSettings as any;
    if (!settings || !autoSettings?.autoSendThankYou) {
      console.log(`⚠️ Auto thank-you SMS disabled for business ${businessId}`);
      return;
    }

    // Get thank-you message template
    const messages = settings.customMessages as any;
    const template = messages?.thankYou || "Thanks {clientName}! Your cleaning is complete. We appreciate your business!";
    
    // Replace placeholders
    const firstName = client.name.split(" ")[0];
    const referralLink = `https://loyalsweep.com/refer?code=${client.referralCode || ''}`;
    
    const personalizedMessage = template
      .replace(/\{clientName\}/g, firstName)
      .replace(/\{referralLink\}/g, referralLink)
      .replace(/\{referralCode\}/g, client.referralCode || '');

    // Get business details for phone number
    const business = await storage.getBusinessById(businessId);
    if (!business?.selectedPhoneNumber) {
      console.log(`❌ No selected phone number for business ${businessId}`);
      return;
    }

    // Send SMS
    const smsResult = await sendSms({
      to: client.phone,
      message: personalizedMessage,
      from: business.selectedPhoneNumber
    });

    if (smsResult.success) {
      // Log the SMS
      await storage.createSmsLog({
        businessId,
        clientId,
        phoneNumber: client.phone,
        messageType: "autoThankYou",
        messageContent: personalizedMessage,
        status: "sent",
        twilioSid: smsResult.messageSid || null
      });

      console.log(`✅ Auto thank-you SMS sent to ${client.name} (${client.phone})`);
      console.log(`📧 MESSAGE: ${personalizedMessage}`);
    } else {
      console.log(`❌ Failed to send auto thank-you SMS to ${client.name}: ${smsResult.error}`);
      
      // Log the failed attempt
      await storage.createSmsLog({
        businessId,
        clientId,
        phoneNumber: client.phone,
        messageType: "autoThankYou",
        messageContent: personalizedMessage,
        status: "failed",
        twilioSid: null
      });
    }

  } catch (error) {
    console.error(`❌ Error in sendAutoThankYouSMS for client ${clientId}:`, error);
  }
}

/**
 * Processes a completed booking and sends auto thank-you SMS if conditions are met
 * @param businessId - ID of the business
 * @param clientId - ID of the client
 */
export async function processCompletedBooking(businessId: number, clientId: number): Promise<void> {
  try {
    console.log(`🔄 Processing completed booking for client ${clientId}, business ${businessId}`);
    await sendAutoThankYouSMS(clientId, businessId);
  } catch (error) {
    console.error(`❌ Error processing completed booking:`, error);
  }
}

/**
 * Batch process multiple completed bookings (useful for CSV uploads)
 * @param completedBookings - Array of {businessId, clientId} objects
 */
export async function processBulkCompletedBookings(completedBookings: Array<{businessId: number, clientId: number}>): Promise<void> {
  console.log(`🔄 Processing ${completedBookings.length} completed bookings for auto thank-you SMS`);
  
  for (const booking of completedBookings) {
    await processCompletedBooking(booking.businessId, booking.clientId);
    // Add small delay to avoid overwhelming Twilio API
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}