import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle,
  Star,
  MessageCircle,
  Target,
  Smartphone,
  BarChart3,
  ArrowRight,
  Users,
  LogIn,
  Zap,
  TrendingUp,
  Gift,
  Shield,
  Clock,
  DollarSign,
  Play,
  Upload,
  Settings,
  Send,
} from "lucide-react";
import LeftLines from "@/icons/LeftLines";
import RightLines from "@/icons/RightLines";

const industries = [
  { value: "cleaning", label: "Cleaning Services" },
  { value: "landscaping", label: "Landscaping" },
  { value: "mobile-detailing", label: "Mobile Detailing" },
  { value: "pool-cleaning", label: "Pool Cleaning" },
  { value: "pressure-washing", label: "Pressure Washing" },
  { value: "other", label: "Other Service Business" },
];

interface SignupData {
  name: string;
  email: string;
  phone: string;
  businessName: string;
  businessType: string;
  password: string;
  confirmPassword: string;
}

export default function Landing() {
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    businessType: "",
    password: "",
    confirmPassword: "",
  });
  const { toast } = useToast();

  const signupMutation = useMutation({
    mutationFn: async (data: SignupData) => {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Signup failed");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Thanks! Let's get your referral system set up.",
        description: "You're in — starting setup now...",
      });
      // Redirect to onboarding
      window.location.href = "/setup-referable";
    },
    onError: (error: Error) => {
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.businessName ||
      !formData.businessType ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      toast({
        title: "Please fill in all fields",
        description: "All fields are required to create your account.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    signupMutation.mutate(formData);
  };

  const scrollToSignup = () => {
    setIsSignupOpen(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-12">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-4xl font-bold text-gray-900">
                Referable
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-16 font-semibold">
              <a>How it works</a>
              <a>What You'll Get</a>
              <a>About Us</a>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="bg-[#F3F3F3] hover:bg-[#E5E5E5] text-black hover:text-black px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base"
                >
                  Sign In
                </Button>
              </Link>
              <Button
                onClick={scrollToSignup}
                className="bg-gradient-to-br from-blue-800 to-blue-600 hover:from-blue-900 hover:to-blue-700 text-white font-medium px-3 py-2 text-xs sm:px-6 sm:py-2 sm:text-sm whitespace-nowrap"
              >
                <span className="">Get Started. Its Free</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-6 sm:mb-8 leading-tight tracking-tight">
            <span className="text-black">
              Clients Refer{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                2x
              </span>{" "}
              to{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                3x
              </span>{" "}
              More with a Simple Link
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-[#5F5F5F] font-medium mb-10 sm:mb-12 max-w-2xl mx-auto leading-relaxed">
            Referable tracks leads, rewards loyalty, and grows your business
            through word of mouth.
          </p>
        </div>
      </section>

      {/* Lines*/}
      <div className="flex items-center justify-center -mt-[400px] relative">
        <LeftLines className="-mr-12" />
        <div className="w-24 h-24 bg-gradient-to-br mt-52 from-blue-800 to-blue-600 rounded-3xl flex items-center justify-center relative z-10">
          <p className="text-white text-6xl font-bold">R</p>
        </div>
        <RightLines className="-ml-12" />
      </div>
      {/* Social Proof Badge */}
      <section className="py-16 sm:py-20 -mt-60 md:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-md border border-gray-200">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="text-gray-700 text-sm font-medium">
              Trusted by service businesses across the U.S.
            </span>
          </div>
        </div>
      </section>

      {/* How Referable Works Video Section */}
      <section className="py-20 px-6 relative">
        {/* Background with curved top and bottom */}
        <div
          className="absolute inset-0 bg-[#F0F6FE]"
          style={{
            clipPath:
              "polygon(0 50%, 0 52%, 25% 51%, 50% 49%, 75% 51%, 100% 52%, 100% 100%, 0 100%)",
          }}
        ></div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
              How{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Referable
              </span>{" "}
              Works
            </h2>
            <p className="text-[#5F5F5F] text-xl leading-relaxed max-w-xl mx-auto font-medium">
              Referable helps you grow through word-of-mouth without doing extra
              work. A short demo video will soon walk you through setup,
              referrals, and results all in under a minute.
            </p>
          </div>

          {/* Video Placeholder */}
          <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl aspect-video mb-8 flex items-center justify-center group cursor-pointer hover:from-gray-800 hover:to-gray-700 transition-all duration-500 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 to-purple-600/30 rounded-2xl"></div>
            <div className="absolute inset-0 bg-black/10 rounded-2xl"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-white transition-all duration-300 shadow-lg">
                <Play className="h-10 w-10 text-gray-800 ml-1" />
              </div>
              <span className="text-white font-semibold text-xl mb-2">
                Watch how it works — 60-second demo coming soon
              </span>
              <span className="text-blue-200 text-sm">
                Click to see preview
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* What You'll Get */}
      <section className="pb-16 px-6 relative">
        {/* Blue background that extends from previous section */}
        <div
          className="absolute inset-0 bg-[#F0F6FE]"
          style={{
            clipPath:
              "polygon(0 0, 0 60%, 25% 59%, 50% 61%, 75% 59%, 100% 60%, 100% 0)",
          }}
        ></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              What{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                You'll Get
              </span>
            </h2>
            <p className="text-xl text-[#5F5F5F] max-w-lg mx-auto font-medium">
              Everything you need to turn satisfied clients into your best
              marketing channel
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="group hover:scale-105 transition-all duration-300">
              <div className="flex flex-col gap-3 items-start space-x-4 p-6 rounded-2xl w-[380px] h-[350px] bg-[#FBFBFB] hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-50 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-2xl">
                  Referral texts sent automatically or on your schedule
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Never miss an opportunity to get referrals from happy clients.
                </p>
                <p className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Read More...
                </p>
              </div>
            </div>

            <div className="group hover:scale-105 transition-all duration-300">
              <div className="flex flex-col gap-3 items-start space-x-4 p-6 rounded-2xl w-[380px] h-[350px] bg-[#FBFBFB] hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-2xl">
                  Track who referred who — and how much revenue they brought in
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  See exactly which clients are your best referral sources.
                </p>
                <p className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Read More...
                </p>
              </div>
            </div>

            <div className="group hover:scale-105 transition-all duration-300">
              <div className="flex flex-col gap-3 items-start space-x-4 p-6 rounded-2xl w-[380px] h-[350px] bg-[#FBFBFB] hover:bg-gradient-to-br hover:from-yellow-50 hover:to-orange-50 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Gift className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-2xl">
                  Offer rewards like discounts, gift cards, or cash
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Incentivize referrals with rewards that work for your
                  business.
                </p>
                <p className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Read More...
                </p>
              </div>
            </div>

            <div className="group hover:scale-105 transition-all duration-300">
              <div className="flex flex-col gap-3 items-start space-x-4 p-6 rounded-2xl w-[380px] h-[350px] bg-[#FBFBFB] hover:bg-gradient-to-br hover:from-purple-50 hover:to-violet-50 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-2xl">
                  Thank-you texts after jobs + mass outreach anytime
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Keep clients engaged with automated follow-ups and bulk
                  messaging.
                </p>
                <p className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Read More...
                </p>
              </div>
            </div>

            <div className="group hover:scale-105 transition-all duration-300">
              <div className="flex flex-col gap-3 items-start space-x-4 p-6 rounded-2xl w-[380px] h-[350px] bg-[#FBFBFB] hover:bg-gradient-to-br hover:from-pink-50 hover:to-rose-50 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-2xl">
                  Google review requests sent by text
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  Boost your online reputation with simple review request
                  messages.
                </p>
                <p className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Read More...
                </p>
              </div>
            </div>

            <div className="group hover:scale-105 transition-all duration-300">
              <div className="flex flex-col gap-3 items-start space-x-4 p-6 rounded-2xl w-[380px] h-[350px] bg-[#FBFBFB] hover:bg-gradient-to-br hover:from-orange-50 hover:to-amber-50 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-2xl">
                  Know Which Clients Are Slipping Away
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  See which loyal clients are overdue based on their usual
                  schedule — and win them back with a quick follow-up.
                </p>
                <p className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Read More...
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Setup in 5 Minutes */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              From booking system to first referral you're{" "}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                live in minutes.
              </span>
            </h2>
          </div>

          {/* Progress Steps */}
          <div className="relative p-8 rounded-2xl bg-white shadow-lg">
            {/* Gradient Border */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-[2px]">
              <div className="w-full h-full bg-white rounded-2xl"></div>
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
              <div className="text-center lg:text-left">
                <span className="text-3xl font-bold text-gray-900">
                  Setup in{" "}
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    5 minutes or less
                  </span>
                </span>
              </div>

              <div className="flex flex-col lg:flex-row gap-8 lg:gap-6 items-center">
                <div className="text-center group flex flex-col sm:flex-row gap-3 items-center flex-1 min-w-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-xl flex-shrink-0">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg leading-tight text-center sm:text-left">
                    Sync your booking tool or upload clients.
                  </h3>
                </div>

                <div className="text-center group flex flex-col sm:flex-row gap-3 items-center flex-1 min-w-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-xl flex-shrink-0">
                    <Settings className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg leading-tight text-center sm:text-left">
                    Customize your messages
                  </h3>
                </div>

                <div className="text-center group flex flex-col sm:flex-row gap-3 items-center flex-1 min-w-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-xl flex-shrink-0">
                    <Send className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg leading-tight text-center sm:text-left">
                    Start sending and tracking referrals
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results You Can See */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-16">
            Results You Can See
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="w-[376px] h-[173px] text-start p-5 border border-[#9D4DF3] rounded-lg bg-white shadow-md">
              <div className="pt-2">
                <div className="text-3xl font-bold text-[#9D4DF3] mb-2">
                  <p>2× More</p>
                  <p className="text-black">Refferals</p>
                </div>
                <p className="text-[#514F5B] text-lg">
                  Make it easy for clients to refer you.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="w-[376px] h-[173px] text-start p-5 border border-[#EA6A0A] rounded-lg bg-white shadow-md">
              <div className="pt-2">
                <div className="text-3xl font-bold text-[#EA6A0A] mb-2">
                  More 5-Star
                  <p className="text-black">Reviews</p>
                </div>
                <p className="text-gray-600 text-lg">
                  Text-based review requests = more public praise.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="w-[376px] h-[173px] text-start p-5 border border-[#0EA765] rounded-lg bg-white shadow-md">
              <div className="pt-2">
                <div className="text-3xl font-bold text-[#0EA765] mb-2">
                  Thousands
                  <p className="text-black">Recovered</p>
                </div>
                <p className="text-gray-600 text-lg">
                  Don't let word-of-mouth revenue slip through the cracks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6 bg-[#F0F6FE]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
            Start Growing{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Today
            </span>
          </h2>
          <p className="text-xl text-[#5F5F5F] font-medium mb-12 leading-relaxed max-w-lg mx-auto">
            Referable helps you turn satisfied clients into repeat business and
            steady referrals without lifting a finger.
          </p>

          <Button
            size="lg"
            onClick={scrollToSignup}
            className="bg-gradient-to-br from-blue-800 to-blue-600 hover:from-blue-900 hover:to-blue-700 text-white font-medium px-3 py-2 text-xs sm:px-6 sm:py-2 sm:text-sm whitespace-nowrap"
          >
            Get Started. It's Free
          </Button>
        </div>
      </section>

      {/* Signup Dialog */}
      <Dialog open={isSignupOpen} onOpenChange={setIsSignupOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              Start Your Free Account
            </DialogTitle>
            <DialogDescription className="text-center text-gray-600">
              Get your referral system running in under 5 minutes
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  placeholder="John Smith"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@cleaningservice.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                placeholder="ABC Cleaning Services"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData({ ...formData, businessName: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Select
                value={formData.businessType}
                onValueChange={(value) =>
                  setFormData({ ...formData, businessType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {industries.map((industry) => (
                    <SelectItem key={industry.value} value={industry.value}>
                      {industry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 sm:py-3 mt-6 text-base"
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending
                ? "Creating Account..."
                : "Start Free — Launch in Minutes"}
            </Button>

            <p className="text-xs text-gray-500 text-center mt-4">
              By signing up, you agree to our Terms of Service and Privacy
              Policy. No credit card required.
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
