export function getWebhookUrl(webhookId: string): string {
  const domains = import.meta.env.VITE_REPLIT_DOMAINS || "";
  const domain = domains.split(",")[0] || window.location.origin;
  return `${domain}/api/webhook/${webhookId}`;
}

export function getZapierTemplateUrl(webhookUrl: string): string {
  // In production, this would be a pre-configured Zapier template
  const encodedUrl = encodeURIComponent(webhookUrl);
  return `https://zapier.com/apps/zenmaid/integrations/webhooks/create?webhook_url=${encodedUrl}`;
}
