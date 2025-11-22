import { Card, CardContent } from "@/components/ui/card";
import { Users, Share2, Star, TrendingUp } from "lucide-react";

interface StatsGridProps {
  stats: {
    totalClients: number;
    totalReferrals: number;
    avgLoyaltyScore: number;
    monthlyRevenue: number;
    activeReferrals: number;
    referralRevenue: number;
  };
}

export function StatsGrid({ stats }: StatsGridProps) {
  const cards = [
    {
      title: "Total Clients",
      value: stats.totalClients.toString(),
      icon: Users,
      color: "bg-primary-100 text-primary-500",
      trend: "+12%",
      trendLabel: "vs last month",
    },
    {
      title: "Active Referrals",
      value: stats.activeReferrals.toString(),
      icon: Share2,
      color: "bg-orange-100 text-orange-500",
      trend: "+25%",
      trendLabel: "conversion rate",
    },
    {
      title: "Total Referrals",
      value: stats.totalReferrals.toString(),
      icon: Share2,
      color: "bg-blue-100 text-blue-500",
      trend: "+18%",
      trendLabel: "this month",
    },
    {
      title: "Avg Loyalty Score",
      value: stats.avgLoyaltyScore.toFixed(1),
      icon: Star,
      color: "bg-green-100 text-green-500",
      trend: "+0.3",
      trendLabel: "vs last month",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className="w-full h-fit border-0 max-w-2xl rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]"
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#A0AEC0] font-bold truncate">
                      {card.title}
                    </p>
                    <p className="text-2xl font-bold">
                      {card.value}
                    </p>
                  </div>
                  {card.title === "Total Clients" ? (
                    <svg
                      width="48"
                      height="47"
                      viewBox="0 0 48 47"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g filter="url(#filter0_d_38_1276)">
                        <rect
                          x="6.4082"
                          y="2.71564"
                          width="35.2687"
                          height="35.2687"
                          rx="12"
                          fill="#0EA765"
                        />
                      </g>
                      <g clip-path="url(#clip0_38_1276)">
                        <path
                          d="M32.125 15.9414L25.1448 22.9217L21.4709 19.2479L15.9602 24.7586M32.125 15.9414H27.7165M32.125 15.9414V20.35"
                          stroke="white"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </g>
                      <defs>
                        <filter
                          id="filter0_d_38_1276"
                          x="0.908203"
                          y="0.715637"
                          width="46.2688"
                          height="46.2688"
                          filterUnits="userSpaceOnUse"
                          color-interpolation-filters="sRGB"
                        >
                          <feFlood
                            flood-opacity="0"
                            result="BackgroundImageFix"
                          />
                          <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                            result="hardAlpha"
                          />
                          <feOffset dy="3.5" />
                          <feGaussianBlur stdDeviation="2.75" />
                          <feColorMatrix
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.02 0"
                          />
                          <feBlend
                            mode="normal"
                            in2="BackgroundImageFix"
                            result="effect1_dropShadow_38_1276"
                          />
                          <feBlend
                            mode="normal"
                            in="SourceGraphic"
                            in2="effect1_dropShadow_38_1276"
                            result="shape"
                          />
                        </filter>
                        <clipPath id="clip0_38_1276">
                          <rect
                            width="17.6344"
                            height="17.6344"
                            fill="white"
                            transform="translate(15.2253 11.5328)"
                          />
                        </clipPath>
                      </defs>
                    </svg>
                  ) : card.title === "Active Referrals" ? (
                    <svg
                      width="47"
                      height="47"
                      viewBox="0 0 47 47"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g filter="url(#filter0_d_38_1268)">
                        <rect
                          x="5.6106"
                          y="2.71561"
                          width="35.2687"
                          height="35.2687"
                          rx="12"
                          fill="#EA6A0A"
                        />
                      </g>
                      <g clip-path="url(#clip0_38_1268)">
                        <path
                          d="M23.2446 27.6976C27.3026 27.6976 30.5923 24.408 30.5923 20.35C30.5923 16.292 27.3026 13.0023 23.2446 13.0023C19.1866 13.0023 15.897 16.292 15.897 20.35C15.897 24.408 19.1866 27.6976 23.2446 27.6976Z"
                          stroke="white"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M23.2446 24.7586C25.6794 24.7586 27.6532 22.7848 27.6532 20.35C27.6532 17.9152 25.6794 15.9414 23.2446 15.9414C20.8098 15.9414 18.836 17.9152 18.836 20.35C18.836 22.7848 20.8098 24.7586 23.2446 24.7586Z"
                          stroke="white"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                        <path
                          d="M23.2446 21.8195C24.0562 21.8195 24.7142 21.1616 24.7142 20.35C24.7142 19.5384 24.0562 18.8804 23.2446 18.8804C22.433 18.8804 21.7751 19.5384 21.7751 20.35C21.7751 21.1616 22.433 21.8195 23.2446 21.8195Z"
                          stroke="white"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </g>
                      <defs>
                        <filter
                          id="filter0_d_38_1268"
                          x="0.110595"
                          y="0.715606"
                          width="46.2688"
                          height="46.2688"
                          filterUnits="userSpaceOnUse"
                          color-interpolation-filters="sRGB"
                        >
                          <feFlood
                            flood-opacity="0"
                            result="BackgroundImageFix"
                          />
                          <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                            result="hardAlpha"
                          />
                          <feOffset dy="3.5" />
                          <feGaussianBlur stdDeviation="2.75" />
                          <feColorMatrix
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.02 0"
                          />
                          <feBlend
                            mode="normal"
                            in2="BackgroundImageFix"
                            result="effect1_dropShadow_38_1268"
                          />
                          <feBlend
                            mode="normal"
                            in="SourceGraphic"
                            in2="effect1_dropShadow_38_1268"
                            result="shape"
                          />
                        </filter>
                        <clipPath id="clip0_38_1268">
                          <rect
                            width="17.6344"
                            height="17.6344"
                            fill="white"
                            transform="translate(14.4275 11.5328)"
                          />
                        </clipPath>
                      </defs>
                    </svg>
                  ) : card.title === "Total Referrals" ? (
                    <svg
                      width="47"
                      height="47"
                      viewBox="0 0 47 47"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g filter="url(#filter0_d_38_1260)">
                        <rect
                          x="5.81299"
                          y="2.71561"
                          width="35.2687"
                          height="35.2687"
                          rx="12"
                          fill="#E32456"
                        />
                      </g>
                      <g clip-path="url(#clip0_38_1260)">
                        <path
                          d="M27.1215 26.9629V25.4933C27.1215 24.7138 26.8118 23.9663 26.2607 23.4151C25.7095 22.8639 24.9619 22.5543 24.1824 22.5543H18.3043C17.5248 22.5543 16.7772 22.8639 16.2261 23.4151C15.6749 23.9663 15.3652 24.7138 15.3652 25.4933V26.9629M31.5301 26.9629V25.4933C31.5296 24.8421 31.3128 24.2095 30.9139 23.6949C30.5149 23.1802 29.9563 22.8126 29.3258 22.6498M26.3867 13.8326C27.0189 13.9945 27.5793 14.3621 27.9794 14.8777C28.3796 15.3932 28.5968 16.0272 28.5968 16.6798C28.5968 17.3324 28.3796 17.9664 27.9794 18.482C27.5793 18.9975 27.0189 19.3652 26.3867 19.527M24.1824 16.6761C24.1824 18.2993 22.8666 19.6152 21.2434 19.6152C19.6202 19.6152 18.3043 18.2993 18.3043 16.6761C18.3043 15.0529 19.6202 13.7371 21.2434 13.7371C22.8666 13.7371 24.1824 15.0529 24.1824 16.6761Z"
                          stroke="white"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </g>
                      <defs>
                        <filter
                          id="filter0_d_38_1260"
                          x="0.312988"
                          y="0.715606"
                          width="46.2688"
                          height="46.2688"
                          filterUnits="userSpaceOnUse"
                          color-interpolation-filters="sRGB"
                        >
                          <feFlood
                            flood-opacity="0"
                            result="BackgroundImageFix"
                          />
                          <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                            result="hardAlpha"
                          />
                          <feOffset dy="3.5" />
                          <feGaussianBlur stdDeviation="2.75" />
                          <feColorMatrix
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.02 0"
                          />
                          <feBlend
                            mode="normal"
                            in2="BackgroundImageFix"
                            result="effect1_dropShadow_38_1260"
                          />
                          <feBlend
                            mode="normal"
                            in="SourceGraphic"
                            in2="effect1_dropShadow_38_1260"
                            result="shape"
                          />
                        </filter>
                        <clipPath id="clip0_38_1260">
                          <rect
                            width="17.6344"
                            height="17.6344"
                            fill="white"
                            transform="translate(14.6304 11.5328)"
                          />
                        </clipPath>
                      </defs>
                    </svg>
                  ) : (
                    <svg
                      width="47"
                      height="47"
                      viewBox="0 0 47 47"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g filter="url(#filter0_d_38_1252)">
                        <rect
                          x="6.01562"
                          y="2.71561"
                          width="35.2687"
                          height="35.2687"
                          rx="12"
                          fill="#9D4DF3"
                        />
                      </g>
                      <path
                        d="M23.6499 13.0023L25.9203 17.6019L30.9976 18.3441L27.3237 21.9224L28.1908 26.9775L23.6499 24.5896L19.1091 26.9775L19.9761 21.9224L16.3022 18.3441L21.3795 17.6019L23.6499 13.0023Z"
                        stroke="white"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <defs>
                        <filter
                          id="filter0_d_38_1252"
                          x="0.515625"
                          y="0.715606"
                          width="46.2688"
                          height="46.2688"
                          filterUnits="userSpaceOnUse"
                          color-interpolation-filters="sRGB"
                        >
                          <feFlood
                            flood-opacity="0"
                            result="BackgroundImageFix"
                          />
                          <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                            result="hardAlpha"
                          />
                          <feOffset dy="3.5" />
                          <feGaussianBlur stdDeviation="2.75" />
                          <feColorMatrix
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.02 0"
                          />
                          <feBlend
                            mode="normal"
                            in2="BackgroundImageFix"
                            result="effect1_dropShadow_38_1252"
                          />
                          <feBlend
                            mode="normal"
                            in="SourceGraphic"
                            in2="effect1_dropShadow_38_1252"
                            result="shape"
                          />
                        </filter>
                      </defs>
                    </svg>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
