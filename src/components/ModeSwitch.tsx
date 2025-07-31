
import { cn } from "@/lib/utils";
import { FileText, Scale, Users, HelpCircle, Brain } from "lucide-react";

export type AppMode = "policypal" | "finsentinel" | "insuranceclaim" | "policyqa" | "hackrx";

interface ModeSwitchProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const ModeSwitch = ({ currentMode, onModeChange }: ModeSwitchProps) => {
  return (
    <div className="flex flex-col items-center py-4">
      <div className="bg-muted rounded-lg p-1 flex mb-2">
        <button
          onClick={() => onModeChange("policypal")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            currentMode === "policypal"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"
          )}
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">PolicyPal</span>
        </button>

        <button
          onClick={() => onModeChange("finsentinel")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            currentMode === "finsentinel"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"
          )}
        >
          <Scale className="w-4 h-4" />
          <span className="hidden sm:inline">FinSentinel</span>
        </button>

        <button
          onClick={() => onModeChange("insuranceclaim")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            currentMode === "insuranceclaim"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"
          )}
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Insurance Claims</span>
        </button>

        <button
          onClick={() => onModeChange("policyqa")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            currentMode === "policyqa"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"
          )}
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Policy Q&A</span>
        </button>

        <button
          onClick={() => onModeChange("hackrx")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            currentMode === "hackrx"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted-foreground/10"
          )}
        >
          <Brain className="w-4 h-4" />
          <span className="hidden sm:inline">HackRx RAG</span>
        </button>
      </div>

      <div className="px-4 text-center max-w-2xl">
        <img 
          src="/lovable-uploads/2ac1f8ec-4ded-4eac-8585-1a39db49d424.png" 
          alt="DocuGenius Logo" 
          className="h-8 mx-auto mb-2"
        />
        <p className="text-xs text-muted-foreground">
          {currentMode === "policypal" && "Ask questions about your documents and get AI-powered answers"}
          {currentMode === "finsentinel" && "Compare documents for compliance and identify regulatory issues"}
          {currentMode === "insuranceclaim" && "Process insurance claims with AI-powered policy analysis"}
          {currentMode === "policyqa" && "Batch process multiple questions against policy documents from URLs"}
          {currentMode === "hackrx" && "HackRx 6.0 - Intelligent Query-Retrieval System with RAG, semantic search, and explainable AI"}
        </p>
      </div>
    </div>
  );
};

export default ModeSwitch;
