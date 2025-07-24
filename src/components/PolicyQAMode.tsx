import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2 } from "lucide-react";

const PolicyQAMode = () => {
  const [documentUrl, setDocumentUrl] = useState("");
  const [questions, setQuestions] = useState<string[]>([""]);
  const [answers, setAnswers] = useState<string[]>([]);
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
    setAnswers([]);

    try {
      const { data, error } = await supabase.functions.invoke('policy-qa', {
        body: {
          documents: documentUrl,
          questions: validQuestions
        }
      });

      if (error) {
        throw error;
      }

      setAnswers(data.answers || []);
      
      toast({
        title: "Success",
        description: `Processed ${validQuestions.length} questions successfully`,
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

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Policy Document Q&A</CardTitle>
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
                Processing Questions...
              </>
            ) : (
              "Process Questions"
            )}
          </Button>
        </CardContent>
      </Card>

      {answers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Answers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {answers.map((answer, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">
                    Question {index + 1}: {questions[index]}
                  </h4>
                  <p className="text-sm">{answer}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PolicyQAMode;