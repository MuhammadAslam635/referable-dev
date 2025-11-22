// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { db } from './db.js';
import { sql } from 'drizzle-orm';
import cors from 'cors';
import { handleWebhook } from "./stripe.js";


// Debug: Log environment variables at startup
console.log('=== ENVIRONMENT VARIABLES ===');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Missing');
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✓ Set' : '✗ Missing');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✓ Set' : '✗ Missing');
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'Not set');
console.log('===========================');

const app = express();

// Stripe webhook needs raw body, so we define it before express.json()
app.post('/api/stripe/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const { status, message } = await handleWebhook(req);
  res.status(status).send(message);
});

// Health check endpoint (for Docker health checks)
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await db.execute(sql`SELECT 1`);
    res.status(200).json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:3000' : process.env.REPLIT_DEV_DOMAIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

(async () => {
  // Ensure required tables exist (lightweight bootstrap for dev/demo)
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS sms_templates (
      id serial PRIMARY KEY,
      business_id integer NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name text NOT NULL,
      content text NOT NULL,
      variables jsonb DEFAULT '[]'::jsonb,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    );`);
  } catch (e) {
    console.error('DB init error (sms_templates):', e);
  }

  const server = await registerRoutes(app);

  // Schedule cleanup of expired SMS relay contexts every hour
  const { cleanupExpiredContexts } = await import('./sms-relay-service.js');
  setInterval(async () => {
    try {
      await cleanupExpiredContexts();
      console.log('SMS relay context cleanup completed');
    } catch (error) {
      console.error('SMS relay context cleanup error:', error);
    }
  }, 60 * 60 * 1000); // Every hour

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  // Only use Vite in development mode - default to static files in production
  const isDevelopment = process.env.NODE_ENV === "development";
  
  if (isDevelopment) {
    // Only import vite in development - this import is tree-shaken in production builds
    try {
      // Use a string literal to help bundlers tree-shake this in production
      const viteModule = await import(/* @vite-ignore */ "./vite.js");
      await viteModule.setupVite(app, server);
      console.log("✅ Vite dev server enabled");
    } catch (error) {
      console.warn("⚠️ Vite not available, falling back to static serving:", error);
      const { serveStatic } = await import("./static.js");
      serveStatic(app);
    }
  } else {
    // Production mode - always serve static files
    // This path is taken in production, so vite import above is never executed
    const { serveStatic } = await import("./static.js");
    serveStatic(app);
    console.log("✅ Static file serving enabled (production mode)");
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  // const port = 5000;
  // Use the port Render provides (process.env.PORT) and bind to 0.0.0.0 so the platform can detect the open port.

  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || "0.0.0.0";

  server.listen(PORT, HOST, () => {
    console.log(`Server listening on ${HOST}:${PORT} (NODE_ENV=${process.env.NODE_ENV || 'development'})`);
  });
  // server.listen({
  //   port,
  //   host: "0.0.0.0",
  //   reusePort: true,
  // }, () => {
  //   log(`serving on port ${port}`);
  // });
})();
