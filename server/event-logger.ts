import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

interface EventLog {
  id: string;
  timestamp: string;
  user_id: string;
  event_type: string;
  details: Record<string, any>;
}

const EVENT_LOG_FILE = path.join(process.cwd(), 'event_log.json');
const MAX_EVENTS = 500;

/**
 * Logs an event to the event_log.json file
 * @param user_id - The ID of the user performing the action (business ID as string)
 * @param event_type - Type of event (e.g., "referral_sent", "csv_uploaded", "client_created")
 * @param details - Additional metadata about the event
 * 
 * CURRENT IMPLEMENTATION - Events automatically logged in routes.ts:
 * 
 * 1. BUSINESS SIGNUP (when user creates account):
 *    logEvent(business.id.toString(), "business_signup", {
 *      business_name: businessName,
 *      business_type: businessType,
 *      owner_name: name,
 *      signup_method: "landing_page"
 *    });
 * 
 * 2. CLIENT CREATION (manual client addition):
 *    logEvent(req.business.id.toString(), "client_created", {
 *      client_id: client.id,
 *      client_name: client.name,
 *      client_email: client.email,
 *      source: "manual",
 *      has_phone: !!client.phone
 *    });
 * 
 * 3. CSV UPLOAD (file processing):
 *    logEvent(req.business.id.toString(), "csv_uploaded", {
 *      filename: req.file.originalname,
 *      file_size: req.file.size,
 *      rows_processed: processed,
 *      rows_skipped: skipped,
 *      total_rows: results.length,
 *      phone_coverage: coverage_percentage,
 *      error_count: errors.length,
 *      upload_method: "web_interface"
 *    });
 * 
 * 4. WEBHOOK RECEIVED (Zapier integration):
 *    logEvent(business.id.toString(), "webhook_received", {
 *      client_name: clientName,
 *      appointment_date: appointmentDate,
 *      service_type: serviceType,
 *      amount: amountCharged,
 *      status: status || "unknown",
 *      source: "zapier_integration",
 *      webhook_id: webhookId
 *    });
 * 
 * 5. SMS SENT (outreach messaging):
 *    logEvent(req.business.id.toString(), "sms_sent", {
 *      client_id: client.id,
 *      client_name: client.name,
 *      phone_number: formattedPhone,
 *      message_type: messageType,
 *      message_length: messageContent.length,
 *      twilio_sid: smsResult.messageSid,
 *      source: "manual_outreach"
 *    });
 * 
 * SUGGESTED ADDITIONAL EVENTS TO IMPLEMENT:
 * 
 * 6. REFERRAL SENT (when client gets referral link):
 *    logEvent(businessId, "referral_sent", {
 *      referral_code: "REF-ABC123",
 *      referrer_name: "John Doe",
 *      referrer_email: "john@example.com",
 *      send_method: "sms" // or "email"
 *    });
 * 
 * 7. REFERRAL CONVERTED (successful referral completion):
 *    logEvent(businessId, "referral_converted", {
 *      referral_id: 101,
 *      referrer_id: 456,
 *      referee_id: 789,
 *      referee_name: "New Customer",
 *      referral_value: 150.00
 *    });
 * 
 * 8. BOOKING COMPLETED (appointment finished):
 *    logEvent(businessId, "booking_completed", {
 *      booking_id: 789,
 *      client_id: 456,
 *      service_type: "Deep Clean",
 *      amount: 150.00,
 *      completion_method: "webhook" // or "manual"
 *    });
 * 
 * 9. SETUP COMPLETED (onboarding finished):
 *    logEvent(businessId, "setup_completed", {
 *      setup_steps: ["basic_info", "webhook", "test_data"],
 *      time_to_complete: "5 minutes",
 *      help_requested: false
 *    });
 * 
 * 10. LOGIN (user authentication):
 *     logEvent(businessId, "user_login", {
 *       login_method: "email_password",
 *       ip_address: req.ip,
 *       user_agent: req.headers['user-agent']
 *     });
 */
export async function logEvent(user_id: string, event_type: string, details: Record<string, any> = {}): Promise<void> {
  try {
    const event: EventLog = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      user_id,
      event_type,
      details
    };

    // Read existing events or create empty array
    let events: EventLog[] = [];
    try {
      const fileContent = await fs.readFile(EVENT_LOG_FILE, 'utf-8');
      events = JSON.parse(fileContent);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty array
      events = [];
    }

    // Add new event
    events.push(event);

    // Keep only the latest MAX_EVENTS events
    if (events.length > MAX_EVENTS) {
      events = events.slice(-MAX_EVENTS);
    }

    // Write back to file
    await fs.writeFile(EVENT_LOG_FILE, JSON.stringify(events, null, 2));
    
    console.log(`Event logged: ${event_type} for user ${user_id}`);
  } catch (error) {
    console.error('Failed to log event:', error);
  }
}

/**
 * Retrieves all events from the event log
 * @returns Array of all logged events
 */
export async function getEvents(): Promise<EventLog[]> {
  try {
    const fileContent = await fs.readFile(EVENT_LOG_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    // File doesn't exist or is invalid
    return [];
  }
}