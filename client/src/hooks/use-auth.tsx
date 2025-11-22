import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Business, LoginData, SignupData } from "@shared/schema";

interface AuthContextType {
  business: Business | null;
  login: (data: LoginData) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const fetchBusinessProfile = async () => {
  const response = await fetch("/api/business/profile");
  if (!response.ok) {
    throw new Error("Failed to fetch business profile");
  }
  return response.json();
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null);
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/refer",
  ];
  const queryClient = useQueryClient();

  // Check if user is logged in
  const { data: authData, isLoading } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 0,
  });

  const { data: profile } = useQuery({
    queryKey: ["businessProfile"],
    queryFn: fetchBusinessProfile,
  });

  useEffect(() => {
    console.log("Profile in auth", authData);
    if (!publicRoutes.some((route) => window.location.pathname.includes(route)) &&
      ((!profile?.subscriptionStatus ||
        profile?.subscriptionStatus !== "active") &&
        !window.location.pathname.includes("settings"))
    ) {
      window.location.replace("/settings");
    }
    if (
      authData &&
      typeof authData === "object" &&
      authData !== null &&
      "business" in authData
    ) {
      setBusiness((authData as { business: Business }).business);
    } else {
      setBusiness(null);
    }
  }, [authData, profile]);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response;
    },
    onSuccess: (data) => {
      setBusiness(data.business);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupData) => {
      const response = await apiRequest("POST", "/api/auth/signup", data);
      return response.json();
    },
    onSuccess: (data) => {
      setBusiness(data.business);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      setBusiness(null);
      queryClient.clear();
    },
  });

  const login = async (data: LoginData) => {
    await loginMutation.mutateAsync(data);
  };

  const signup = async (data: SignupData) => {
    console.log("Making signup request with data:", data);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "include",
    });

    console.log("Signup response status:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error("Signup error response:", error);
      throw new Error(error.message || "Signup failed");
    }

    const result = await response.json();
    console.log("Signup success:", result);
    setBusiness(result.business);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        business,
        login,
        signup,
        logout,
        isLoading:
          isLoading || loginMutation.isPending || signupMutation.isPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
