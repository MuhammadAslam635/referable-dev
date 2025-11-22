import { response, type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { z } from "zod";
import {
  loginSchema,
  signupSchema,
  insertClientSchema,
  insertBookingSchema,
  insertOutreachSettingsSchema,
  insertSmsLogSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  insertLeadSchema,
  insertFormSchema,
  insertLeadCommunicationSchema,
  businesses,
  insertSmsTemplateSchema,
} from "@shared/schema";
import { and, asc, count, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { db } from "./db";
import { smsMessages } from "@shared/schema";

type Business = typeof businesses.$inferSelect;
import rateLimit from "express-rate-limit";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";
import {
  sendSms,
  formatPhoneNumber,
  validatePhoneNumber,
  autoAssignLocalNumber,
  getOwnedNumbers,
  renderMessageTemplate,
} from "./twilio-service";
import { logCsvUpload } from "./csv-upload-logger";
import { processBulkCompletedBookings } from "./auto-sms-service";
import { logEvent, getEvents } from "./event-logger";
import { handleSmsWebhook } from "./sms-webhook-handler";
import { sendPasswordResetEmail, sendWelcomeEmail } from "./email-service";
import { getTwilioWebhookConfig, logWebhookConfig } from "./webhook-config";
import * as XLSX from "xlsx";
import { nanoid } from "nanoid";
import { createCheckoutSession, createPortalSession } from "./stripe";

// Phone number utility functions for CSV processing
function normalizePhoneNumber(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Handle different formats
  if (digits.length === 10) {
    // US number without country code
    return `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    // US number with country code
    return `+${digits}`;
  } else if (digits.length >= 10) {
    // International number
    return `+${digits}`;
  }

  return null; // Invalid format
}

function validatePhoneForCsv(phone: string): boolean {
  if (!phone) return false;
  // Basic validation for international format
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

// Field aliasing system for flexible webhook data mapping
function getField(payload: any, aliases: string[]): any {
  for (const alias of aliases) {
    // Check direct property access
    if (
      payload[alias] !== undefined &&
      payload[alias] !== null &&
      payload[alias] !== ""
    ) {
      return payload[alias];
    }

    // Check case-insensitive property access
    const lowerAlias = alias.toLowerCase();
    for (const key of Object.keys(payload)) {
      if (
        key.toLowerCase() === lowerAlias &&
        payload[key] !== null &&
        payload[key] !== ""
      ) {
        return payload[key];
      }
    }

    // Check nested object access (e.g., payload.client.name)
    const parts = alias.split(".");
    let value = payload;
    let found = true;

    for (const part of parts) {
      if (value && typeof value === "object" && value[part] !== undefined) {
        value = value[part];
      } else {
        found = false;
        break;
      }
    }

    if (found && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

// Extend session interface
declare module "express-session" {
  interface SessionData {
    businessId: number;
  }
}

// PostgreSQL session store for persistence across restarts
const PgSession = connectPgSimple(session);

const sessionMiddleware = session({
  store: new PgSession({
    pool: pool,
    tableName: "session", // This table will be auto-created
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
  name: "sessionId",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: "lax",
  },
});

// Rate limiting for webhooks
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each business to 100 requests per windowMs
  message: "Too many webhook requests",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 authentication attempts per windowMs
  message: "Too many authentication attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful authentication attempts
});

// Multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const allowedExtensions = [".csv", ".xlsx", ".xls"];

    if (
      allowedTypes.includes(file.mimetype) ||
      allowedExtensions.some((ext) =>
        file.originalname.toLowerCase().endsWith(ext)
      )
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV and Excel files are allowed"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // Increased to 10MB for Excel files
  },
});

// Auth middleware
const requireAuth = async (req: any, res: any, next: any) => {
  console.log(
    "Auth check - Session ID:",
    req.sessionID,
    "Business ID:",
    req.session?.businessId
  );

  if (!req.session?.businessId) {
    console.log("No business ID in session");
    return res.status(401).json({ message: "Authentication required" });
  }

  const business = await storage.getBusinessById(req.session.businessId);
  if (!business) {
    console.log("Business not found for ID:", req.session.businessId);
    return res.status(401).json({ message: "Invalid session" });
  }
  req.business = business;
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(sessionMiddleware);

  // Signup route
  app.post("/api/auth/early-access-signup", async (req, res) => {
    try {
      console.log("Received signup request:", req.body);

      const { name, email, phone, businessName, businessType, password } =
        req.body;

      // Validate required fields
      if (!name || !email || !phone || !businessName || !businessType) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if business already exists
      const existing = await storage.getBusinessByEmail(email);
      if (existing) {
        return res
          .status(400)
          .json({ message: "Business already exists with this email" });
      }

      // Hash the password before storing
      const passwordHash = await bcrypt.hash(password, 10);

      const businessData = {
        name: businessName,
        email: email,
        passwordHash,
        ownerName: name,
        phone: phone,
        businessType: businessType,
        isEarlyAccess: false,
      };

      const business = await storage.createBusiness(businessData);
      req.session.businessId = business.id;

      // Log business signup event
      await logEvent(business.id.toString(), "business_signup", {
        business_name: businessName,
        business_type: businessType,
        owner_name: name,
        signup_method: "landing_page",
      });

      console.log("Business created successfully:", business.id);

      res.json({
        business: {
          id: business.id,
          name: business.name,
          email: business.email,
          webhookUrl: business.webhookUrl,
        },
      });
    } catch (error) {
      console.error("Early access signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Authentication routes
  app.post("/api/auth/signup", authLimiter, async (req, res) => {
    try {
      console.log("Received signup request:", req.body);
      const data = signupSchema.parse(req.body);

      // Check if business already exists
      const existing = await storage.getBusinessByEmail(data.email);
      if (existing) {
        return res
          .status(400)
          .json({ message: "Business already exists with this email" });
      }

      // Hash the password before storing
      const passwordHash = await bcrypt.hash(data.password, 10);

      const businessData = {
        name: data.name,
        email: data.email,
        passwordHash,
      };

      const business = await storage.createBusiness(businessData);
      req.session.businessId = business.id;

      console.log("Business created successfully:", business.id);

      // Send welcome email
      try {
        const emailResult = await sendWelcomeEmail(
          business.email,
          business.name
        );

        if (emailResult.success) {
          console.log(`Welcome email sent successfully to ${business.email}`);
        } else {
          console.warn(
            `Failed to send welcome email to ${business.email}: ${emailResult.error}`
          );
        }
      } catch (emailError) {
        console.error(`Email service error for ${business.email}:`, emailError);
      }

      // Log business signup event
      await logEvent(business.id.toString(), "business_signup", {
        business_name: business.name,
        business_email: business.email,
        signup_method: "direct",
      });

      res.json({
        business: {
          id: business.id,
          name: business.name,
          email: business.email,
          webhookUrl: business.webhookUrl,
          created: business.createdAt,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log("Validation error:", error.errors);
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      console.error("Signup error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      console.log("Login attempt:", {
        email: req.body.email,
        hasPassword: !!req.body.password,
      });
      const { email, password } = loginSchema.parse(req.body);

      const business = await storage.getBusinessByEmail(email);
      console.log("Business found:", business);
      if (!business) {
        console.log("Business not found for email:", email);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, business.passwordHash);
      if (!isValid) {
        console.log("Invalid password for business:", business.id);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.businessId = business.id;
      console.log(
        "Session set for business:",
        business.id,
        "Session ID:",
        req.sessionID
      );

      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
        } else {
          console.log("Session saved successfully");
        }
      });

      res.json({
        business: {
          id: business.id,
          name: business.name,
          email: business.email,
          webhookUrl: business.webhookUrl,
          created: business.createdAt,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, (req: any, res) => {
    res.json({
      business: {
        id: req.business.id,
        name: req.business.name,
        email: req.business.email,
        webhookUrl: req.business.webhookUrl,
        createdAt: req.business.createdAt,
      },
    });
  });

  // Password reset routes
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);

      // Check if business exists
      const business = await storage.getBusinessByEmail(email);
      if (!business) {
        // Always return success to prevent email enumeration
        return res.json({
          message:
            "If an account exists with this email, a reset link has been sent.",
        });
      }

      // Generate reset token
      const resetToken = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

      await storage.createPasswordResetToken({
        businessId: business.id,
        token: resetToken,
        expiresAt,
        usedAt: null,
      });

      // Send password reset email
      const baseUrl = process.env.FRONTEND_URL || "https://referable.live";
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

      try {
        const emailResult = await sendPasswordResetEmail(
          email,
          resetLink,
          business.name
        );

        if (emailResult.success) {
          console.log(`Password reset email sent successfully to ${email}`);
        } else {
          console.warn(
            `Failed to send password reset email to ${email}: ${emailResult.error}`
          );
          // Still log the reset link for development
          console.log(`Password reset link for ${email}: ${resetLink}`);
        }
      } catch (emailError) {
        console.error(`Email service error for ${email}:`, emailError);
        // Still log the reset link for development
        console.log(`Password reset link for ${email}: ${resetLink}`);
      }

      // Log event
      await logEvent(business.id.toString(), "password_reset_requested", {
        email: business.email,
        token_id: resetToken.substring(0, 8) + "...", // Only log partial token for security
      });

      res.json({
        message:
          "If an account exists with this email, a reset link has been sent.",
        // Include the reset link in development for testing
        ...(process.env.NODE_ENV === "development" && { resetLink }),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);

      // Find and validate reset token
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res
          .status(400)
          .json({ message: "Invalid or expired reset token" });
      }

      // Hash the new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update business password
      await storage.updateBusinessPassword(resetToken.businessId, passwordHash);

      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(token);

      // Log event
      await logEvent(
        resetToken.businessId.toString(),
        "password_reset_completed",
        {
          token_id: token.substring(0, 8) + "...", // Only log partial token for security
        }
      );

      res.json({ message: "Password reset successful" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/auth/verify-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;

      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res
          .status(400)
          .json({ valid: false, message: "Invalid or expired reset token" });
      }

      res.json({ valid: true, message: "Token is valid" });
    } catch (error) {
      console.error("Verify reset token error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Business profile endpoint with SMS data
  app.get("/api/business/profile", requireAuth, async (req: any, res) => {
    try {
      const business = await storage.getBusinessById(req.business.id);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      res.json({
        id: business.id,
        name: business.name,
        email: business.email,
        webhookUrl: business.webhookUrl,
        googleReviewLink: business.googleReviewLink,
        twilioPhoneNumber: business.selectedPhoneNumber,
        preferredAreaCode: business.preferredAreaCode,
        businessZipCode: business.businessZipCode,
        websiteUrl: business.websiteUrl,
        stripeCustomerId: business.stripeCustomerId,
        subscriptionPlan: business.subscriptionPlan,
        subscriptionStatus: business.subscriptionStatus,
        createdAt: business.createdAt,
      });
    } catch (error) {
      console.error("Error fetching business profile:", error);
      res.status(500).json({ message: "Failed to fetch business profile" });
    }
  });

  // Update business profile endpoint
  app.patch("/api/business/profile", requireAuth, async (req: any, res) => {
    try {
      const { name, email, websiteUrl } = req.body;

      // Validate websiteUrl if provided
      if (websiteUrl && websiteUrl.trim() !== "") {
        try {
          const url = new URL(websiteUrl);
          if (url.protocol !== "https:") {
            return res
              .status(400)
              .json({ message: "Website URL must use HTTPS" });
          }
        } catch {
          return res
            .status(400)
            .json({ message: "Invalid website URL format" });
        }
      }

      const updates: Partial<Business> = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (websiteUrl !== undefined)
        updates.websiteUrl = websiteUrl.trim() === "" ? null : websiteUrl;

      const updatedBusiness = await storage.updateBusiness(
        req.business.id,
        updates
      );

      if (!updatedBusiness) {
        return res.status(404).json({ message: "Business not found" });
      }

      res.json({
        id: updatedBusiness.id,
        name: updatedBusiness.name,
        email: updatedBusiness.email,
        webhookUrl: updatedBusiness.webhookUrl,
        googleReviewLink: updatedBusiness.googleReviewLink,
        twilioPhoneNumber: updatedBusiness.selectedPhoneNumber,
        preferredAreaCode: updatedBusiness.preferredAreaCode,
        businessZipCode: updatedBusiness.businessZipCode,
        websiteUrl: updatedBusiness.websiteUrl,
      });
    } catch (error) {
      console.error("Error updating business profile:", error);
      res.status(500).json({ message: "Failed to update business profile" });
    }
  });

  // SMS Management Routes
  app.post(
    "/api/sms/assign-local-number",
    requireAuth,
    async (req: any, res) => {
      try {
        const twilio = (await import("twilio")).default;
        const {
          preferredAreaCode,
          businessZipCode,
          forwardingNumber,
          enableForwarding,
        } = req.body;

        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );

        // Search for numbers in priority order
        let areaCode = preferredAreaCode;
        if (!areaCode && businessZipCode) {
          // Simple ZIP to area code mapping for demo
          const zipMappings: { [key: string]: string } = {
            "15201": "412",
            "15202": "412",
            "15203": "412", // Pittsburgh
            "90210": "310",
            "90211": "310",
            "90212": "310", // Beverly Hills
            "60601": "312",
            "60602": "312",
            "60603": "312", // Chicago
            "94101": "415",
            "94102": "415",
            "94103": "415", // San Francisco
          };
          areaCode = zipMappings[businessZipCode.substring(0, 5)];
        }

        // Search for available SMS-enabled numbers
        const searchOptions: any = { smsEnabled: true, limit: 1 };
        if (areaCode) {
          searchOptions.areaCode = parseInt(areaCode);
        }

        const numbers = await client
          .availablePhoneNumbers("US")
          .local.list(searchOptions);

        if (numbers.length === 0) {
          return res
            .status(400)
            .json({
              message: "No SMS-enabled numbers available in requested area",
            });
        }

        // Purchase the first available number with full webhook configuration
        const phoneNumber = numbers[0].phoneNumber;
        const webhookConfig = getTwilioWebhookConfig();
        logWebhookConfig(); // Log webhook URLs for debugging

        const purchaseResult = await client.incomingPhoneNumbers.create({
          phoneNumber: phoneNumber,
          ...webhookConfig
        });

        // Normalize forwarding number if provided
        let normalizedForwardingNumber = null;
        if (enableForwarding && forwardingNumber) {
          normalizedForwardingNumber = normalizePhoneNumber(forwardingNumber);
        }

        // Update business record with SMS settings and forwarding
        await storage.updateBusiness(req.business.id, {
          selectedPhoneNumber: phoneNumber,
          twilioSid: purchaseResult.sid,
          preferredAreaCode: preferredAreaCode || null,
          businessZipCode: businessZipCode || null,
          forwardingNumber: normalizedForwardingNumber,
          enableForwarding: enableForwarding || false,
        });

        res.json({
          success: true,
          twilioPhoneNumber: phoneNumber,
          forwardingEnabled: enableForwarding,
          forwardingNumber: normalizedForwardingNumber,
          message: "SMS number assigned successfully",
        });
      } catch (error) {
        console.error("Error assigning SMS number:", error);
        res.status(500).json({ message: "Failed to assign SMS number" });
      }
    }
  );

  // Get paginated SMS conversations for a business
  app.get("/api/sms/conversations", requireAuth, async (req: any, res) => {
    try {
      // Parse pagination parameters with defaults
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per page
      const offset = (page - 1) * limit;

      // Get total count of unique conversations
      const totalCountResult = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${smsMessages.clientId})` })
        .from(smsMessages)
        .where(eq(smsMessages.businessId, req.business.id))
        .execute();

      const total = totalCountResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);

      // Get paginated unique client IDs with their last message time
      const clientMessages = await db
        .select({
          clientId: smsMessages.clientId,
          lastMessage: sql<Date>`MAX(${smsMessages.timestamp})`,
        })
        .from(smsMessages)
        .where(eq(smsMessages.businessId, req.business.id))
        .groupBy(smsMessages.clientId)
        .orderBy(desc(sql`MAX(${smsMessages.timestamp})`))
        .limit(limit)
        .offset(offset);

      // For each client in the current page, get their conversation
      const conversations = await Promise.all(
        clientMessages.map(async ({ clientId }) => {
          if (!clientId) return null;

          // Get the client details
          const client = await storage.getClientById(clientId, req.business.id);
          if (!client) return null;

          // Get all messages for this conversation
          const messages = await storage.getSmsMessages(
            req.business.id,
            undefined, // direction
            1000, // limit
            0, // offset
            undefined, // search
            clientId // clientId
          );

          // Sort messages by timestamp in descending order (newest first)
          messages.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          if (messages.length === 0) return null;

          // Count unread messages (status === 'received' for inbound messages)
          const unreadCount = messages.filter(
            (m) => m.direction === "inbound" && m.status === "received"
          ).length;

          return {
            clientId,
            client: {
              id: client.id,
              name: client.name || "Unknown",
              phone: client.phone || "Unknown",
            },
            unreadCount,
            lastMessage: messages[0], // Most recent message first
            recentMessages: messages,
            unreadMessageIds: messages
              .filter(
                (m) => m.direction === "inbound" && m.status === "received"
              )
              .map((m) => m.id),
          };
        })
      );

      // Filter out any null conversations
      const validConversations = conversations.filter(Boolean);

      // Return paginated response
      res.json({
        data: validConversations,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error("Error fetching SMS conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // app.get("/api/sms/messages", requireAuth, async (req: any, res) => {
  //   try {
  //     // Return empty messages for now - will implement later
  //     res.json([]);
  //   } catch (error) {
  //     console.error("Error fetching SMS messages:", error);
  //     res.status(500).json({ message: "Failed to fetch messages" });
  //   }
  // });

  // ===== SMS Templates (Persistent) =====
  app.get("/api/sms/templates", requireAuth, async (req: any, res) => {
    try {
      const templates = await storage.getSmsTemplates(req.business.id);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching SMS templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/sms/templates", requireAuth, async (req: any, res) => {
    try {
      const { name, content } = req.body;
      const data = insertSmsTemplateSchema
        .pick({ name: true, content: true })
        .parse({ name, content });

      // Extract variables like {clientName} from content
      const regex = /\{([^}]+)\}/g;
      const vars = new Set<string>();
      let match;
      while ((match = regex.exec(data.content)) !== null) {
        vars.add(match[1]);
      }

      const created = await storage.createSmsTemplate({
        businessId: req.business.id,
        name: data.name,
        content: data.content,
        variables: Array.from(vars),
      } as any);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating SMS template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.patch("/api/sms/templates/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { name, content } = req.body;
      const updates: any = {};
      if (typeof name === "string") updates.name = name;
      if (typeof content === "string") {
        updates.content = content;
        // Recompute variables from content
        const regex = /\{([^}]+)\}/g;
        const vars = new Set<string>();
        let match;
        while ((match = regex.exec(content)) !== null) {
          vars.add(match[1]);
        }
        updates.variables = Array.from(vars);
      }

      const updated = await storage.updateSmsTemplate(
        id,
        req.business.id,
        updates
      );
      if (!updated)
        return res.status(404).json({ message: "Template not found" });
      res.json(updated);
    } catch (error) {
      console.error("Error updating SMS template:", error);
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/sms/templates/:id", requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const ok = await storage.deleteSmsTemplate(id, req.business.id);
      if (!ok) return res.status(404).json({ message: "Template not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting SMS template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Debug endpoint to check Twilio configuration
  app.get("/api/debug/twilio-config", (req, res) => {
    const hasSid = !!process.env.TWILIO_ACCOUNT_SID;
    const hasToken = !!process.env.TWILIO_AUTH_TOKEN;

    return res.json({
      twilioConfigured: hasSid && hasToken,
      hasAccountSid: hasSid,
      hasAuthToken: hasToken,
      // hasPhoneNumber: hasPhoneNumber,
      nodeEnv: process.env.NODE_ENV,
      // Don't expose actual values in production
      accountSid:
        process.env.NODE_ENV === "development"
          ? process.env.TWILIO_ACCOUNT_SID
          : "[REDACTED]",
      authToken:
        process.env.NODE_ENV === "development"
          ? process.env.TWILIO_AUTH_TOKEN
            ? "***"
            : ""
          : "[REDACTED]",
    });
  });

  // Stripe routes
  app.post(
    "/api/stripe/create-checkout-session",
    requireAuth,
    async (req: any, res) => {
      try {
        const { priceId } = req.body;
        if (!priceId) {
          return res.status(400).json({ message: "priceId is required" });
        }
        const session = await createCheckoutSession(req.business.id, priceId);
        res.json({ url: session.url });
      } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).json({ message: "Failed to create checkout session" });
      }
    }
  );

  app.post(
    "/api/stripe/create-portal-session",
    requireAuth,
    async (req: any, res) => {
      try {
        // Re-fetch the business profile to ensure we have the latest data
        const business = await storage.getBusinessById(req.business.id);
        if (!business || !business.stripeCustomerId) {
          return res
            .status(400)
            .json({ message: "User is not a Stripe customer" });
        }

        const portalSession = await createPortalSession(
          business.stripeCustomerId
        );
        res.json({ url: portalSession.url });
      } catch (error) {
        console.error("Error creating portal session:", error);
        res.status(500).json({ message: "Failed to create portal session" });
      }
    }
  );

  // Search available phone numbers for user selection
  app.post("/api/sms/search-numbers", requireAuth, async (req: any, res) => {
    try {
      const { areaCode, businessZipCode } = req.body;
      console.log(`=== TWILIO SEARCH REQUEST ===`);
      console.log(`Request body:`, req.body);
      console.log(`Business ID:`, req.business.id);

      // Debug: Log environment variables (don't log actual tokens in production)
      console.log("Twilio SID exists:", !!process.env.TWILIO_ACCOUNT_SID);
      console.log("Twilio Auth Token exists:", !!process.env.TWILIO_AUTH_TOKEN);

      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.log(`ERROR: Missing Twilio credentials`);
        return res.status(500).json({ message: "SMS service not configured" });
      }

      const twilio = (await import("twilio")).default;
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      // Determine search area code
      let searchAreaCode = areaCode;
      if (!searchAreaCode && businessZipCode) {
        // Use ZIP to area code mapping
        const { getPriorityAreaCodes } = await import("./zip-to-area-code.js");
        const areaCodes = getPriorityAreaCodes(undefined, businessZipCode);
        if (areaCodes.length > 0) {
          searchAreaCode = areaCodes[0];
        }
      }

      // Search for available SMS-enabled numbers
      const searchOptions: any = { smsEnabled: true, limit: 10 };
      if (searchAreaCode) {
        searchOptions.areaCode = parseInt(searchAreaCode);
      }

      console.log(`Searching Twilio API with options:`, searchOptions);
      console.log(
        `Full request URL: https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json`
      );

      const numbers = await client
        .availablePhoneNumbers("US")
        .local.list(searchOptions);

      console.log(
        `Raw Twilio API response:`,
        JSON.stringify(numbers.slice(0, 3), null, 2)
      );
      console.log(
        `Found ${numbers.length} numbers for area code ${searchAreaCode}`
      );

      if (numbers.length === 0) {
        console.log(
          "No numbers found for specified area code, trying without area code restriction..."
        );
        // Fallback: search without area code restriction
        const fallbackNumbers = await client
          .availablePhoneNumbers("US")
          .local.list({ smsEnabled: true, limit: 10 });
        console.log(
          `Fallback search found ${fallbackNumbers.length} numbers without area code restriction`
        );

        if (fallbackNumbers.length === 0) {
          console.log("No fallback numbers found either");
          return res.json({
            success: false,
            message:
              "No available numbers found in any area. Please try again later.",
            numbers: [],
          });
        }

        // Use fallback numbers
        const formattedFallbackNumbers = fallbackNumbers
          .slice(0, 8)
          .map((number) => ({
            phoneNumber: number.phoneNumber,
            friendlyName: number.phoneNumber.replace(
              /^\+1(\d{3})(\d{3})(\d{4})$/,
              "($1) $2-$3"
            ),
            locality: number.locality || "Available Area",
            region: number.region || "US",
          }));

        console.log(
          `Returning ${formattedFallbackNumbers.length} fallback numbers`
        );
        return res.json({
          success: true,
          numbers: formattedFallbackNumbers,
          searchedAreaCode: searchAreaCode,
          fallbackUsed: true,
          message: `Found ${formattedFallbackNumbers.length} available numbers (from various areas)`,
        });
      }

      // Format numbers for display
      const formattedNumbers = numbers.slice(0, 8).map((number) => ({
        phoneNumber: number.phoneNumber,
        friendlyName: number.phoneNumber.replace(
          /^\+1(\d{3})(\d{3})(\d{4})$/,
          "($1) $2-$3"
        ),
        locality: number.locality || "Local Area",
        region: number.region || "US",
      }));

      console.log(
        `Returning ${formattedNumbers.length} formatted numbers:`,
        formattedNumbers.slice(0, 2)
      );

      const response = {
        success: true,
        numbers: formattedNumbers,
        searchedAreaCode: searchAreaCode,
        message: `Found ${formattedNumbers.length} available numbers in area code ${searchAreaCode}`,
      };

      console.log(`Final response:`, response);
      res.json(response);
    } catch (error) {
      console.error("Error searching phone numbers:", error);
      res.status(500).json({ message: "Failed to search available numbers" });
    }
  });

  // Purchase selected phone number
  app.post("/api/sms/purchase-number", requireAuth, async (req: any, res) => {
    try {
      const { phoneNumber, areaCode } = req.body;
      // Mock Data

      // // valid
      // const phoneNumber = "+15005550006";

      //invalid
      // const phoneNumber = "+15005550001";

      //unavailable
      // const phoneNumber = "+15005550000";

      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        return res.status(500).json({ message: "SMS service not configured" });
      }

      const twilio = (await import("twilio")).default;
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      // Get current domain for webhook - fix the domain issue
      const domain = process.env.REPLIT_DEV_DOMAIN;
      if (!domain) {
        return res
          .status(500)
          .json({ message: "Domain configuration missing" });
      }

      const webhookUrl = `https://${domain}/api/sms/inbound`;

      // Purchase the selected number
      const purchaseResult = await client.incomingPhoneNumbers.create({
        phoneNumber: phoneNumber,
        smsUrl: webhookUrl,
      });

      // Update business record
      await storage.updateBusiness(req.business.id, {
        selectedPhoneNumber: phoneNumber,
        twilioSid: purchaseResult.sid,
        preferredAreaCode: areaCode || null,
      });

      res.json({
        success: true,
        twilioPhoneNumber: phoneNumber,
        friendlyNumber: phoneNumber.replace(
          /^\+1(\d{3})(\d{3})(\d{4})$/,
          "($1) $2-$3"
        ),
      });
    } catch (error) {
      console.error("Error purchasing phone number:", error);
      res.status(500).json({ message: "Failed to set up SMS number" });
    }
  });

  app.post("/api/sms/mark-read", requireAuth, async (req: any, res) => {
    try {
      // Placeholder - will implement when SMS message storage is added
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Business settings update endpoint
  app.put("/api/business/settings", requireAuth, async (req: any, res) => {
    try {
      const { googleReviewLink } = req.body;

      // Validate Google review link format if provided
      if (googleReviewLink && googleReviewLink.trim()) {
        const reviewLinkPattern =
          /^https:\/\/(g\.page\/r\/|maps\.google\.com\/|goo\.gl\/maps\/|maps\.app\.goo\.gl\/)/;
        if (!reviewLinkPattern.test(googleReviewLink.trim())) {
          return res.status(400).json({
            message:
              "Invalid Google review link format. Please use a valid Google review URL.",
          });
        }
      }

      const updatedBusiness = await storage.updateBusiness(req.business.id, {
        googleReviewLink: googleReviewLink?.trim() || null,
      });

      if (!updatedBusiness) {
        return res.status(404).json({ message: "Business not found" });
      }

      // Log settings update event
      await logEvent(req.business.id.toString(), "settings_updated", {
        setting_type: "google_review_link",
        has_review_link: !!updatedBusiness.googleReviewLink,
        updated_by: "business_owner",
      });

      res.json({
        message: "Settings updated successfully",
        business: {
          id: updatedBusiness.id,
          name: updatedBusiness.name,
          email: updatedBusiness.email,
          googleReviewLink: updatedBusiness.googleReviewLink,
          webhookUrl: updatedBusiness.webhookUrl,
        },
      });
    } catch (error) {
      console.error("Update business settings error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Support endpoint for setup help requests
  app.post("/api/support/setup-help", requireAuth, async (req: any, res) => {
    try {
      // Log the help request for admin notification
      console.log(`🆘 SETUP HELP REQUEST:`);
      console.log(`Business: ${req.business.name} (${req.business.email})`);
      console.log(`Business ID: ${req.business.id}`);
      console.log(`Webhook URL: ${req.business.webhookUrl}`);
      console.log(`Time: ${new Date().toISOString()}`);
      console.log(`=====================================`);

      // In a real application, you would:
      // - Send an email notification to admin
      // - Create a support ticket in your system
      // - Add to a support queue/database

      res.json({
        success: true,
        message: "Help request submitted successfully",
      });
    } catch (error) {
      console.error("Error handling setup help request:", error);
      res.status(500).json({ message: "Failed to submit help request" });
    }
  });

  // Public referral landing page API
  app.get("/api/public/referral/:code", async (req, res) => {
    try {
      const { code } = req.params;

      // Find the referrer by code across all businesses
      const referrer = await storage.getClientByReferralCodeGlobal(code);

      if (!referrer) {
        return res.status(404).json({ message: "Invalid referral code" });
      }

      res.json({
        referrerName: referrer.name.split(" ")[0], // First name only for privacy
        referralCode: code,
        businessId: referrer.businessId,
      });
    } catch (error) {
      console.error("Error fetching referral info:", error);
      res.status(500).json({ message: "Failed to fetch referral information" });
    }
  });

  // Submit referral form
  app.post("/api/public/referral", async (req, res) => {
    try {
      const { referralCode, name, email, phone, businessId } = req.body;

      if (!referralCode || !name || !email || !businessId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const { createPendingReferral } = await import("./referral-workflow");
      const success = await createPendingReferral(
        businessId,
        referralCode,
        name,
        email,
        phone
      );

      if (!success) {
        return res
          .status(400)
          .json({
            message: "Invalid referral code or referral already exists",
          });
      }

      res.json({
        success: true,
        message:
          "Referral submitted successfully! You'll both get rewards when you book your first cleaning.",
      });
    } catch (error) {
      console.error("Error submitting referral:", error);
      res.status(500).json({ message: "Failed to submit referral" });
    }
  });

  // Manual referral conversion check
  app.post(
    "/api/referrals/check-conversions",
    requireAuth,
    async (req: any, res) => {
      try {
        const { processCompletedBooking } = await import("./referral-workflow");

        // Get all clients for this business who have bookings
        const clients = await storage.getClientsByBusinessId(req.business.id);
        let conversionsProcessed = 0;

        for (const client of clients) {
          if (client.totalBookings > 0) {
            await processCompletedBooking(req.business.id, client.id);
            conversionsProcessed++;
          }
        }

        res.json({
          success: true,
          message: `Checked ${conversionsProcessed} clients for pending referral conversions`,
        });
      } catch (error) {
        console.error("Error checking referral conversions:", error);
        res.status(500).json({ message: "Failed to check conversions" });
      }
    }
  );

  // Dashboard routes
  app.get("/api/dashboard/stats", requireAuth, async (req: any, res) => {
    try {
      const stats = await storage.getBusinessStats(req.business.id);
      res.json(stats);
    } catch (error) {
      console.error("Stats error:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/clients", requireAuth, async (req: any, res) => {
    try {
      const { new: isNew } = req.query;
      const clients = await storage.getClientsByBusinessId(req.business.id);

      // If requesting new clients, filter to last 24 hours
      if (isNew === "true") {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const newClients = clients.filter((client) => {
          const createdAt = new Date(client.createdAt);
          return createdAt > yesterday;
        });

        res.json(newClients);
      } else {
        res.json(clients);
      }
    } catch (error) {
      console.error("Clients error:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", requireAuth, async (req: any, res) => {
    try {
      const clientData = insertClientSchema.parse({
        ...req.body,
        businessId: req.business.id,
      });

      const client = await storage.createClient(clientData);

      // Log client creation event
      await logEvent(req.business.id.toString(), "client_created", {
        client_id: client.id,
        client_name: client.name,
        client_email: client.email,
        source: "manual",
        has_phone: !!client.phone,
      });

      // Check for matching referrals when a new client is created
      await storage.checkAndMatchReferrals(
        req.business.id,
        client.email,
        client.phone
      );

      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      console.error("Create client error:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.get("/api/referrals", requireAuth, async (req: any, res) => {
    try {
      const { new: isNew } = req.query;
      const referrals = await storage.getReferralsByBusinessId(req.business.id);

      // If requesting new referrals, filter to last 24 hours
      if (isNew === "true") {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const newReferrals = referrals.filter((referral) => {
          const createdAt = new Date(referral.createdAt);
          return createdAt > yesterday;
        });

        res.json(newReferrals);
      } else {
        res.json(referrals);
      }
    } catch (error) {
      console.error("Referrals error:", error);
      res.status(500).json({ message: "Failed to fetch referrals" });
    }
  });

  app.get(
    "/api/analytics/top-referrers",
    requireAuth,
    async (req: any, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 10;
        const topReferrers = await storage.getTopReferrers(
          req.business.id,
          limit
        );
        res.json(topReferrers);
      } catch (error) {
        console.error("Top referrers error:", error);
        res.status(500).json({ message: "Failed to fetch top referrers" });
      }
    }
  );

  app.get(
    "/api/analytics/booking-trends",
    requireAuth,
    async (req: any, res) => {
      try {
        const days = parseInt(req.query.days as string) || 30;
        const trends = await storage.getBookingTrends(req.business.id, days);
        res.json(trends);
      } catch (error) {
        console.error("Booking trends error:", error);
        res.status(500).json({ message: "Failed to fetch booking trends" });
      }
    }
  );

  // CSV Upload
  app.post(
    "/api/upload/csv",
    requireAuth,
    upload.single("csv"),
    async (req: any, res) => {
      try {
        console.log(`📁 CSV Upload started for business ${req.business.id}`);

        if (!req.file) {
          console.log(`❌ No CSV file provided`);
          return res.status(400).json({ message: "No CSV file provided" });
        }

        console.log(
          `📄 Processing file: ${req.file.originalname}, size: ${req.file.buffer.length} bytes`
        );

        const results: any[] = [];
        const errors: string[] = [];
        let csvContent: string;

        // Check if file is Excel format
        const isExcel =
          req.file.originalname.toLowerCase().endsWith(".xlsx") ||
          req.file.originalname.toLowerCase().endsWith(".xls") ||
          req.file.mimetype.includes("spreadsheet") ||
          req.file.mimetype.includes("excel");

        if (isExcel) {
          try {
            console.log(`📊 Converting Excel file to CSV format`);

            // Parse Excel file
            const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

            // Use first worksheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to CSV
            csvContent = XLSX.utils.sheet_to_csv(worksheet);

            if (!csvContent || csvContent.trim().length === 0) {
              return res
                .status(400)
                .json({
                  message:
                    "Excel file appears to be empty or could not be processed",
                });
            }

            console.log(`✅ Successfully converted Excel to CSV`);
          } catch (excelError) {
            console.error("Excel conversion error:", excelError);
            return res.status(400).json({
              message:
                "Failed to process Excel file. Please ensure it's a valid Excel file or try saving as CSV instead.",
              error:
                excelError instanceof Error
                  ? excelError.message
                  : "Unknown Excel processing error",
            });
          }
        } else {
          // Handle CSV file as before
          csvContent = req.file.buffer.toString("utf8");
          // Handle UTF-8 BOM
          if (csvContent.charCodeAt(0) === 0xfeff) {
            csvContent = csvContent.slice(1);
          }
        }

        const stream = Readable.from(csvContent);

        // Support both standard and ZenMaid format headers
        const headerMappings = {
          "Client Name": ["Client Name", "client_name"],
          "Client Email": ["Client Email", "client_email"],
          "Service Date": ["Service Date", "service_date"],
          "Appointment Status": ["Appointment Status", "appointment_status"],
        };

        await new Promise<void>((resolve, reject) => {
          stream
            .pipe(csv({ mapHeaders: ({ header }) => header.trim() }))
            .on("data", (data) => {
              const normalizedRow: any = {};
              for (const [key, value] of Object.entries(data)) {
                normalizedRow[key] =
                  typeof value === "string" ? value.trim() : value;
              }
              results.push(normalizedRow);
            })
            .on("end", resolve)
            .on("error", reject);
        });

        if (results.length === 0) {
          return res
            .status(400)
            .json({ message: "No rows found in CSV file." });
        }

        // Validate CSV headers - check for either standard or alternative headers
        const csvHeaders = Object.keys(results[0]);
        const missingHeaders: string[] = [];

        for (const [standardHeader, alternatives] of Object.entries(
          headerMappings
        )) {
          const hasAnyVariant = alternatives.some((alt) =>
            csvHeaders.includes(alt)
          );
          if (!hasAnyVariant) {
            missingHeaders.push(standardHeader);
          }
        }

        // Special case for ZenMaid: if we have the basic ZenMaid headers, consider appointment status as satisfied
        const hasZenMaidFormat =
          csvHeaders.includes("client_name") &&
          csvHeaders.includes("client_email") &&
          csvHeaders.includes("service_date");

        if (hasZenMaidFormat) {
          // Remove "Appointment Status" from missing headers for ZenMaid format
          const appointmentStatusIndex =
            missingHeaders.indexOf("Appointment Status");
          if (appointmentStatusIndex > -1) {
            missingHeaders.splice(appointmentStatusIndex, 1);
          }
        }

        if (missingHeaders.length > 0) {
          return res.status(400).json({
            message: "CSV is missing required headers",
            missingHeaders,
            expectedHeaders: Object.keys(headerMappings),
            foundHeaders: csvHeaders,
            supportedFormats: {
              standard: [
                "Client Name",
                "Client Email",
                "Service Date",
                "Appointment Status",
              ],
              zenmaid: ["client_name", "client_email", "service_date"],
            },
          });
        }

        let processed = 0;
        let skipped = 0;
        let phonesFound = 0;
        let phonesMissing = 0;
        const clientPreviews: string[] = [];
        const processedClientNames = new Set<string>();

        for (const row of results) {
          try {
            // Support both standard and ZenMaid format headers
            const clientName = row["Client Name"] || row["client_name"];
            const email = row["Client Email"] || row["client_email"];
            // Support flexible phone number column names including ZenMaid format
            const phone =
              row["Phone"] ||
              row["Client Phone"] ||
              row["Phone Number"] ||
              row["phone"] ||
              row["client_phone"] ||
              row["phone_number"] ||
              row["client_mobile"] ||
              row["client_contact_number"];
            const serviceDateRaw = row["Service Date"] || row["service_date"];
            const serviceType = row["Service Type"] || row["service_type"];
            const amountRaw = row["Amount Charged"] || row["amount_charged"];
            // For ZenMaid format, assume all appointments are completed since they export completed jobs
            const appointmentStatus =
              row["Appointment Status"] ||
              row["appointment_status"] ||
              (hasZenMaidFormat ? "completed" : null);

            if (
              !appointmentStatus ||
              appointmentStatus.toLowerCase() !== "completed"
            ) {
              errors.push(
                `Skipping row: appointment not completed (status: "${appointmentStatus}")`
              );
              skipped++;
              continue;
            }

            if (!clientName || !email || !serviceDateRaw) {
              const missing = [];
              if (!clientName) missing.push("Client Name");
              if (!email) missing.push("Client Email");
              if (!serviceDateRaw) missing.push("Service Date");
              errors.push(
                `Skipping row: missing required fields [${missing.join(", ")}]`
              );
              skipped++;
              continue;
            }

            const serviceDate = new Date(serviceDateRaw);
            if (isNaN(serviceDate.getTime())) {
              errors.push(
                `Skipping row: invalid Service Date "${serviceDateRaw}"`
              );
              skipped++;
              continue;
            }

            const amount =
              typeof amountRaw === "string"
                ? amountRaw.replace(/[^0-9.-]+/g, "")
                : typeof amountRaw === "number"
                  ? amountRaw.toFixed(2)
                  : null;

            // Process phone number
            const normalizedPhone = phone ? normalizePhoneNumber(phone) : null;
            let phoneIsValid = false;

            if (normalizedPhone && validatePhoneForCsv(normalizedPhone)) {
              phonesFound++;
              phoneIsValid = true;
            } else {
              phonesMissing++;
              if (phone) {
                console.log(`Invalid phone format for ${clientName}: ${phone}`);
              }
            }

            let client = await storage.getClientByEmail(email, req.business.id);
            if (!client) {
              client = await storage.createClient({
                businessId: req.business.id,
                name: clientName,
                email,
                phone: phoneIsValid ? normalizedPhone : null,
              });

              // Check for matching referrals when a new client is created
              await storage.checkAndMatchReferrals(
                req.business.id,
                client.email,
                client.phone
              );
            } else {
              // Update phone if we have a valid one and client doesn't have one yet
              if (phoneIsValid && !client.phone) {
                const updatedClient = await storage.updateClient(
                  client.id,
                  req.business.id,
                  {
                    phone: normalizedPhone,
                  }
                );
                if (updatedClient) {
                  client = updatedClient;
                }
              }
            }

            if (client) {
              // Collect client names for preview (first 3 unique names)
              if (
                clientPreviews.length < 3 &&
                !processedClientNames.has(clientName)
              ) {
                clientPreviews.push(clientName);
                processedClientNames.add(clientName);
              }

              await storage.createBooking({
                businessId: req.business.id,
                clientId: client.id,
                serviceDate,
                serviceType,
                amount,
                status: "completed",
                amountCharged:
                  amount && /^[0-9]+\.?[0-9]*$/.test(amount)
                    ? amount
                    : undefined,
              });

              // Trigger referral workflow for completed booking
              const { processCompletedBooking } = await import(
                "./referral-workflow"
              );
              await processCompletedBooking(req.business.id, client.id);

              // Send automated thank-you SMS for completed appointments
              const { sendAutoThankYouSMS } = await import(
                "./auto-sms-service"
              );
              await sendAutoThankYouSMS(client.id, req.business.id);
            }

            processed++;
          } catch (err: any) {
            errors.push(`Error processing row: ${err.message}`);
            skipped++;
          }
        }

        console.log(
          `Phone number coverage: Found phone numbers for ${phonesFound}/${phonesFound + phonesMissing} clients`
        );

        // Log the CSV upload for history tracking
        await logCsvUpload({
          businessId: req.business.id,
          fileName: req.file.originalname,
          rowsProcessed: processed,
          rowsSkipped: skipped,
          totalRows: results.length,
          clientPreviews,
          errors: errors.slice(0, 3), // Limit to first 3 errors for logging
          phoneStats: {
            phonesFound,
            phonesMissing,
            coverage:
              phonesFound + phonesMissing > 0
                ? Math.round(
                    (phonesFound / (phonesFound + phonesMissing)) * 100
                  )
                : 0,
          },
        });

        // Log CSV upload event
        await logEvent(req.business.id.toString(), "csv_uploaded", {
          filename: req.file.originalname,
          file_size: req.file.size,
          rows_processed: processed,
          rows_skipped: skipped,
          total_rows: results.length,
          phone_coverage:
            phonesFound + phonesMissing > 0
              ? Math.round((phonesFound / (phonesFound + phonesMissing)) * 100)
              : 0,
          error_count: errors.length,
          upload_method: "web_interface",
        });

        res.json({
          message: `Processed ${processed} bookings, skipped ${skipped}`,
          processed,
          skipped,
          totalRows: results.length,
          phoneStats: {
            phonesFound,
            phonesMissing,
            coverage:
              phonesFound + phonesMissing > 0
                ? Math.round(
                    (phonesFound / (phonesFound + phonesMissing)) * 100
                  )
                : 0,
          },
          errors: errors.slice(0, 10),
        });
      } catch (error) {
        console.error("CSV upload error:", error);
        res.status(500).json({ message: "Failed to process CSV file" });
      }
    }
  );

  // Webhook endpoint with flexible field mapping
  app.post("/api/webhook/:webhookId", webhookLimiter, async (req, res) => {
    try {
      const { webhookId } = req.params;
      const payload = req.body;

      console.log(
        `Received webhook for ${webhookId}:`,
        JSON.stringify(payload, null, 2)
      );

      // Find business by webhook URL
      const business = await storage.getBusinessByWebhookId(webhookId);
      if (!business) {
        return res.status(404).json({ message: "Invalid webhook URL" });
      }

      // Use flexible field mapping to extract client data
      const clientName = getField(payload, [
        "client.name",
        "client_name",
        "name",
        "customer_name",
        "client name",
        "customer name",
        "clientName",
        "customerName",
        "Client Name",
        "Customer Name",
      ]);

      const clientEmail = getField(payload, [
        "client.email",
        "client_email",
        "email",
        "customer_email",
        "client email",
        "customer email",
        "clientEmail",
        "customerEmail",
        "Client Email",
        "Customer Email",
        "Email",
      ]);

      const appointmentDate = getField(payload, [
        "job.date",
        "appointment_date",
        "service_date",
        "visit_date",
        "job_date",
        "date",
        "appointmentDate",
        "serviceDate",
        "visitDate",
        "jobDate",
        "Appointment Date",
        "Service Date",
        "Visit Date",
        "Job Date",
      ]);

      const status = getField(payload, [
        "job.status",
        "status",
        "appointment_status",
        "job_status",
        "appointmentStatus",
        "jobStatus",
        "Appointment Status",
        "Job Status",
        "Status",
      ]);

      const phone = getField(payload, [
        "client.phone",
        "phone",
        "phone_number",
        "mobile",
        "client_phone",
        "phoneNumber",
        "clientPhone",
        "Phone",
        "Phone Number",
        "Mobile",
      ]);

      const amountCharged = getField(payload, [
        "job.amount",
        "amount",
        "total",
        "price",
        "revenue",
        "amount_charged",
        "Amount",
        "Total",
        "Price",
        "Revenue",
        "Amount Charged",
      ]);

      const serviceType = getField(payload, [
        "job.service",
        "service",
        "service_type",
        "job_type",
        "serviceType",
        "jobType",
        "Service",
        "Service Type",
        "Job Type",
      ]);

      // Log the full payload for debugging
      await storage.createWebhookLog({
        businessId: business.id,
        payload,
        status: "processing",
        errorMessage: null,
      });

      // Validate required fields
      if (!clientName || !clientEmail) {
        const missingFields = [];
        if (!clientName) missingFields.push("client name");
        if (!clientEmail) missingFields.push("client email");

        await storage.createWebhookLog({
          businessId: business.id,
          payload,
          status: "error",
          errorMessage: `Missing required fields: ${missingFields.join(", ")}. Please check your field mapping in the automation tool.`,
        });
        return res.status(400).json({
          message: "Missing required fields",
          missingFields,
          suggestion:
            "Please check your field mapping to ensure client name and email are included.",
        });
      }

      // Find or create client
      let client = await storage.getClientByEmail(clientEmail, business.id);
      if (!client) {
        const clientData: any = {
          businessId: business.id,
          name: clientName,
          email: clientEmail,
        };

        // Add phone if available and valid
        if (phone) {
          const normalizedPhone = normalizePhoneNumber(phone);
          if (normalizedPhone) {
            clientData.phone = normalizedPhone;
          }
        }

        client = await storage.createClient(clientData);

        // If client has a referral code, create referral record
        const referralCode = getField(payload, [
          "client.referredBy",
          "referred_by",
          "referral_code",
          "referredBy",
          "Referred By",
          "Referral Code",
        ]);

        if (referralCode) {
          await storage.createReferral({
            businessId: business.id,
            referrerCode: referralCode,
            refereeName: clientName,
            refereeEmail: clientEmail,
          });
        }
      } else {
        // Update existing client with phone if provided and not already set
        if (phone && !client.phone) {
          const normalizedPhone = normalizePhoneNumber(phone);
          if (normalizedPhone) {
            await storage.updateClient(client.id, business.id, {
              phone: normalizedPhone,
            });
          }
        }
      }

      // Create booking if appointment data is provided
      if (appointmentDate) {
        const bookingData: any = {
          businessId: business.id,
          clientId: client.id,
          serviceDate: new Date(appointmentDate),
          serviceType: serviceType || null,
          amount: amountCharged ? amountCharged.toString() : null,
        };

        await storage.createBooking(bookingData);

        // Check if this is a completed appointment and send auto thank-you SMS
        if (status && status.toLowerCase() === "completed") {
          const { sendAutoThankYouSMS } = await import("./auto-sms-service");
          await sendAutoThankYouSMS(client.id, business.id);
        }
      }

      // Update webhook log to success
      await storage.createWebhookLog({
        businessId: business.id,
        payload,
        status: "success",
        errorMessage: null,
      });

      // Log webhook received event
      await logEvent(business.id.toString(), "webhook_received", {
        client_name: clientName,
        appointment_date: appointmentDate,
        service_type: serviceType,
        amount: amountCharged,
        status: status || "unknown",
        source: "zapier_integration",
        webhook_id: webhookId,
      });

      res.json({
        message: "Webhook processed successfully",
        clientName,
        appointmentDate: appointmentDate || "No appointment date provided",
      });
    } catch (error) {
      console.error("Webhook error:", error);

      // Log the error
      try {
        const business = await storage.getBusinessByWebhookId(
          req.params.webhookId
        );
        if (business) {
          await storage.createWebhookLog({
            businessId: business.id,
            payload: req.body,
            status: "error",
            errorMessage:
              error instanceof Error ? error.message : "Unknown error occurred",
          });
        }
      } catch (logError) {
        console.error("Failed to log webhook error:", logError);
      }

      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // Test webhook endpoint for setup
  app.post("/api/webhook/test", requireAuth, async (req: any, res) => {
    try {
      // Create sample test data for the business
      const testClients = [
        {
          businessId: req.business.id,
          name: "Sarah Johnson",
          email: "sarah@example.com",
        },
        {
          businessId: req.business.id,
          name: "Mike Chen",
          email: "mike@example.com",
        },
        {
          businessId: req.business.id,
          name: "Lisa Rodriguez",
          email: "lisa@example.com",
        },
      ];

      const createdClients = [];
      for (const clientData of testClients) {
        const existingClient = await storage.getClientByEmail(
          clientData.email,
          req.business.id
        );
        if (!existingClient) {
          const client = await storage.createClient(clientData);
          createdClients.push(client);
        }
      }

      // Create sample bookings for the clients
      const today = new Date();
      const testBookings = [
        {
          businessId: req.business.id,
          clientId: createdClients[0]?.id,
          serviceDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          serviceType: "Deep Clean",
          amount: "150",
        },
        {
          businessId: req.business.id,
          clientId: createdClients[1]?.id,
          serviceDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          serviceType: "Regular Clean",
          amount: "85",
        },
        {
          businessId: req.business.id,
          clientId: createdClients[2]?.id,
          serviceDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          serviceType: "Window Clean",
          amount: "75",
        },
      ];

      for (const bookingData of testBookings) {
        if (bookingData.clientId) {
          await storage.createBooking(bookingData);
        }
      }

      res.json({
        message: "Test data created successfully",
        clientsCreated: createdClients.length,
        bookingsCreated: testBookings.length,
      });
    } catch (error) {
      console.error("Test webhook error:", error);
      res.status(500).json({ message: "Failed to create test data" });
    }
  });

  // CSV Upload History
  app.get("/api/csv-uploads", requireAuth, async (req: any, res) => {
    try {
      const { getCsvUploadHistory } = await import("./csv-upload-logger");
      const uploadHistory = await getCsvUploadHistory(req.business.id, 20);
      res.json(uploadHistory);
    } catch (error) {
      console.error("CSV upload history error:", error);
      res.status(500).json({ message: "Failed to fetch upload history" });
    }
  });

  // Webhook logs endpoint
  app.get("/api/webhook-logs", requireAuth, async (req: any, res) => {
    try {
      // Get webhook logs from the database for the business
      const logs = await storage.getWebhookLogs(req.business.id, 50);
      res.json(logs);
    } catch (error) {
      console.error("Webhook logs error:", error);
      res.status(500).json({ message: "Failed to fetch webhook logs" });
    }
  });

  // Phone number management endpoints
  app.get("/api/twilio/numbers", requireAuth, async (req: any, res) => {
    try {
      const phoneNumbers = await storage.getBusinessPhoneNumbers(
        req.business.id
      );
      res.json(phoneNumbers);
    } catch (error) {
      console.error("Get phone numbers error:", error);
      res.status(500).json({ message: "Failed to get phone numbers" });
    }
  });

  app.post("/api/user/phone-number", requireAuth, async (req: any, res) => {
    try {
      const { selectedPhoneNumber, twilioNumbers } = req.body;

      if (!selectedPhoneNumber) {
        return res
          .status(400)
          .json({ message: "Selected phone number is required" });
      }

      const updatedBusiness = await storage.updateBusinessPhoneNumbers(
        req.business.id,
        selectedPhoneNumber,
        twilioNumbers || []
      );

      res.json({ selectedPhoneNumber, twilioNumbers });
    } catch (error) {
      console.error("Update phone number error:", error);
      res.status(500).json({ message: "Failed to update phone number" });
    }
  });

  // Activities dashboard endpoints
  app.get("/api/activities/conversions", requireAuth, async (req: any, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days) : 7;
      const conversions = await storage.getRecentReferralConversions(
        req.business.id,
        days
      );
      res.json(conversions);
    } catch (error) {
      console.error("Get referral conversions error:", error);
      res.status(500).json({ message: "Failed to get referral conversions" });
    }
  });

  app.post(
    "/api/activities/mark-reward-given/:referralId",
    requireAuth,
    async (req: any, res) => {
      try {
        const { referralId } = req.params;
        const { rewardAmount, notes } = req.body;

        // Check if reward record already exists
        const existingRewards = await storage.getReferralRewards(
          req.business.id,
          false,
          1000
        );
        const existingReward = existingRewards.find(
          (r) => r.referralId === parseInt(referralId)
        );

        let reward;
        if (existingReward) {
          reward = await storage.updateReferralReward(
            existingReward.id,
            req.business.id,
            {
              rewardGiven: true,
              rewardAmount,
              notes,
            }
          );
        } else {
          reward = await storage.createReferralReward({
            businessId: req.business.id,
            referralId: parseInt(referralId),
            rewardGiven: true,
            rewardAmount,
            notes,
          });
        }

        // Log activity
        await storage.createActivityLog({
          businessId: req.business.id,
          type: "referral_reward_given",
          description: `Marked referral reward as given`,
          metadata: { referralId: parseInt(referralId), rewardAmount, notes },
        });

        res.json(reward);
      } catch (error) {
        console.error("Mark reward given error:", error);
        res.status(500).json({ message: "Failed to mark reward as given" });
      }
    }
  );

  app.get(
    "/api/activities/recent-bookings",
    requireAuth,
    async (req: any, res) => {
      try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const bookings = await storage.getRecentCompletedBookings(
          req.business.id,
          limit
        );
        res.json(bookings);
      } catch (error) {
        console.error("Get recent bookings error:", error);
        res.status(500).json({ message: "Failed to get recent bookings" });
      }
    }
  );

  app.get(
    "/api/activities/pending-referrals",
    requireAuth,
    async (req: any, res) => {
      try {
        const daysOld = req.query.daysOld ? parseInt(req.query.daysOld) : 30;
        const referrals = await storage.getPendingReferrals(
          req.business.id,
          daysOld
        );
        res.json(referrals);
      } catch (error) {
        console.error("Get pending referrals error:", error);
        res.status(500).json({ message: "Failed to get pending referrals" });
      }
    }
  );

  app.get("/api/activities/feed", requireAuth, async (req: any, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const activities = await storage.getActivityLogs(req.business.id, limit);
      res.json(activities);
    } catch (error) {
      console.error("Get activity feed error:", error);
      res.status(500).json({ message: "Failed to get activity feed" });
    }
  });

  app.post(
    "/api/referrals/send-reminder/:referralId",
    requireAuth,
    async (req: any, res) => {
      try {
        const { referralId } = req.params;

        // Get the referral details
        const referral = await storage.getReferralById(
          parseInt(referralId),
          req.business.id
        );
        if (!referral) {
          return res.status(404).json({ message: "Referral not found" });
        }

        // Get outreach settings for business
        const settings = await storage.getOutreachSettings(req.business.id);
        if (!settings?.twilioPhone) {
          return res
            .status(400)
            .json({ message: "SMS not configured for this business" });
        }

        // Send reminder SMS if phone number is available
        if (referral.refereePhone) {
          const message = `Hi ${referral.refereeName}! Just a friendly reminder about your referral from ${referral.referrerCode}. Ready to book your service? Reply to this message or call us!`;

          try {
            const twilioResult = await sendSms({
              to: referral.refereePhone,
              message: message,
            });

            if (!twilioResult.success) {
              throw new Error(twilioResult.error || "SMS send failed");
            }

            // Log the SMS
            await storage.logSms({
              businessId: req.business.id,
              clientId: null, // No client ID for pending referrals
              phoneNumber: referral.refereePhone,
              message: message,
              messageType: "referral_reminder",
              twilioSid: twilioResult.messageSid || "",
              status: "sent",
            });

            // Log activity
            await storage.createActivityLog({
              businessId: req.business.id,
              type: "referral_reminder_sent",
              description: `Sent referral reminder to ${referral.refereeName}`,
              metadata: {
                referralId: parseInt(referralId),
                refereeName: referral.refereeName,
                refereePhone: referral.refereePhone,
                twilioSid: twilioResult.messageSid,
              },
            });

            res.json({
              message: "Reminder sent successfully",
              twilioSid: twilioResult.messageSid,
            });
          } catch (smsError) {
            console.error("SMS send error:", smsError);
            res.status(500).json({ message: "Failed to send SMS reminder" });
          }
        } else {
          res
            .status(400)
            .json({ message: "No phone number available for this referral" });
        }
      } catch (error) {
        console.error("Send reminder error:", error);
        res.status(500).json({ message: "Failed to send reminder" });
      }
    }
  );

  // Admin endpoint for viewing event logs
  app.get("/admin/events", async (req, res) => {
    try {
      const events = await getEvents();
      res.json(events);
    } catch (error) {
      console.error("Failed to retrieve events:", error);
      res.status(500).json({ message: "Failed to retrieve events" });
    }
  });

  // Admin actions
  app.post("/api/admin/send-thanks", requireAuth, async (req: any, res) => {
    try {
      const { clientId, message } = req.body;

      const client = await storage.getClientById(clientId, req.business.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Mock implementation - in production, integrate with email service
      console.log(
        `Sending thank you to ${client.name} (${client.email}): ${message}`
      );

      res.json({ message: "Thank you message sent successfully" });
    } catch (error) {
      console.error("Send thanks error:", error);
      res.status(500).json({ message: "Failed to send thank you message" });
    }
  });

  app.post("/api/admin/send-gift", requireAuth, async (req: any, res) => {
    try {
      const { clientId, giftType, amount } = req.body;

      const client = await storage.getClientById(clientId, req.business.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Mock implementation - in production, integrate with gift/reward service
      console.log(
        `Sending ${giftType} gift ($${amount}) to ${client.name} (${client.email})`
      );

      res.json({ message: "Gift sent successfully" });
    } catch (error) {
      console.error("Send gift error:", error);
      res.status(500).json({ message: "Failed to send gift" });
    }
  });

  app.get("/api/admin/export", requireAuth, async (req: any, res) => {
    try {
      const clients = await storage.getClientsByBusinessId(req.business.id);
      const referrals = await storage.getReferralsByBusinessId(req.business.id);

      // Create CSV data
      const csvData = clients.map((client) => ({
        name: client.name,
        email: client.email,
        referralCode: client.referralCode,
        referredBy: client.referredBy || "",
        totalBookings: client.totalBookings,
        loyaltyScore: client.loyaltyScore,
        firstBooking: client.firstBooking?.toISOString().split("T")[0] || "",
        lastBooking: client.lastBooking?.toISOString().split("T")[0] || "",
        frequency: client.frequency || "",
      }));

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=clients-export.csv"
      );

      // Simple CSV generation
      const header = Object.keys(csvData[0] || {}).join(",");
      const rows = csvData.map((row) => Object.values(row).join(","));
      const csv = [header, ...rows].join("\n");

      res.send(csv);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Development endpoint to add sample phone numbers
  app.post(
    "/api/clients/add-sample-phones",
    requireAuth,
    async (req: any, res) => {
      try {
        const clients = await storage.getClientsByBusinessId(req.business.id);
        let updated = 0;

        // Sample phone numbers for testing
        const samplePhones = [
          "+15551234567",
          "+15551234568",
          "+15551234569",
          "+15551234570",
          "+15551234571",
        ];

        for (
          let i = 0;
          i < Math.min(clients.length, samplePhones.length);
          i++
        ) {
          const client = clients[i];
          if (!client.phone) {
            await storage.updateClient(client.id, req.business.id, {
              phone: samplePhones[i],
            });
            updated++;
          }
        }

        res.json({
          message: `Added phone numbers to ${updated} clients`,
          updated,
        });
      } catch (error) {
        console.error("Error adding sample phones:", error);
        res.status(500).json({ message: "Failed to add sample phone numbers" });
      }
    }
  );

  // SMS Outreach routes
  // Insights endpoint
  app.get("/api/insights", requireAuth, async (req: any, res) => {
    try {
      const insights = await storage.getInsightsData(req.business.id);
      res.json(insights);
    } catch (error) {
      console.error("Get insights error:", error);
      res.status(500).json({ message: "Failed to get insights data" });
    }
  });

  app.get("/api/outreach/settings", requireAuth, async (req: any, res) => {
    try {
      let settings = await storage.getOutreachSettings(req.business.id);

      // Auto-create default settings if none exist
      if (!settings) {
        const defaultSettings = {
          businessId: req.business.id,
          referralDiscount: "$25",
          customMessages: {
            referral:
              "Hi {clientName}! Refer a friend and both get {referralDiscount} off your next cleaning! Use link: {referralLink}",
            thankYou:
              "Thanks, {clientName}! We appreciate your business! Your referral code is {referralCode}",
            followUp:
              "Hi {clientName}, hope you loved your last cleaning! Ready to book another session?",
            review:
              "Thanks again for choosing us, {clientName}! If you have a moment, we'd really appreciate a quick review: {googleReviewLink}",
          },
          autoMessageSettings: {
            autoSendThankYou: true,
            autoSendFollowUp: false,
          },
        };

        settings = await storage.createOutreachSettings(defaultSettings);
      }

      res.json(settings);
    } catch (error) {
      console.error("Get outreach settings error:", error);
      res.status(500).json({ message: "Failed to get outreach settings" });
    }
  });

  app.post("/api/outreach/settings", requireAuth, async (req: any, res) => {
    try {
      const settingsData = insertOutreachSettingsSchema.parse({
        businessId: req.business.id,
        ...req.body,
      });

      const existingSettings = await storage.getOutreachSettings(
        req.business.id
      );
      let settings;

      if (existingSettings) {
        settings = await storage.updateOutreachSettings(
          req.business.id,
          settingsData
        );
      } else {
        settings = await storage.createOutreachSettings(settingsData);
      }

      res.json(settings);
    } catch (error) {
      console.error("Save outreach settings error:", error);
      res.status(500).json({ message: "Failed to save outreach settings" });
    }
  });

  app.post("/api/outreach/send-sms", requireAuth, async (req: any, res) => {
    try {
      const { clientId, messageType, customMessage } = req.body;

      if (!clientId || !messageType) {
        return res
          .status(400)
          .json({ message: "Client ID and message type are required" });
      }

      const client = await storage.getClientById(clientId, req.business.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      if (!client.phone) {
        return res.status(400).json({ message: "Client has no phone number" });
      }

      const settings = await storage.getOutreachSettings(req.business.id);
      if (!settings) {
        return res
          .status(400)
          .json({ message: "Outreach settings not configured" });
      }

      // Format phone number
      const formattedPhone = formatPhoneNumber(client.phone);
      if (!validatePhoneNumber(formattedPhone)) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }

      // Get message template
      let messageContent = customMessage;
      if (!messageContent && settings.customMessages) {
        const messages = settings.customMessages as any;
        messageContent = messages[messageType];
      }

      if (!messageContent) {
        return res.status(400).json({ message: "No message template found" });
      }

      // Replace placeholders
      messageContent = messageContent
        .replace(/\{clientName\}/g, client.name)
        .replace(/\{referralDiscount\}/g, settings.referralDiscount || "$25")
        .replace(
          /\{referralLink\}/g,
          `https://yourapp.com/ref/${client.referralCode}`
        )
        .replace(/\{referralCode\}/g, client.referralCode)
        .replace(
          /\{googleReviewLink\}/g,
          settings.googleReviewLink ||
            req.business.googleReviewLink ||
            "your-google-review-link"
        );

      // Send SMS
      const smsResult = await sendSms({
        to: formattedPhone,
        message: messageContent,
      });

      if (!smsResult.success) {
        return res
          .status(500)
          .json({ message: `Failed to send SMS: ${smsResult.error}` });
      }

      // Log SMS
      await storage.createSmsLog({
        businessId: req.business.id,
        clientId: client.id,
        phoneNumber: formattedPhone,
        messageType,
        messageContent,
        status: "sent",
        twilioSid: smsResult.messageSid,
      });

      // Log SMS sent event
      await logEvent(req.business.id.toString(), "sms_sent", {
        client_id: client.id,
        client_name: client.name,
        phone_number: formattedPhone,
        message_type: messageType,
        message_length: messageContent.length,
        twilio_sid: smsResult.messageSid,
        source: "manual_outreach",
      });

      res.json({
        message: "SMS sent successfully",
        messageSid: smsResult.messageSid,
      });
    } catch (error) {
      console.error("Send SMS error:", error);
      res.status(500).json({ message: "Failed to send SMS" });
    }
  });

  app.get("/api/outreach/sms-logs", requireAuth, async (req: any, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const logs = await storage.getSmsLogs(req.business.id, limit);
      res.json(logs);
    } catch (error) {
      console.error("Get SMS logs error:", error);
      res.status(500).json({ message: "Failed to get SMS logs" });
    }
  });

  app.get(
    "/api/outreach/sms-logs/:clientId",
    requireAuth,
    async (req: any, res) => {
      try {
        const { clientId } = req.params;
        const logs = await storage.getSmsLogsByClient(
          parseInt(clientId),
          req.business.id
        );
        res.json(logs);
      } catch (error) {
        console.error("Get client SMS logs error:", error);
        res.status(500).json({ message: "Failed to get client SMS logs" });
      }
    }
  );

  // Send thank you SMS to client after booking completion
  app.post(
    "/api/sms/send-thank-you/:clientId",
    requireAuth,
    async (req: any, res) => {
      try {
        const { clientId } = req.params;
        const client = await storage.getClient(
          parseInt(clientId),
          req.business.id
        );

        if (!client) {
          return res.status(404).json({ message: "Client not found" });
        }

        if (!client.phone) {
          return res
            .status(400)
            .json({ message: "Client has no phone number" });
        }

        // Get outreach settings for message template
        const settings = await storage.getOutreachSettings(req.business.id);
        const customMessages = settings?.customMessages as any;
        const thankYouTemplate =
          customMessages?.thankYou ||
          "Thanks {clientName}! We appreciate your business! Your referral code is {referralCode}";

        // Generate referral code for the client
        const referralCode = `REF-${client.name.substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        // Replace template variables
        const message = thankYouTemplate
          .replace("{clientName}", client.name)
          .replace("{referralCode}", referralCode);

        // Get business phone number
        const business = await storage.getBusinessById(req.business.id);
        if (!business?.selectedPhoneNumber) {
          throw new Error("No business phone number configured");
        }

        // Send SMS using Twilio service
        const result = await sendSms({
          to: client.phone,
          message: message,
          from: business.selectedPhoneNumber,
        });

        // Log the SMS
        if (!result.messageSid) {
          throw new Error("Failed to get message SID from Twilio");
        }

        await storage.logSms({
          businessId: req.business.id,
          clientId: client.id,
          phoneNumber: client.phone,
          message: message,
          messageType: "thank_you",
          twilioSid: result.messageSid,
          status: "sent",
        });

        // Log activity
        await logEvent(req.business.id.toString(), "sms_sent", {
          client_id: client.id,
          client_name: client.name,
          phone_number: client.phone,
          message_type: "thank_you",
          message_length: message.length,
          twilio_sid: result.messageSid,
          source: "activities_dashboard",
        });

        res.json({ success: true, messageSid: result.messageSid });
      } catch (error) {
        console.error("Send thank you SMS error:", error);
        res.status(500).json({ message: "Failed to send thank you SMS" });
      }
    }
  );

  // Send referral reminder SMS
  app.post(
    "/api/sms/send-referral-reminder/:referralId",
    requireAuth,
    async (req: any, res) => {
      try {
        const { referralId } = req.params;
        const referral = await storage.getPendingReferralById(
          parseInt(referralId),
          req.business.id
        );

        if (!referral) {
          return res.status(404).json({ message: "Referral not found" });
        }

        if (!referral.refereePhone) {
          return res
            .status(400)
            .json({ message: "Referral has no phone number" });
        }

        // Get outreach settings for message template
        const settings = await storage.getOutreachSettings(req.business.id);
        const customMessages = settings?.customMessages as any;
        const reminderTemplate =
          customMessages?.followUp ||
          "Hi {refereeName}, don't forget about {businessName}! Use code {referralCode} for your discount.";

        // Replace template variables
        const message = reminderTemplate
          .replace("{refereeName}", referral.refereeName)
          .replace("{businessName}", req.business.name)
          .replace("{referralCode}", referral.referrerCode);

        // Send SMS using Twilio
        const twilio = await import("twilio");
        const twilioClient = twilio.default(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );

        const result = await twilioClient.messages.create({
          body: message,
          from: req.business.selectedPhoneNumber,
          to: referral.refereePhone,
        });

        // Log the SMS
        await storage.logSms({
          businessId: req.business.id,
          clientId: null, // This is for a potential client, not existing
          phoneNumber: referral.refereePhone,
          message: message,
          messageType: "referral_reminder",
          twilioSid: result.sid,
          status: "sent",
        });

        // Log activity
        await logEvent(req.business.id.toString(), "sms_sent", {
          referral_id: referral.id,
          referee_name: referral.refereeName,
          phone_number: referral.refereePhone,
          message_type: "referral_reminder",
          message_length: message.length,
          twilio_sid: result.sid,
          source: "activities_dashboard",
        });

        res.json({ success: true, messageSid: result.sid });
      } catch (error) {
        console.error("Send referral reminder SMS error:", error);
        res
          .status(500)
          .json({ message: "Failed to send referral reminder SMS" });
      }
    }
  );

  // =========================
  // COMPREHENSIVE SMS INFRASTRUCTURE
  // =========================

  // SMS Webhook endpoint - handles inbound SMS from Twilio
  app.post("/api/sms/inbound", async (req, res) => {
    await handleSmsWebhook(req, res);
  });

  // Auto-assign local Twilio number during onboarding
  app.post(
    "/api/sms/assign-local-number",
    requireAuth,
    async (req: any, res) => {
      try {
        const { preferredAreaCode, businessZipCode } = req.body;

        console.log(
          `Auto-assigning local number for business ${req.business.id}...`
        );

        const assignmentResult = await autoAssignLocalNumber(
          preferredAreaCode,
          businessZipCode
        );

        if (assignmentResult.success && assignmentResult.number) {
          // Update business with assigned Twilio number
          await storage.updateBusiness(req.business.id, {
            selectedPhoneNumber: assignmentResult.number.phoneNumber,
            twilioSid: assignmentResult.number.sid,
            preferredAreaCode: preferredAreaCode,
            businessZipCode: businessZipCode,
          });

          // Log the assignment
          await storage.createActivityLog({
            businessId: req.business.id,
            type: "twilio_number_assigned",
            description: `Business phone number assigned: ${assignmentResult.number.phoneNumber}`,
            metadata: {
              phoneNumber: assignmentResult.number.phoneNumber,
              areaCode: assignmentResult.number.areaCode,
              fallbackUsed: assignmentResult.fallbackUsed,
              preferredAreaCode,
              businessZipCode,
            },
          });

          res.json({
            success: true,
            phoneNumber: assignmentResult.number.phoneNumber,
            areaCode: assignmentResult.number.areaCode,
            fallbackUsed: assignmentResult.fallbackUsed,
            message: assignmentResult.fallbackUsed
              ? `Assigned ${assignmentResult.number.phoneNumber} (fallback - no local numbers available)`
              : `Local number assigned: ${assignmentResult.number.phoneNumber}`,
          });
        } else {
          res.status(500).json({
            success: false,
            error: assignmentResult.error || "Failed to assign phone number",
          });
        }
      } catch (error) {
        console.error("Auto-assign number error:", error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Get SMS messages with pagination and search
  app.get("/api/sms/messages", requireAuth, async (req: any, res) => {
    try {
      const { direction, search = "", page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = Math.min(parseInt(limit as string), 100); // Max 100 per page
      const offset = (pageNum - 1) * limitNum;

      // Get total count of messages
      let query = db
        .select({ count: sql<number>`COUNT(*)` })
        .from(smsMessages)
        .where(
          and(
            eq(smsMessages.businessId, req.business.id),
            direction
              ? eq(smsMessages.direction, direction as "inbound" | "outbound")
              : undefined,
            search
              ? sql`LOWER(${smsMessages.messageBody}) LIKE LOWER(${`%${search}%`})`
              : undefined
          )
        );

      const totalResult = await query;
      const total = totalResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limitNum);

      // Get paginated messages
      const messages = await storage.getSmsMessages(
        req.business.id,
        direction as "inbound" | "outbound" | undefined,
        limitNum,
        offset,
        search as string
      );

      console.log(
        `Found ${messages.length} messages for business ${req.business.id} (page ${pageNum})`
      );

      // Return paginated response
      res.json({
        data: messages,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error("Get SMS messages error:", error);
      res
        .status(500)
        .json({
          message: "Failed to get SMS messages",
          error: error instanceof Error ? error.message : "Unknown error",
        });
    }
  });

  // Get SMS conversation with specific client
  app.get(
    "/api/sms/conversation/:clientId",
    requireAuth,
    async (req: any, res) => {
      try {
        const clientId = parseInt(req.params.clientId);
        const conversation = await storage.getSmsConversation(
          req.business.id,
          clientId
        );
        res.json(conversation);
      } catch (error) {
        console.error("Get SMS conversation error:", error);
        res.status(500).json({ message: "Failed to get SMS conversation" });
      }
    }
  );

  // Send SMS with template rendering
  app.post("/api/sms/send", requireAuth, async (req: any, res) => {
    try {
      const { clientId, messageTemplate, messageType = "manual" } = req.body;

      // Get client details
      const client = await storage.getClientById(clientId, req.business.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      if (!client.phone) {
        return res.status(400).json({ message: "Client has no phone number" });
      }

      // Get business phone number
      const business = await storage.getBusinessById(req.business.id);
      if (!business?.selectedPhoneNumber) {
        return res.status(400).json({
          message:
            "No business phone number configured. Please set up your Twilio number first.",
        });
      }

      // Render message template with variables
      const variables = {
        client_name: client.name,
        referral_link: `${process.env.REPLIT_DEV_DOMAIN || "https://referable.replit.app"}/refer?code=${client.referralCode}`,
        google_review_link:
          business.googleReviewLink || "https://g.page/your-business/review",
        business_name: business.name,
      };

      const renderedMessage = renderMessageTemplate(messageTemplate, variables);

      // Send SMS
      const smsResult = await sendSms({
        to: client.phone,
        message: renderedMessage,
        from: business.selectedPhoneNumber,
      });

      if (smsResult.success) {
        // Save to SMS messages table
        await storage.createSmsMessage({
          businessId: req.business.id,
          clientId: client.id,
          direction: "outbound",
          fromNumber: business.selectedPhoneNumber,
          toNumber: client.phone,
          messageBody: renderedMessage,
          messageType: messageType,
          twilioSid: smsResult.messageSid!,
          status: "sent",
        });

        // Also save to legacy SMS logs for backward compatibility
        await storage.createSmsLog({
          businessId: req.business.id,
          clientId: client.id,
          phoneNumber: client.phone,
          messageContent: renderedMessage,
          messageType: messageType,
          twilioSid: smsResult.messageSid!,
          status: "sent",
        });

        // Log activity
        await storage.createActivityLog({
          businessId: req.business.id,
          type: "sms_sent",
          description: `SMS sent to ${client.name}`,
          metadata: {
            clientId: client.id,
            clientName: client.name,
            phoneNumber: client.phone,
            messageType: messageType,
            messageLength: renderedMessage.length,
            twilioSid: smsResult.messageSid,
          },
        });

        res.json({
          success: true,
          messageSid: smsResult.messageSid,
          message: "SMS sent successfully",
        });
      } else {
        res.status(500).json({
          success: false,
          error: smsResult.error || "Failed to send SMS",
        });
      }
    } catch (error) {
      console.error("Send SMS error:", error);
      res.status(500).json({ message: "Failed to send SMS" });
    }
  });

  // Reply to SMS conversation
  app.post("/api/sms/reply", requireAuth, async (req: any, res) => {
    try {
      const { clientId, message: messageContent, originalMessageId } = req.body;

      if (!messageContent?.trim()) {
        return res.status(400).json({ message: "Message cannot be empty" });
      }

      // Get client, business, and outreach settings
      const [client, business, outreachSettings] = await Promise.all([
        storage.getClient(clientId, req.business.id),
        storage.getBusinessById(req.business.id),
        storage.getOutreachSettings(req.business.id),
      ]);

      if (!client || !business) {
        return res
          .status(404)
          .json({ message: "Client or business not found" });
      }

      if (!client.phone || !business.selectedPhoneNumber) {
        return res
          .status(400)
          .json({
            message: "Phone number not configured for client or business",
          });
      }

      // Get referral discount amount
      const referralDiscount = outreachSettings?.referralDiscount || "$25";

      // Generate referral link
      const baseUrl = business.websiteUrl || `https://${business.webhookUrl}`;
      const referralLink = `${baseUrl}?ref=${encodeURIComponent(client.referralCode)}`;

      // Replace placeholders in message
      let message = messageContent
        .replace(/{clientName}/g, client.name)
        .replace(/{referralCode}/g, client.referralCode)
        .replace(/{referralLink}/g, referralLink)
        .replace(/{referralDiscount}/g, referralDiscount);

      try {
        // Send reply
        const smsResult = await sendSms({
          to: client.phone,
          message: message,
          from: business.selectedPhoneNumber,
        });

        if (!smsResult.success) {
          throw new Error(smsResult.error || "Failed to send SMS");
        }

        // Save outbound reply
        await storage.createSmsMessage({
          businessId: req.business.id,
          clientId: client.id,
          direction: "outbound",
          fromNumber: business.selectedPhoneNumber,
          toNumber: client.phone,
          messageBody: message,
          messageType: "reply",
          twilioSid: smsResult.messageSid!,
          status: "sent",
        });

        // Mark original message as read if specified
        if (originalMessageId) {
          await storage.markSmsMessageAsRead(
            originalMessageId,
            req.business.id
          );
        }

        return res.json({
          success: true,
          messageSid: smsResult.messageSid,
          message: "Reply sent successfully",
        });
      } catch (error) {
        console.error("SMS send error:", error);
        return res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : "Failed to send SMS",
        });
      }
    } catch (error) {
      console.error("SMS reply processing error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process SMS reply",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get unread SMS count
  app.get("/api/sms/unread-count", requireAuth, async (req: any, res) => {
    try {
      const count = await storage.getUnreadSmsMessagesCount(req.business.id);
      res.json({ unreadCount: count });
    } catch (error) {
      console.error("Get unread SMS count error:", error);
      res.status(500).json({ message: "Failed to get unread count" });
    }
  });

  // Mark SMS message as read
  app.post(
    "/api/sms/mark-read/:messageId",
    requireAuth,
    async (req: any, res) => {
      try {
        const messageId = parseInt(req.params.messageId);
        const updatedMessage = await storage.markSmsMessageAsRead(
          messageId,
          req.business.id
        );

        if (updatedMessage) {
          res.json({ success: true, message: "Message marked as read" });
        } else {
          res.status(404).json({ message: "Message not found" });
        }
      } catch (error) {
        console.error("Mark SMS as read error:", error);
        res.status(500).json({ message: "Failed to mark message as read" });
      }
    }
  );

  // Get owned Twilio numbers
  app.get("/api/sms/owned-numbers", requireAuth, async (req: any, res) => {
    try {
      const ownedNumbers = await getOwnedNumbers();
      res.json({ numbers: ownedNumbers });
    } catch (error) {
      console.error("Get owned numbers error:", error);
      res.status(500).json({ message: "Failed to get owned numbers" });
    }
  });

  // SMS Dashboard Summary
  app.get("/api/sms/dashboard", requireAuth, async (req: any, res) => {
    try {
      const [unreadCount, recentInbound, recentOutbound, totalMessages] =
        await Promise.all([
          storage.getUnreadSmsMessagesCount(req.business.id),
          storage.getSmsMessages(req.business.id, "inbound", 10),
          storage.getSmsMessages(req.business.id, "outbound", 10),
          storage
            .getSmsMessages(req.business.id, undefined, 1000)
            .then((msgs) => msgs.length),
        ]);

      res.json({
        unreadCount,
        totalMessages,
        recentInbound: recentInbound.slice(0, 5),
        recentOutbound: recentOutbound.slice(0, 5),
        hasBusinessNumber: !!(await storage.getBusinessById(req.business.id))
          ?.selectedPhoneNumber,
      });
    } catch (error) {
      console.error("SMS dashboard error:", error);
      res.status(500).json({ message: "Failed to get SMS dashboard data" });
    }
  });

  // Inbound SMS webhook from Twilio
  app.post("/api/sms/inbound", async (req, res) => {
    const { handleSmsWebhook } = await import("./sms-webhook-handler");
    await handleSmsWebhook(req, res);
  });

  // SMS forwarding settings endpoints
  app.get(
    "/api/sms/forwarding-settings",
    requireAuth,
    async (req: any, res) => {
      try {
        const business = await storage.getBusinessById(req.business.id);
        res.json({
          enableForwarding: business?.enableForwarding || false,
          forwardingNumber: business?.forwardingNumber || null,
        });
      } catch (error) {
        console.error("Get forwarding settings error:", error);
        res.status(500).json({ message: "Failed to get forwarding settings" });
      }
    }
  );

  app.post("/api/sms/update-forwarding", requireAuth, async (req: any, res) => {
    try {
      const { enableForwarding, forwardingNumber } = req.body;

      let normalizedForwardingNumber = null;
      if (enableForwarding && forwardingNumber) {
        normalizedForwardingNumber = normalizePhoneNumber(forwardingNumber);
        if (!normalizedForwardingNumber) {
          return res
            .status(400)
            .json({ message: "Invalid forwarding phone number format" });
        }
      }

      await storage.updateBusiness(req.business.id, {
        enableForwarding: enableForwarding || false,
        forwardingNumber: normalizedForwardingNumber,
      });

      res.json({
        success: true,
        enableForwarding: enableForwarding || false,
        forwardingNumber: normalizedForwardingNumber,
        message: "Forwarding settings updated successfully",
      });
    } catch (error) {
      console.error("Update forwarding settings error:", error);
      res.status(500).json({ message: "Failed to update forwarding settings" });
    }
  });

  // Test Auto-Assignment Feature (Demo Mode)
  app.post(
    "/api/sms/test-auto-assignment",
    requireAuth,
    async (req: any, res) => {
      try {
        const { preferredAreaCode, businessZipCode } = req.body;

        console.log(`Testing auto-assignment for business ${req.business.id}:`);
        console.log(`- Preferred Area Code: ${preferredAreaCode || "None"}`);
        console.log(`- Business ZIP Code: ${businessZipCode || "None"}`);

        // Import the ZIP to area code mapping
        const { getPriorityAreaCodes } = await import("./zip-to-area-code.js");
        const priorityAreaCodes = getPriorityAreaCodes(
          preferredAreaCode,
          businessZipCode
        );

        console.log(`- Priority Area Codes: [${priorityAreaCodes.join(", ")}]`);

        // Simulate the search process without actually purchasing
        const simulationResults = [];

        for (const areaCode of priorityAreaCodes) {
          try {
            console.log(`Searching for numbers in area code ${areaCode}...`);

            // Try to search for available numbers (read-only)
            const { searchAvailableNumbers } = await import(
              "./twilio-service.js"
            );
            const availableNumbers = await searchAvailableNumbers(areaCode, 3);

            simulationResults.push({
              areaCode,
              available: availableNumbers.length,
              numbers: availableNumbers.map((n) => n.phoneNumber).slice(0, 2), // Show first 2
            });

            if (availableNumbers.length > 0) {
              console.log(
                `Found ${availableNumbers.length} numbers in ${areaCode}`
              );
              break; // Would purchase the first one in real mode
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            console.log(`Error searching area code ${areaCode}:`, errorMessage);
            simulationResults.push({
              areaCode,
              available: 0,
              error: errorMessage,
            });
          }
        }

        // Check current business phone setup
        const business = await storage.getBusinessById(req.business.id);

        res.json({
          success: true,
          testMode: true,
          business: {
            currentPhone: business?.selectedPhoneNumber || null,
            name: business?.name,
          },
          input: {
            preferredAreaCode: preferredAreaCode || null,
            businessZipCode: businessZipCode || null,
          },
          analysis: {
            priorityAreaCodes,
            searchResults: simulationResults,
            recommendation: simulationResults.find((r) => r.available > 0)
              ? `Recommend area code ${simulationResults.find((r) => r.available > 0)?.areaCode}`
              : "Would fall back to any available US number",
          },
          nextSteps: [
            "In production, system would purchase the first available number",
            "Business record would be updated with new phone number",
            "Twilio webhook would be configured for SMS reception",
            "Activity log would record the assignment",
          ],
        });
      } catch (error) {
        console.error("Test auto-assignment error:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        res.status(500).json({
          success: false,
          error: errorMessage,
          testMode: true,
        });
      }
    }
  );

  // LEAD MANAGEMENT API ROUTES

  // Get lead statistics
  app.get("/api/leads/stats", requireAuth, async (req: any, res) => {
    try {
      const stats = await storage.getLeadStats(req.business.id);
      res.json(stats);
    } catch (error) {
      console.error("Lead stats error:", error);
      res.status(500).json({ message: "Failed to fetch lead statistics" });
    }
  });

  // Get all leads
  app.get("/api/leads", requireAuth, async (req: any, res) => {
    try {
      const leads = await storage.getLeadsByBusinessId(req.business.id);
      res.json(leads);
    } catch (error) {
      console.error("Leads error:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  // Create new lead
  app.post("/api/leads", requireAuth, async (req: any, res) => {
    try {
      const leadData = insertLeadSchema.parse({
        ...req.body,
        businessId: req.business.id,
      });

      const lead = await storage.createLead(leadData);

      // Log lead creation event
      await logEvent(req.business.id.toString(), "lead_created", {
        lead_id: lead.id,
        lead_name: lead.name,
        lead_email: lead.email,
        source: lead.source,
        has_phone: !!lead.phone,
      });

      res.json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      console.error("Create lead error:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  // Update lead status
  app.patch("/api/leads/:leadId/status", requireAuth, async (req: any, res) => {
    try {
      const { leadId } = req.params;
      const { status } = req.body;

      if (
        !status ||
        !["new", "contacted", "converted", "lost"].includes(status)
      ) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const lead = await storage.updateLeadStatus(
        parseInt(leadId),
        req.business.id,
        status
      );

      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Log status change event
      await logEvent(req.business.id.toString(), "lead_status_changed", {
        lead_id: lead.id,
        lead_name: lead.name,
        old_status: req.body.old_status || "unknown",
        new_status: status,
      });

      res.json(lead);
    } catch (error) {
      console.error("Update lead status error:", error);
      res.status(500).json({ message: "Failed to update lead status" });
    }
  });

  // Send SMS to lead
  app.post("/api/leads/:leadId/sms", requireAuth, async (req: any, res) => {
    try {
      const { leadId } = req.params;
      const { message } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ message: "Message is required" });
      }

      const lead = await storage.getLeadById(parseInt(leadId), req.business.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (!lead.phone) {
        return res.status(400).json({ message: "Lead has no phone number" });
      }

      // Send SMS via Twilio
      const result = await sendSms({
        to: lead.phone,
        message: message,
        from: req.business.selectedPhoneNumber,
      });

      if (result.success) {
        // Log communication
        await storage.createLeadCommunication({
          businessId: req.business.id,
          leadId: lead.id,
          type: "sms",
          direction: "outbound",
          content: message,
          status: "sent",
        });

        // Log SMS event
        await logEvent(req.business.id.toString(), "lead_sms_sent", {
          lead_id: lead.id,
          lead_name: lead.name,
          message_length: message.length,
        });

        res.json({ success: true, message: "SMS sent successfully" });
      } else {
        res.status(500).json({ message: result.error || "Failed to send SMS" });
      }
    } catch (error) {
      console.error("Send SMS to lead error:", error);
      res.status(500).json({ message: "Failed to send SMS" });
    }
  });

  // Send email to lead
  app.post("/api/leads/:leadId/email", requireAuth, async (req: any, res) => {
    try {
      const { leadId } = req.params;
      const { subject, message } = req.body;

      if (
        !subject ||
        !message ||
        subject.trim().length === 0 ||
        message.trim().length === 0
      ) {
        return res
          .status(400)
          .json({ message: "Subject and message are required" });
      }

      const lead = await storage.getLeadById(parseInt(leadId), req.business.id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (!lead.email) {
        return res.status(400).json({ message: "Lead has no email address" });
      }

      // Send email via Resend
      const { sendLeadEmail } = await import("./email-service");
      const result = await sendLeadEmail(
        lead.email,
        subject,
        message,
        req.business
      );

      if (result.success) {
        // Log communication
        await storage.createLeadCommunication({
          businessId: req.business.id,
          leadId: lead.id,
          type: "email",
          direction: "outbound",
          content: `Subject: ${subject}\n\n${message}`,
          status: "sent",
        });

        // Log email event
        await logEvent(req.business.id.toString(), "lead_email_sent", {
          lead_id: lead.id,
          lead_name: lead.name,
          subject: subject,
          message_length: message.length,
        });

        res.json({ success: true, message: "Email sent successfully" });
      } else {
        res
          .status(500)
          .json({ message: result.error || "Failed to send email" });
      }
    } catch (error) {
      console.error("Send email to lead error:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Get lead communications
  app.get(
    "/api/leads/:leadId/communications",
    requireAuth,
    async (req: any, res) => {
      try {
        const { leadId } = req.params;

        const communications = await storage.getLeadCommunications(
          parseInt(leadId),
          req.business.id
        );
        res.json(communications);
      } catch (error) {
        console.error("Get lead communications error:", error);
        res.status(500).json({ message: "Failed to fetch communications" });
      }
    }
  );

  // FORM MANAGEMENT API ROUTES

  // Get all forms
  app.get("/api/forms", requireAuth, async (req: any, res) => {
    try {
      const forms = await storage.getFormsByBusinessId(req.business.id);
      res.json(forms);
    } catch (error) {
      console.error("Forms error:", error);
      res.status(500).json({ message: "Failed to fetch forms" });
    }
  });

  // Create new form
  app.post("/api/forms", requireAuth, async (req: any, res) => {
    try {
      const formData = insertFormSchema.parse({
        ...req.body,
        businessId: req.business.id,
      });

      const form = await storage.createForm(formData);

      // Log form creation event
      await logEvent(req.business.id.toString(), "form_created", {
        form_id: form.id,
        form_name: form.name,
        field_count: Array.isArray(form.fields) ? form.fields.length : 0,
      });

      res.json(form);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      console.error("Create form error:", error);
      res.status(500).json({ message: "Failed to create form" });
    }
  });

  // Update form
  app.patch("/api/forms/:formId", requireAuth, async (req: any, res) => {
    try {
      const { formId } = req.params;
      const updateData = req.body;

      const form = await storage.updateForm(
        parseInt(formId),
        req.business.id,
        updateData
      );

      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      // Log form update event
      await logEvent(req.business.id.toString(), "form_updated", {
        form_id: form.id,
        form_name: form.name,
      });

      res.json(form);
    } catch (error) {
      console.error("Update form error:", error);
      res.status(500).json({ message: "Failed to update form" });
    }
  });

  // Delete form
  app.delete("/api/forms/:formId", requireAuth, async (req: any, res) => {
    try {
      const { formId } = req.params;

      const success = await storage.deleteForm(
        parseInt(formId),
        req.business.id
      );

      if (!success) {
        return res.status(404).json({ message: "Form not found" });
      }

      // Log form deletion event
      await logEvent(req.business.id.toString(), "form_deleted", {
        form_id: parseInt(formId),
      });

      res.json({ success: true, message: "Form deleted successfully" });
    } catch (error) {
      console.error("Delete form error:", error);
      res.status(500).json({ message: "Failed to delete form" });
    }
  });

  // Public form submission endpoint
  app.post("/api/forms/:embedToken/submit", async (req, res) => {
    try {
      const { embedToken } = req.params;
      const submission = req.body;

      // Find form by embed token
      const form = await storage.getFormByEmbedToken(embedToken);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }

      // Extract lead data from submission
      const leadData = {
        businessId: form.businessId,
        name: submission.name || submission.Name || "Unknown",
        email: submission.email || submission.Email || null,
        phone: submission.phone || submission.Phone || null,
        source: "form",
        formId: form.id,
        customFields: submission,
        notes: submission.message || submission.Message || null,
        referralCode: submission.referralCode || null,
        smsOptIn: Boolean(
          submission.smsOptIn || submission["sms-opt-in"] || false
        ),
      };

      // Create lead
      const lead = await storage.createLead(leadData);

      // Handle referral tracking if referral code is present
      if (submission.referralCode) {
        try {
          // Find the referrer client by referral code
          const referrer = await storage.getClientByReferralCode(
            submission.referralCode,
            form.businessId
          );

          if (referrer) {
            // Create referral record
            await storage.createReferral({
              businessId: form.businessId,
              referrerCode: submission.referralCode,
              refereeName: lead.name,
              refereeEmail: lead.email || "unknown@example.com",
              refereePhone: lead.phone,
            });

            // Log referral tracking
            await logEvent(form.businessId.toString(), "referral_tracked", {
              form_id: form.id,
              form_name: form.name,
              lead_id: lead.id,
              lead_name: lead.name,
              referrer_code: submission.referralCode,
              referrer_name: referrer.name,
              submission_source: "embedded_form",
            });
          }
        } catch (error) {
          console.error("Error tracking referral:", error);
          // Continue with form submission even if referral tracking fails
        }
      }

      // Update form submission count
      await storage.incrementFormSubmissions(form.id);

      // Log form submission
      await logEvent(form.businessId.toString(), "form_submitted", {
        form_id: form.id,
        form_name: form.name,
        lead_id: lead.id,
        lead_name: lead.name,
        submission_source: "public_form",
        has_referral: !!submission.referralCode,
      });

      res.json({
        success: true,
        message: "Thank you for your submission! We'll be in touch soon.",
      });
    } catch (error) {
      console.error("Form submission error:", error);
      res.status(500).json({ message: "Failed to submit form" });
    }
  });

  // Form embed endpoint (returns HTML form)
  app.get("/api/forms/:embedToken/embed", async (req, res) => {
    try {
      const { embedToken } = req.params;

      const form = await storage.getFormByEmbedToken(embedToken);
      if (!form) {
        return res.status(404).send("Form not found");
      }

      // Generate HTML form based on form fields
      const formFields = Array.isArray(form.fields) ? form.fields : [];
      const formStyles = (form.styles as any) || {
        font: "Inter",
        primaryColor: "#667eea",
        textColor: "#374151",
        backgroundColor: "#ffffff",
        buttonShape: "rounded",
        fieldBorderStyle: "boxed",
        theme: "modern",
        spacing: "comfortable",
        borderRadius: "8px",
        shadowLevel: "subtle",
        gradientStyle: "none",
        containerWidth: "full",
        fieldSize: "medium",
        buttonStyle: "solid",
        trustElements: true,
        privacyText: "We respect your privacy and will never spam you.",
      };

      const baseUrl =
        process.env.NODE_ENV === "development"
          ? "http://127.0.0.1:3000"
          : "https://" + process.env.REPLIT_DEV_DOMAIN;

      const fieldHtml = await Promise.all(
        formFields.map(async (field: any) => {
          switch (field.type) {
            case "text":
            case "email":
            case "phone":
              return `
              <div class="form-field">
                <label class="form-label">${field.label}${field.required ? '<span class="required-asterisk">*</span>' : ""}</label>
                <input 
                  type="${field.type}" 
                  name="${field.id}" 
                  placeholder="${field.placeholder || ""}"
                  ${field.required ? "required" : ""}
                  class="form-input"
                />
              </div>
            `;
            case "textarea":
              return `
              <div class="form-field">
                <label class="form-label">${field.label}${field.required ? '<span class="required-asterisk">*</span>' : ""}</label>
                <textarea 
                  name="${field.id}" 
                  placeholder="${field.placeholder || ""}"
                  ${field.required ? "required" : ""}
                  rows="4"
                  class="form-textarea"
                ></textarea>
              </div>
            `;
            case "select":
              const options = Array.isArray(field.options) ? field.options : [];
              return `
              <div class="form-field">
                <label class="form-label">${field.label}${field.required ? '<span class="required-asterisk">*</span>' : ""}</label>
                <select 
                  name="${field.id}" 
                  ${field.required ? "required" : ""}
                  class="form-select"
                >
                  <option value="">Choose an option...</option>
                  ${options.map((opt: string) => `<option value="${opt}">${opt}</option>`).join("")}
                </select>
              </div>
            `;
            case "checkbox":
              return `
              <div class="form-field">
                <div class="checkbox-field">
                  <input 
                    type="checkbox" 
                    name="${field.id}" 
                    value="true"
                    ${field.required ? "required" : ""}
                    class="form-checkbox"
                    id="${field.id}"
                  />
                  <label for="${field.id}" class="checkbox-label">${field.label}${field.required ? '<span class="required-asterisk">*</span>' : ""}</label>
                </div>
              </div>
            `;
            case "sms-optin":
              const business = await storage.getBusinessById(form.businessId);
              const businessName = business?.name || "[Business Name]";
              return `
              <div class="form-field">
                <div class="sms-optin-field">
                  <input 
                    type="checkbox" 
                    name="smsOptIn" 
                    value="true"
                    class="form-checkbox"
                    id="sms-optin-${field.id}"
                  />
                  <label for="sms-optin-${field.id}" class="checkbox-label sms-optin-label">
                    ${field.smsOptInText || field.label || "Yes, I'd like to receive SMS updates about my service appointments and special offers."}
                  </label>
                </div>
                <div class="sms-compliance-notice">
                  <small style="color: #6b7280; font-size: 12px; margin-top: 8px; display: block; line-height: 1.4;">
                    By checking this box, you consent to receive SMS messages from ${businessName} related to booking inquiries and other relevant communications.
                  </small>
                </div>
              </div>
            `;
            default:
              return "";
          }
        })
      );

      const fieldHtmlString = fieldHtml.join("");

      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${form.name}</title>
          <style>
            #referable-form-${embedToken} {
              --rf-font: '${formStyles.font}', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              --rf-primary-color: ${formStyles.primaryColor};
              --rf-text-color: ${formStyles.textColor};
              --rf-bg-color: ${formStyles.backgroundColor};
              --rf-button-radius: ${formStyles.buttonShape === "rounded" ? "8px" : formStyles.buttonShape === "slightly-rounded" ? "4px" : "0px"};
              --rf-field-border: ${formStyles.fieldBorderStyle === "boxed" ? "2px solid #e5e7eb" : formStyles.fieldBorderStyle === "underline" ? "0px solid transparent" : "none"};
              --rf-field-border-bottom: ${formStyles.fieldBorderStyle === "underline" ? "2px solid #e5e7eb" : "inherit"};
              --rf-spacing: ${formStyles.spacing === "compact" ? "16px" : formStyles.spacing === "spacious" ? "32px" : "24px"};
              --rf-field-size: ${formStyles.fieldSize === "small" ? "10px 12px" : formStyles.fieldSize === "large" ? "16px 20px" : "12px 16px"};
              --rf-shadow: ${formStyles.shadowLevel === "none" ? "none" : formStyles.shadowLevel === "medium" ? "0 10px 15px -3px rgba(0, 0, 0, 0.1)" : formStyles.shadowLevel === "strong" ? "0 25px 50px -12px rgba(0, 0, 0, 0.25)" : "0 4px 6px -1px rgba(0, 0, 0, 0.1)"};
              --rf-container-width: ${formStyles.containerWidth === "narrow" ? "320px" : formStyles.containerWidth === "medium" ? "480px" : formStyles.containerWidth === "wide" ? "640px" : "100%"};
            }
            
            * {
              box-sizing: border-box;
            }
            body {
              font-family: var(--rf-font);
              line-height: 1.6;
              color: var(--rf-text-color);
              margin: 0;
              padding: 20px;
              background: linear-gradient(135deg, var(--rf-primary-color) 0%, #764ba2 100%);
              min-height: 100vh;
            }
            #referable-form-${embedToken} .form-container {
              background: var(--rf-bg-color);
              max-width: var(--rf-container-width);
              margin: 0 auto;
              padding: var(--rf-spacing);
              border-radius: var(--rf-button-radius);
              box-shadow: var(--rf-shadow);
              position: relative;
              overflow: hidden;
              ${formStyles.theme === "modern" ? "border-top: 4px solid var(--rf-primary-color);" : ""}
              ${formStyles.theme === "minimal" ? "border: 1px solid #e5e7eb;" : ""}
              ${formStyles.theme === "classic" ? "border: 2px solid #d1d5db; background: #fafafa;" : ""}
              ${formStyles.theme === "vibrant" ? "background: linear-gradient(135deg, var(--rf-bg-color) 0%, #f3f4f6 100%);" : ""}
            }
            #referable-form-${embedToken} .form-container::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 4px;
              background: linear-gradient(90deg, var(--rf-primary-color) 0%, #764ba2 100%);
            }
            #referable-form-${embedToken} .form-title {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 8px;
              color: var(--rf-text-color);
              text-align: center;
            }
            #referable-form-${embedToken} .form-description {
              color: var(--rf-text-color);
              opacity: 0.7;
              margin-bottom: 32px;
              font-size: 16px;
              text-align: center;
              line-height: 1.5;
            }
            #referable-form-${embedToken} .form-field {
              margin-bottom: var(--rf-spacing);
            }
            #referable-form-${embedToken} .form-label {
              display: block;
              font-size: 14px;
              font-weight: 600;
              color: var(--rf-text-color);
              margin-bottom: 8px;
            }
            #referable-form-${embedToken} .required-asterisk {
              color: #ef4444;
              margin-left: 2px;
            }
            #referable-form-${embedToken} .form-input, 
            #referable-form-${embedToken} .form-textarea, 
            #referable-form-${embedToken} .form-select {
              width: 100%;
              padding: var(--rf-field-size);
              border: var(--rf-field-border);
              border-bottom: var(--rf-field-border-bottom);
              border-radius: var(--rf-button-radius);
              font-size: ${formStyles.fieldSize === "small" ? "14px" : formStyles.fieldSize === "large" ? "18px" : "16px"};
              color: var(--rf-text-color);
              background-color: #ffffff;
              transition: all 0.2s ease;
              outline: none;
              font-family: var(--rf-font);
            }
            #referable-form-${embedToken} .form-input:focus, 
            #referable-form-${embedToken} .form-textarea:focus, 
            #referable-form-${embedToken} .form-select:focus {
              border-color: var(--rf-primary-color);
              box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            .form-input::placeholder, .form-textarea::placeholder {
              color: #9ca3af;
            }
            .form-textarea {
              resize: vertical;
              min-height: 100px;
            }
            .form-select {
              cursor: pointer;
              appearance: none;
              background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
              background-position: right 12px center;
              background-repeat: no-repeat;
              background-size: 16px;
              padding-right: 48px;
            }
            .checkbox-field {
              display: flex;
              align-items: flex-start;
              gap: 12px;
            }
            .form-checkbox {
              width: 18px;
              height: 18px;
              margin: 0;
              cursor: pointer;
              accent-color: #667eea;
            }
            .checkbox-label {
              font-size: 14px;
              color: #374151;
              cursor: pointer;
              line-height: 1.4;
              margin: 0;
            }
            .sms-optin-field {
              display: flex;
              align-items: flex-start;
              gap: 12px;
              padding: 16px;
              background: #f8fafc;
              border-left: 4px solid var(--rf-primary-color);
              border-radius: var(--rf-button-radius);
              margin-top: 8px;
            }
            .sms-optin-label {
              font-size: 13px;
              color: #475569;
              line-height: 1.5;
              font-weight: 500;
            }
            .privacy-text {
              margin-top: var(--rf-spacing);
              padding: 16px;
              background: #f8fafc;
              border-radius: var(--rf-button-radius);
              border: 1px solid #e2e8f0;
              text-align: center;
            }
            .privacy-icons {
              display: flex;
              justify-content: center;
              gap: 8px;
              margin-bottom: 8px;
            }
            .security-icon, .verified-icon {
              font-size: 16px;
              opacity: 0.8;
            }
            .privacy-message {
              font-size: 12px;
              color: #64748b;
              margin: 0;
              line-height: 1.4;
              font-weight: 500;
            }
            #referable-form-${embedToken} .submit-button {
              ${formStyles.buttonStyle === "solid" ? `background: var(--rf-primary-color); color: white; border: none;` : ""}
              ${formStyles.buttonStyle === "outline" ? `background: transparent; color: var(--rf-primary-color); border: 2px solid var(--rf-primary-color);` : ""}
              ${formStyles.buttonStyle === "gradient" ? `background: linear-gradient(135deg, var(--rf-primary-color) 0%, #764ba2 100%); color: white; border: none;` : ""}
              padding: ${formStyles.fieldSize === "small" ? "10px 24px" : formStyles.fieldSize === "large" ? "18px 40px" : "14px 32px"};
              border-radius: var(--rf-button-radius);
              font-size: ${formStyles.fieldSize === "small" ? "14px" : formStyles.fieldSize === "large" ? "18px" : "16px"};
              font-weight: 600;
              cursor: pointer;
              width: 100%;
              transition: all 0.2s ease;
              position: relative;
              overflow: hidden;
              font-family: var(--rf-font);
            }
            #referable-form-${embedToken} .submit-button:hover:not(:disabled) {
              transform: translateY(-1px);
              filter: brightness(110%);
              box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
            }
            #referable-form-${embedToken} .submit-button:active {
              transform: translateY(0);
            }
            #referable-form-${embedToken} .submit-button:disabled {
              opacity: 0.7;
              cursor: not-allowed;
              transform: none;
              box-shadow: none;
            }
            .success-message {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 16px 20px;
              border-radius: 8px;
              margin-bottom: 24px;
              font-weight: 500;
              text-align: center;
              animation: slideIn 0.3s ease;
              display: none;
            }
            .error-message {
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              color: white;
              padding: 16px 20px;
              border-radius: 8px;
              margin-bottom: 24px;
              font-weight: 500;
              text-align: center;
              animation: slideIn 0.3s ease;
              display: none;
            }
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateY(-10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .loading-spinner {
              display: inline-block;
              width: 16px;
              height: 16px;
              border: 2px solid #ffffff;
              border-radius: 50%;
              border-top-color: transparent;
              animation: spin 1s ease-in-out infinite;
              margin-right: 8px;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            @media (max-width: 640px) {
              body {
                padding: 16px;
              }
              .form-container {
                padding: 24px;
              }
              .form-title {
                font-size: 24px;
              }
            }
          </style>
        </head>
        <body>
          <div id="referable-form-${embedToken}">
            <div class="form-container">
              <h1 class="form-title">${form.name}</h1>
              ${form.description ? `<p class="form-description">${form.description}</p>` : ""}
              
              <div class="success-message" id="success-message">
                ✨ Thank you! Your information has been submitted successfully. We'll be in touch soon!
              </div>
              <div class="error-message" id="error-message">
                ⚠️ Sorry, there was an error submitting your information. Please try again or contact us directly.
              </div>
              
              <form id="lead-form">
                ${fieldHtmlString}
                <button type="submit" class="submit-button" id="submit-btn">Submit</button>
                ${
                  formStyles.trustElements
                    ? `
                  <div class="privacy-text">
                    <div class="privacy-icons">
                      <span class="security-icon">🔒</span>
                      <span class="verified-icon">✓</span>
                    </div>
                    <p class="privacy-message">${formStyles.privacyText || "We respect your privacy and will never spam you."}</p>
                  </div>
                `
                    : ""
                }
              </form>
            </div>
          </div>


<script>
  // Referral tracking functionality
  function detectReferralCode() {
    // Check for 'ref' parameter in current page URL
    const urlParams = new URLSearchParams(window.location.search);
    let referralCode = urlParams.get('ref');
    
    // If not found in current page, check parent window (for iframe embedding)
    if (!referralCode && window.parent !== window) {
      try {
        const parentParams = new URLSearchParams(window.parent.location.search);
        referralCode = parentParams.get('ref');
      } catch (e) {
        // Cross-origin iframe restrictions - try to get from document.referrer
        if (document.referrer) {
          try {
            const referrerUrl = new URL(document.referrer);
            const referrerParams = new URLSearchParams(referrerUrl.search);
            referralCode = referrerParams.get('ref');
          } catch (e) {
            console.debug('Could not parse referrer URL for referral code');
          }
        }
      }
    }
    
    // Store referral code if found
    if (referralCode) {
      console.debug('Referral code detected:', referralCode);
      sessionStorage.setItem('referralCode', referralCode);
      
      // Show referral indicator (optional visual feedback)
      showReferralIndicator(referralCode);
    }
    
    return referralCode;
  }
  
  function showReferralIndicator(referralCode) {
    const formTitle = document.querySelector('.form-title');
    if (formTitle && !document.querySelector('.referral-indicator')) {
      const indicator = document.createElement('div');
      indicator.className = 'referral-indicator';
      indicator.style.cssText = \`
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        text-align: center;
        margin-bottom: 16px;
        animation: fadeIn 0.5s ease;
      \`;
      indicator.innerHTML = '🎉 Referred by ' + referralCode + ' - You both get rewards!';
      formTitle.parentNode.insertBefore(indicator, formTitle.nextSibling);
    }
  }
  
  // Detect referral on page load
  document.addEventListener('DOMContentLoaded', function() {
    detectReferralCode();
  });
  
  // FIXED: Form submission with proper URL handling
  document.getElementById('lead-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    const successMsg = document.getElementById('success-message');
    const errorMsg = document.getElementById('error-message');
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading-spinner"></span>Submitting...';
    successMsg.style.display = 'none';
    errorMsg.style.display = 'none';
    
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Add referral code if available
    const referralCode = sessionStorage.getItem('referralCode') || detectReferralCode();
    if (referralCode) {
      data.referralCode = referralCode;
      console.debug('Including referral code in submission:', referralCode);
    }
    
    // FIX 1: Use absolute URL or get base URL dynamically
    const submitUrl = \`${baseUrl}/api/forms/${embedToken}/submit\`;
    
    console.log('Submitting to:', submitUrl);
    console.log('Data:', data);
    
    try {
      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Accept',
        },
        body: JSON.stringify(data)
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Success response:', result);
        
        successMsg.style.display = 'block';
        e.target.reset();
        
        // Update success message for referrals
        if (referralCode) {
          successMsg.innerHTML = "🎉 Thank you! Your referral has been tracked and you both qualify for rewards. We'll be in touch soon!";
        }
        
        // Scroll to success message
        successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // FIX 3: Better error handling
        const errorText = await response.text();
        console.error('Server error:', response.status, errorText);
        throw new Error(\`Server error: ${response.status}\`);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      errorMsg.style.display = 'block';
      
      // Show more specific error message in development
      if (error.message.includes('Failed to fetch')) {
        errorMsg.innerHTML = '⚠️ Network error: Could not connect to server. Please check your connection and try again.';
      } else {
        errorMsg.innerHTML = '⚠️ Sorry, there was an error submitting your information. Please try again or contact us directly.';
      }
      
      // Scroll to error message
      errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Submit';
    }
  });
  
  // FIX 4: Make embedToken available to the script
  const embedToken = '${embedToken}';
</script>
        </body>
        </html>
      `;

      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      console.error("Form embed error:", error);
      res.status(500).send("Error loading form");
    }
  });

  // Referral redirect endpoint - handles /ref/{code} links
  app.get("/ref/:referralCode", async (req, res) => {
    try {
      const { referralCode } = req.params;

      // Find the business that owns this referral code
      let targetBusiness: any = null;
      let referrerClient: any = null;

      // Search across all businesses to find the referral code
      const businesses = await storage.getAllBusinesses();

      for (const business of businesses) {
        const client = await storage.getClientByReferralCode(
          referralCode,
          business.id
        );
        if (client) {
          targetBusiness = business;
          referrerClient = client;
          break;
        }
      }

      if (!targetBusiness || !referrerClient) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Referral Not Found</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                       text-align: center; padding: 40px; background: #f8fafc; }
                .container { max-width: 400px; margin: 0 auto; background: white; 
                            padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                h1 { color: #ef4444; margin-bottom: 16px; }
                p { color: #64748b; line-height: 1.6; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🔍 Referral Not Found</h1>
                <p>The referral code "${referralCode}" could not be found or may have expired.</p>
                <p>Please check the link and try again, or contact the person who referred you.</p>
              </div>
            </body>
          </html>
        `);
      }

      // If business has a website URL, redirect there with referral parameter
      if (targetBusiness.websiteUrl) {
        const websiteUrl = new URL(targetBusiness.websiteUrl);
        websiteUrl.searchParams.set("ref", referralCode);
        return res.redirect(302, websiteUrl.toString());
      }

      // Otherwise, show Referable's hosted referral landing page
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You've Been Referred to ${targetBusiness.name}!</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              margin: 0;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 20px;
              padding: 40px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
              text-align: center;
            }
            .emoji {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #1f2937;
              margin-bottom: 16px;
              font-size: 32px;
              font-weight: 700;
            }
            .business-name {
              color: #667eea;
              font-weight: 800;
            }
            .referrer-info {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 20px;
              border-radius: 12px;
              margin: 24px 0;
            }
            .cta-section {
              margin: 32px 0;
              padding: 24px;
              background: #f8fafc;
              border-radius: 12px;
            }
            .cta-button {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 16px 32px;
              border: none;
              border-radius: 8px;
              font-size: 18px;
              font-weight: 600;
              cursor: pointer;
              text-decoration: none;
              display: inline-block;
              margin: 8px;
              transition: all 0.2s ease;
            }
            .cta-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 16px rgba(0,0,0,0.2);
            }
            .benefits {
              text-align: left;
              margin: 24px 0;
            }
            .benefit {
              display: flex;
              align-items: center;
              margin: 12px 0;
              padding: 12px;
              background: #f0f9ff;
              border-radius: 8px;
            }
            .benefit-icon {
              margin-right: 12px;
              font-size: 20px;
            }
            .footer {
              margin-top: 32px;
              padding-top: 24px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="emoji">🎉</div>
            <h1>Welcome! You've been referred to <span class="business-name">${targetBusiness.name}</span></h1>
            
            <div class="referrer-info">
              <h3>🌟 ${referrerClient.name} thinks you'll love ${targetBusiness.name}!</h3>
              <p>When you book your first service, you both get special rewards.</p>
            </div>
            
            <div class="benefits">
              <div class="benefit">
                <span class="benefit-icon">💰</span>
                <span>Get exclusive discounts on your first booking</span>
              </div>
              <div class="benefit">
                <span class="benefit-icon">⭐</span>
                <span>Trusted by ${referrerClient.name} and hundreds of other customers</span>
              </div>
              <div class="benefit">
                <span class="benefit-icon">🎁</span>
                <span>Both you and ${referrerClient.name} earn rewards when you book</span>
              </div>
            </div>
            
            <div class="cta-section">
              <h3>Ready to get started?</h3>
              <p>Contact ${targetBusiness.name} to schedule your service and claim your referral rewards!</p>
              
              ${targetBusiness.email ? `<a href="mailto:${targetBusiness.email}?subject=Referral from ${referrerClient.name}" class="cta-button">📧 Email Us</a>` : ""}
              ${targetBusiness.phone ? `<a href="tel:${targetBusiness.phone}" class="cta-button">📞 Call Now</a>` : ""}
            </div>
            
            <div class="footer">
              <p>Referral Code: <strong>${referralCode}</strong></p>
              <p>Powered by Referable • Making referrals simple and rewarding</p>
            </div>
          </div>
          
          <script>
            // Track referral page view
            console.log('Referral landing page viewed for:', '${referralCode}');
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Referral redirect error:", error);
      res.status(500).send("Error processing referral link");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
