
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileText, MessageCircle, Upload, Loader2, Check, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ClaimDecision {
  approved: boolean;
  amount: number;
  justification: string;
  relevantClauses: string[];
}

const InsuranceClaimMode = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [query, setQuery] = useState("");
  const [decision, setDecision] = useState<ClaimDecision | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [exampleQuery, setExampleQuery] = useState("46-year-old male, knee surgery in Pune, 3-month-old insurance policy");

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setPdfUploaded(true);
      toast.success("Policy document uploaded successfully!");
    } else {
      toast.error("Please upload a valid PDF file");
    }
  };

  const handleQuerySubmit = async () => {
    if (!pdfFile || !query.trim()) return;
    
    setIsLoading(true);
    try {
      // Convert PDF to text (simplified - in production would use proper PDF.js)
      const arrayBuffer = await pdfFile.arrayBuffer();
      
      // In a real implementation, we would extract the PDF text properly
      // For now, we'll use a sample policy document text for demonstration
      const samplePolicyText = `
Section 1.1: Policy Overview
This health insurance policy provides coverage for medical procedures and treatments as outlined in the sections below.

Section 1.2: Waiting Periods
For all surgeries except emergency procedures, a waiting period of 6 months from the date of policy issuance applies.
Maternity benefits have a waiting period of 9 months.
Pre-existing conditions have a waiting period of 48 months.

Section 1.3: Surgical Procedures
Knee surgery is covered up to Rs.75,000 after the applicable waiting period.
Heart surgery is covered up to Rs.200,000 after the applicable waiting period.
Cataract surgery is covered up to Rs.40,000 after the applicable waiting period.

Section 1.4: Geographical Limitations
Treatment in tier-1 cities (Mumbai, Delhi, Bangalore) is covered at 100% of the eligible amount.
Treatment in tier-2 cities (Pune, Hyderabad, Chennai) is covered at 90% of the eligible amount.
Treatment in other locations is covered at 80% of the eligible amount.

Section 1.5: Age-related Provisions
For policyholders above 60 years, a co-payment of 10% applies to all claims.
For policyholders below 18 years, pediatric specialists' fees are covered at an additional 10%.
`;
      
      const { data, error } = await supabase.functions.invoke('process-insurance-claim', {
        body: {
          query: query,
          document_content: samplePolicyText // In production, extract text from PDF
        }
      });

      if (error) throw error;
      
      setDecision(data.decision);
      toast.success("Claim processed successfully!");
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to process claim. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const useExample = () => {
    setQuery(exampleQuery);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Insurance Claim Processor
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Upload a policy document and enter a claim query to get an AI-powered decision with relevant policy clauses.
        </p>
      </div>

      {/* PDF Upload Section */}
      <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Policy Document
          </CardTitle>
          <CardDescription>
            Upload your insurance policy document in PDF format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {pdfUploaded ? `✓ ${pdfFile?.name} uploaded successfully!` : "Drag and drop your PDF here, or click to browse"}
              </p>
              <div>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pdf-upload"
                />
                <Button 
                  variant={pdfUploaded ? "secondary" : "default"}
                  onClick={() => document.getElementById('pdf-upload')?.click()}
                >
                  {pdfUploaded ? "Change Document" : "Choose File"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Query Section */}
      {pdfUploaded && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Enter Claim Details
            </CardTitle>
            <CardDescription>
              Enter the claim details in natural language format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Enter claim details (e.g., '46-year-old male, knee surgery in Pune, 3-month-old insurance policy')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={useExample}
                  className="text-xs"
                >
                  Use Example
                </Button>
              </div>
            </div>
            
            <Button 
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
              disabled={!query.trim() || isLoading}
              onClick={handleQuerySubmit}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Claim...
                </>
              ) : (
                "Process Claim"
              )}
            </Button>
            
            {/* Decision Area */}
            {decision && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-2 p-4 rounded-lg bg-muted">
                  <div className={`p-2 rounded-full ${decision.approved ? 'bg-green-100' : 'bg-red-100'}`}>
                    {decision.approved ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold">Claim Decision</h4>
                    <p className="text-sm">
                      {decision.approved ? (
                        <span className="text-green-600">Approved for ₹{decision.amount.toLocaleString()}</span>
                      ) : (
                        <span className="text-red-600">Rejected</span>
                      )}
                    </p>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg border">
                  <h4 className="font-semibold mb-2">Justification</h4>
                  <p className="text-sm">{decision.justification}</p>
                </div>
                
                {decision.relevantClauses.length > 0 && (
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2">Relevant Policy Clauses</h4>
                    <div className="space-y-3">
                      {decision.relevantClauses.map((clause, index) => (
                        <div key={index} className="p-3 bg-muted/50 rounded text-sm">
                          {clause}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-800 dark:text-blue-300">Extracted Information</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {query.includes("male") || query.includes("M") ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">Gender: Male</Badge>
                        ) : query.includes("female") || query.includes("F") ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">Gender: Female</Badge>
                        ) : null}
                        
                        {query.match(/\d+/) && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                            Age: {query.match(/\d+/)?.[0]}
                          </Badge>
                        )}
                        
                        {query.toLowerCase().includes("knee") && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">Procedure: Knee Surgery</Badge>
                        )}
                        
                        {query.toLowerCase().includes("pune") && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">Location: Pune</Badge>
                        )}
                        
                        {query.toLowerCase().includes("month") && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                            Policy: {query.match(/(\d+)[\s-]*month/i)?.[0] || "3-month"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InsuranceClaimMode;
