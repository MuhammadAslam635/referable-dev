import { WebhookSettings } from "@/components/settings/webhook-settings";
import { BusinessProfile, AccountInformation, DangerZone } from "@/components/settings/business-settings";
import { GoogleReviewSettings } from "@/components/settings/google-review-settings";
import { SmsSettings } from "@/components/settings/sms-settings";
import { SubscriptionSettings } from "@/components/settings/subscription-settings";

export default function Settings() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className=" px-6 py-4">
        <div className="space-y-6">
          <h2 className="text-5xl font-bold text-gray-900">Settings</h2>
          <p className="text-[#5F5F5F] mt-1 text-sm sm:text-xl">Manage your business settings and integrations</p>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="space-y-12">
            <div className="flex gap-12">
              <BusinessProfile />
              <AccountInformation />
            </div>
            <SubscriptionSettings />
            {/* <SmsSettings />
            <GoogleReviewSettings />
            <WebhookSettings />
            <DangerZone /> */}
          </div>
        </div>
      </div>
    </div>
  );
}
