import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, MessageCircle, FileText, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// Helper function to safely convert ArrayBuffer to base64
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  // Use a chunked approach to avoid call stack issues with large files
  const chunk_size = 8192; // Process 8KB chunks
  const uint8Array = new Uint8Array(buffer);
  let result = '';
  
  for (let i = 0; i < uint8Array.length; i += chunk_size) {
    const chunk = uint8Array.slice(i, i + chunk_size);
    result += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  try {
    return btoa(result);
  } catch (error) {
    console.error("Base64 conversion error:", error);
    throw new Error("Failed to convert PDF to base64. The file may be too large.");
  }
};

// Helper to extract text from PDF for simplified demo
const extractSimplifiedText = (base64: string, fileName: string): string => {
  // In a production app, we would use PDF.js or similar to extract real text
  // This is a placeholder that indicates we'd process the actual content
  return `[PDF Content extracted from ${fileName} - In production, this would be actual text from the PDF]`;
};

const PolicyPalMode = () => {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [entities, setEntities] = useState<Record<string, string | null>>({});
  const [relevantSections, setRelevantSections] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = event.target.files?.[0];
    
    if (!file) {
      return;
    }
    
    if (file.type !== 'application/pdf') {
      setFileError("Please upload a valid PDF file");
      toast.error("Please upload a valid PDF file");
      return;
    }
    
    // Check file size (limit to 10MB for example)
    if (file.size > 10 * 1024 * 1024) {
      setFileError("File too large. Please upload a PDF smaller than 10MB");
      toast.error("File too large. Please upload a PDF smaller than 10MB");
      return;
    }
    
    setPdfFile(file);
    setPdfUploaded(true);
    toast.success("PDF uploaded successfully!");
  };

  const handleQuestionSubmit = async () => {
    if (!pdfFile || !question.trim()) return;
    
    setIsLoading(true);
    try {
      // Process the PDF safely
      const arrayBuffer = await pdfFile.arrayBuffer();
      
      // Convert PDF to base64 safely using our helper function
      let base64Content;
      try {
        base64Content = arrayBufferToBase64(arrayBuffer);
      } catch (error) {
        console.error("PDF conversion error:", error);
        toast.error("Error processing PDF. The file may be too large.");
        setIsLoading(false);
        return;
      }
      
      // For PolicyPal mode, we'll use the Gemini API directly with the PDF content
      // since it can handle PDF files natively
      const { data, error } = await supabase.functions.invoke('process-pdf', {
        body: {
          pdf_content: base64Content, // Send the actual base64 PDF content
          question: question,
          is_pdf_base64: true // Flag to indicate this is base64 PDF content
        }
      });

      if (error) {
        console.error("Supabase function error:", error);
        throw error;
      }
      
      setAnswer(data.answer);
      setEntities(data.entities || {});
      setRelevantSections(data.relevantSections || []);
      toast.success("Answer generated successfully!");
    } catch (error) {
      console.error('Error processing question:', error);
      toast.error("Failed to process question. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            PolicyPal Mode
          </h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Upload a single PDF document and ask questions to get intelligent answers powered by AI analysis.
        </p>
      </div>

      {/* PDF Upload Section */}
      <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload PDF Document
          </CardTitle>
          <CardDescription>
            Upload your policy document, contract, or any PDF you want to analyze
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
              {fileError && <p className="text-sm text-red-500">{fileError}</p>}
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

      {/* Q&A Section */}
      {pdfUploaded && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Ask Questions
            </CardTitle>
            <CardDescription>
              Ask any question about the uploaded document
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Ask a question about your document... (e.g., 'What are the key policy terms?', 'What are the compliance requirements?')"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[100px]"
            />
            <Button 
              className="w-full bg-gradient-to-r from-primary to-primary-glow hover:opacity-90"
              disabled={!question.trim() || isLoading}
              onClick={handleQuestionSubmit}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Get Answer"
              )}
            </Button>
            
            {/* Answer Area */}
            {answer && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">AI Response:</h4>
                  <p className="text-sm whitespace-pre-wrap">{answer}</p>
                </div>
                
                {/* Extracted Entities */}
                {Object.keys(entities).length > 0 && (
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-blue-800 dark:text-blue-300">Extracted Information</h4>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.entries(entities).map(([key, value]) => (
                            value && (
                              <Badge key={key} variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                                {key}: {value}
                              </Badge>
                            )
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Relevant Sections */}
                {relevantSections.length > 0 && (
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-2">Relevant Document Sections</h4>
                    <div className="space-y-3">
                      {relevantSections.map((section, index) => (
                        <div key={index} className="p-3 bg-muted/50 rounded text-sm">
                          {section}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Sample Answer Area */}
            {question.trim() && !answer && !isLoading && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">AI Response:</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Get Answer" to analyze your document and receive an AI-generated response.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PolicyPalMode;
