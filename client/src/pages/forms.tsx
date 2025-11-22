import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Code,
  Settings,
  ArrowUpDown,
  GripVertical,
  X,
  Info,
  ExternalLink,
  Check,
  Users,
  Calendar,
} from "lucide-react";
import type { Form, InsertForm } from "@shared/schema";

interface FormField {
  id: string;
  type:
    | "text"
    | "email"
    | "phone"
    | "textarea"
    | "select"
    | "checkbox"
    | "sms-optin";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  smsOptInText?: string; // Custom text for SMS opt-in checkbox
}

interface FormWithSubmissions extends Form {
  submissions: number;
}

const fieldTypes = [
  { value: "text", label: "Text Input", description: "Single line text field" },
  {
    value: "email",
    label: "Email",
    description: "Email address with validation",
  },
  { value: "phone", label: "Phone Number", description: "Phone number field" },
  {
    value: "textarea",
    label: "Long Text",
    description: "Multi-line text area",
  },
  {
    value: "select",
    label: "Dropdown",
    description: "Select from multiple options",
  },
  {
    value: "checkbox",
    label: "Checkbox",
    description: "Yes/no or agreement field",
  },
  {
    value: "sms-optin",
    label: "SMS Opt-in",
    description: "SMS marketing consent checkbox",
  },
];

