import { useState, useRef, ChangeEvent } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Upload,
  Zap,
  CheckCircle,
  ExternalLink,
  FileText,
  Database,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getWebhookUrl } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import Papa from "papaparse";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import CsvDropzone from "@/components/ui/csv-dropzone";

const fetchBusinessProfile = async () => {
  const response = await fetch("/api/business/profile");
  if (!response.ok) {
    throw new Error("Failed to fetch business profile");
  }
  return response.json();
};

const plans = [
  {
    name: "Starter",
    price: "$38/month",
    features: [
      "Up to 50 referrals per month",
      "Basic referral tracking",
      "Standard email notifications",
    ],
    priceId: "price_1SHCLwLxln8mNVYpQZkZTVjK", // Your Starter Price ID
  },
  {
    name: "Pro",
    price: "$58/month",
    features: [
      "Unlimited referrals",
      "Advanced analytics & reporting",
      "Custom branding",
      "API & webhook access",
    ],
    priceId: "price_1SHCMRLxln8mNVYpwDZB6wOY", // Your Pro Price ID
  },
];

// CSV Upload History Component
function CsvUploadHistory() {
  const {
    data: uploadHistory,
    isLoading,
    error,
  } = useQuery<any[]>({
    queryKey: ["/api/csv-uploads"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading upload history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load upload history. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  if (
    !uploadHistory ||
    !Array.isArray(uploadHistory) ||
    uploadHistory.length === 0
  ) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No CSV uploads yet</p>
        <p className="text-sm text-gray-500">
          Upload your first CSV file to see history here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {uploadHistory.map((upload: any) => (
          <div key={upload.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="font-medium">{upload.fileName}</h4>
                  <p className="text-sm text-gray-500">
                    {formatDate(upload.timestamp)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-200"
                >
                  {upload.rowsProcessed} processed
                </Badge>
                {upload.rowsSkipped > 0 && (
                  <Badge
                    variant="outline"
                    className="text-orange-600 border-orange-200"
                  >
                    {upload.rowsSkipped} skipped
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Total Rows:</span>
                <span className="ml-2">{upload.totalRows}</span>
              </div>
              {upload.phoneStats && (
                <div>
                  <span className="font-medium text-gray-700">
                    Phone Coverage:
                  </span>
                  <span className="ml-2">{upload.phoneStats.coverage}%</span>
                </div>
              )}
              {upload.clientPreviews && upload.clientPreviews.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">
                    Sample Clients:
                  </span>
                  <span className="ml-2">
                    {upload.clientPreviews.join(", ")}
                  </span>
                </div>
              )}
            </div>

            {upload.errors && upload.errors.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-red-600 hover:text-red-700">
                  View Errors ({upload.errors.length})
                </summary>
                <div className="mt-2 space-y-1">
                  {upload.errors.map((error: string, index: number) => (
                    <div
                      key={index}
                      className="text-sm text-red-600 bg-red-50 p-2 rounded"
                    >
                      {error}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface CsvHeaderMapping {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceDate?: string;
  amountCharged?: string;
  appointmentStatus?: string;
}

export default function DataSources() {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [headerMapping, setHeaderMapping] = useState<CsvHeaderMapping>({});
  const [extraFields, setExtraFields] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState("csv");

  // Check if all required fields are mapped
  const areAllRequiredFieldsMapped = (): boolean => {
    const requiredFields: (keyof CsvHeaderMapping)[] = [
      "clientName",
      "clientEmail",
      "serviceDate",
      "appointmentStatus",
    ];
    return requiredFields.every(
      (field) =>
        headerMapping[field] &&
        headerMapping[field] !== "" &&
        headerMapping[field] !== "__select_placeholder__"
    );
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { business } = useAuth();

  const webhookUrl = business ? getWebhookUrl(business.webhookUrl) : "";

  const { data: profile } = useQuery({
    queryKey: ["businessProfile"],
    queryFn: fetchBusinessProfile,
  });

  const currentPlan = profile?.subscriptionPlan
    ? plans.find((p) => p.priceId === profile.subscriptionPlan)
    : null;

  const copyWebhookUrl = async () => {
    if (!webhookUrl) return;

    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      toast({
        title: "Copied!",
        description: "Webhook URL copied to clipboard.",
      });
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please manually copy the webhook URL.",
        variant: "destructive",
      });
    }
  };

  // Define required fields and their possible variations
  const requiredFields = {
    clientName: [
      "client name",
      "client_name",
      "full name",
      "full_name",
      "name",
      "customer name",
      "customer_name",
    ],
    clientEmail: [
      "client email",
      "client_email",
      "email",
      "email address",
      "email_address",
      "customer email",
      "customer_email",
    ],
    clientPhone: [
      "client phone",
      "client_phone",
      "phone",
      "phone number",
      "phone_number",
      "mobile",
      "mobile number",
      "mobile_number",
      "customer phone",
      "customer_phone",
    ],
    serviceDate: [
      "service date",
      "service_date",
      "date",
      "appointment date",
      "appointment_date",
      "booking date",
      "booking_date",
    ],
    amountCharged: [
      "amount",
      "amount charged",
      "amount_charged",
      "total",
      "price",
      "cost",
      "fee",
      "amount paid",
      "amount_paid",
    ],
    appointmentStatus: [
      "status",
      "appointment status",
      "appointment_status",
      "booking status",
      "booking_status",
      "completion status",
      "completion_status",
    ],
  };

  // Check if a header matches any of the possible field names
  const matchesField = (header: string, fieldVariations: string[]) => {
    const normalizedHeader = header
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    return fieldVariations.some(
      (variation) => normalizedHeader === variation.toLowerCase()
    );
  };

  // Handle file selection and parse headers
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset previous state
    setCsvFile(null);
    setCsvHeaders([]);
    setHeaderMapping({});
    setShowMapping(false);

    // Parse CSV headers
    Papa.parse(file, {
      preview: 1,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          // Filter out empty or whitespace-only headers
          const headers = (results.data[0] as string[])
            .map((header) => header?.trim())
            .filter((header) => header && header.length > 0);

          setCsvHeaders(headers);
          setCsvFile(file);

          // Try to auto-map headers
          const autoMapping: CsvHeaderMapping = {};
          let allRequiredMapped = true;
          const usedHeaders = new Set<string>();
          const requiredFieldKeys = Object.keys(requiredFields).filter(
            (key) => key !== "amountCharged" && key !== "clientPhone"
          ) as Array<keyof CsvHeaderMapping>;

          // Check each required field
          requiredFieldKeys.forEach((field) => {
            const matchedHeader = headers.find(
              (header) =>
                header &&
                !usedHeaders.has(header) &&
                matchesField(header, requiredFields[field])
            );

            if (matchedHeader) {
              autoMapping[field] = matchedHeader;
              usedHeaders.add(matchedHeader);
            } else {
              allRequiredMapped = false;
            }
          });

          // Try to map optional fields if they exist
          (
            ["clientPhone", "amountCharged"] as Array<keyof CsvHeaderMapping>
          ).forEach((field) => {
            const matchedHeader = headers.find(
              (header) =>
                header &&
                !usedHeaders.has(header) &&
                matchesField(header, requiredFields[field])
            );

            if (matchedHeader) {
              autoMapping[field] = matchedHeader;
              usedHeaders.add(matchedHeader);
            }
          });

          // Find extra fields (unmapped headers)
          const extra = headers.filter(
            (header) =>
              header &&
              !usedHeaders.has(header) &&
              !Object.values(autoMapping).includes(header)
          );
          setExtraFields(extra);

          // Set the mapping and show UI
          setHeaderMapping(autoMapping);
          setShowMapping(true);

          // Check if all required and optional fields are mapped
          const allFieldsMapped = Object.keys(requiredFields).every(
            (field) => autoMapping[field as keyof CsvHeaderMapping]
          );

          // Show success toast if all required and optional fields are mapped
          if (allFieldsMapped) {
            toast({
              title: "Auto-mapping successful!",
              description:
                extra.length > 0
                  ? `All required and optional fields mapped. ${extra.length} extra field(s) will be ignored.`
                  : "All fields mapped successfully!",
              variant: "default",
            });
          }
        }
      },
      error: () => {
        toast({
          title: "Error",
          description:
            "Failed to parse CSV file. Please make sure it's a valid CSV file.",
          variant: "destructive",
        });
      },
    });
  };

  // Handle mapping change
  const handleMappingChange = (
    field: keyof CsvHeaderMapping,
    value: string | undefined
  ) => {
    const isClearing =
      !value ||
      value === "__select_placeholder__" ||
      value === "__not_mapped__" ||
      value === "__clear_selection__";
    const newValue = isClearing ? undefined : value;

    // Clear any existing error for this field
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });

    // Check if the new value is already mapped to another field
    if (newValue) {
      const alreadyMappedField = Object.entries(headerMapping).find(
        ([key, val]) => key !== field && val === newValue
      );

      if (alreadyMappedField) {
        // Set error for this field
        setFieldErrors((prev) => ({
          ...prev,
          [field]: `This column is already mapped to ${alreadyMappedField[0]
            .replace(/([A-Z])/g, " $1")
            .toLowerCase()
            .trim()}`,
        }));
        // Force a re-render to reset the select value
        setHeaderMapping((prev) => ({ ...prev }));
        return; // Exit early to prevent the change
      }
    }

    setHeaderMapping((prev) => {
      // Get the previous value for this field to update extraFields
      const previousValue = prev[field];

      // Update the mapping
      const newMapping = {
        ...prev,
        [field]: newValue,
      };

      // Update extraFields based on the mapping change
      setExtraFields((prevExtra) => {
        let updatedExtra = [...prevExtra];

        // If we're clearing a mapping and the previous value exists
        if (isClearing && previousValue) {
          // Check if the previous value is not mapped to any other field
          const isMappedElsewhere = Object.entries(newMapping).some(
            ([key, val]) => key !== field && val === previousValue
          );

          // Only add back if not mapped elsewhere
          if (!isMappedElsewhere) {
            updatedExtra = [...updatedExtra, previousValue];
          }
        }
        // If we're setting a new value
        else if (newValue && newValue !== previousValue) {
          // Remove the new value from extraFields
          updatedExtra = updatedExtra.filter((header) => header !== newValue);

          // If there was a previous value, add it back if not mapped elsewhere
          if (previousValue) {
            const isMappedElsewhere = Object.entries(newMapping).some(
              ([key, val]) => key !== field && val === previousValue
            );

            if (!isMappedElsewhere) {
              updatedExtra = [...updatedExtra, previousValue];
            }
          }
        }

        return updatedExtra;
      });

      return newMapping;
    });
  };

  // Reset file selection
  const resetFileSelection = () => {
    setCsvFile(null);
    setCsvHeaders([]);
    setHeaderMapping({});
    setExtraFields([]);
    setShowMapping(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // CSV Upload Mutation
  const uploadCsv = useMutation({
    mutationFn: async ({
      file,
      mapping,
    }: {
      file: File;
      mapping: CsvHeaderMapping;
    }) => {
      const formData = new FormData();
      formData.append("csv", file);
      formData.append("mapping", JSON.stringify(mapping));

      const response = await fetch("/api/upload/csv", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        let errorMessage = "Upload failed";
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          errorMessage = `Upload failed with status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: (data) => {
      setUploadResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/csv-uploads"] });
      toast({
        title: "Upload Successful",
        description: `Processed ${data.processed} bookings, skipped ${data.skipped}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCsvUpload = (customMapping?: CsvHeaderMapping) => {
    if (!csvFile) return;

    // Use provided mapping or the one from state
    const mappingToUse = customMapping || headerMapping;

    // Clean up any placeholder values
    const cleanMapping = Object.fromEntries(
      Object.entries(mappingToUse).map(([key, value]) => [
        key,
        value === "__select_placeholder__" || value === "__not_mapped__"
          ? undefined
          : value,
      ])
    );

    // Check if required fields are mapped
    if (
      !cleanMapping.clientName ||
      !cleanMapping.clientEmail ||
      !cleanMapping.serviceDate ||
      !cleanMapping.appointmentStatus
    ) {
      // Only show error if we're not in auto-mapping mode
      if (!customMapping) {
        toast({
          title: "Missing required mappings",
          description: "Please map all required fields before uploading.",
          variant: "destructive",
        });
      }
      return;
    }

    uploadCsv.mutate({ file: csvFile, mapping: cleanMapping });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-6 pt-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between space-x-4">
            <div>
              <h1 className="text-5xl font-bold text-brand-slate">
                Data Sources
              </h1>
              <p className="text-[#5F5F5F] text-xl font-medium">
                Connect your booking systems to Referable for automated client
                management
              </p>
            </div>
            {currentPlan?.priceId === "price_1SHCMRLxln8mNVYpwDZB6wOY" && (
              <div>
                <Button
                  className="bg-gradient-to-br from-blue-800 to-blue-600 hover:from-blue-900 hover:to-blue-700 text-white font-medium px-3 py-2 text-xs sm:px-6 sm:py-2 sm:text-sm whitespace-nowrap"
                  onClick={
                    activeTab === "csv"
                      ? () => setActiveTab("zapier")
                      : () => setActiveTab("csv")
                  }
                >
                  {activeTab === "csv" ? "Switch To Zapier" : "Switch to CSV"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1">
        <div className="pt-6">
          <div className="relative">
            <div className="absolute inset-0"></div>
            <div className="relative">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                {/* {currentPlan?.priceId === "price_1SHCMRLxln8mNVYpwDZB6wOY" && (
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                      value="csv"
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      CSV Upload
                    </TabsTrigger>
                    <TabsTrigger
                      value="zapier"
                      className="flex items-center gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      Zapier Integration
                    </TabsTrigger>
                  </TabsList>
                )} */}

                <TabsContent value="csv" className="space-y-6 p-0 border-0">
                  <Card className="bg-transparent border-0 p-0">
                    <CardContent className="space-y-4 border-0">
                      <div className="space-y-4">
                        <CsvDropzone
                          onSelect={setCsvFile}
                          onInputChange={handleFileSelect}
                          className="my-8"
                        />
                        {csvFile && (
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-muted-foreground">
                              Selected: {csvFile.name} (
                              {Math.round(csvFile.size / 1024)} KB)
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={resetFileSelection}
                              className="text-gray-500 hover:text-gray-700 bg-transparent hover:bg-transparent"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}

                        {!showMapping && csvFile && (
                          <div className="space-y-4 border rounded-lg p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                            <div className="flex items-start gap-3 text-green-700 dark:text-green-300">
                              <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                              <div className="space-y-2">
                                <h4 className="font-medium">
                                  Auto-mapped columns detected!
                                </h4>
                                <p className="text-sm">
                                  We've automatically mapped your CSV columns.
                                  Click the button below to upload.
                                </p>
                                {extraFields.length > 0 && (
                                  <div className="mt-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                                    <p className="font-medium">Note:</p>
                                    <p>
                                      The following columns will be ignored as
                                      they don't match any required fields:
                                    </p>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                      {extraFields.map((field, index) => (
                                        <li
                                          key={`extra-${index}`}
                                          className="font-mono text-xs"
                                        >
                                          {field}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {showMapping && (
                          <div className="w-full h-fit border-0 bg-white rounded-2xl shadow-[0px_7px_23px_0px_#0000000D]">
                            <div className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                              <div className="grid grid-cols-12 gap-2 px-8 py-4">
                                <div className="col-span-5 font-bold">
                                  Field
                                </div>
                                <div className="col-span-7 font-bold">
                                  Map to CSV Column
                                </div>
                              </div>

                              <div className="p-2">
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 px-2">
                                  Required Fields
                                </div>
                                {[
                                  {
                                    id: "clientName",
                                    label: "Client Name",
                                    required: true,
                                    icon: "👤",
                                  },
                                  {
                                    id: "clientEmail",
                                    label: "Client Email",
                                    required: true,
                                    icon: "✉️",
                                  },
                                  {
                                    id: "serviceDate",
                                    label: "Service Date",
                                    required: true,
                                    icon: "📅",
                                  },
                                  {
                                    id: "appointmentStatus",
                                    label: "Appointment Status",
                                    required: true,
                                    icon: "✅",
                                  },
                                ].map((field) => (
                                  <div
                                    key={field.id}
                                    className="grid grid-cols-12 gap-2 items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded"
                                  >
                                    <div className="col-span-5 flex items-center gap-2">
                                      <Label
                                        htmlFor={field.id}
                                        className="font-medium text-sm"
                                      >
                                        {field.label}{" "}
                                        {field.required && (
                                          <span className="text-red-500">
                                            *
                                          </span>
                                        )}
                                      </Label>
                                    </div>
                                    <div className="col-span-7">
                                      <div className="w-full">
                                        <Select
                                          value={
                                            headerMapping[
                                              field.id as keyof CsvHeaderMapping
                                            ] || ""
                                          }
                                          onValueChange={(value) =>
                                            handleMappingChange(
                                              field.id as keyof CsvHeaderMapping,
                                              value
                                            )
                                          }
                                        >
                                          <SelectTrigger
                                            className={`w-full bg-white ${fieldErrors[field.id] ? "border-red-500" : ""}`}
                                          >
                                            <SelectValue placeholder="Select column" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem
                                              value="__clear_selection__"
                                              className="text-sm text-muted-foreground"
                                            >
                                              <div className="flex items-center gap-2">
                                                <X className="h-3.5 w-3.5" />
                                                Clear selection
                                              </div>
                                            </SelectItem>
                                            {csvHeaders
                                              .filter(
                                                (header) =>
                                                  header &&
                                                  header.trim().length > 0
                                              )
                                              .map((header) => (
                                                <SelectItem
                                                  key={header}
                                                  value={header}
                                                >
                                                  {header}
                                                </SelectItem>
                                              ))}
                                          </SelectContent>
                                        </Select>
                                        {fieldErrors[field.id] && (
                                          <p className="text-red-500 text-xs mt-1">
                                            {fieldErrors[field.id]}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <div className="p-2">
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 px-2">
                                  Optional Fields
                                </div>
                                {[
                                  {
                                    id: "clientPhone",
                                    label: "Client Phone",
                                    required: false,
                                    icon: "📞",
                                  },
                                  {
                                    id: "amountCharged",
                                    label: "Amount Charged",
                                    required: false,
                                    icon: "💰",
                                  },
                                ].map((field) => (
                                  <div
                                    key={field.id}
                                    className="grid grid-cols-12 gap-2 items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded"
                                  >
                                    <div className="col-span-5 flex items-center gap-2">
                                      <Label
                                        htmlFor={field.id}
                                        className="font-medium text-sm"
                                      >
                                        {field.label}
                                      </Label>
                                    </div>
                                    <div className="col-span-7">
                                      <Select
                                        value={
                                          headerMapping[
                                            field.id as keyof CsvHeaderMapping
                                          ] || ""
                                        }
                                        onValueChange={(value) =>
                                          handleMappingChange(
                                            field.id as keyof CsvHeaderMapping,
                                            value
                                          )
                                        }
                                      >
                                        <SelectTrigger className="w-full bg-white">
                                          <SelectValue placeholder="Select column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem
                                            value="__clear_selection__"
                                            className="text-sm text-muted-foreground"
                                          >
                                            <div className="flex items-center gap-2">
                                              <X className="h-3.5 w-3.5" />
                                              Clear selection
                                            </div>
                                          </SelectItem>
                                          {csvHeaders
                                            .filter(
                                              (header) =>
                                                header &&
                                                header.trim().length > 0
                                            )
                                            .map((header) => (
                                              <SelectItem
                                                key={header}
                                                value={header}
                                              >
                                                {header}
                                              </SelectItem>
                                            ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* <div className="p-4 flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={resetFileSelection}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => handleCsvUpload()}
                                disabled={
                                  uploadCsv.isPending ||
                                  !areAllRequiredFieldsMapped()
                                }
                              >
                                {uploadCsv.isPending ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  "Upload File"
                                )}
                              </Button>
                            </div> */}
                          </div>
                        )}

                        {showMapping && !areAllRequiredFieldsMapped() && (
                          <div className="text-sm text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>
                              Please map all required fields (marked with *)
                              before uploading
                            </span>
                          </div>
                        )}
                        <Button
                          onClick={() => handleCsvUpload()}
                          disabled={
                            !csvFile ||
                            (showMapping && !areAllRequiredFieldsMapped())
                          }
                          className="w-[200px] bg-[#E7A800]"
                        >
                          Upload and Process CSV
                        </Button>

                        <Alert className="bg-[#E1E5F0] flex items-center justify-center">
                          <AlertCircle className="h-4 w-4" />
                          <p className="text-center text-sm">
                            Upload only appointments with status "Completed" to
                            trigger the automated referral workflow. Each
                            completed booking will generate a unique referral
                            code for the client.
                          </p>
                        </Alert>

                        {(!csvFile || !headerMapping.clientPhone) && (
                          <div className="bg-[#F5F5F5] dark:bg-gray-800 rounded-2xl p-4">
                            {!csvFile && (
                              <>
                                <h4 className="font-bold text-[#5F5F5F] mb-2 text-sm">
                                  Required File Format (CSV or Excel):
                                </h4>
                                <div className="text-sm text-[#5F5F5F] dark:text-gray-400 grid grid-cols-2 gap-2">
                                  <div>
                                    • Client Name: Full name of the client
                                  </div>
                                  <div>
                                    • Client Email: Client's email address
                                  </div>
                                  <div>
                                    • Client Phone: Phone number for SMS
                                    outreach (required for automated messaging)
                                  </div>
                                  <div>
                                    • Service Date: Date of appointment
                                    (YYYY-MM-DD)
                                  </div>
                                  <div>
                                    • Amount Charged: Service amount (optional)
                                  </div>
                                  <div>
                                    • Appointment Status: Must be "Completed" to
                                    process
                                  </div>
                                </div>
                              </>
                            )}
                            {/* {!headerMapping.clientPhone && (
                              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                  <strong>SMS Automation:</strong> Phone numbers
                                  enable automated referral messages and
                                  follow-up outreach. Supports formats: (555)
                                  123-4567, +1-555-123-4567, 5551234567
                                </p>
                              </div>
                            )} */}
                          </div>
                        )}

                        {uploadCsv.isPending && (
                          <div className="mt-4 text-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-sm text-gray-600">
                              Uploading... please wait.
                            </p>
                          </div>
                        )}

                        {uploadResult && (
                          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                              <h4 className="font-medium text-green-800 dark:text-green-200">
                                Upload Complete
                              </h4>
                            </div>
                            <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                              <div>
                                ✅ Processed: {uploadResult.processed} bookings
                              </div>
                              <div>
                                ⏭️ Skipped: {uploadResult.skipped} appointments
                                (not completed)
                              </div>
                              <div>
                                📧 Referral codes generated and sent to clients
                              </div>
                            </div>
                            {uploadResult.errors &&
                              uploadResult.errors.length > 0 && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-sm font-medium">
                                    View Details
                                  </summary>
                                  <div className="mt-2 text-xs space-y-1">
                                    {uploadResult.errors
                                      .slice(0, 5)
                                      .map((error: string, index: number) => (
                                        <div
                                          key={index}
                                          className="text-gray-600 dark:text-gray-400"
                                        >
                                          - {error}
                                        </div>
                                      ))}
                                    {uploadResult.errors.length > 5 && (
                                      <div className="text-gray-500">
                                        ... and {uploadResult.errors.length - 5}{" "}
                                        more
                                      </div>
                                    )}
                                  </div>
                                </details>
                              )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="zapier">
                  <Card>
                    <CardHeader>
                      <CardTitle>Zapier Integration</CardTitle>
                      <CardDescription>
                        Connect Referable to thousands of apps with Zapier.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p>
                        Your webhook URL is your key to connecting with Zapier.
                        Use it to send data from your favorite apps directly to
                        Referable.
                      </p>
                      <div className="flex items-center gap-2">
                        <Input value={webhookUrl} readOnly />
                        <Button onClick={copyWebhookUrl} variant="secondary">
                          {copiedWebhook ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Button asChild>
                        <a
                          href="https://zapier.com/apps/webhook/integrations"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Go to Zapier <ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
