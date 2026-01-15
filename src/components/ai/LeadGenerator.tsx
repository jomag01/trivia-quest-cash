import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  Search,
  Building2,
  Globe,
  Mail,
  Phone,
  Linkedin,
  Download,
  Loader2,
  MapPin,
  ExternalLink,
  Filter,
  RefreshCw,
  Sparkles,
  Target,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface LeadGeneratorProps {
  userCredits: number;
  onCreditsChange: () => void;
}

interface Lead {
  id: string;
  company_name: string;
  website: string;
  industry: string;
  location: string;
  description: string;
  employee_count: string;
  contact_name?: string;
  contact_title?: string;
  contact_email?: string;
  contact_phone?: string;
  linkedin_url?: string;
  relevance_score: number;
}

const INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare",
  "Finance & Banking",
  "E-commerce & Retail",
  "Education",
  "Real Estate",
  "Manufacturing",
  "Hospitality",
  "Professional Services",
  "Marketing & Advertising",
  "Food & Beverage",
  "Automotive",
  "Construction",
  "Entertainment & Media",
  "Agriculture",
];

const LOCATION_OPTIONS = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Philippines",
  "Singapore",
  "India",
  "Germany",
  "France",
  "Japan",
  "Global",
];

const COMPANY_SIZE_OPTIONS = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "501+", label: "501+ employees" },
];

export const LeadGenerator = ({ userCredits, onCreditsChange }: LeadGeneratorProps) => {
  const { user } = useAuth();
  const [businessNiche, setBusinessNiche] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [targetLocation, setTargetLocation] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [additionalKeywords, setAdditionalKeywords] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  const generateLeads = async () => {
    if (!businessNiche.trim()) {
      toast.error("Please describe your business niche or target market");
      return;
    }

    if (userCredits < 15) {
      toast.error("Not enough credits. You need 15 credits for lead generation.");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-lead-generator", {
        body: {
          niche: businessNiche,
          industry: targetIndustry,
          location: targetLocation,
          companySize: companySize,
          keywords: additionalKeywords,
        },
      });

      if (error) throw error;

      if (data?.leads) {
        setLeads(data.leads);
        toast.success(`Found ${data.leads.length} potential leads!`);
        onCreditsChange();
      }
    } catch (error: any) {
      console.error("Lead generation error:", error);
      toast.error(error.message || "Failed to generate leads");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportLeadsCSV = () => {
    if (leads.length === 0) {
      toast.error("No leads to export");
      return;
    }

    const headers = [
      "Company Name",
      "Website",
      "Industry",
      "Location",
      "Employees",
      "Contact Name",
      "Contact Title",
      "Contact Email",
      "Contact Phone",
      "LinkedIn",
      "Description",
      "Relevance Score",
    ];

    const csvContent = [
      headers.join(","),
      ...leads.map((lead) =>
        [
          `"${lead.company_name}"`,
          lead.website,
          lead.industry,
          lead.location,
          lead.employee_count,
          lead.contact_name || "",
          lead.contact_title || "",
          lead.contact_email || "",
          lead.contact_phone || "",
          lead.linkedin_url || "",
          `"${lead.description.replace(/"/g, '""')}"`,
          lead.relevance_score,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Leads exported to CSV!");
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          AI Lead Generator
        </h2>
        <p className="text-muted-foreground">
          Find quality business leads for your niche using AI-powered search
        </p>
      </div>

      {/* Search Form */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="w-5 h-5 text-primary" />
                  Search Criteria
                </CardTitle>
                {showFilters ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div>
                <Label>Your Business Niche / Target Market *</Label>
                <Textarea
                  placeholder="E.g., SaaS companies looking for email marketing solutions, restaurants needing POS systems, e-commerce stores selling fashion..."
                  value={businessNiche}
                  onChange={(e) => setBusinessNiche(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Target Industry</Label>
                  <Select value={targetIndustry} onValueChange={setTargetIndustry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_OPTIONS.map((industry) => (
                        <SelectItem key={industry} value={industry.toLowerCase()}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Location</Label>
                  <Select value={targetLocation} onValueChange={setTargetLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any location" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_OPTIONS.map((location) => (
                        <SelectItem key={location} value={location.toLowerCase()}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Company Size</Label>
                  <Select value={companySize} onValueChange={setCompanySize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any size" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Additional Keywords (optional)</Label>
                <Input
                  placeholder="E.g., startup, growing, venture-funded"
                  value={additionalKeywords}
                  onChange={(e) => setAdditionalKeywords(e.target.value)}
                />
              </div>

              <Button
                onClick={generateLeads}
                disabled={isGenerating || !businessNiche}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching for leads...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Generate Leads (15 credits)
                  </>
                )}
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Results */}
      {leads.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Found {leads.length} Leads
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportLeadsCSV}>
                <Download className="w-4 h-4 mr-1" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={generateLeads}
                disabled={isGenerating}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {leads.map((lead) => (
              <Card
                key={lead.id}
                className="overflow-hidden hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-semibold text-lg">{lead.company_name}</h4>
                        <Badge
                          className={`${getRelevanceColor(lead.relevance_score)} text-white text-xs`}
                        >
                          {lead.relevance_score}% match
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {lead.industry}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {lead.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {lead.employee_count}
                        </span>
                      </div>

                      <p className="text-sm mt-2 line-clamp-2">{lead.description}</p>

                      {/* Expanded Details */}
                      <Collapsible
                        open={expandedLead === lead.id}
                        onOpenChange={(open) => setExpandedLead(open ? lead.id : null)}
                      >
                        <CollapsibleContent className="mt-3 pt-3 border-t space-y-2">
                          {lead.contact_name && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">{lead.contact_name}</span>
                              {lead.contact_title && (
                                <span className="text-muted-foreground">
                                  - {lead.contact_title}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-3 text-sm">
                            {lead.contact_email && (
                              <a
                                href={`mailto:${lead.contact_email}`}
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <Mail className="w-3 h-3" />
                                {lead.contact_email}
                              </a>
                            )}
                            {lead.contact_phone && (
                              <a
                                href={`tel:${lead.contact_phone}`}
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <Phone className="w-3 h-3" />
                                {lead.contact_phone}
                              </a>
                            )}
                            {lead.linkedin_url && (
                              <a
                                href={lead.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:underline"
                              >
                                <Linkedin className="w-3 h-3" />
                                LinkedIn
                              </a>
                            )}
                          </div>
                        </CollapsibleContent>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="mt-2 text-xs">
                            {expandedLead === lead.id ? "Show less" : "View contact details"}
                          </Button>
                        </CollapsibleTrigger>
                      </Collapsible>
                    </div>

                    <div className="flex flex-col gap-2">
                      {lead.website && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Globe className="w-3 h-3 mr-1" />
                            Visit
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pro Tip */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Pro Tip</p>
                  <p className="text-sm text-muted-foreground">
                    Export your leads to CSV and import them into your CRM or email
                    marketing tool for follow-up campaigns.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {leads.length === 0 && !isGenerating && (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium text-lg mb-1">Find Your Ideal Customers</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Describe your business niche above and let AI find qualified leads that
            match your target market.
          </p>
        </div>
      )}
    </div>
  );
};
