import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  formatDate, 
  generateInitials, 
  getAvatarGradient, 
  cn 
} from "@/lib/utils";
import { Search, Filter, Download, Check, X, Users } from "lucide-react";
import { ReferralLinkButtons } from "./referral-link-buttons";
import type { Referral } from "@shared/schema";

interface TopReferrer {
  client: {
    id: number;
    name: string;
    email: string;
    referralCode: string;
  };
  totalReferrals: number;
  convertedReferrals: number;
  conversionRate: number;
}

interface ReferralsTableProps {
  referrals: Referral[];
  topReferrers: TopReferrer[];
  isLoading: boolean;
  onExport: () => void;
}

export function ReferralsTable({ referrals, topReferrers, isLoading, onExport }: ReferralsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [filterStatus, setFilterStatus] = useState("all");

  const filteredReferrals = referrals
    .filter(referral => {
      const matchesSearch = 
        referral.refereeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referral.refereeEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        referral.referrerCode.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = 
        filterStatus === "all" ||
        (filterStatus === "converted" && referral.converted) ||
        (filterStatus === "pending" && !referral.converted);
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "createdAt":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "refereeName":
          return a.refereeName.localeCompare(b.refereeName);
        case "referrerCode":
          return a.referrerCode.localeCompare(b.referrerCode);
        case "converted":
          return Number(b.converted) - Number(a.converted);
        default:
          return 0;
      }
    });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Main Referrals Table */}
      <div className="lg:col-span-3">
        <Card className="bg-transparent border-0">
          {/* Table Header */}
          {/* <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex-1 max-w-lg">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search referrals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Sort by Date</SelectItem>
                    <SelectItem value="refereeName">Sort by Name</SelectItem>
                    <SelectItem value="referrerCode">Sort by Referrer</SelectItem>
                    <SelectItem value="converted">Sort by Status</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
          </div> */}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-black">
                    Referee
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-black">
                    Referred By
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-black">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-black">
                    Date Referred
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-black">
                    Converted
                  </th>
                </tr>
              </thead>
              <tbody className=" divide-y divide-gray-200">
                {filteredReferrals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium mb-2">No referrals found</h3>
                        <p className="text-sm">
                          {searchTerm || filterStatus !== "all" 
                            ? "Try adjusting your search or filters" 
                            : "Referrals will appear here when clients start referring others"
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReferrals.map((referral) => (
                    <tr key={referral.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {referral.refereeName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {referral.refereeEmail}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {(() => {
                            // First try to find in topReferrers list
                            const referrer = topReferrers.find(r => r.client.referralCode === referral.referrerCode);
                            if (referrer) {
                              return (
                                <div className="flex items-center">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {referrer.client.name}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {referral.referrerCode}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            
                            // Final fallback: just show the referrer code
                            return (
                              <div>
                                <Badge variant="secondary" className="text-xs">
                                  {referral.referrerCode}
                                </Badge>
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant={referral.converted ? "default" : "secondary"}
                          className={cn(
                            "text-xs",
                            referral.converted 
                              ? "bg-[#16C09861] text-[#00B087] border-[#00B087] hover:bg-green-100" 
                              : "bg-[#FFC5C5] text-[#DF0404] border-[#DF0404] hover:bg-yellow-100"
                          )}
                        >
                          {referral.converted ? "Converted" : "Pending"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {formatDate(referral.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {referral.converted ? (
                          <div className="flex items-center text-green-600">
                            <Check className="h-4 w-4 mr-1" />
                            <span className="text-sm">
                              {formatDate(referral.convertedAt)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-400">
                            <X className="h-4 w-4 mr-1" />
                            <span className="text-sm">Not yet</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Top Referrers Sidebar */}
      {/* <div className="lg:col-span-1">
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Top Referrers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topReferrers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">
                    <div className="text-sm">No referrers yet</div>
                    <div className="text-xs mt-1">Top referrers will appear here</div>
                  </div>
                </div>
              ) : (
                topReferrers.map((referrer, index) => (
                  <div key={referrer.client.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-500 w-4">
                          #{index + 1}
                        </span>
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-xs",
                          getAvatarGradient(referrer.client.name)
                        )}>
                          {generateInitials(referrer.client.name)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {referrer.client.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {referrer.client.referralCode}
                        </p>
                      </div>
                      <div className="ml-2">
                        <ReferralLinkButtons client={referrer.client} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div></div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {referrer.totalReferrals} referrals
                        </p>
                        <p className="text-xs text-gray-500">
                          {Math.round(referrer.conversionRate)}% conversion
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="mt-6 shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Referrals</span>
                <span className="text-sm font-medium">{referrals.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Converted</span>
                <span className="text-sm font-medium text-green-600">
                  {referrals.filter(r => r.converted).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Pending</span>
                <span className="text-sm font-medium text-yellow-600">
                  {referrals.filter(r => !r.converted).length}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="text-sm text-gray-600">Conversion Rate</span>
                <span className="text-sm font-medium">
                  {referrals.length > 0 
                    ? Math.round((referrals.filter(r => r.converted).length / referrals.length) * 100)
                    : 0
                  }%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div> */}
    </div>
  );
}
