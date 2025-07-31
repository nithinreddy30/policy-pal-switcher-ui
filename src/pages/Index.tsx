
import { useState } from "react";
import ModeSwitch, { AppMode } from "@/components/ModeSwitch";
import PolicyPalMode from "@/components/PolicyPalMode";
import FinSentinelMode from "@/components/FinSentinelMode";
import InsuranceClaimMode from "@/components/InsuranceClaimMode";
import PolicyQAMode from "@/components/PolicyQAMode";
import HackRxMode from "@/components/HackRxMode";

const Index = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>("hackrx");

  const handleModeChange = (mode: AppMode) => {
    setCurrentMode(mode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <ModeSwitch currentMode={currentMode} onModeChange={handleModeChange} />
      
      <main className="container mx-auto">
        {currentMode === "policypal" && <PolicyPalMode />}
        {currentMode === "finsentinel" && <FinSentinelMode />}
        {currentMode === "insuranceclaim" && <InsuranceClaimMode />}
        {currentMode === "policyqa" && <PolicyQAMode />}
        {currentMode === "hackrx" && <HackRxMode />}
      </main>
    </div>
  );
};

export default Index;
