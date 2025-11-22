import twilio, { Twilio } from 'twilio';
import { getPriorityAreaCodes, isValidAreaCode } from './zip-to-area-code.js';
import { getTwilioWebhookConfig, logWebhookConfig } from './webhook-config.js';

let twilioClient: Twilio | null = null;

// // Initialize Twilio client if environment variables are available
// if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
//   twilioClient = twilio(
//     process.env.TWILIO_ACCOUNT_SID,
//     process.env.TWILIO_AUTH_TOKEN
//   );
  
// } else {
//   console.error('Twilio client not initialized. Check your environment variables.');
// }



function getTwilioClient(): Twilio | null {
  if (twilioClient) {
    return twilioClient;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.error('Twilio credentials not found in environment variables');
    return null;
  }

  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('Twilio client initialized successfully');
    return twilioClient;
  } catch (error) {
    console.error('Failed to initialize Twilio client:', error);
    return null;
  }
}

export interface SendSmsParams {
  to: string;
  message: string;
  from?: string; // Allow custom from number
}

export interface SmsResult {
  success: boolean;
  messageSid?: string;
  error?: string;
}

export interface TwilioNumber {
  phoneNumber: string;
  sid: string;
  areaCode: string;
  friendlyName?: string;
}

export interface NumberAssignmentResult {
  success: boolean;
  number?: TwilioNumber;
  error?: string;
  fallbackUsed?: boolean;
}

export async function sendSms({ to, message, from }: SendSmsParams): Promise<SmsResult> {
  const twilioClient = getTwilioClient();
  if (!twilioClient) {
    const errorMsg = 'Twilio client not initialized. Please check your environment variables (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN).';
    console.error(errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }

  if (!from) {
    return {
      success: false,
      error: 'No from number provided. Please select a Twilio number to send from.'
    };
  }

  try {
    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: from,
      to: to,
    });

    return {
      success: true,
      messageSid: twilioMessage.sid,
    };
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add +1 if it's a 10-digit US number
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // Add + if it doesn't start with it
  if (cleaned.length > 10 && !phone.startsWith('+')) {
    return `+${cleaned}`;
  }
  
  return phone;
}

export function validatePhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  // Basic validation for international format
  return /^\+[1-9]\d{1,14}$/.test(formatted);
}

/**
 * Search for available SMS-enabled phone numbers in a specific area code
 */
export async function searchAvailableNumbers(areaCode: string, limit: number = 5): Promise<TwilioNumber[]> {
  const client = getTwilioClient();
  if (!client) {
    console.error('Twilio client not initialized');
    return [];
  }

  try {
    console.log(`Searching for numbers in area code ${areaCode}...`);
    
    const numbers = await client.availablePhoneNumbers('US')
      .local
      .list({
        areaCode: parseInt(areaCode),
        smsEnabled: true,
        limit
      }) as any[];

    return numbers.map((number: any) => ({
      phoneNumber: number.phoneNumber,
      sid: '', // Will be set after purchase
      areaCode: areaCode,
      friendlyName: number.friendlyName || undefined
    }));
  } catch (error) {
    console.error(`Error searching numbers for area code ${areaCode}:`, error);
    return [];
  }
}

/**
 * Purchase a Twilio phone number
 */
