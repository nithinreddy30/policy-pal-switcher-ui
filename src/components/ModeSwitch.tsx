import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Scale } from "lucide-react";

export type AppMode = "policypal" | "finsentinel";

interface ModeSwitchProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const ModeSwitch = ({ currentMode, onModeChange }: ModeSwitchProps) => {
  return (
    <div className="flex items-center justify-center p-6 bg-gradient-to-r from-background to-muted border-b">
      <div className="flex bg-secondary rounded-lg p-1 shadow-sm">
        <Button
          variant={currentMode === "policypal" ? "default" : "ghost"}
          onClick={() => onModeChange("policypal")}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-md transition-all duration-300
            ${currentMode === "policypal" 
              ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-md transform scale-105" 
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }
          `}
        >
          <FileText size={18} />
          <span className="font-medium">PolicyPal Mode</span>
          <span className="text-xs opacity-75">Single PDF + Q&A</span>
        </Button>
        
        <Button
          variant={currentMode === "finsentinel" ? "default" : "ghost"}
          onClick={() => onModeChange("finsentinel")}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-md transition-all duration-300
            ${currentMode === "finsentinel" 
              ? "bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-md transform scale-105" 
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }
          `}
        >
          <Scale size={18} />
          <span className="font-medium">FinSentinel Mode</span>
          <span className="text-xs opacity-75">Compare 2 PDFs</span>
        </Button>
      </div>
    </div>
  );
};

export default ModeSwitch;