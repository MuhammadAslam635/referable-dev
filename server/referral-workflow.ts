import { db } from "./db";
import { clients, referrals, businesses } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Generate a unique referral code
export function generateReferralCode(clientName: string): string {
  const randomString = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `REF-${randomString}`;
}

// Send thank you message with referral code (simulated for now)
export function sendReferralMessage(clientName: string, clientEmail: string, referralCode: string): void {
  const message = `Thanks again for booking with us! 🙌
Here's your referral code: ${referralCode}.
Share it and you both get $25 off your next cleaning!`;

  console.log(`📧 REFERRAL MESSAGE SENT:`);
  console.log(`To: ${clientName} (${clientEmail})`);
  console.log(`Message: ${message}`);
  console.log(`========================`);
  
  // In production, this would integrate with:
  // - Twilio for SMS
  // - SendGrid/Mailgun for email
  // - Customer notification system
}

// Send reward notification (simulated for now)
export function sendRewardNotification(clientName: string, clientEmail: string, referrerName: string): void {
  const message = `🎉 ${referrerName} just booked their first cleaning — you both earned $25 off your next visit!`;

  console.log(`🎁 REWARD NOTIFICATION SENT:`);
  console.log(`To: ${clientName} (${clientEmail})`);
  console.log(`Message: ${message}`);
  console.log(`=========================`);
}

// Process completed booking and trigger referral workflow
export async function processCompletedBooking(businessId: number, clientId: number): Promise<void> {
  try {
    // Get client details
    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.businessId, businessId)));

    if (!client) {
      console.log(`Client ${clientId} not found for business ${businessId}`);
      return;
    }

    // Check if client already has a referral code
    if (!client.referralCode) {
      // Generate and save referral code
      const referralCode = generateReferralCode(client.name);
      
      await db
        .update(clients)
        .set({ 
          referralCode,
          thankYouSent: new Date()
        })
        .where(eq(clients.id, clientId));

      // Send thank you message with referral code
      sendReferralMessage(client.name, client.email, referralCode);
      
      console.log(`✅ Generated referral code ${referralCode} for client ${client.name}`);
    } else if (!client.thankYouSent) {
      // Client has code but hasn't received thank you message
      await db
        .update(clients)
        .set({ thankYouSent: new Date() })
        .where(eq(clients.id, clientId));

      sendReferralMessage(client.name, client.email, client.referralCode);
      
      console.log(`✅ Sent thank you message to existing client ${client.name}`);
    }

    // Check if this client was referred and convert the referral
    // Look for pending referrals by email address
    const pendingReferrals = await db
      .select()
      .from(referrals)
      .where(and(
        eq(referrals.businessId, businessId),
        eq(referrals.refereeEmail, client.email),
        eq(referrals.converted, false)
      ));

    // Convert any pending referrals for this client
    for (const referral of pendingReferrals) {
      await convertReferral(businessId, referral.referrerCode, client.name, client.email);
    }

  } catch (error) {
    console.error("Error processing completed booking:", error);
  }
}

// Convert a referral when the referred client books their first service
export async function convertReferral(businessId: number, referrerCode: string, refereeName: string, refereeEmail: string): Promise<void> {
  try {
    // Find the pending referral
    const [referral] = await db
      .select()
      .from(referrals)
      .where(and(
        eq(referrals.businessId, businessId),
        eq(referrals.referrerCode, referrerCode),
        eq(referrals.refereeEmail, refereeEmail),
        eq(referrals.converted, false)
      ));

    if (!referral) {
      console.log(`No pending referral found for ${refereeEmail} with code ${referrerCode}`);
      return;
    }

    // Mark referral as converted
    await db
      .update(referrals)
      .set({ 
        converted: true,
        convertedAt: new Date()
      })
      .where(eq(referrals.id, referral.id));

    // Find the referrer client
    const [referrer] = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.businessId, businessId),
        eq(clients.referralCode, referrerCode)
      ));

    if (referrer) {
      // Mark both clients as having earned rewards
      await db
        .update(clients)
        .set({ 
          hasReward: true,
          rewardEarned: new Date()
        })
        .where(and(
          eq(clients.businessId, businessId),
          eq(clients.referralCode, referrerCode)
        ));

      // Find the referred client
      const [referee] = await db
        .select()
        .from(clients)
        .where(and(
          eq(clients.businessId, businessId),
          eq(clients.email, refereeEmail)
        ));

      if (referee) {
        await db
          .update(clients)
          .set({ 
            hasReward: true,
            rewardEarned: new Date()
          })
          .where(eq(clients.id, referee.id));

        // Send reward notifications to both parties
        sendRewardNotification(referrer.name, referrer.email, referee.name);
        sendRewardNotification(referee.name, referee.email, referrer.name);
      }

      console.log(`🎉 Referral converted! ${referrer.name} referred ${refereeName}`);
    }

  } catch (error) {
    console.error("Error converting referral:", error);
  }
}

// Create a pending referral from the landing page
export async function createPendingReferral(businessId: number, referrerCode: string, refereeName: string, refereeEmail: string, refereePhone?: string): Promise<boolean> {
  try {
    // Check if referrer code exists
    const [referrer] = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.businessId, businessId),
        eq(clients.referralCode, referrerCode)
      ));

    if (!referrer) {
      return false; // Invalid referral code
    }

    // Check if referral already exists
    const existingReferral = await db
      .select()
      .from(referrals)
      .where(and(
        eq(referrals.businessId, businessId),
        eq(referrals.referrerCode, referrerCode),
        eq(referrals.refereeEmail, refereeEmail)
      ));

    if (existingReferral.length > 0) {
      return false; // Referral already exists
    }

    // Create pending referral
    await db
      .insert(referrals)
      .values({
        businessId,
        referrerCode,
        refereeName,
        refereeEmail,
        refereePhone,
        converted: false
      });

    console.log(`📝 Created pending referral: ${referrer.name} → ${refereeName} (${refereeEmail})`);
    return true;

  } catch (error) {
    console.error("Error creating pending referral:", error);
    return false;
  }
}