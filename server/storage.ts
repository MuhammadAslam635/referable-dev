import { 
  businesses, 
  clients, 
  bookings, 
  referrals, 
  smsTemplates,
  webhookLogs,
  outreachSettings,
  smsLogs,
  csvUploadLogs,
  smsReplies,
  smsMessages,
  referralRewards,
  activityLogs,
  passwordResetTokens,
  leads,
  forms,
  leadCommunications,
  type Business, 
  type InsertBusiness,
  type Client,
  type InsertClient,
  type Booking,
  type InsertBooking,
  type Referral,
  type InsertReferral,
  type WebhookLog,
  type InsertWebhookLog,
  type OutreachSettings,
  type InsertOutreachSettings,
  type SmsLog,
  type InsertSmsLog,
  type CsvUploadLog,
  type InsertCsvUploadLog,
  type SmsReply,
  type InsertSmsReply,
  type SmsMessage,
  type InsertSmsMessage,
  type ReferralReward,
  type InsertReferralReward,
  type ActivityLog,
  type InsertActivityLog,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type Lead,
  type InsertLead,
  type Form,
  type InsertForm,
  type LeadCommunication,
  type InsertLeadCommunication,
  type SmsTemplate,
  type InsertSmsTemplate
} from "@shared/schema";
import { db } from "./db.js";
import { and, eq, desc, sql, or, isNull, ilike, SQL, count, avg, isNotNull } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  // Business methods
  createBusiness(business: InsertBusiness & { passwordHash: string }): Promise<Business>;
  getBusinessByEmail(email: string): Promise<Business | undefined>;
  getBusinessById(id: number): Promise<Business | undefined>;
  getBusinessByWebhookId(webhookId: string): Promise<Business | undefined>;
  getAllBusinesses(): Promise<Business[]>;
  updateBusiness(id: number, updates: Partial<Business>): Promise<Business | undefined>;

  // Client methods
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, businessId: number, updates: Partial<Client>): Promise<Client | undefined>;
  getClientsByBusinessId(businessId: number): Promise<Client[]>;
  getClientByEmail(email: string, businessId: number): Promise<Client | undefined>;
  getClientById(id: number, businessId: number): Promise<Client | undefined>;
  getClientByReferralCode(referralCode: string, businessId: number): Promise<Client | undefined>;
  getClientByReferralCodeGlobal(referralCode: string): Promise<Client | undefined>;

  // Booking methods
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBookingsByClientId(clientId: number, businessId: number): Promise<Booking[]>;
  getBookingsByBusinessId(businessId: number): Promise<Booking[]>;

  // Referral methods
  createReferral(referral: InsertReferral): Promise<Referral>;
  getReferralsByBusinessId(businessId: number): Promise<Referral[]>;
  updateReferral(id: number, businessId: number, updates: Partial<Referral>): Promise<Referral | undefined>;
  checkAndMatchReferrals(businessId: number, clientEmail: string, clientPhone?: string | null): Promise<void>;

  // Webhook methods
  createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog>;
  getWebhookLogs(businessId: number, limit?: number): Promise<WebhookLog[]>;

  // Analytics methods
  getBusinessStats(businessId: number): Promise<{
    totalClients: number;
    totalReferrals: number;
    avgLoyaltyScore: number;
    monthlyRevenue: number;
    activeReferrals: number;
    referralRevenue: number;
  }>;

  getTopReferrers(businessId: number, limit: number): Promise<Array<{
    client: Client;
    totalReferrals: number;
    convertedReferrals: number;
    conversionRate: number;
  }>>;

  getBookingTrends(businessId: number, days: number): Promise<Array<{
    date: string;
    count: number;
  }>>;

  // SMS Outreach methods
  getOutreachSettings(businessId: number): Promise<OutreachSettings | undefined>;
  createOutreachSettings(settings: InsertOutreachSettings): Promise<OutreachSettings>;
  updateOutreachSettings(businessId: number, updates: Partial<OutreachSettings>): Promise<OutreachSettings | undefined>;
  
  createSmsLog(log: InsertSmsLog): Promise<SmsLog>;
  getSmsLogs(businessId: number, limit?: number): Promise<SmsLog[]>;
  getSmsLogsByClient(clientId: number, businessId: number): Promise<SmsLog[]>;

  // CSV Upload Log methods
  createCsvUploadLog(log: CsvUploadLog): Promise<CsvUploadLog>;
  getCsvUploadLogs(businessId: number, limit?: number): Promise<CsvUploadLog[]>;

  // SMS Messages methods (comprehensive SMS handling)
  createSmsMessage(message: InsertSmsMessage): Promise<SmsMessage>;
  getSmsMessages(
    businessId: number, 
    direction?: 'inbound' | 'outbound', 
    limit?: number,
    offset?: number,
    search?: string
  ): Promise<SmsMessage[]>;
  getSmsConversation(businessId: number, clientId: number): Promise<SmsMessage[]>;
  markSmsMessageAsRead(id: number, businessId: number): Promise<SmsMessage | undefined>;
  getUnreadSmsMessagesCount(businessId: number): Promise<number>;
  getSmsMessageByTwilioSid(twilioSid: string): Promise<SmsMessage | undefined>;
  updateSmsMessage(id: number, updates: Partial<InsertSmsMessage>): Promise<SmsMessage | undefined>;


  // Referral Reward methods  
  createReferralReward(reward: InsertReferralReward): Promise<ReferralReward>;
  updateReferralReward(id: number, businessId: number, updates: Partial<ReferralReward>): Promise<ReferralReward | undefined>;
  getReferralRewards(businessId: number, pendingOnly?: boolean, limit?: number): Promise<Array<ReferralReward & { referral: Referral }>>;

  // Activity Log methods
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(businessId: number, limit?: number): Promise<ActivityLog[]>;

  // Phone number management
  updateBusinessPhoneNumbers(businessId: number, selectedPhone: string, availableNumbers: string[]): Promise<Business | undefined>;
  getBusinessPhoneNumbers(businessId: number): Promise<{ selectedPhoneNumber: string | null, twilioNumbers: string[] }>;

  // Activities dashboard data
  getRecentCompletedBookings(businessId: number, limit?: number): Promise<Booking[]>;
  getPendingReferrals(businessId: number, daysOld?: number): Promise<Array<Referral & { daysSinceShared: number; referrerClient: { id: number; name: string; email: string } | null }>>;
  getRecentReferralConversions(businessId: number, days?: number): Promise<Array<Referral & { referralReward?: ReferralReward | null; referrerClient?: { id: number; name: string; email: string } | null }>>;
  
  // Insights data
  getInsightsData(businessId: number): Promise<any>;

  // Password reset methods
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(token: string): Promise<void>;
  deleteExpiredPasswordResetTokens(): Promise<void>;
  updateBusinessPassword(businessId: number, passwordHash: string): Promise<void>;

  // Lead Management methods
  createLead(lead: InsertLead): Promise<Lead>;
  getLeadsByBusinessId(businessId: number): Promise<Lead[]>;
  getLeadById(id: number, businessId: number): Promise<Lead | undefined>;
  updateLeadStatus(id: number, businessId: number, status: string): Promise<Lead | undefined>;
  getLeadStats(businessId: number): Promise<{
    totalLeadsThisWeek: number;
    conversionRate: number;
    referralPercentage: number;
    topReferrers: Array<{ name: string; count: number }>;
  }>;

  // Lead Communication methods
  createLeadCommunication(communication: InsertLeadCommunication): Promise<LeadCommunication>;
  getLeadCommunications(leadId: number, businessId: number): Promise<LeadCommunication[]>;

  // Form Management methods
  createForm(form: InsertForm): Promise<Form>;
  getFormsByBusinessId(businessId: number): Promise<Form[]>;
  getFormById(id: number, businessId: number): Promise<Form | undefined>;
  getFormByEmbedToken(embedToken: string): Promise<Form | undefined>;
  updateForm(id: number, businessId: number, updates: Partial<Form>): Promise<Form | undefined>;
  deleteForm(id: number, businessId: number): Promise<boolean>;
  incrementFormSubmissions(formId: number): Promise<void>;

  // SMS Templates methods
  getSmsTemplates(businessId: number): Promise<SmsTemplate[]>;
  createSmsTemplate(template: InsertSmsTemplate): Promise<SmsTemplate>;
  updateSmsTemplate(id: number, businessId: number, updates: Partial<SmsTemplate>): Promise<SmsTemplate | undefined>;
  deleteSmsTemplate(id: number, businessId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async createBusiness(data: InsertBusiness & { passwordHash: string }): Promise<Business> {
    const webhookUrl = `webhook-${nanoid(12)}`;

    const [business] = await db
      .insert(businesses)
      .values({
        ...data,
        webhookUrl,
      })
      .returning();

    return business;
  }

  // ===== SMS Templates =====
  async getSmsTemplates(businessId: number): Promise<SmsTemplate[]> {
    return await db
      .select()
      .from(smsTemplates)
      .where(eq(smsTemplates.businessId, businessId))
      .orderBy(desc(smsTemplates.updatedAt));
  }

  async createSmsTemplate(template: InsertSmsTemplate): Promise<SmsTemplate> {
    const values = {
      ...template,
      variables: (template.variables ?? []) as string[],
    };
    const [created] = await db
      .insert(smsTemplates)
      .values(values)
      .returning();
    return created;
  }

  async updateSmsTemplate(id: number, businessId: number, updates: Partial<SmsTemplate>): Promise<SmsTemplate | undefined> {
    const values: Partial<SmsTemplate> = {
      ...updates,
      ...(updates.variables ? { variables: updates.variables as string[] } : {}),
      updatedAt: new Date(),
    };
    const [updated] = await db
      .update(smsTemplates)
      .set(values)
      .where(and(eq(smsTemplates.id, id), eq(smsTemplates.businessId, businessId)))
      .returning();
    return updated || undefined;
  }

  async deleteSmsTemplate(id: number, businessId: number): Promise<boolean> {
    const result = await db
      .delete(smsTemplates)
      .where(and(eq(smsTemplates.id, id), eq(smsTemplates.businessId, businessId)));
    // drizzle returns { rowCount? } on pg; use >0 heuristic if available; otherwise assume success
    // @ts-ignore
    return (result?.rowCount ?? 1) > 0;
  }

  async getBusinessByEmail(email: string): Promise<Business | undefined> {
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.email, email));

    return business || undefined;
  }

  async getBusinessById(id: number): Promise<Business | undefined> {
    const [business] = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        email: businesses.email,
        passwordHash: businesses.passwordHash,
        webhookUrl: businesses.webhookUrl,
        ownerName: businesses.ownerName,
        phone: businesses.phone,
        businessType: businesses.businessType,
        googleReviewLink: businesses.googleReviewLink,
        selectedPhoneNumber: businesses.selectedPhoneNumber,
        twilioNumbers: businesses.twilioNumbers,
        twilioSid: businesses.twilioSid,
        preferredAreaCode: businesses.preferredAreaCode,
        businessZipCode: businesses.businessZipCode,
        forwardingNumber: businesses.forwardingNumber,
        enableForwarding: businesses.enableForwarding,
        websiteUrl: businesses.websiteUrl,
        isEarlyAccess: businesses.isEarlyAccess,
        stripeCustomerId: businesses.stripeCustomerId,
        subscriptionPlan: businesses.subscriptionPlan,
        subscriptionStatus: businesses.subscriptionStatus,
        createdAt: businesses.createdAt,
      })
      .from(businesses)
      .where(eq(businesses.id, id));

    return business || undefined;
  }

  async getBusinessByWebhookId(webhookId: string): Promise<Business | undefined> {
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.webhookUrl, webhookId));
    
    return business || undefined;
  }

  async getAllBusinesses(): Promise<Business[]> {
    return await db.select().from(businesses);
  }

  async updateBusiness(id: number, updates: Partial<Business>): Promise<Business | undefined> {
    const [business] = await db
      .update(businesses)
      .set(updates)
      .where(eq(businesses.id, id))
      .returning();

    return business || undefined;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const referralCode = `REF-${nanoid(8).toUpperCase()}`;

    const [newClient] = await db
      .insert(clients)
      .values({
        ...client,
        referralCode,
      })
      .returning();

    return newClient;
  }

  async updateClient(id: number, businessId: number, updates: Partial<Client>): Promise<Client | undefined> {
    const [updatedClient] = await db
      .update(clients)
      .set(updates)
      .where(and(eq(clients.id, id), eq(clients.businessId, businessId)))
      .returning();

    return updatedClient || undefined;
  }

  async getClientsByBusinessId(businessId: number): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(eq(clients.businessId, businessId))
      .orderBy(desc(clients.loyaltyScore));
  }

  async getClientByEmail(email: string, businessId: number): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.email, email), eq(clients.businessId, businessId)));

    return client || undefined;
  }

  async getClientById(id: number, businessId: number): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.businessId, businessId)));

    return client || undefined;
  }

  async getClientByReferralCode(referralCode: string, businessId: number): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.referralCode, referralCode),
        eq(clients.businessId, businessId)
      ));
    
    return client || undefined;
  }

  async getClientByReferralCodeGlobal(referralCode: string): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.referralCode, referralCode));
    
    return client || undefined;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [newBooking] = await db
      .insert(bookings)
      .values(booking)
      .returning();

    // Update client stats
    await this.updateClientStats(booking.clientId, booking.businessId);

    return newBooking;
  }

  async getBookingsByClientId(clientId: number, businessId: number): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.clientId, clientId), eq(bookings.businessId, businessId)))
      .orderBy(desc(bookings.serviceDate));
  }

  async getBookingsByBusinessId(businessId: number): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.businessId, businessId))
      .orderBy(desc(bookings.serviceDate));
  }

  private async updateClientStats(clientId: number, businessId: number): Promise<void> {
    // Get all bookings for this client
    const clientBookings = await this.getBookingsByClientId(clientId, businessId);

    if (clientBookings.length === 0) return;

    // Sort by date
    const sortedBookings = clientBookings.sort((a, b) => 
      new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime()
    );

    const firstBooking = sortedBookings[0].serviceDate;
    const lastBooking = sortedBookings[sortedBookings.length - 1].serviceDate;
    const totalBookings = clientBookings.length;

    // Calculate frequency (average days between bookings)
    let frequency = null;
    if (totalBookings > 1) {
      const totalDays = (new Date(lastBooking).getTime() - new Date(firstBooking).getTime()) / (1000 * 60 * 60 * 24);
      frequency = Math.round(totalDays / (totalBookings - 1));
    }

    // Calculate loyalty score (based on tenure and frequency)
    const tenureDays = (Date.now() - new Date(firstBooking).getTime()) / (1000 * 60 * 60 * 24);
    const tenureScore = Math.min(tenureDays / 365 * 5, 5); // Max 5 points for 1+ year
    const frequencyScore = frequency ? Math.max(5 - (frequency / 7), 0) : 0; // Higher score for more frequent
    const bookingScore = Math.min(totalBookings / 10 * 2, 2); // Max 2 points for 10+ bookings

    const loyaltyScore = (tenureScore + frequencyScore + bookingScore).toFixed(1);

    await db
      .update(clients)
      .set({
        firstBooking,
        lastBooking,
        totalBookings,
        frequency,
        loyaltyScore,
      })
      .where(eq(clients.id, clientId));
  }

  async createReferral(referral: InsertReferral): Promise<Referral> {
    const [newReferral] = await db
      .insert(referrals)
      .values(referral)
      .returning();

    return newReferral;
  }

  async getReferralsByBusinessId(businessId: number): Promise<Referral[]> {
    return await db
      .select()
      .from(referrals)
      .where(eq(referrals.businessId, businessId))
      .orderBy(desc(referrals.createdAt));
  }

  async updateReferral(id: number, businessId: number, updates: Partial<Referral>): Promise<Referral | undefined> {
    const [updatedReferral] = await db
      .update(referrals)
      .set(updates)
      .where(and(eq(referrals.id, id), eq(referrals.businessId, businessId)))
      .returning();

    return updatedReferral || undefined;
  }

  async checkAndMatchReferrals(businessId: number, clientEmail: string, clientPhone?: string | null): Promise<void> {
    // Find matching referrals by email first, then fallback to phone
    const matchingReferrals = await db
      .select()
      .from(referrals)
      .where(and(
        eq(referrals.businessId, businessId),
        eq(referrals.converted, false),
        or(
          eq(referrals.refereeEmail, clientEmail),
          clientPhone ? eq(referrals.refereePhone, clientPhone) : sql`false`
        )
      ));

    for (const referral of matchingReferrals) {
      // Mark the referral as converted
      await db
        .update(referrals)
        .set({
          converted: true,
          convertedAt: new Date(),
        })
        .where(eq(referrals.id, referral.id));

      // Mark the client as a referred client
      await db
        .update(clients)
        .set({
          isReferredClient: true,
          referralId: referral.id,
        })
        .where(and(
          eq(clients.businessId, businessId),
          eq(clients.email, clientEmail)
        ));
    }
  }

  async createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
    const [newLog] = await db
      .insert(webhookLogs)
      .values(log)
      .returning();

    return newLog;
  }

  async getWebhookLogs(businessId: number, limit: number = 50): Promise<WebhookLog[]> {
    return db
      .select()
      .from(webhookLogs)
      .where(eq(webhookLogs.businessId, businessId))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(limit);
  }

  async getBusinessStats(businessId: number): Promise<{
    totalClients: number;
    totalReferrals: number;
    avgLoyaltyScore: number;
    monthlyRevenue: number;
    activeReferrals: number;
    referralRevenue: number;
    monthlyReferralRevenue: number;
    monthlyConvertedBookings: number;
    totalConvertedBookings: number;
  }> {
    const [clientStats] = await db
      .select({
        totalClients: count(),
        avgLoyaltyScore: avg(clients.loyaltyScore),
      })
      .from(clients)
      .where(eq(clients.businessId, businessId));

    const [referralStats] = await db
      .select({
        totalReferrals: count(),
        activeReferrals: count(sql`CASE WHEN ${referrals.converted} = false THEN 1 END`),
      })
      .from(referrals)
      .where(eq(referrals.businessId, businessId));

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [revenueStats] = await db
      .select({
        monthlyRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${bookings.amount} ~ '^[0-9]+\.?[0-9]*$' THEN CAST(${bookings.amount} AS DECIMAL) ELSE 0 END), 0)`,
      })
      .from(bookings)
      .where(and(
        eq(bookings.businessId, businessId),
        sql`${bookings.serviceDate} >= ${thirtyDaysAgo.toISOString()}`
      ));

    // Calculate referral revenue from completed bookings by referred clients
    const [referralRevenueStats] = await db
      .select({
        referralRevenue: sql<number>`COALESCE(SUM(${bookings.amountCharged}), 0)`,
      })
      .from(bookings)
      .innerJoin(clients, eq(bookings.clientId, clients.id))
      .where(and(
        eq(bookings.businessId, businessId),
        eq(clients.isReferredClient, true),
        eq(bookings.status, "completed"),
        isNotNull(bookings.amountCharged)
      ));

    // Calculate monthly referral revenue from completed bookings by referred clients
    const [monthlyReferralStats] = await db
      .select({
        monthlyReferralRevenue: sql<number>`COALESCE(SUM(${bookings.amountCharged}), 0)`,
        monthlyConvertedBookings: count(),
      })
      .from(bookings)
      .innerJoin(clients, eq(bookings.clientId, clients.id))
      .where(and(
        eq(bookings.businessId, businessId),
        eq(clients.isReferredClient, true),
        eq(bookings.status, "completed"),
        isNotNull(bookings.amountCharged),
        sql`${bookings.serviceDate} >= ${thirtyDaysAgo.toISOString()}`
      ));

    // Count total converted bookings for all time referral revenue
    const [totalConvertedBookings] = await db
      .select({
        totalConvertedBookings: count(),
      })
      .from(bookings)
      .innerJoin(clients, eq(bookings.clientId, clients.id))
      .where(and(
        eq(bookings.businessId, businessId),
        eq(clients.isReferredClient, true),
        eq(bookings.status, "completed"),
        isNotNull(bookings.amountCharged)
      ));

    return {
      totalClients: clientStats?.totalClients || 0,
      totalReferrals: referralStats?.totalReferrals || 0,
      avgLoyaltyScore: parseFloat(clientStats?.avgLoyaltyScore || "0"),
      monthlyRevenue: parseFloat(String(revenueStats?.monthlyRevenue || "0")),
      activeReferrals: referralStats?.activeReferrals || 0,
      referralRevenue: parseFloat(String(referralRevenueStats?.referralRevenue || "0")),
      monthlyReferralRevenue: parseFloat(String(monthlyReferralStats?.monthlyReferralRevenue || "0")),
      monthlyConvertedBookings: monthlyReferralStats?.monthlyConvertedBookings || 0,
      totalConvertedBookings: totalConvertedBookings?.totalConvertedBookings || 0,
    };
  }

  async getTopReferrers(businessId: number, limit: number): Promise<Array<{
    client: Client;
    totalReferrals: number;
    convertedReferrals: number;
    conversionRate: number;
  }>> {
    const results = await db
      .select({
        client: clients,
        totalReferrals: count(referrals.id),
        convertedReferrals: count(sql`CASE WHEN ${referrals.converted} = true THEN 1 END`),
      })
      .from(clients)
      .leftJoin(referrals, eq(referrals.referrerCode, clients.referralCode))
      .where(eq(clients.businessId, businessId))
      .groupBy(clients.id)
      .having(sql`count(${referrals.id}) > 0`)
      .orderBy(desc(count(referrals.id)))
      .limit(limit);

    return results.map(result => ({
      client: result.client,
      totalReferrals: result.totalReferrals,
      convertedReferrals: result.convertedReferrals,
      conversionRate: result.totalReferrals > 0 ? (result.convertedReferrals / result.totalReferrals) * 100 : 0,
    }));
  }

  async getBookingTrends(businessId: number, days: number): Promise<Array<{
    date: string;
    count: number;
  }>> {
    // Calculate start date for the specified period
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    // Format dates for consistent comparison
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const results = await db
      .select({
        date: sql<string>`DATE(${bookings.serviceDate})`,
        count: count(),
      })
      .from(bookings)
      .where(and(
        eq(bookings.businessId, businessId),
        sql`DATE(${bookings.serviceDate}) >= ${startDateStr}`,
        sql`DATE(${bookings.serviceDate}) <= ${endDateStr}`
      ))
      .groupBy(sql`DATE(${bookings.serviceDate})`)
      .orderBy(sql`DATE(${bookings.serviceDate})`);

    // Fill in missing dates with zero counts for complete time series
    const dateMap = new Map<string, number>();
    results.forEach(result => {
      dateMap.set(result.date, result.count);
    });

    const completeTrends: Array<{ date: string; count: number }> = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      completeTrends.push({
        date: dateStr,
        count: dateMap.get(dateStr) || 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return completeTrends;
  }

  // SMS Outreach methods
  async getOutreachSettings(businessId: number): Promise<OutreachSettings | undefined> {
    const [settings] = await db
      .select()
      .from(outreachSettings)
      .where(eq(outreachSettings.businessId, businessId));
    return settings || undefined;
  }

  async createOutreachSettings(settings: InsertOutreachSettings): Promise<OutreachSettings> {
    const [result] = await db
      .insert(outreachSettings)
      .values(settings)
      .returning();
    return result;
  }

  async updateOutreachSettings(businessId: number, updates: Partial<OutreachSettings>): Promise<OutreachSettings | undefined> {
    const [result] = await db
      .update(outreachSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(outreachSettings.businessId, businessId))
      .returning();
    return result || undefined;
  }

  async createSmsLog(log: InsertSmsLog): Promise<SmsLog> {
    const [result] = await db
      .insert(smsLogs)
      .values(log)
      .returning();
    return result;
  }

  async getSmsLogs(businessId: number, limit: number = 50): Promise<SmsLog[]> {
    return await db
      .select()
      .from(smsLogs)
      .where(eq(smsLogs.businessId, businessId))
      .orderBy(desc(smsLogs.sentAt))
      .limit(limit);
  }

  async getSmsLogsByClient(clientId: number, businessId: number): Promise<SmsLog[]> {
    return await db
      .select()
      .from(smsLogs)
      .where(and(
        eq(smsLogs.clientId, clientId),
        eq(smsLogs.businessId, businessId)
      ))
      .orderBy(desc(smsLogs.sentAt));
  }

  async createCsvUploadLog(log: CsvUploadLog): Promise<CsvUploadLog> {
    const [created] = await db
      .insert(csvUploadLogs)
      .values(log)
      .returning();
    return created;
  }

  async getCsvUploadLogs(businessId: number, limit: number = 10): Promise<CsvUploadLog[]> {
    const logs = await db.select()
      .from(csvUploadLogs)
      .where(eq(csvUploadLogs.businessId, businessId))
      .orderBy(desc(csvUploadLogs.timestamp))
      .limit(limit);
    
    return logs;
  }

  // SMS Messages methods (comprehensive SMS handling)
  async createSmsMessage(message: InsertSmsMessage): Promise<SmsMessage> {
    const [result] = await db
      .insert(smsMessages)
      .values(message)
      .returning();
    return result;
  }

  async getSmsMessages(
    businessId: number, 
    direction?: 'inbound' | 'outbound', 
    limit: number = 100,
    offset: number = 0,
    search?: string,
    clientId?: number
  ): Promise<SmsMessage[]> {
    // Start building the query
    const query = db
      .select()
      .from(smsMessages)
      .where(and(
        eq(smsMessages.businessId, businessId),
        direction ? eq(smsMessages.direction, direction) : undefined,
        clientId ? eq(smsMessages.clientId, clientId) : undefined,
        search ? or(
          ilike(smsMessages.messageBody, `%${search}%`),
          ilike(smsMessages.fromNumber, `%${search}%`),
          ilike(smsMessages.toNumber, `%${search}%`)
        ) : undefined
      ))
      .orderBy(desc(sql`timestamp`))
      .limit(limit)
      .offset(offset);
    
    return await query;
  }

  async getSmsConversation(businessId: number, clientId: number): Promise<SmsMessage[]> {
    return await db
      .select()
      .from(smsMessages)
      .where(and(
        eq(smsMessages.businessId, businessId),
        eq(smsMessages.clientId, clientId)
      ))
      .orderBy(desc(sql`timestamp`));
  }

  async markSmsMessageAsRead(id: number, businessId: number): Promise<SmsMessage | undefined> {
    const [result] = await db
      .update(smsMessages)
      .set({ status: 'read' })
      .where(and(eq(smsMessages.id, id), eq(smsMessages.businessId, businessId)))
      .returning();
    return result || undefined;
  }

  async getUnreadSmsMessagesCount(businessId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(smsMessages)
      .where(and(
        eq(smsMessages.businessId, businessId), 
        eq(smsMessages.direction, 'inbound'),
        eq(smsMessages.status, 'unread')
      ));
    return result.count;
  }

  async getSmsMessageByTwilioSid(twilioSid: string): Promise<SmsMessage | undefined> {
    const [result] = await db
      .select()
      .from(smsMessages)
      .where(eq(smsMessages.twilioSid, twilioSid))
      .limit(1);
    return result || undefined;
  }

  async updateSmsMessage(id: number, updates: Partial<InsertSmsMessage>): Promise<SmsMessage | undefined> {
    const [result] = await db
      .update(smsMessages)
      .set(updates)
      .where(eq(smsMessages.id, id))
      .returning();
    return result || undefined;
  }


  // Referral Reward methods
  async createReferralReward(reward: InsertReferralReward): Promise<ReferralReward> {
    const [result] = await db
      .insert(referralRewards)
      .values(reward)
      .returning();
    return result;
  }

  async updateReferralReward(id: number, businessId: number, updates: Partial<ReferralReward>): Promise<ReferralReward | undefined> {
    const [result] = await db
      .update(referralRewards)
      .set(updates)
      .where(and(eq(referralRewards.id, id), eq(referralRewards.businessId, businessId)))
      .returning();
    return result || undefined;
  }

  async getReferralRewards(businessId: number, pendingOnly: boolean = false, limit: number = 50): Promise<Array<ReferralReward & { referral: Referral }>> {
    const whereConditions = pendingOnly 
      ? and(eq(referralRewards.businessId, businessId), eq(referralRewards.rewardGiven, false))
      : eq(referralRewards.businessId, businessId);

    return await db
      .select({
        id: referralRewards.id,
        businessId: referralRewards.businessId,
        referralId: referralRewards.referralId,
        rewardGiven: referralRewards.rewardGiven,
        rewardAmount: referralRewards.rewardAmount,
        notes: referralRewards.notes,
        markedAt: referralRewards.markedAt,
        referral: referrals
      })
      .from(referralRewards)
      .innerJoin(referrals, eq(referralRewards.referralId, referrals.id))
      .where(whereConditions)
      .orderBy(desc(referralRewards.markedAt))
      .limit(limit);
  }

  // Activity Log methods
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [result] = await db
      .insert(activityLogs)
      .values(log)
      .returning();
    return result;
  }

  async getActivityLogs(businessId: number, limit: number = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.businessId, businessId))
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
  }

  // Phone number management
  async updateBusinessPhoneNumbers(businessId: number, selectedPhone: string, availableNumbers: string[]): Promise<Business | undefined> {
    const [result] = await db
      .update(businesses)
      .set({ 
        selectedPhoneNumber: selectedPhone,
        twilioNumbers: availableNumbers
      })
      .where(eq(businesses.id, businessId))
      .returning();
    return result || undefined;
  }

  async getBusinessPhoneNumbers(businessId: number): Promise<{ selectedPhoneNumber: string | null, twilioNumbers: string[] }> {
    const [result] = await db
      .select({ 
        selectedPhoneNumber: businesses.selectedPhoneNumber,
        twilioNumbers: businesses.twilioNumbers
      })
      .from(businesses)
      .where(eq(businesses.id, businessId));
    
    return {
      selectedPhoneNumber: result?.selectedPhoneNumber || null,
      twilioNumbers: (result?.twilioNumbers as string[]) || []
    };
  }

  // Activities dashboard data
  async getRecentCompletedBookings(businessId: number, limit: number = 10): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(and(
        eq(bookings.businessId, businessId),
        eq(bookings.status, 'completed')
      ))
      .orderBy(desc(bookings.serviceDate))
      .limit(limit);
  }

  async getPendingReferrals(businessId: number, daysOld: number = 30): Promise<Array<Referral & { daysSinceShared: number; referrerClient: { id: number; name: string; email: string } | null }>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const results = await db
      .select({
        id: referrals.id,
        businessId: referrals.businessId,
        referrerCode: referrals.referrerCode,
        refereeName: referrals.refereeName,
        refereeEmail: referrals.refereeEmail,
        refereePhone: referrals.refereePhone,
        converted: referrals.converted,
        convertedAt: referrals.convertedAt,
        createdAt: referrals.createdAt,
        daysSinceShared: sql<number>`EXTRACT(DAY FROM NOW() - ${referrals.createdAt})`,
        referrerClient: sql<{id: number; name: string; email: string} | null>`
          CASE 
            WHEN ${clients.id} IS NOT NULL THEN 
              json_build_object('id', ${clients.id}, 'name', ${clients.name}, 'email', ${clients.email})
            ELSE NULL 
          END
        `
      })
      .from(referrals)
      .leftJoin(clients, eq(referrals.referrerCode, clients.referralCode))
      .where(and(
        eq(referrals.businessId, businessId),
        eq(referrals.converted, false),
        sql`${referrals.createdAt} >= ${cutoffDate}`
      ))
      .orderBy(desc(referrals.createdAt));

    return results;
  }

  async getReferralById(referralId: number, businessId: number): Promise<Referral | undefined> {
    const [result] = await db
      .select()
      .from(referrals)
      .where(and(
        eq(referrals.id, referralId),
        eq(referrals.businessId, businessId)
      ))
      .limit(1);

    return result || undefined;
  }

  async getRecentReferralConversions(businessId: number, days: number = 7): Promise<Array<Referral & { referralReward?: ReferralReward | null; referrerClient?: { id: number; name: string; email: string } | null }>> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const results = await db
      .select({
        id: referrals.id,
        businessId: referrals.businessId,
        referrerCode: referrals.referrerCode,
        refereeName: referrals.refereeName,
        refereeEmail: referrals.refereeEmail,
        refereePhone: referrals.refereePhone,
        converted: referrals.converted,
        convertedAt: referrals.convertedAt,
        createdAt: referrals.createdAt,
        referralReward: sql<ReferralReward | null>`
          CASE 
            WHEN ${referralRewards.id} IS NOT NULL THEN 
              json_build_object(
                'id', ${referralRewards.id}, 
                'businessId', ${referralRewards.businessId}, 
                'referralId', ${referralRewards.referralId}, 
                'rewardGiven', ${referralRewards.rewardGiven}, 
                'rewardAmount', ${referralRewards.rewardAmount}, 
                'notes', ${referralRewards.notes}, 
                'markedAt', ${referralRewards.markedAt}
              )
            ELSE NULL 
          END
        `,
        referrerClient: sql<{id: number; name: string; email: string} | null>`
          CASE 
            WHEN ${clients.id} IS NOT NULL THEN 
              json_build_object('id', ${clients.id}, 'name', ${clients.name}, 'email', ${clients.email})
            ELSE NULL 
          END
        `
      })
      .from(referrals)
      .leftJoin(referralRewards, eq(referrals.id, referralRewards.referralId))
      .leftJoin(clients, eq(referrals.referrerCode, clients.referralCode))
      .where(and(
        eq(referrals.businessId, businessId),
        eq(referrals.converted, true),
        sql`${referrals.convertedAt} >= ${cutoffDate}`
      ))
      .orderBy(desc(referrals.convertedAt));

    return results;
  }

  async getPendingReferralById(referralId: number, businessId: number) {
    const result = await db
      .select()
      .from(referrals)
      .where(and(
        eq(referrals.id, referralId),
        eq(referrals.businessId, businessId),
        eq(referrals.converted, false)
      ))
      .limit(1);

    return result[0] || null;
  }

  async getClient(clientId: number, businessId: number) {
    const result = await db
      .select()
      .from(clients)
      .where(and(
        eq(clients.id, clientId),
        eq(clients.businessId, businessId)
      ))
      .limit(1);

    return result[0] || null;
  }

  async logSms(smsData: {
    businessId: number;
    clientId: number | null;
    phoneNumber: string;
    message: string;
    messageType: string;
    twilioSid: string;
    status: string;
  }) {
    // Only log SMS if we have a valid client ID (skip logging for referral reminders to non-clients)
    if (!smsData.clientId) {
      console.log("Skipping SMS log for non-client message");
      return null;
    }

    const logData = {
      businessId: smsData.businessId,
      clientId: smsData.clientId,
      phoneNumber: smsData.phoneNumber,
      messageContent: smsData.message,
      messageType: smsData.messageType,
      twilioSid: smsData.twilioSid,
      status: smsData.status,
      sentAt: new Date()
    };

    const result = await db
      .insert(smsLogs)
      .values(logData)
      .returning();

    return result[0];
  }

  async getInsightsData(businessId: number): Promise<any> {
    try {
      // Get all completed bookings for the business
      const completedBookings = await db
        .select({
          id: bookings.id,
          clientId: bookings.clientId,
          serviceDate: bookings.serviceDate,
          amountCharged: bookings.amountCharged,
          status: bookings.status,
          createdAt: bookings.createdAt,
          client: {
            id: clients.id,
            name: clients.name,
            email: clients.email
          }
        })
        .from(bookings)
        .innerJoin(clients, eq(bookings.clientId, clients.id))
        .where(and(
          eq(bookings.businessId, businessId),
          eq(bookings.status, 'completed')
        ))
        .orderBy(desc(bookings.serviceDate));

      // Get all bookings including cancelled ones for cancellation rate
      const allBookings = await db
        .select({
          id: bookings.id,
          status: bookings.status,
          serviceDate: bookings.serviceDate,
          createdAt: bookings.createdAt
        })
        .from(bookings)
        .where(eq(bookings.businessId, businessId));

      if (completedBookings.length === 0) {
        return {
          hasData: false,
          totalBookings: allBookings.length,
          totalClients: 0
        };
      }

      // Calculate basic metrics
      const totalRevenue = completedBookings.reduce((sum, booking) => sum + (parseFloat(booking.amountCharged || '0') || 0), 0);
      const avgBookingValue = totalRevenue / completedBookings.length;

      // Group bookings by client
      const clientBookings = new Map<number, { client: any; bookings: any[] }>();
      completedBookings.forEach(booking => {
        if (!clientBookings.has(booking.clientId)) {
          clientBookings.set(booking.clientId, {
            client: booking.client,
            bookings: []
          });
        }
        clientBookings.get(booking.clientId)!.bookings.push(booking);
      });

      // Calculate repeat booking rate
      const clientsWithMultipleBookings = Array.from(clientBookings.values()).filter(
        clientData => clientData.bookings.length >= 2
      ).length;
      const repeatBookingRate = (clientsWithMultipleBookings / clientBookings.size) * 100;

      // Calculate average time between bookings for repeat clients
      let totalDaysBetweenBookings = 0;
      let timeBetweenBookingsCount = 0;
      
      const clientTimeBetweenBookings = new Map();

      Array.from(clientBookings.values()).forEach(clientData => {
        if (clientData.bookings.length >= 2) {
          const sortedBookings = clientData.bookings.sort((a: any, b: any) => 
            new Date(a.serviceDate).getTime() - new Date(b.serviceDate).getTime()
          );
          
          let clientTotalDays = 0;
          let clientIntervals = 0;
          
          for (let i = 1; i < sortedBookings.length; i++) {
            const daysBetween = Math.abs(
              new Date(sortedBookings[i].serviceDate).getTime() - 
              new Date(sortedBookings[i-1].serviceDate).getTime()
            ) / (1000 * 60 * 60 * 24);
            
            totalDaysBetweenBookings += daysBetween;
            clientTotalDays += daysBetween;
            timeBetweenBookingsCount++;
            clientIntervals++;
          }
          
          clientTimeBetweenBookings.set(
            clientData.client.id, 
            clientTotalDays / clientIntervals
          );
        }
      });

      const avgTimeBetweenBookings = timeBetweenBookingsCount > 0 
        ? totalDaysBetweenBookings / timeBetweenBookingsCount 
        : 0;

      // Find inactive but loyal clients (past their average rebooking interval by 20% or more)
      const now = new Date();
      const inactiveButLoyalClients: any[] = [];

      Array.from(clientBookings.values()).forEach(clientData => {
        if (clientData.bookings.length >= 2) {
          const avgInterval = clientTimeBetweenBookings.get(clientData.client.id);
          const lastBooking = clientData.bookings.reduce((latest: any, booking: any) => 
            new Date(booking.serviceDate) > new Date(latest.serviceDate) ? booking : latest
          );
          
          const daysSinceLastBooking = Math.floor(
            (now.getTime() - new Date(lastBooking.serviceDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          const overdueThreshold = avgInterval * 1.2; // 20% past average
          
          if (daysSinceLastBooking > overdueThreshold) {
            inactiveButLoyalClients.push({
              id: clientData.client.id,
              name: clientData.client.name,
              email: clientData.client.email,
              daysSinceLastBooking,
              avgTimeBetweenBookings: avgInterval,
              overdueByDays: Math.floor(daysSinceLastBooking - avgInterval),
              totalBookings: clientData.bookings.length
            });
          }
        }
      });

      // Calculate top clients by lifetime value
      const topClientsByLTV = Array.from(clientBookings.values())
        .map(clientData => ({
          id: clientData.client.id,
          name: clientData.client.name,
          email: clientData.client.email,
          totalRevenue: clientData.bookings.reduce((sum: number, booking: any) => 
            sum + (parseFloat(booking.amountCharged || '0') || 0), 0
          ),
          totalBookings: clientData.bookings.length
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Calculate weekly and monthly booking trends
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const bookingsThisWeek = completedBookings.filter(booking => 
        new Date(booking.serviceDate) >= oneWeekAgo
      ).length;
      
      const bookingsLastWeek = completedBookings.filter(booking => 
        new Date(booking.serviceDate) >= twoWeeksAgo && 
        new Date(booking.serviceDate) < oneWeekAgo
      ).length;
      
      const bookingsThisMonth = completedBookings.filter(booking => 
        new Date(booking.serviceDate) >= oneMonthAgo
      ).length;
      
      const bookingsLastMonth = completedBookings.filter(booking => 
        new Date(booking.serviceDate) >= twoMonthsAgo && 
        new Date(booking.serviceDate) < oneMonthAgo
      ).length;

      // Calculate cancellation rate
      const cancelledBookings = allBookings.filter(booking => 
        booking.status === 'cancelled'
      ).length;
      const cancellationRate = allBookings.length > 0 
        ? (cancelledBookings / allBookings.length) * 100 
        : 0;

      return {
        hasData: true,
        totalBookings: completedBookings.length,
        totalClients: clientBookings.size,
        
        // Customer Loyalty & Retention
        repeatBookingRate,
        avgTimeBetweenBookings,
        inactiveButLoyalClients: inactiveButLoyalClients.sort((a, b) => b.overdueByDays - a.overdueByDays),
        
        // Client Value Insights
        topClientsByLTV,
        avgBookingValue,
        
        // Operational Trends
        bookingsThisWeek,
        bookingsThisMonth,
        bookingsLastWeek,
        bookingsLastMonth,
        cancellationRate
      };
    } catch (error) {
      console.error('Error calculating insights:', error);
      return {
        hasData: false,
        totalBookings: 0,
        totalClients: 0,
        error: 'Failed to calculate insights'
      };
    }
  }
  // Password reset methods
  async createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [newToken] = await db
      .insert(passwordResetTokens)
      .values(token)
      .returning();
    return newToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [result] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        isNull(passwordResetTokens.usedAt),
        sql`${passwordResetTokens.expiresAt} > NOW()`
      ))
      .limit(1);
    return result || undefined;
  }

  async markPasswordResetTokenAsUsed(token: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.token, token));
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} < NOW() OR ${passwordResetTokens.usedAt} IS NOT NULL`);
  }

  async updateBusinessPassword(businessId: number, passwordHash: string): Promise<void> {
    await db
      .update(businesses)
      .set({ passwordHash })
      .where(eq(businesses.id, businessId));
  }

  // LEAD MANAGEMENT METHODS

  async createLead(lead: InsertLead): Promise<Lead> {
    const [newLead] = await db
      .insert(leads)
      .values(lead)
      .returning();
    return newLead;
  }

  async getLeadsByBusinessId(businessId: number): Promise<Lead[]> {
    return db
      .select()
      .from(leads)
      .where(eq(leads.businessId, businessId))
      .orderBy(desc(leads.createdAt));
  }

  async getLeadById(id: number, businessId: number): Promise<Lead | undefined> {
    const [lead] = await db
      .select()
      .from(leads)
      .where(and(eq(leads.id, id), eq(leads.businessId, businessId)));
    return lead || undefined;
  }

  async updateLeadStatus(id: number, businessId: number, status: string): Promise<Lead | undefined> {
    const [updatedLead] = await db
      .update(leads)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(leads.id, id), eq(leads.businessId, businessId)))
      .returning();
    return updatedLead || undefined;
  }

  async getLeadStats(businessId: number): Promise<{
    totalLeadsThisWeek: number;
    conversionRate: number;
    referralPercentage: number;
    topReferrers: Array<{ name: string; count: number }>;
  }> {
    // Get leads from the past week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [totalLeadsResult] = await db
      .select({ count: count() })
      .from(leads)
      .where(and(
        eq(leads.businessId, businessId),
        sql`${leads.createdAt} >= ${weekAgo}`
      ));

    const totalLeadsThisWeek = totalLeadsResult?.count || 0;

    // Calculate conversion rate
    const [totalLeads] = await db
      .select({ count: count() })
      .from(leads)
      .where(eq(leads.businessId, businessId));

    const [convertedLeads] = await db
      .select({ count: count() })
      .from(leads)
      .where(and(
        eq(leads.businessId, businessId),
        eq(leads.status, 'converted')
      ));

    const conversionRate = totalLeads.count > 0 
      ? Math.round((convertedLeads.count / totalLeads.count) * 100) 
      : 0;

    // Calculate referral percentage
    const [referralLeads] = await db
      .select({ count: count() })
      .from(leads)
      .where(and(
        eq(leads.businessId, businessId),
        eq(leads.source, 'referral')
      ));

    const referralPercentage = totalLeads.count > 0 
      ? Math.round((referralLeads.count / totalLeads.count) * 100) 
      : 0;

    // Get top referrers
    const topReferrersResult = await db
      .select({
        name: leads.referrerName,
        count: count()
      })
      .from(leads)
      .where(and(
        eq(leads.businessId, businessId),
        eq(leads.source, 'referral'),
        isNotNull(leads.referrerName)
      ))
      .groupBy(leads.referrerName)
      .orderBy(desc(count()))
      .limit(5);

    const topReferrers = topReferrersResult
      .filter(r => r.name)
      .map(r => ({ name: r.name as string, count: r.count }));

    return {
      totalLeadsThisWeek,
      conversionRate,
      referralPercentage,
      topReferrers
    };
  }

  // LEAD COMMUNICATION METHODS

  async createLeadCommunication(communication: InsertLeadCommunication): Promise<LeadCommunication> {
    const [newCommunication] = await db
      .insert(leadCommunications)
      .values(communication)
      .returning();
    return newCommunication;
  }

  async getLeadCommunications(leadId: number, businessId: number): Promise<LeadCommunication[]> {
    return db
      .select()
      .from(leadCommunications)
      .where(and(
        eq(leadCommunications.leadId, leadId),
        eq(leadCommunications.businessId, businessId)
      ))
      .orderBy(desc(leadCommunications.sentAt));
  }

  // FORM MANAGEMENT METHODS

  async createForm(form: InsertForm): Promise<Form> {
    const [newForm] = await db
      .insert(forms)
      .values(form)
      .returning();
    return newForm;
  }

  async getFormsByBusinessId(businessId: number): Promise<Form[]> {
    return db
      .select()
      .from(forms)
      .where(eq(forms.businessId, businessId))
      .orderBy(desc(forms.createdAt));
  }

  async getFormById(id: number, businessId: number): Promise<Form | undefined> {
    const [form] = await db
      .select()
      .from(forms)
      .where(and(eq(forms.id, id), eq(forms.businessId, businessId)));
    return form || undefined;
  }

  async getFormByEmbedToken(embedToken: string): Promise<Form | undefined> {
    const [form] = await db
      .select()
      .from(forms)
      .where(eq(forms.embedToken, embedToken));
    return form || undefined;
  }

  async updateForm(id: number, businessId: number, updates: Partial<Form>): Promise<Form | undefined> {
    const [updatedForm] = await db
      .update(forms)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(forms.id, id), eq(forms.businessId, businessId)))
      .returning();
    return updatedForm || undefined;
  }

  async deleteForm(id: number, businessId: number): Promise<boolean> {
    const result = await db
      .delete(forms)
      .where(and(eq(forms.id, id), eq(forms.businessId, businessId)));
    return (result.rowCount || 0) > 0;
  }

  async incrementFormSubmissions(formId: number): Promise<void> {
    await db
      .update(forms)
      .set({ 
        submissionCount: sql`${forms.submissionCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(forms.id, formId));
  }
}

export const storage = new DatabaseStorage();