import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GiftModal } from "@/components/modals/gift-modal";
import { ThanksModal } from "@/components/modals/thanks-modal";
import {
  formatDate,
  formatFrequency,
  getLoyaltyScoreColor,
  getLoyaltyScoreWidth,
  generateInitials,
  getAvatarGradient,
  cn,
} from "@/lib/utils";
import {
  Search,
  Filter,
  Download,
  Plus,
  Heart,
  Gift,
  Users,
  Copy,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Client } from "@shared/schema";

interface ClientsTableProps {
  clients: Client[];
  onExport: () => void;
  onAddClient: () => void;
}

export function ClientsTable({
  clients,
  onExport,
  onAddClient,
}: ClientsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("loyaltyScore");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [modalType, setModalType] = useState<"gift" | "thanks" | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const clientsPerPage = 25;

  const filteredClients = clients
    .filter(
      (client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "loyaltyScore":
          return parseFloat(b.loyaltyScore) - parseFloat(a.loyaltyScore);
        case "totalBookings":
          return b.totalBookings - a.totalBookings;
        case "lastBooking":
          if (!a.lastBooking) return 1;
          if (!b.lastBooking) return -1;
          return (
            new Date(b.lastBooking).getTime() -
            new Date(a.lastBooking).getTime()
          );
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  // Calculate pagination
  const totalPages = Math.ceil(filteredClients.length / clientsPerPage);
  const indexOfLastClient = currentPage * clientsPerPage;
  const indexOfFirstClient = indexOfLastClient - clientsPerPage;
  const currentClients = filteredClients.slice(
    indexOfFirstClient,
    indexOfLastClient
  );

  // Reset to first page when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleSendThanks = (client: Client) => {
    setSelectedClient(client);
    setModalType("thanks");
  };

  const handleSendGift = (client: Client) => {
    setSelectedClient(client);
    setModalType("gift");
  };

  const closeModal = () => {
    setSelectedClient(null);
    setModalType(null);
  };

  return (
    <Card className="w-full h-fit bg-transparent border-0">
      {/* Table Header */}
      {/* <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1 max-w-lg">
            <div className="relative mr-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="loyaltyScore">Sort by Loyalty Score</SelectItem>
                <SelectItem value="lastBooking">Sort by Last Booking</SelectItem>
                <SelectItem value="totalBookings">Sort by Total Bookings</SelectItem>
                <SelectItem value="name">Sort by Name</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="bg-white" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" className="bg-white" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button className="bg-gradient-to-br from-blue-800 to-blue-600 hover:from-blue-900 hover:to-blue-700 text-white font-medium px-3 py-2 text-xs sm:px-6 sm:py-2 sm:text-sm whitespace-nowrap" onClick={onAddClient}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </div>
        </div>
      </div> */}

      {/* Table */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full">
          <thead className=" border-b border-[#959595]">
            <tr>
              <th className="px-4 py-1 text-left text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-1 text-left text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
                Referral Code
              </th>
              {/* <th className="px-6 py-1 text-left text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
                Bookings
              </th>
              <th className="px-6 py-1 text-left text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
                Frequency
              </th>
              <th className="px-6 py-1 text-left text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
                Last Booking
              </th> */}
              <th className="px-6 py-1 text-left text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
                Loyality Score
              </th>
              <th className="px-6 py-1 text-left text-sm font-bold text-[#1A1A1A] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="">
            {currentClients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">
                      No clients found
                    </h3>
                    <p className="text-sm">
                      {searchTerm
                        ? "Try adjusting your search terms"
                        : "Get started by adding your first client"}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              currentClients.map((client) => {
                const loyaltyScore = parseFloat(client.loyaltyScore);
                const scoreColor = getLoyaltyScoreColor(loyaltyScore);
                const scoreWidth = getLoyaltyScoreWidth(loyaltyScore);

                return (
                  <tr
                    key={client.id}
                    className="bg-white rounded-2xl transition-colors"
                  >
                    <td className=" py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {/* <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm",
                          getAvatarGradient(client.name)
                        )}>
                          {generateInitials(client.name)}
                        </div> */}
                        <div className="ml-4 flex flex-col">
                          <span className="text-sm font-bold text-gray-900">
                            {client.name}
                          </span>
                          <span className="text-xs text-[#718096]">
                            {client.email}
                          </span>
                          <span className="text-xs text-[#718096]">
                            {client.phone || "No phone number"}
                          </span>
                          {/* <div className="text-xs text-gray-400 mt-1 space-x-2">
                            <Badge variant="secondary" className="text-xs">
                              {client.referralCode}
                            </Badge>
                            {client.referredBy && (
                              <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                                Referred by: {client.referredBy}
                              </Badge>
                            )}
                          </div> */}
                        </div>
                      </div>
                    </td>
                    <td className="px-14 py-4 whitespace-nowrap">
                      {client.referralCode ? (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/refer?code=${client.referralCode}`
                                );
                              }}
                            >
                              <Badge
                                variant="secondary"
                                className="font-mono text-xs"
                              >
                                {client.referralCode}
                              </Badge>
                            </Button>
                            <div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 ml-2"
                                onClick={() =>
                                  window.open(
                                    `/refer?code=${client.referralCode}`,
                                    "_blank"
                                  )
                                }
                              >
                                <ExternalLink className="h-3 w-3 -mr-10" />
                              </Button>
                            </div>
                          </div>
                          {client.hasReward && (
                            <Badge
                              variant="default"
                              className="text-xs bg-green-100 text-green-800"
                            >
                              Reward Earned
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          No code yet
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                          <div
                            className={cn(
                              "loyalty-score-fill",
                              `loyalty-score-fill[data-score="${scoreColor}"]`
                            )}
                            data-score={scoreColor}
                            style={{ width: `${scoreWidth}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {loyaltyScore.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {client.totalBookings}
                      </div>
                      <div className="text-xs text-gray-500">
                        since {formatDate(client.firstBooking)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {formatFrequency(client.frequency)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {formatDate(client.lastBooking)}
                      </span>
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendThanks(client)}
                          className="text-xs text-white bg-[#F39FB5] hover:bg-[#ed6a8d]"
                        >
                          Thanks
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendGift(client)}
                          className="text-white bg-[#CAA0F7] hover:bg-[#ae70ef]"
                        >
                          Gift
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {indexOfFirstClient + 1} to{" "}
              {Math.min(indexOfLastClient, filteredClients.length)} of{" "}
              {filteredClients.length} clients
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNumber}
                      variant={
                        currentPage === pageNumber ? "default" : "outline"
                      }
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setCurrentPage(pageNumber)}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedClient && modalType === "thanks" && (
        <ThanksModal client={selectedClient} onClose={closeModal} />
      )}

      {selectedClient && modalType === "gift" && (
        <GiftModal client={selectedClient} onClose={closeModal} />
      )}
    </Card>
  );
}
