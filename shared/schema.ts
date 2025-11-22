import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const businesses = pgTable("businesses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  webhookUrl: text("webhook_url").notNull().unique(),
  ownerName: text("owner_name"),
  phone: text("phone"),
  businessType: text("business_type"),
  googleReviewLink: text("google_review_link"),
  selectedPhoneNumber: text("selected_phone_number"), // Selected Twilio number for SMS
  twilioNumbers: jsonb("twilio_numbers"), // Array of available Twilio numbers
  twilioSid: text("twilio_sid"), // Twilio number SID
  preferredAreaCode: text("preferred_area_code"), // Business preferred area code
  businessZipCode: text("business_zip_code"), // Business ZIP code for local number assignment
  forwardingNumber: text("forwarding_number"), // Personal phone number for reply forwarding
  enableForwarding: boolean("enable_forwarding").default(true).notNull(), // Whether to forward client replies
  websiteUrl: text("website_url"), // Website URL for custom referral links
  isEarlyAccess: boolean("is_early_access").default(false).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionPlan: text("subscription_plan"),
  subscriptionStatus: text("subscription_status"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New: SMS Templates persisted per business
export const smsTemplates = pgTable("sms_templates", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  content: text("content").notNull(),
  variables: jsonb("variables").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"), // phone number for SMS
  referralCode: text("referral_code").notNull().unique(),
  referredBy: text("referred_by"),
  isReferredClient: boolean("is_referred_client").default(false).notNull(), // true if this client was referred
  referralId: integer("referral_id").references(() => referrals.id), // reference to the original referral
  firstBooking: timestamp("first_booking"),
  lastBooking: timestamp("last_booking"),
  totalBookings: integer("total_bookings").default(0).notNull(),
  frequency: integer("frequency_days"),
  loyaltyScore: decimal("loyalty_score", { precision: 3, scale: 1 }).default("0.0").notNull(),
  hasReward: boolean("has_reward").default(false).notNull(),
  rewardEarned: timestamp("reward_earned"),
  thankYouSent: timestamp("thank_you_sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  serviceDate: timestamp("service_date").notNull(),
  serviceType: text("service_type"),
  amount: text("amount"),
  status: text("status").default("pending"), // "pending", "completed", "cancelled"
  amountCharged: decimal("amount_charged", { precision: 10, scale: 2 }), // actual charged amount for completed bookings
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  referrerCode: text("referrer_code").notNull(),
  refereeName: text("referee_name").notNull(),
  refereeEmail: text("referee_email").notNull(),
  refereePhone: text("referee_phone"), // phone number for matching
  converted: boolean("converted").default(false).notNull(),
  convertedAt: timestamp("converted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull(), // 'success', 'error'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const outreachSettings = pgTable("outreach_settings", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }).unique(),
  twilioPhone: text("twilio_phone"), // Assigned phone number for this business
  referralDiscount: text("referral_discount").default("$25"),
  googleReviewLink: text("google_review_link"), // Google Business Profile review link
  customMessages: jsonb("custom_messages").default({
    referral: "Refer a friend and both get {referralDiscount}: {referralLink}",
    thankYou: "Thanks, {clientName}! We appreciate your business!",
    followUp: "Hi {clientName}, ready for another clean soon?",
    review: "Thanks again for choosing us, {clientName}! If you have a moment, we'd really appreciate a quick review: {googleReviewLink}"
  }),
  autoMessageSettings: jsonb("auto_message_settings").default({
    autoSendThankYou: true,
    autoSendFollowUp: true
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const smsLogs = pgTable("sms_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  phoneNumber: text("phone_number").notNull(),
  messageType: text("message_type").notNull(), // "referral", "thankYou", "followUp"
  messageContent: text("message_content").notNull(),
  status: text("status").default("sent"), // "sent", "delivered", "failed"
  twilioSid: text("twilio_sid"), // Twilio message SID for tracking
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const csvUploadLogs = pgTable("csv_upload_logs", {
  id: text("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  fileName: text("file_name").notNull(),
  rowsProcessed: integer("rows_processed").notNull(),
  rowsSkipped: integer("rows_skipped").notNull(),
  totalRows: integer("total_rows").notNull(),
  clientPreviews: jsonb("client_previews").default([]),
  errors: jsonb("errors").default([]),
  phoneStats: jsonb("phone_stats"),
});

export const smsMessages = pgTable("sms_messages", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }),
  direction: text("direction").notNull(), // "inbound" or "outbound"
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  messageBody: text("message_body").notNull(),
  messageType: text("message_type"), // "referral", "thank_you", "review_request", "reply", etc.
  twilioSid: text("twilio_sid").notNull().unique(),
  status: text("status").default("sent").notNull(), // "sent", "delivered", "failed", "unread", "read"
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const smsReplies = pgTable("sms_replies", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "cascade" }),
  fromNumber: text("from_number").notNull(), // Client's phone number
  toNumber: text("to_number").notNull(), // Business Twilio number
  messageBody: text("message_body").notNull(),
  twilioSid: text("twilio_sid").notNull().unique(),
  isRead: boolean("is_read").default(false).notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
});

export const referralRewards = pgTable("referral_rewards", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  referralId: integer("referral_id").notNull().references(() => referrals.id, { onDelete: "cascade" }),
  rewardGiven: boolean("reward_given").default(false).notNull(),
  rewardAmount: text("reward_amount"),
  notes: text("notes"),
  markedAt: timestamp("marked_at").defaultNow().notNull(),
});

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "booking_added", "sms_sent", "referral_converted", "client_created", etc.
  description: text("description").notNull(),
  metadata: jsonb("metadata").default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const smsReplyContext = pgTable("sms_reply_context", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  clientPhone: text("client_phone").notNull(),
  forwardingNumber: text("forwarding_number").notNull(),
  twilioNumber: text("twilio_number").notNull(),
  lastMessageId: text("last_message_id"), // Twilio SID of the last forwarded message
  expiresAt: timestamp("expires_at").notNull(), // 60 minutes from creation
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const forms = pgTable("forms", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  fields: jsonb("fields").notNull(), // Array of field configurations
  isActive: boolean("is_active").default(true).notNull(),
  submissionCount: integer("submission_count").default(0).notNull(),
  embedToken: text("embed_token").notNull().unique(), // Unique token for embedding
  styles: jsonb("styles").default('{"font":"Inter","primaryColor":"#667eea","textColor":"#374151","backgroundColor":"#ffffff","buttonShape":"rounded","fieldBorderStyle":"boxed","theme":"modern","spacing":"comfortable","borderRadius":"8px","shadowLevel":"subtle","gradientStyle":"none","containerWidth":"full","fieldSize":"medium","buttonStyle":"solid","trustElements":true,"privacyText":"We respect your privacy and will never spam you."}'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  source: text("source").notNull(), // "referral", "website", "manual", "form"
  referrerCode: text("referrer_code"), // If from referral
  referrerName: text("referrer_name"), // If from referral
  status: text("status").default("new").notNull(), // "new", "contacted", "converted", "lost"
  notes: text("notes"),
  formId: integer("form_id").references(() => forms.id), // If from form submission
  customFields: jsonb("custom_fields").default({}),
  smsOptIn: boolean("sms_opt_in").default(false).notNull(), // SMS marketing consent
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leadCommunications = pgTable("lead_communications", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id").notNull().references(() => businesses.id, { onDelete: "cascade" }),
  leadId: integer("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "sms", "email", "note"
  direction: text("direction").notNull(), // "outbound", "inbound"
  content: text("content").notNull(),
  status: text("status").default("sent"), // "sent", "delivered", "failed", "read"
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

// Relations
export const businessesRelations = relations(businesses, ({ one, many }) => ({
  clients: many(clients),
  bookings: many(bookings),
  referrals: many(referrals),
  webhookLogs: many(webhookLogs),
  outreachSettings: one(outreachSettings),
  smsLogs: many(smsLogs),
  csvUploadLogs: many(csvUploadLogs),
  smsReplies: many(smsReplies),
  referralRewards: many(referralRewards),
  activityLogs: many(activityLogs),
  smsReplyContext: many(smsReplyContext),
  passwordResetTokens: many(passwordResetTokens),
  leads: many(leads),
  forms: many(forms),
  leadCommunications: many(leadCommunications),
}));

export const smsTemplatesRelations = relations(smsTemplates, ({ one }) => ({
  business: one(businesses, {
    fields: [smsTemplates.businessId],
    references: [businesses.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  business: one(businesses, {
    fields: [clients.businessId],
    references: [businesses.id],
  }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  business: one(businesses, {
    fields: [bookings.businessId],
    references: [businesses.id],
  }),
  client: one(clients, {
    fields: [bookings.clientId],
    references: [clients.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  business: one(businesses, {
    fields: [referrals.businessId],
    references: [businesses.id],
  }),
}));

export const webhookLogsRelations = relations(webhookLogs, ({ one }) => ({
  business: one(businesses, {
    fields: [webhookLogs.businessId],
    references: [businesses.id],
  }),
}));

export const outreachSettingsRelations = relations(outreachSettings, ({ one }) => ({
  business: one(businesses, {
    fields: [outreachSettings.businessId],
    references: [businesses.id],
  }),
}));

export const smsLogsRelations = relations(smsLogs, ({ one }) => ({
  business: one(businesses, {
    fields: [smsLogs.businessId],
    references: [businesses.id],
  }),
  client: one(clients, {
    fields: [smsLogs.clientId],
    references: [clients.id],
  }),
}));

export const csvUploadLogsRelations = relations(csvUploadLogs, ({ one }) => ({
  business: one(businesses, {
    fields: [csvUploadLogs.businessId],
    references: [businesses.id],
  }),
}));

export const smsMessagesRelations = relations(smsMessages, ({ one }) => ({
  business: one(businesses, {
    fields: [smsMessages.businessId],
    references: [businesses.id],
  }),
  client: one(clients, {
    fields: [smsMessages.clientId],
    references: [clients.id],
  }),
}));

export const smsRepliesRelations = relations(smsReplies, ({ one }) => ({
  business: one(businesses, {
    fields: [smsReplies.businessId],
    references: [businesses.id],
  }),
  client: one(clients, {
    fields: [smsReplies.clientId],
    references: [clients.id],
  }),
}));

export const referralRewardsRelations = relations(referralRewards, ({ one }) => ({
  business: one(businesses, {
    fields: [referralRewards.businessId],
    references: [businesses.id],
  }),
  referral: one(referrals, {
    fields: [referralRewards.referralId],
    references: [referrals.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  business: one(businesses, {
    fields: [activityLogs.businessId],
    references: [businesses.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  business: one(businesses, {
    fields: [passwordResetTokens.businessId],
    references: [businesses.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  business: one(businesses, {
    fields: [leads.businessId],
    references: [businesses.id],
  }),
  form: one(forms, {
    fields: [leads.formId],
    references: [forms.id],
  }),
  communications: many(leadCommunications),
}));

export const formsRelations = relations(forms, ({ one, many }) => ({
  business: one(businesses, {
    fields: [forms.businessId],
    references: [businesses.id],
  }),
  leads: many(leads),
}));

export const leadCommunicationsRelations = relations(leadCommunications, ({ one }) => ({
  business: one(businesses, {
    fields: [leadCommunications.businessId],
    references: [businesses.id],
  }),
  lead: one(leads, {
    fields: [leadCommunications.leadId],
    references: [leads.id],
  }),
}));

// Insert schemas
export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  webhookUrl: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  referralCode: true,
  createdAt: true,
  totalBookings: true,
  loyaltyScore: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  converted: true,
  convertedAt: true,
});

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({
  id: true,
  createdAt: true,
});

export const insertOutreachSettingsSchema = createInsertSchema(outreachSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSmsMessageSchema = createInsertSchema(smsMessages).omit({
  id: true,
  timestamp: true,
});

export const insertSmsLogSchema = createInsertSchema(smsLogs).omit({
  id: true,
  sentAt: true,
});

export const insertCsvUploadLogSchema = createInsertSchema(csvUploadLogs).omit({
  timestamp: true,
});

export const insertSmsReplySchema = createInsertSchema(smsReplies).omit({
  id: true,
  receivedAt: true,
});

export const insertSmsTemplateSchema = createInsertSchema(smsTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReferralRewardSchema = createInsertSchema(referralRewards).omit({
  id: true,
  markedAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  timestamp: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submissionCount: true,
});

export const insertLeadCommunicationSchema = createInsertSchema(leadCommunications).omit({
  id: true,
  sentAt: true,
});

// Types
export type Business = typeof businesses.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type OutreachSettings = typeof outreachSettings.$inferSelect;
export type InsertOutreachSettings = z.infer<typeof insertOutreachSettingsSchema>;
export type SmsLog = typeof smsLogs.$inferSelect;
export type InsertSmsLog = z.infer<typeof insertSmsLogSchema>;
export type CsvUploadLog = typeof csvUploadLogs.$inferSelect;
export type InsertCsvUploadLog = z.infer<typeof insertCsvUploadLogSchema>;
export type SmsMessage = typeof smsMessages.$inferSelect;
export type InsertSmsMessage = z.infer<typeof insertSmsMessageSchema>;
export type SmsReply = typeof smsReplies.$inferSelect;
export type InsertSmsReply = z.infer<typeof insertSmsReplySchema>;
export type SmsTemplate = typeof smsTemplates.$inferSelect;
export type InsertSmsTemplate = z.infer<typeof insertSmsTemplateSchema>;
export type ReferralReward = typeof referralRewards.$inferSelect;
export type InsertReferralReward = z.infer<typeof insertReferralRewardSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Form = typeof forms.$inferSelect;
export type InsertForm = z.infer<typeof insertFormSchema>;
export type LeadCommunication = typeof leadCommunications.$inferSelect;
export type InsertLeadCommunication = z.infer<typeof insertLeadCommunicationSchema>;

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signupSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type LoginData = z.infer<typeof loginSchema>;
export type SignupData = z.infer<typeof signupSchema>;
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
