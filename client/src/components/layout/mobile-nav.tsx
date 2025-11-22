import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Sparkles,
  Users,
  Share2,
  Database,
  MessageSquare,
  Activity,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const { business, logout } = useAuth();
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notification counts
  const { data: unreadSmsCount = 0 } = useQuery({
    queryKey: ["/api/sms/unread-count"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/sms/unread-count");
      return response.unreadCount || 0;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: newClientsCount = 0 } = useQuery({
    queryKey: ["/api/clients", "new"],
    queryFn: async () => {
      const response = await fetch("/api/clients?new=true");
      if (!response.ok) return 0;
      const clients = await response.json();
      return Array.isArray(clients) ? clients.length : 0;
    },
    refetchInterval: 300000,
  });

  const { data: newReferralsCount = 0 } = useQuery({
    queryKey: ["/api/referrals", "new"],
    queryFn: async () => {
      const response = await fetch("/api/referrals?new=true");
      if (!response.ok) return 0;
      const referrals = await response.json();
      return Array.isArray(referrals) ? referrals.length : 0;
    },
    refetchInterval: 300000,
  });

  const navigation = [
    { name: "Leads", href: "/leads", icon: Target },
    {
      name: "Clients",
      href: "/clients",
      icon: Users,
      badge: newClientsCount > 0 ? newClientsCount : undefined,
    },
    {
      name: "Referrals",
      href: "/referrals",
      icon: Share2,
      badge: newReferralsCount > 0 ? newReferralsCount : undefined,
    },
    { name: "Insights", href: "/insights", icon: TrendingUp },
    { name: "Data Sources", href: "/data-sources", icon: Database },
    {
      name: "SMS Outreach",
      href: "/outreach",
      icon: MessageSquare,
      badge: unreadSmsCount > 0 ? unreadSmsCount : undefined,
    },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleNavClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Referable</h1>
            <p className="text-xs text-gray-500 truncate max-w-32">
              {business?.name}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-64 bg-white shadow-xl">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">
                      Referable
                    </h1>
                    <p className="text-xs text-gray-500">{business?.name}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="p-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={handleNavClick}
                  >
                    <div
                      className={cn(
                        "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative",
                        isActive
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <Badge
                          variant="destructive"
                          className="text-xs px-2 py-1 min-w-[20px] h-5 flex items-center justify-center"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-gray-200">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
