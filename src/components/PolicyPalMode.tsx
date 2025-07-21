import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, MessageCircle, FileText } from "lucide-react";

const PolicyPalMode = () => {
  const [pdfUploaded, setPdfUploaded] = useState(false);
  const [question, setQuestion] = useState("");

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
                {pdfUploaded ? "✓ PDF uploaded successfully!" : "Drag and drop your PDF here, or click to browse"}
              </p>
              <Button 
                variant={pdfUploaded ? "secondary" : "default"}
                onClick={() => setPdfUploaded(!pdfUploaded)}
              >
                {pdfUploaded ? "Change Document" : "Choose File"}
              </Button>
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
              disabled={!question.trim()}
            >
              Get Answer
            </Button>
            
            {/* Sample Answer Area */}
            {question.trim() && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">AI Response:</h4>
                <p className="text-sm text-muted-foreground">
                  This is where the AI-generated answer would appear based on the analysis of your uploaded PDF document.
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