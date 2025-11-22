import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import BusinessDashboard from "@/pages/business-dashboard";
import Leads from "@/pages/leads";
import Setup from "@/pages/setup-referable";
import Referrals from "@/pages/referrals";
import Insights from "@/pages/insights";
import Activities from "@/pages/activities";
import Settings from "@/pages/settings";
import DataSources from "@/pages/data-sources";
import Outreach from "@/pages/outreach";
import SmsManagement from "@/pages/sms-management";
import Forms from "@/pages/forms";
import NotFound from "@/pages/not-found";
import ReferralLanding from "@/pages/referral-landing";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useState, useEffect } from "react";

function AuthenticatedApp() {
  const { business } = useAuth();

  // Check if user has completed setup by checking if they have any data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  // Simple setup detection - check for both setup paths
  const shouldShowSetup =
    window.location.pathname === "/setup" ||
    window.location.pathname === "/setup-referable";

  // If user explicitly goes to setup page, show it
  if (shouldShowSetup) {
    return (
      <div className="min-h-screen bg-background">
        <Switch>
          <Route path="/setup" component={Setup} />
          <Route path="/setup-referable" component={Setup} />
          <Route component={() => <Setup />} />
        </Switch>
      </div>
    );
  }

  // Normal app interface after setup is completed
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-background">
      {!window.location.pathname.includes("/refer") && <>
        <div className="lg:hidden">
          <MobileNav />
        </div>
        <div className="hidden lg:block sticky top-0 self-start">
          <SidebarWithMargin />
        </div>
      </>}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-2 sm:p-4 max-w-7xl">
          <Switch>
            <Route path="/" component={Leads} />
            <Route path="/leads" component={Leads} />
            <Route path="/clients" component={Dashboard} />
            <Route path="/dashboard" component={BusinessDashboard} />
            <Route path="/setup" component={Setup} />
            <Route path="/setup-referable" component={Setup} />
            <Route path="/referrals" component={Referrals} />
            <Route path="/insights" component={Insights} />
            <Route path="/data-sources" component={DataSources} />
            <Route path="/outreach" component={Outreach} />
            <Route path="/sms" component={SmsManagement} />
            <Route path="/forms" component={Forms} />
            <Route path="/settings" component={Settings} />
            <Route path="/refer" component={ReferralLanding} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

// Create a wrapper component for the sidebar with margin
function SidebarWithMargin() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save collapsed state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  return (
    <div className="h-screen sticky top-0 p-2">
      <div className="h-full bg-white shadow-[0px_16px_44px_0px_#00000012] rounded-2xl overflow-hidden">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      </div>
    </div>
  );
}

function AppRouter() {
  const { business, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/refer" component={ReferralLanding} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
