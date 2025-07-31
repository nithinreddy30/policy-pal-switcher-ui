import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Brain, Search, FileText, CheckCircle } from "lucide-react";

interface StructuredResponse {
  answer: string;
  confidence: number;
  reasoning: string;
  relevant_clauses: Array<{
    clause_id: string;
    clause_text: string;
    relevance_score: number;
  }>;
  entities_found: string[];
  decision_factors: Array<{
    factor: string;
    status: string;
    explanation: string;
  }>;
  metadata: {
    query_type: string;
    processing_time_ms: number;
    sources_used: number;
  };
}

interface HackRxResponse {
  answers: string[];
  structured_responses: StructuredResponse[];
  system_metadata: {
    total_processing_time_ms: number;
    document_chunks_created: number;
    questions_processed: number;
    avg_confidence: number;
    system_version: string;
  };
}

const HackRxMode = () => {
  const [documentUrl, setDocumentUrl] = useState("https://hackrx.blob.core.windows.net/assets/policy.pdf?sv=2023-01-03&st=2025-07-04T09%3A11%3A24Z&se=2027-07-05T09%3A11%3A00Z&sr=b&sp=r&sig=N4a9OU0w0QXO6AOIBiu4bpl7AXvEZogeT%2FjUHNO7HzQ%3D");
  const [questions, setQuestions] = useState<string[]>([
    "What is the grace period for premium payment under the National Parivar Mediclaim Plus Policy?"
  ]);
  const [response, setResponse] = useState<HackRxResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const addQuestion = () => {
    setQuestions([...questions, ""]);
  };

  const removeQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  const updateQuestion = (index: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = value;
    setQuestions(newQuestions);
  };

  const loadSampleQuestions = () => {
    setQuestions([
      "What is the grace period for premium payment under the National Parivar Mediclaim Plus Policy?",
      "What is the waiting period for pre-existing diseases (PED) to be covered?",
      "Does this policy cover maternity expenses, and what are the conditions?",
      "What is the waiting period for cataract surgery?",
      "Are the medical expenses for an organ donor covered under this policy?",
      "What is the No Claim Discount (NCD) offered in this policy?",
      "Is there a benefit for preventive health check-ups?",
      "How does the policy define a 'Hospital'?",
      "What is the extent of coverage for AYUSH treatments?",
      "Are there any sub-limits on room rent and ICU charges for Plan A?"
    ]);
  };

  const handleSubmit = async () => {
    if (!documentUrl.trim()) {
      toast({
        title: "Error",
        description: "Please provide a document URL",
        variant: "destructive",
      });
      return;
    }

    const validQuestions = questions.filter(q => q.trim());
    if (validQuestions.length === 0) {
      toast({
        title: "Error",
        description: "Please provide at least one question",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);

    try {
      const { data, error } = await supabase.functions.invoke('hackrx-intelligent-query', {
        body: {
          documents: documentUrl,
          questions: validQuestions
        }
      });

      if (error) {
        throw error;
      }

      setResponse(data);
      
      toast({
        title: "Success",
        description: `Processed ${validQuestions.length} questions with ${data.system_metadata.avg_confidence.toFixed(1)}% avg confidence`,
      });

    } catch (error) {
      console.error('Error processing questions:', error);
      toast({
        title: "Error",
        description: "Failed to process questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'met': return "bg-green-500";
      case 'not_met': return "bg-red-500";
      case 'conditional': return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            HackRx 6.0 - Intelligent Query-Retrieval System
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            LLM-powered document analysis with semantic search, clause matching, and explainable AI decisions
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Document URL</label>
            <Input
              placeholder="https://example.com/policy.pdf"
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium">Questions</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadSampleQuestions}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Load Sample
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addQuestion}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              {questions.map((question, index) => (
                <div key={index} className="flex gap-2">
                  <Textarea
                    placeholder={`Question ${index + 1}...`}
                    value={question}
                    onChange={(e) => updateQuestion(index, e.target.value)}
                    className="flex-1"
                    rows={2}
                  />
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeQuestion(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing with RAG Pipeline...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Run Intelligent Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {response && (
        <>
          {/* System Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                System Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{response.system_metadata.total_processing_time_ms}ms</div>
                  <div className="text-sm text-muted-foreground">Total Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{response.system_metadata.document_chunks_created}</div>
                  <div className="text-sm text-muted-foreground">Document Chunks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{(response.system_metadata.avg_confidence * 100).toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Avg Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{response.system_metadata.questions_processed}</div>
                  <div className="text-sm text-muted-foreground">Questions</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Structured Responses */}
          <div className="space-y-4">
            {response.structured_responses.map((structuredResponse, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Question {index + 1}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{structuredResponse.metadata.query_type}</Badge>
                      <div className={`w-3 h-3 rounded-full ${getConfidenceColor(structuredResponse.confidence)}`} />
                      <span className="text-sm font-medium">{(structuredResponse.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground font-normal">
                    {questions[index]}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Answer */}
                  <div>
                    <h4 className="font-medium mb-2">Answer</h4>
                    <p className="text-sm bg-muted p-3 rounded-lg">
                      {structuredResponse.answer}
                    </p>
                  </div>

                  {/* Reasoning */}
                  <div>
                    <h4 className="font-medium mb-2">Reasoning</h4>
                    <p className="text-sm text-muted-foreground">
                      {structuredResponse.reasoning}
                    </p>
                  </div>

                  {/* Entities Found */}
                  {structuredResponse.entities_found.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Entities Identified</h4>
                      <div className="flex flex-wrap gap-1">
                        {structuredResponse.entities_found.map((entity, idx) => (
                          <Badge key={idx} variant="secondary">{entity}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Decision Factors */}
                  {structuredResponse.decision_factors.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Decision Factors</h4>
                      <div className="space-y-2">
                        {structuredResponse.decision_factors.map((factor, idx) => (
                          <div key={idx} className="border rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(factor.status)}`} />
                              <span className="font-medium text-sm">{factor.factor}</span>
                              <Badge variant="outline" className="text-xs">{factor.status}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{factor.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Relevant Clauses */}
                  {structuredResponse.relevant_clauses.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Relevant Clauses</h4>
                      <div className="space-y-2">
                        {structuredResponse.relevant_clauses.map((clause, idx) => (
                          <div key={idx} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{clause.clause_id}</span>
                              <span className="text-xs text-muted-foreground">
                                {(clause.relevance_score * 100).toFixed(1)}% relevant
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{clause.clause_text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Processing Metadata */}
                  <div className="text-xs text-muted-foreground border-t pt-2">
                    Processed in {structuredResponse.metadata.processing_time_ms}ms • 
                    Used {structuredResponse.metadata.sources_used} sources
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HackRxMode;