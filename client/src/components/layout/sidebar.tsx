import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { generateInitials } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  Users,
  Share2,
  Database,
  MessageSquare,
  Settings,
  LogOut,
  TrendingUp,
  FileText,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect } from "react";

const fetchBusinessProfile = async () => {
  const response = await fetch("/api/business/profile");
  if (!response.ok) {
    throw new Error("Failed to fetch business profile");
  }
  return response.json();
};

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const { business, logout } = useAuth();
  const [location] = useLocation();

  const { data: profile } = useQuery({
    queryKey: ["businessProfile"],
    queryFn: fetchBusinessProfile,
  });

  useEffect(() => {
    console.log("Profile is Here", profile);
  }, [profile]);

  // Fetch unread SMS replies count for notification badge
  const { data: unreadSmsCount = 0 } = useQuery({
    queryKey: ["/api/sms/unread-count"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/sms/unread-count");
      return response.unreadCount || 0;
    },
    refetchInterval: 30000,
  });

  // Fetch new clients count
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

  // Fetch new referrals count
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
    { name: "Leads", href: "/leads", icon: UserPlus },
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
      name: "SMS Management",
      href: "/outreach",
      icon: MessageSquare,
      badge: unreadSmsCount > 0 ? unreadSmsCount : undefined,
    },
    { name: "Forms", href: "/forms", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };
  return (
    <div className="h-full flex flex-col transition-all duration-800 ease-in-out">
      {/* Collapse Button */}
      <div className="absolute -right-1 top-6 z-10">
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6 rounded-full bg-white border hover:bg-[#EEF2FF] hover:text-black border-gray-300"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Business Branding */}
      <div
        className={cn(
          "px-8 pt-6 transition-all duration-800 ease-in-out",
          isCollapsed && "px-4"
        )}
      >
        <div className="flex items-center space-x-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-bold bg-[#F05E5E]",
              isCollapsed && "mx-auto"
            )}
          >
            {generateInitials(business?.name || "")}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xl font-bold text-brand-slate truncate">
                {business?.name}
              </p>
            </div>
          )}
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 hover:bg-[#EEF2FF]"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 p-4 ${isCollapsed && "mx-auto"}`}>
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive =
              location === item.href ||
              (item.href === "/leads" &&
                (location === "/" || location === "/leads"));
            const Icon = item.icon;

            if (profile?.subscriptionStatus !== "active") return null;

            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "justify-start space-x-3 relative",
                      isActive
                        ? "bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#EEF2FF]"
                        : "text-gray-600 hover:bg-brand-lightgray hover:text-brand-slate",
                      isCollapsed && "justify-center px-0",
                      isCollapsed
                        ? "rounded-full h-10 w-10"
                        : "rounded-[99px] w-full"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {!isCollapsed && (
                      <span className="text-sm font-medium">{item.name}</span>
                    )}
                    {!isCollapsed && item.badge && (
                      <Badge
                        variant="destructive"
                        className="ml-auto text-xs px-2 py-1 min-w-[20px] h-5 flex items-center justify-center"
                      >
                        {item.badge}
                      </Badge>
                    )}
                    {isCollapsed && item.badge && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 text-xs px-1 py-0 min-w-[16px] h-4 flex items-center justify-center"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className={cn("pb-6 px-8", isCollapsed && "px-4")}>
        {!isCollapsed && <span className="text-2xl font-bold">Referable</span>}
        {isCollapsed && <div className="flex justify-center"></div>}
      </div>
    </div>
  );
}