export async function purchasePhoneNumber(phoneNumber: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  const client = getTwilioClient();
  if (!client) {
    return { success: false, error: 'Twilio client not initialized' };
  }

  try {
    console.log(`Purchasing phone number ${phoneNumber}...`);

    // Get centralized webhook configuration
    const webhookConfig = getTwilioWebhookConfig();
    logWebhookConfig(); // Log webhook URLs for debugging

    // Purchase the number with full webhook configuration
    const incomingPhoneNumber = await client.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber,
      ...webhookConfig
    });

    return {
      success: true,
      sid: incomingPhoneNumber.sid
    };
  } catch (error) {
    console.error(`Error purchasing number ${phoneNumber}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Auto-assign a local Twilio number based on business preferences
 */
export async function autoAssignLocalNumber(
  preferredAreaCode?: string,
  businessZipCode?: string
): Promise<NumberAssignmentResult> {
  const client = getTwilioClient();
  if (!client) {
    return { success: false, error: 'Twilio client not initialized' };
  }

  try {
    // Get priority area codes (preferred first, then ZIP-based)
    const priorityAreaCodes = getPriorityAreaCodes(preferredAreaCode, businessZipCode);
    
    if (priorityAreaCodes.length === 0) {
      console.log('No area codes specified, searching for any available US number...');
      return await assignAnyAvailableNumber();
    }

    // Try each area code in priority order
    for (const areaCode of priorityAreaCodes) {
      if (!isValidAreaCode(areaCode)) {
        console.log(`Skipping invalid area code: ${areaCode}`);
        continue;
      }

      const availableNumbers = await searchAvailableNumbers(areaCode, 3);
      
      if (availableNumbers.length > 0) {
        // Try to purchase the first available number
        const numberToPurchase = availableNumbers[0];
        const purchaseResult = await purchasePhoneNumber(numberToPurchase.phoneNumber);
        
        if (purchaseResult.success && purchaseResult.sid) {
          return {
            success: true,
            number: {
              ...numberToPurchase,
              sid: purchaseResult.sid
            },
            fallbackUsed: areaCode !== preferredAreaCode
          };
        }
      }
    }

    // If no numbers found in preferred/ZIP area codes, assign any available US number
    console.log('No numbers available in preferred area codes, trying fallback...');
    return await assignAnyAvailableNumber();

  } catch (error) {
    console.error('Error in auto-assign local number:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Assign any available US SMS number as fallback
 */
export async function assignAnyAvailableNumber(): Promise<NumberAssignmentResult> {
  const client = getTwilioClient();
  if (!client) {
    return { success: false, error: 'Twilio client not initialized' };
  }

  try {
    // If no numbers in preferred area code, try any available US number
    const anyAvailableNumbers = await client.availablePhoneNumbers('US')
      .tollFree
      .list({
        smsEnabled: true,
        limit: 1
      });

    if (anyAvailableNumbers.length === 0) {
      return {
        success: false,
        error: 'No SMS-enabled numbers available'
      };
    }

    const numberToPurchase = anyAvailableNumbers[0];
    const purchaseResult = await purchasePhoneNumber(numberToPurchase.phoneNumber);
    
    if (purchaseResult.success && purchaseResult.sid) {
      // Extract area code from phone number
      const areaCode = numberToPurchase.phoneNumber.substring(2, 5);
      
      return {
        success: true,
        number: {
          phoneNumber: numberToPurchase.phoneNumber,
          sid: purchaseResult.sid,
          areaCode: areaCode,
          friendlyName: numberToPurchase.friendlyName || undefined
        },
        fallbackUsed: true
      };
    }

    return {
      success: false,
      error: purchaseResult.error || 'Failed to purchase number'
    };
  } catch (error) {
    console.error('Error assigning fallback number:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get list of purchased Twilio numbers for the account
 */
export async function getOwnedNumbers(): Promise<TwilioNumber[]> {
  const client = getTwilioClient();
  if (!client) {
    console.error('Twilio client not initialized');
    return [];
  }

  try {
    const numbers = await client.incomingPhoneNumbers.list() as any[];
    
    return numbers.map((number: any) => ({
      phoneNumber: number.phoneNumber,
      sid: number.sid,
      areaCode: number.phoneNumber.substring(2, 5),
      friendlyName: number.friendlyName || undefined
    }));
  } catch (error) {
    console.error('Error fetching owned numbers:', error);
    return [];
  }
}

/**
 * Render SMS message template with variables
 */
export function renderMessageTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), value || '');
  });
  
  return rendered;
}

// Export the getter function instead of the client directly
export { getTwilioClient };