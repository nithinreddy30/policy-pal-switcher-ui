import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Upload, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

const FinSentinelMode = () => {
  const [pdf1Uploaded, setPdf1Uploaded] = useState(false);
  const [pdf2Uploaded, setPdf2Uploaded] = useState(false);
  const [comparisonDone, setComparisonDone] = useState(false);

  const handleCompare = () => {
    setComparisonDone(true);
  };

  const mockComplianceResults = [
    { category: "Data Privacy", status: "compliant", details: "Both documents meet GDPR requirements" },
    { category: "Financial Reporting", status: "warning", details: "Minor discrepancies in reporting timelines" },
    { category: "Risk Management", status: "non-compliant", details: "Document 2 lacks required risk assessment procedures" },
    { category: "Audit Requirements", status: "compliant", details: "Both documents have comprehensive audit frameworks" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "compliant": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "non-compliant": return <XCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      compliant: "bg-green-100 text-green-800 border-green-200",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-200", 
      "non-compliant": "bg-red-100 text-red-800 border-red-200"
    };
    return variants[status as keyof typeof variants] || "";
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <Scale className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            FinSentinel Mode
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Compare two PDF documents to analyze compliance differences and identify potential regulatory issues.
        </p>
      </div>

      {/* Upload Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Document 1 */}
        <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Document 1 (Reference)
            </CardTitle>
            <CardDescription>
              Upload the reference compliance document
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${pdf1Uploaded ? 'bg-green-100' : 'bg-muted'}`}>
                {pdf1Uploaded ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  {pdf1Uploaded ? "✓ Reference document uploaded" : "Upload reference document"}
                </p>
                <Button 
                  variant={pdf1Uploaded ? "secondary" : "default"}
                  size="sm"
                  onClick={() => setPdf1Uploaded(!pdf1Uploaded)}
                >
                  {pdf1Uploaded ? "Change" : "Choose File"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document 2 */}
        <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Document 2 (Comparison)
            </CardTitle>
            <CardDescription>
              Upload the document to compare against reference
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${pdf2Uploaded ? 'bg-green-100' : 'bg-muted'}`}>
                {pdf2Uploaded ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  {pdf2Uploaded ? "✓ Comparison document uploaded" : "Upload comparison document"}
                </p>
                <Button 
                  variant={pdf2Uploaded ? "secondary" : "default"}
                  size="sm"
                  onClick={() => setPdf2Uploaded(!pdf2Uploaded)}
                >
                  {pdf2Uploaded ? "Change" : "Choose File"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compare Button */}
      {pdf1Uploaded && pdf2Uploaded && (
        <div className="text-center">
          <Button 
            onClick={handleCompare}
            className="bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 px-8 py-3"
            size="lg"
          >
            <Scale className="w-5 h-5 mr-2" />
            Compare Documents for Compliance
          </Button>
        </div>
      )}

      {/* Results Section */}
      {comparisonDone && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Compliance Analysis Results
            </CardTitle>
            <CardDescription>
              Detailed comparison results highlighting compliance status across different categories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockComplianceResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <h4 className="font-medium">{result.category}</h4>
                    <p className="text-sm text-muted-foreground">{result.details}</p>
                  </div>
                </div>
                <Badge className={getStatusBadge(result.status)}>
                  {result.status.replace("-", " ")}
                </Badge>
              </div>
            ))}
            
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Summary</h4>
              <p className="text-sm text-muted-foreground">
                2 of 4 compliance categories passed, 1 warning, 1 non-compliant. 
                Review the non-compliant items to ensure full regulatory adherence.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FinSentinelMode;