export default function Forms() {
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormWithSubmissions | null>(
    null
  );
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isEmbedOpen, setIsEmbedOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFields, setFormFields] = useState<FormField[]>([
    { id: "name", type: "text", label: "Name", required: true },
    { id: "email", type: "email", label: "Email", required: true },
    { id: "phone", type: "phone", label: "Phone", required: false },
    { id: "message", type: "textarea", label: "Message", required: false },
  ]);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(
    null
  );
  const [copiedEmbedCode, setCopiedEmbedCode] = useState(false);

  // Design & Style state
  const [formStyles, setFormStyles] = useState({
    font: "Inter",
    primaryColor: "#667eea",
    textColor: "#374151",
    backgroundColor: "#ffffff",
    buttonShape: "rounded",
    fieldBorderStyle: "boxed",
    theme: "modern",
    spacing: "comfortable",
    borderRadius: "8px",
    shadowLevel: "subtle",
    gradientStyle: "none",
    containerWidth: "full",
    fieldSize: "medium",
    buttonStyle: "solid",
    trustElements: true,
    privacyText: "We respect your privacy and will never spam you.",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch forms
  const { data: forms = [], isLoading } = useQuery<FormWithSubmissions[]>({
    queryKey: ["/api/forms"],
  });

  // Create form mutation
  const createFormMutation = useMutation({
    mutationFn: async (formData: InsertForm) => {
      return apiRequest("POST", "/api/forms", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      setIsCreateFormOpen(false);
      resetFormBuilder();
      toast({ title: "Form created successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create form",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update form mutation
  const updateFormMutation = useMutation({
    mutationFn: async ({
      formId,
      formData,
    }: {
      formId: number;
      formData: Partial<InsertForm>;
    }) => {
      return apiRequest("PATCH", `/api/forms/${formId}`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      setIsBuilderOpen(false);
      toast({ title: "Form updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update form",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete form mutation
  const deleteFormMutation = useMutation({
    mutationFn: async (formId: number) => {
      return apiRequest("DELETE", `/api/forms/${formId}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forms"] });
      toast({ title: "Form deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete form",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetFormBuilder = () => {
    setFormName("");
    setFormDescription("");
    setFormFields([
      { id: "name", type: "text", label: "Name", required: true },
      { id: "email", type: "email", label: "Email", required: true },
      { id: "phone", type: "phone", label: "Phone", required: false },
      { id: "message", type: "textarea", label: "Message", required: false },
    ]);
    setEditingFieldIndex(null);
    setFormStyles({
      font: "Inter",
      primaryColor: "#667eea",
      textColor: "#374151",
      backgroundColor: "#ffffff",
      buttonShape: "rounded",
      fieldBorderStyle: "boxed",
      theme: "modern",
      spacing: "comfortable",
      borderRadius: "8px",
      shadowLevel: "subtle",
      gradientStyle: "none",
      containerWidth: "full",
      fieldSize: "medium",
      buttonStyle: "solid",
      trustElements: true,
      privacyText: "We respect your privacy and will never spam you.",
    });
  };

  const addField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: "text",
      label: "New Field",
      required: false,
      options: [],
    };
    setFormFields([...formFields, newField]);
    setEditingFieldIndex(formFields.length);
  };

  const updateField = useCallback(
    (index: number, updates: Partial<FormField>) => {
      setFormFields((prevFields) => {
        const updatedFields = [...prevFields];
        updatedFields[index] = { ...updatedFields[index], ...updates };
        return updatedFields;
      });
    },
    []
  );

  const deleteField = (index: number) => {
    const updatedFields = formFields.filter((_, i) => i !== index);
    setFormFields(updatedFields);
    setEditingFieldIndex(null);
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    const updatedFields = [...formFields];
    const [movedField] = updatedFields.splice(fromIndex, 1);
    updatedFields.splice(toIndex, 0, movedField);
    setFormFields(updatedFields);
  };

  const addOption = (fieldIndex: number) => {
    const field = formFields[fieldIndex];
    const newOptions = [...(field.options || []), "New Option"];
    updateField(fieldIndex, { options: newOptions });
  };

  const updateOption = useCallback(
    (fieldIndex: number, optionIndex: number, value: string) => {
      setFormFields((prevFields) => {
        const updatedFields = [...prevFields];
        const field = updatedFields[fieldIndex];
        const updatedOptions = [...(field.options || [])];
        updatedOptions[optionIndex] = value;
        updatedFields[fieldIndex] = { ...field, options: updatedOptions };
        return updatedFields;
      });
    },
    []
  );

  const handleFormNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormName(e.target.value);
    },
    []
  );

  const handleFormDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setFormDescription(e.target.value);
    },
    []
  );

  const deleteOption = (fieldIndex: number, optionIndex: number) => {
    const field = formFields[fieldIndex];
    const updatedOptions = (field.options || []).filter(
      (_, i) => i !== optionIndex
    );
    updateField(fieldIndex, { options: updatedOptions });
  };

  const openEditForm = (form: FormWithSubmissions) => {
    setSelectedForm(form);
    setFormName(form.name);
    setFormDescription(form.description || "");
    setFormFields(Array.isArray(form.fields) ? form.fields : []);
    setIsBuilderOpen(true);
    setEditingFieldIndex(null);
  };

  const showEmbedCode = (form: FormWithSubmissions) => {
    setSelectedForm(form);
    setIsEmbedOpen(true);
  };

  const copyEmbedCode = (embedToken: string) => {
    const embedCode = `<iframe 
  src="${window.location.origin}/api/forms/${embedToken}/embed" 
  width="100%" 
  height="600" 
  frameborder="0" 
  style="border: 1px solid #e5e5e5; border-radius: 8px;">
</iframe>`;

    navigator.clipboard.writeText(embedCode);
    setCopiedEmbedCode(true);
    setTimeout(() => setCopiedEmbedCode(false), 2000);
    toast({ title: "Embed code copied to clipboard!" });
  };

  const handleCreateForm = () => {
    if (!formName.trim()) {
      toast({ title: "Form name is required", variant: "destructive" });
      return;
    }

    const formData: InsertForm = {
      businessId: 0, // Will be set by server
      name: formName,
      description: formDescription,
      fields: formFields,
      embedToken: `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isActive: true,
      styles: formStyles,
    };

    createFormMutation.mutate(formData);
  };

  const handleUpdateForm = () => {
    if (!selectedForm || !formName.trim()) {
      toast({ title: "Form name is required", variant: "destructive" });
      return;
    }

    const formData = {
      name: formName,
      description: formDescription,
      fields: formFields,
    };

    updateFormMutation.mutate({ formId: selectedForm.id, formData });
  };

  // Field Editor Component with improved input handling
  const FieldEditor = ({
    field,
    index,
  }: {
    field: FormField;
    index: number;
  }) => {
    const isEditing = editingFieldIndex === index;

    if (!isEditing) {
      return (
        <div className="group flex items-center justify-between p-4 border rounded-xl bg-white hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">{field.label}</div>
              <div className="text-sm text-gray-500 capitalize flex items-center gap-2">
                {field.type}
                {field.required && (
                  <Badge variant="secondary" className="text-xs">
                    Required
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingFieldIndex(index)}
              className="hover:bg-blue-50 hover:border-blue-200"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteField(index)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Card className="border-2 border-blue-200 shadow-lg">
        <CardContent className="p-6 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b">
            <h4 className="text-lg font-semibold text-gray-900">Edit Field</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingFieldIndex(null)}
              className="hover:bg-gray-100"
            >
              <X className="h-4 w-4 mr-1" />
              Close
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Field Type
              </Label>
              <Select
                value={field.type}
                onValueChange={(value) => {
                  const updates: Partial<FormField> = {
                    type: value as FormField["type"],
                  };
                  // Automatically populate SMS opt-in text when switching to SMS opt-in field
                  if (value === "sms-optin" && !field.smsOptInText) {
                    updates.smsOptInText =
                      "Yes, I'd like to receive SMS updates about my service appointments and special offers.";
                  }
                  updateField(index, updates);
                }}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="py-1">
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-gray-500">
                          {type.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Field Label
              </Label>
              <Input
                className="h-11"
                defaultValue={field.label}
                onBlur={(e) => updateField(index, { label: e.target.value })}
                placeholder="Enter field label"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Placeholder Text (Optional)
            </Label>
            <Input
              className="h-11"
              defaultValue={field.placeholder || ""}
              onBlur={(e) =>
                updateField(index, { placeholder: e.target.value })
              }
              placeholder="Enter placeholder text"
            />
          </div>

          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <Switch
              checked={field.required}
              onCheckedChange={(checked) =>
                updateField(index, { required: checked })
              }
            />
            <Label className="text-sm font-medium text-gray-700">
              Make this field required
            </Label>
          </div>

          {field.type === "select" && (
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">
                Dropdown Options
              </Label>
              <div className="space-y-3">
                {(field.options || []).map((option, optionIndex) => (
                  <div
                    key={`opt-${optionIndex}`}
                    className="flex gap-3 items-center"
                  >
                    <Input
                      className="h-10"
                      defaultValue={option}
                      onBlur={(e) =>
                        updateOption(index, optionIndex, e.target.value)
                      }
                      placeholder="Option text"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteOption(index, optionIndex)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addOption(index)}
                  className="w-full h-10 border-dashed hover:bg-blue-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          {field.type === "sms-optin" && (
            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700">
                SMS Opt-in Text
              </Label>
              <Textarea
                className="min-h-[80px] resize-none"
                defaultValue={
                  field.smsOptInText ||
                  "Yes, I'd like to receive SMS updates about my service appointments and special offers."
                }
                onBlur={(e) =>
                  updateField(index, { smsOptInText: e.target.value })
                }
                placeholder="Enter the text for SMS opt-in checkbox"
              />
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Info className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-amber-800 mb-2">
                      Compliance Notice
                    </h4>
                    <p className="text-sm text-amber-700 leading-relaxed">
                      A compliance message will automatically be added to your
                      form: <br />
                      <span className="font-medium italic">
                        "By checking this box, you consent to receive SMS
                        messages from [Business Name] related to booking
                        inquiries and other relevant communications."
                      </span>
                    </p>
                    <p className="text-xs text-amber-600 mt-2">
                      This message ensures compliance with SMS regulations and
                      cannot be edited.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="default"
              size="sm"
              onClick={() => setEditingFieldIndex(null)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Check className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingFieldIndex(null)}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-6">
          <h1 className="text-5xl font-bold text-gray-900">
            Lead Capture Forms
          </h1>
          <p className="text-[#5F5F5F] mt-1 text-sm sm:text-xl">
            Create and manage forms to capture leads from your website
          </p>
        </div>
        <Dialog open={isCreateFormOpen} onOpenChange={setIsCreateFormOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-br from-blue-800 to-blue-600 hover:from-blue-900 hover:to-blue-700 text-white px-3 py-2 text-xs sm:px-6 sm:py-2 sm:text-base font-medium whitespace-nowrap"
              onClick={() => resetFormBuilder()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] bg-white overflow-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-900">Create New Form</DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                Build a custom form to capture leads from your website
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="settings" className="w-full bg-transparent">
              <TabsList className="grid w-full grid-cols-3 bg-transparent">
                <TabsTrigger value="settings">Form Settings</TabsTrigger>
                <TabsTrigger value="fields">Form Fields</TabsTrigger>
                <TabsTrigger value="design">Design & Style</TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Form Name
                  </Label>
                  <Input
                    className="h-11 bg-white"
                    defaultValue={formName}
                    onBlur={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Contact Form, Quote Request"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Description (Optional)
                  </Label>
                  <Textarea
                    className="min-h-[100px] resize-none bg-white"
                    defaultValue={formDescription}
                    onBlur={(e) => setFormDescription(e.target.value)}
                    placeholder="Brief description of what this form is for"
                  />
                </div>
              </TabsContent>

              <TabsContent value="fields" className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Form Fields
                    </h3>
                    <p className="text-sm text-gray-500">
                      Add and configure fields for your form
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={addField}
                    className="bg-[#F3F3F3] hover:bg-[#dad9d9] border-blue-200 text-black hover:text-black"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>

                {formFields.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Plus className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No fields added yet
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Start building your form by adding your first field
                    </p>
                    <Button
                      onClick={addField}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Field
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formFields.map((field, index) => (
                      <FieldEditor key={field.id} field={field} index={index} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="design" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Font Selection */}
                  <div>
                    <Label>Font Family</Label>
                    <Select
                      value={formStyles.font}
                      onValueChange={(value) =>
                        setFormStyles({ ...formStyles, font: value })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">
                          Inter (Modern Sans-serif)
                        </SelectItem>
                        <SelectItem value="Roboto">
                          Roboto (Google Sans)
                        </SelectItem>
                        <SelectItem value="Georgia">
                          Georgia (Classic Serif)
                        </SelectItem>
                        <SelectItem value="Arial">
                          Arial (System Sans)
                        </SelectItem>
                        <SelectItem value="Times New Roman">
                          Times New Roman (Traditional)
                        </SelectItem>
                        <SelectItem value="Helvetica">
                          Helvetica (Clean Sans)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Primary Color */}
                  <div>
                    <Label>Primary Color (Buttons & Links)</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        value={formStyles.primaryColor}
                        onChange={(e) =>
                          setFormStyles({
                            ...formStyles,
                            primaryColor: e.target.value,
                          })
                        }
                        className="w-16 h-10 p-1 bg-white border rounded cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={formStyles.primaryColor}
                        onChange={(e) =>
                          setFormStyles({
                            ...formStyles,
                            primaryColor: e.target.value,
                          })
                        }
                        placeholder="#667eea"
                        className="flex-1 bg-white"
                      />
                    </div>
                  </div>

                  {/* Text Color */}
                  <div>
                    <Label>Text Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        value={formStyles.textColor}
                        onChange={(e) =>
                          setFormStyles({
                            ...formStyles,
                            textColor: e.target.value,
                          })
                        }
                        className="w-16 h-10 p-1 bg-white border rounded cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={formStyles.textColor}
                        onChange={(e) =>
                          setFormStyles({
                            ...formStyles,
                            textColor: e.target.value,
                          })
                        }
                        placeholder="#374151"
                        className="flex-1 bg-white"
                      />
                    </div>
                  </div>

                  {/* Background Color */}
                  <div>
                    <Label>Background Color</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        value={formStyles.backgroundColor}
                        onChange={(e) =>
                          setFormStyles({
                            ...formStyles,
                            backgroundColor: e.target.value,
                          })
                        }
                        className="w-16 h-10 p-1 bg-white border rounded cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={formStyles.backgroundColor}
                        onChange={(e) =>
                          setFormStyles({
                            ...formStyles,
                            backgroundColor: e.target.value,
                          })
                        }
                        placeholder="#ffffff"
                        className="flex-1 bg-white"
                      />
                    </div>
                  </div>

                  {/* Button Shape */}
                  <div>
                    <Label>Button Shape</Label>
                    <Select
                      value={formStyles.buttonShape}
                      onValueChange={(value) =>
                        setFormStyles({ ...formStyles, buttonShape: value })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rounded">
                          Rounded (8px radius)
                        </SelectItem>
                        <SelectItem value="slightly-rounded">
                          Slightly Rounded (4px radius)
                        </SelectItem>
                        <SelectItem value="sharp">
                          Sharp (0px radius)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Field Border Style */}
                  <div>
                    <Label>Field Border Style</Label>
                    <Select
                      value={formStyles.fieldBorderStyle}
                      onValueChange={(value) =>
                        setFormStyles({
                          ...formStyles,
                          fieldBorderStyle: value,
                        })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="boxed">
                          Boxed (Full border)
                        </SelectItem>
                        <SelectItem value="underline">
                          Underline (Bottom border only)
                        </SelectItem>
                        <SelectItem value="none">None (No border)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Theme Style */}
                  <div>
                    <Label>Theme Style</Label>
                    <Select
                      value={formStyles.theme}
                      onValueChange={(value) =>
                        setFormStyles({ ...formStyles, theme: value })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modern">
                          Modern (Clean, professional)
                        </SelectItem>
                        <SelectItem value="minimal">
                          Minimal (Ultra-clean, spacious)
                        </SelectItem>
                        <SelectItem value="classic">
                          Classic (Traditional, structured)
                        </SelectItem>
                        <SelectItem value="vibrant">
                          Vibrant (Bold, eye-catching)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Spacing */}
                  <div>
                    <Label>Spacing</Label>
                    <Select
                      value={formStyles.spacing}
                      onValueChange={(value) =>
                        setFormStyles({ ...formStyles, spacing: value })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">
                          Compact (Tight spacing)
                        </SelectItem>
                        <SelectItem value="comfortable">
                          Comfortable (Standard spacing)
                        </SelectItem>
                        <SelectItem value="spacious">
                          Spacious (Extra breathing room)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Shadow Level */}
                  <div>
                    <Label>Shadow Effect</Label>
                    <Select
                      value={formStyles.shadowLevel}
                      onValueChange={(value) =>
                        setFormStyles({ ...formStyles, shadowLevel: value })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Flat design)</SelectItem>
                        <SelectItem value="subtle">
                          Subtle (Light shadow)
                        </SelectItem>
                        <SelectItem value="medium">
                          Medium (Noticeable depth)
                        </SelectItem>
                        <SelectItem value="strong">
                          Strong (Prominent shadow)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Container Width */}
                  <div>
                    <Label>Container Width</Label>
                    <Select
                      value={formStyles.containerWidth}
                      onValueChange={(value) =>
                        setFormStyles({ ...formStyles, containerWidth: value })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="narrow">
                          Narrow (320px max)
                        </SelectItem>
                        <SelectItem value="medium">
                          Medium (480px max)
                        </SelectItem>
                        <SelectItem value="wide">Wide (640px max)</SelectItem>
                        <SelectItem value="full">Full Width (100%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Field Size */}
                  <div>
                    <Label>Field Size</Label>
                    <Select
                      value={formStyles.fieldSize}
                      onValueChange={(value) =>
                        setFormStyles({ ...formStyles, fieldSize: value })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">
                          Small (Compact fields)
                        </SelectItem>
                        <SelectItem value="medium">
                          Medium (Standard size)
                        </SelectItem>
                        <SelectItem value="large">
                          Large (Prominent fields)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Advanced Options */}
                <div className="space-y-4">
                  <h4 className="font-medium">Advanced Options</h4>

                  {/* Trust Elements */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formStyles.trustElements}
                      onCheckedChange={(checked) =>
                        setFormStyles({ ...formStyles, trustElements: checked })
                      }
                    />
                    <Label>Show privacy text and trust elements</Label>
                  </div>

                  {/* Privacy Text */}
                  {formStyles.trustElements && (
                    <div>
                      <Label>Privacy Text</Label>
                      <Textarea
                        value={formStyles.privacyText}
                        onChange={(e) =>
                          setFormStyles({
                            ...formStyles,
                            privacyText: e.target.value,
                          })
                        }
                        placeholder="Enter privacy text"
                        rows={2}
                        className="mt-2 bg-white"
                      />
                    </div>
                  )}

                  {/* Button Style */}
                  <div>
                    <Label>Button Style</Label>
                    <Select
                      value={formStyles.buttonStyle}
                      onValueChange={(value) =>
                        setFormStyles({ ...formStyles, buttonStyle: value })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">
                          Solid (Filled background)
                        </SelectItem>
                        <SelectItem value="outline">
                          Outline (Border only)
                        </SelectItem>
                        <SelectItem value="gradient">
                          Gradient (Smooth color blend)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Enhanced Style Preview */}
                <div>
                  <Label>Style Preview</Label>
                  <div
                    className="mt-2 border rounded-lg overflow-hidden"
                    style={{
                      fontFamily: formStyles.font,
                      maxWidth:
                        formStyles.containerWidth === "narrow"
                          ? "320px"
                          : formStyles.containerWidth === "medium"
                            ? "480px"
                            : formStyles.containerWidth === "wide"
                              ? "640px"
                              : "100%",
                      boxShadow:
                        formStyles.shadowLevel === "none"
                          ? "none"
                          : formStyles.shadowLevel === "medium"
                            ? "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                            : formStyles.shadowLevel === "strong"
                              ? "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                              : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: formStyles.backgroundColor,
                        color: formStyles.textColor,
                        padding:
                          formStyles.spacing === "compact"
                            ? "16px"
                            : formStyles.spacing === "spacious"
                              ? "32px"
                              : "24px",
                        borderTop:
                          formStyles.theme === "modern"
                            ? `4px solid ${formStyles.primaryColor}`
                            : undefined,
                        border:
                          formStyles.theme === "minimal"
                            ? "1px solid #e5e7eb"
                            : formStyles.theme === "classic"
                              ? "2px solid #d1d5db"
                              : undefined,
                        background:
                          formStyles.theme === "classic"
                            ? "#fafafa"
                            : formStyles.theme === "vibrant"
                              ? `linear-gradient(135deg, ${formStyles.backgroundColor} 0%, #f3f4f6 100%)`
                              : formStyles.backgroundColor,
                      }}
                    >
                      <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
                      <div
                        style={{
                          marginBottom:
                            formStyles.spacing === "compact"
                              ? "16px"
                              : formStyles.spacing === "spacious"
                                ? "32px"
                                : "24px",
                        }}
                      >
                        <label className="block text-sm font-medium mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          placeholder="Enter your name"
                          className="w-full transition-colors"
                          style={{
                            padding:
                              formStyles.fieldSize === "small"
                                ? "10px 12px"
                                : formStyles.fieldSize === "large"
                                  ? "16px 20px"
                                  : "12px 16px",
                            borderRadius:
                              formStyles.buttonShape === "rounded"
                                ? "8px"
                                : formStyles.buttonShape === "slightly-rounded"
                                  ? "4px"
                                  : "0px",
                            border:
                              formStyles.fieldBorderStyle === "boxed"
                                ? "2px solid #e5e7eb"
                                : formStyles.fieldBorderStyle === "underline"
                                  ? "0px solid transparent"
                                  : "none",
                            borderBottom:
                              formStyles.fieldBorderStyle === "underline"
                                ? "2px solid #e5e7eb"
                                : undefined,
                            backgroundColor: "#ffffff",
                            fontSize:
                              formStyles.fieldSize === "small"
                                ? "14px"
                                : formStyles.fieldSize === "large"
                                  ? "18px"
                                  : "16px",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          marginBottom:
                            formStyles.spacing === "compact"
                              ? "16px"
                              : formStyles.spacing === "spacious"
                                ? "32px"
                                : "24px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "12px",
                            padding: "16px",
                            background: "#f8fafc",
                            borderLeft: `4px solid ${formStyles.primaryColor}`,
                            borderRadius:
                              formStyles.buttonShape === "rounded"
                                ? "8px"
                                : formStyles.buttonShape === "slightly-rounded"
                                  ? "4px"
                                  : "0px",
                            marginTop: "8px",
                          }}
                        >
                          <input
                            type="checkbox"
                            style={{
                              width: "18px",
                              height: "18px",
                              margin: 0,
                              cursor: "pointer",
                            }}
                          />
                          <label
                            style={{
                              fontSize: "13px",
                              color: "#475569",
                              lineHeight: "1.5",
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            I agree to receive SMS updates and promotional
                            messages.
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="w-full font-medium transition-colors"
                        style={{
                          padding:
                            formStyles.fieldSize === "small"
                              ? "10px 24px"
                              : formStyles.fieldSize === "large"
                                ? "18px 40px"
                                : "14px 32px",
                          borderRadius:
                            formStyles.buttonShape === "rounded"
                              ? "8px"
                              : formStyles.buttonShape === "slightly-rounded"
                                ? "4px"
                                : "0px",
                          fontSize:
                            formStyles.fieldSize === "small"
                              ? "14px"
                              : formStyles.fieldSize === "large"
                                ? "18px"
                                : "16px",
                          background:
                            formStyles.buttonStyle === "solid"
                              ? formStyles.primaryColor
                              : formStyles.buttonStyle === "outline"
                                ? "transparent"
                                : `linear-gradient(135deg, ${formStyles.primaryColor} 0%, #764ba2 100%)`,
                          color:
                            formStyles.buttonStyle === "outline"
                              ? formStyles.primaryColor
                              : "white",
                          border:
                            formStyles.buttonStyle === "outline"
                              ? `2px solid ${formStyles.primaryColor}`
                              : "none",
                        }}
                      >
                        Submit
                      </button>
                      {formStyles.trustElements && (
                        <div
                          style={{
                            marginTop:
                              formStyles.spacing === "compact"
                                ? "16px"
                                : formStyles.spacing === "spacious"
                                  ? "32px"
                                  : "24px",
                            padding: "16px",
                            background: "#f8fafc",
                            borderRadius:
                              formStyles.buttonShape === "rounded"
                                ? "8px"
                                : formStyles.buttonShape === "slightly-rounded"
                                  ? "4px"
                                  : "0px",
                            border: "1px solid #e2e8f0",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              gap: "8px",
                              marginBottom: "8px",
                            }}
                          >
                            <span style={{ fontSize: "16px", opacity: 0.8 }}>
                              🔒
                            </span>
                            <span style={{ fontSize: "16px", opacity: 0.8 }}>
                              ✓
                            </span>
                          </div>
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              margin: 0,
                              lineHeight: "1.4",
                              fontWeight: 500,
                            }}
                          >
                            {formStyles.privacyText}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-center gap-2 pt-4">
              {/* <Button
                variant="outline"
                onClick={() => setIsCreateFormOpen(false)}
              >
                Cancel
              </Button> */}
              <Button
                onClick={handleCreateForm}
                disabled={createFormMutation.isPending}
                className=" bg-[#E7A800] text-white font-bold w-[300px] px-4 py-2 text-xs sm:px-6 sm:py-2 sm:text-xl whitespace-nowrap"
              >
                {createFormMutation.isPending ? "Creating..." : "Create Form"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Forms List */}
      {forms?.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            Create Your First Form
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Start capturing leads from your website with beautiful, customizable
            forms that match your brand
          </p>
          <Button
            size="lg"
            onClick={() => {
              setIsCreateFormOpen(true);
              resetFormBuilder();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Your First Form
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <Card
              key={form.id}
              className="hover:shadow-lg transition-all duration-200 border-0 group shadow-[0px_7px_23px_0px_#0000000D]"
            >
              <CardHeader className="pb-4">
                <div className="">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <CardTitle className="text-xl font-bold text-gray-900">
                        {form.name}
                      </CardTitle>
                      <Badge
                        variant={form.isActive ? "default" : "secondary"}
                        className={
                          form.isActive
                            ? "bg-green-100 text-green-800 rounded-sm py-2 px-4 hover:bg-green-100"
                            : ""
                        }
                      >
                        {form.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {form.description && (
                      <CardDescription className="text-gray-600 text-base leading-relaxed mb-3">
                        {form.description}
                      </CardDescription>
                    )}
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="font-medium">
                          {Array.isArray(form.fields) ? form.fields.length : 0}
                        </span>
                        <span>fields</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-green-500" />
                        <span className="font-medium">
                          {form.submissionCount || 0}
                        </span>
                        <span>submissions</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-4">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        Created {new Date(form.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditForm(form)}
                      className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => showEmbedCode(form)}
                      className="hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                    >
                      <Code className="h-4 w-4 mr-1" />
                      Embed
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `/api/forms/${form.embedToken}/embed`,
                          "_blank"
                        )
                      }
                      className="hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteFormMutation.mutate(form.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Form Dialog */}
      <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] bg-white overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Form</DialogTitle>
            <DialogDescription>
              Update your form settings and fields
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-transparent">
              <TabsTrigger value="settings">Form Settings</TabsTrigger>
              <TabsTrigger value="fields">Form Fields</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-4">
              <div>
                <Label>Form Name</Label>
                <Input
                  className="bg-transparent"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Contact Form, Quote Request"
                />
              </div>

              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  className="bg-transparent"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of what this form is for"
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="fields" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Form Fields</h3>
                <Button variant="ghost" className="bg-[#F3F3F3] hover:bg-[#dad9d9] border-blue-200 text-black hover:text-black" onClick={addField}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>

              <div className="space-y-3">
                {formFields.map((field, index) => (
                  <FieldEditor key={field.id} field={field} index={index} />
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-center gap-2 pt-4">
            {/* <Button variant="outline" onClick={() => setIsBuilderOpen(false)}>
              Cancel
            </Button> */}
            <Button
              className="bg-[#E7A800] text-white font-bold w-[300px] px-4 py-2 text-xs sm:px-6 sm:py-2 sm:text-xl whitespace-nowrap"
              onClick={handleUpdateForm}
              disabled={updateFormMutation.isPending}
            >
              {updateFormMutation.isPending ? "Updating..." : "Update Form"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embed Code Dialog */}
      <Dialog open={isEmbedOpen} onOpenChange={setIsEmbedOpen}>
        <DialogContent className="max-w-3xl max-h-[90dvh] bg-white overflow-auto">
          <DialogHeader>
            <DialogTitle>Embed Form on Your Website</DialogTitle>
            <DialogDescription>
              Copy and paste this code into your website to display the form
            </DialogDescription>
          </DialogHeader>

          {selectedForm && (
            <div className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Add this iframe code to any page on your website where you
                  want the form to appear. The form will automatically capture
                  leads and add them to your lead management system.
                </AlertDescription>
              </Alert>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-base font-medium">Embed Code</Label>
                  <Button
                    variant="ghost"
                    className="bg-[#F3F3F3] hover:bg-[#dad9d9] border-blue-200 text-black hover:text-black"
                    size="sm"
                    onClick={() => copyEmbedCode(selectedForm.embedToken)}
                  >
                    {copiedEmbedCode ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-gray-100 p-4 rounded-lg border">
                  <code className="text-sm break-all">
                    {`<iframe 
  src="${window.location.origin}/api/forms/${selectedForm.embedToken}/embed" 
  width="100%" 
  height="600" 
  frameborder="0" 
  style="border: 1px solid #e5e5e5; border-radius: 8px;">
</iframe>`}
                  </code>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">How to Use</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center font-medium text-xs mt-0.5">
                      1
                    </div>
                    <div>
                      <div className="font-medium">
                        Copy the embed code above
                      </div>
                      <div className="text-gray-600">
                        Click the "Copy Code" button to copy it to your
                        clipboard
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center font-medium text-xs mt-0.5">
                      2
                    </div>
                    <div>
                      <div className="font-medium">
                        Paste it into your website
                      </div>
                      <div className="text-gray-600">
                        Add the code to any HTML page, WordPress post, or
                        website builder where you want the form
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center font-medium text-xs mt-0.5">
                      3
                    </div>
                    <div>
                      <div className="font-medium">Start collecting leads</div>
                      <div className="text-gray-600">
                        Form submissions will automatically appear in your Leads
                        page
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Preview Form</div>
                  <div className="text-sm text-gray-600">
                    See how your form looks to visitors
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="bg-[#F3F3F3] hover:bg-[#dad9d9] border-blue-200 text-black hover:text-black"
                  onClick={() =>
                    window.open(
                      `/api/forms/${selectedForm.embedToken}/embed`,
                      "_blank"
                    )
                  }
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Preview
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Advanced Customization</h3>
                <p className="text-sm text-gray-600">
                  Override the form's styling by adding CSS variables to your
                  website. This allows you to match your brand colors and fonts.
                </p>

                <div>
                  <Label className="text-sm font-medium">
                    CSS Variables (Optional)
                  </Label>
                  <div className="bg-gray-100 p-4 rounded-lg border mt-2">
                    <code className="text-sm">
                      {`<style>
#referable-form-${selectedForm.embedToken} {
  --rf-font: 'Your Font', sans-serif;
  --rf-primary-color: #your-color;
  --rf-text-color: #your-text-color; 
  --rf-bg-color: #your-background;
}
</style>`}
                    </code>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">--rf-font</div>
                    <div className="text-gray-600">
                      Font family for all text
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">--rf-primary-color</div>
                    <div className="text-gray-600">Button and link colors</div>
                  </div>
                  <div>
                    <div className="font-medium">--rf-text-color</div>
                    <div className="text-gray-600">Main text color</div>
                  </div>
                  <div>
                    <div className="font-medium">--rf-bg-color</div>
                    <div className="text-gray-600">Form background color</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
