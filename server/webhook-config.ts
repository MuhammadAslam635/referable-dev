/**
 * Centralized webhook URL configuration for Twilio
 * Ensures consistent webhook URLs across all Twilio number operations
 */

/**
 * Gets the base URL for the application
 * @returns Base URL (e.g., https://referable.live or http://127.0.0.1:3000)
 */
export function getBaseUrl(): string {
  // Priority order for determining base URL:
  // 1. FRONTEND_URL (explicitly set)
  // 2. REPLIT_DEV_DOMAIN (Replit environment)
  // 3. Fallback to production domain

  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }

  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }

  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS}`;
  }

  // Default production URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://referable.live';
  }

  // Local development fallback
  return 'http://127.0.0.1:3000';
}

/**
 * Gets the full webhook URL for a specific path
 * @param path - API path (e.g., '/api/sms/inbound')
 * @returns Full webhook URL
 */
export function getWebhookUrl(path: string = '/api/sms/inbound'): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}${path}`;
}

/**
 * Gets all Twilio webhook URLs needed for phone number configuration
 * @returns Object with all webhook URLs
 */
export function getTwilioWebhookConfig() {
  const smsInboundUrl = getWebhookUrl('/api/sms/inbound');
  const smsStatusUrl = getWebhookUrl('/api/sms/status');

  return {
    smsUrl: smsInboundUrl,
    smsMethod: 'POST' as const,
    smsFallbackUrl: smsInboundUrl, // Use same URL as fallback
    smsFallbackMethod: 'POST' as const,
    statusCallback: smsStatusUrl,
    statusCallbackMethod: 'POST' as const,
  };
}

/**
 * Logs webhook configuration for debugging
 */
export function logWebhookConfig(): void {
  const config = getTwilioWebhookConfig();
  console.log('=== Twilio Webhook Configuration ===');
  console.log('Base URL:', getBaseUrl());
  console.log('SMS Inbound URL:', config.smsUrl);
  console.log('SMS Status URL:', config.statusCallback);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('====================================');
}
