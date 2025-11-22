import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { Star, Save, ExternalLink, MessageSquare } from "lucide-react";

const googleReviewSchema = z.object({
  googleReviewLink: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true;
    const reviewLinkPattern = /^https:\/\/(g\.page\/r\/|maps\.google\.com\/|goo\.gl\/maps\/|maps\.app\.goo\.gl\/)/;
    return reviewLinkPattern.test(val.trim());
  }, "Please enter a valid Google review link starting with https://g.page/r/, https://maps.google.com/, https://goo.gl/maps/, or https://maps.app.goo.gl/"),
});

type GoogleReviewData = z.infer<typeof googleReviewSchema>;

export function GoogleReviewSettings() {
  const { business } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<GoogleReviewData>({
    resolver: zodResolver(googleReviewSchema),
    defaultValues: {
      googleReviewLink: business?.googleReviewLink || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: GoogleReviewData) => {
      const response = await apiRequest("PUT", "/api/business/settings", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Google Review Link updated",
        description: "Your Google review link has been saved successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update Google review link.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GoogleReviewData) => {
    updateMutation.mutate(data);
  };

  const handleEdit = () => {
    setIsEditing(true);
    form.reset({
      googleReviewLink: business?.googleReviewLink || "",
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.reset({
      googleReviewLink: business?.googleReviewLink || "",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Star className="h-5 w-5 text-yellow-500" />
          <span>Google Review Link</span>
        </CardTitle>
        <CardDescription>
          Add your Google review link to easily share it with clients via text messages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="googleReviewLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Review Link</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://g.page/r/yourbusiness/review"
                      disabled={!isEditing}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Paste your Google Business Profile review link here. This will be used in review request text messages.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {business?.googleReviewLink && !isEditing && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Star className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Review link configured</span>
                <a 
                  href={business.googleReviewLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-green-600 hover:text-green-800"
                >
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            )}

            {business?.googleReviewLink && !isEditing && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Preview Message</span>
                </div>
                <p className="text-sm text-blue-600">
                  "Thanks again for choosing us! If you have a moment, we'd really appreciate a quick review: {business.googleReviewLink}"
                </p>
              </div>
            )}

            <div className="flex items-center space-x-3 pt-4">
              {!isEditing ? (
                <Button type="button" onClick={handleEdit}>
                  {business?.googleReviewLink ? "Update Link" : "Add Review Link"}
                </Button>
              ) : (
                <>
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleCancel}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}