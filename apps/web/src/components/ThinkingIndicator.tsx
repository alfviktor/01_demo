"use client";

import { useState, useEffect } from "react";
import { Loader2, Search, BookOpen, Sparkles } from "lucide-react";

type ThinkingStage = 
  | "retrieving" 
  | "processing" 
  | "generating" 
  | "completing";

interface ThinkingIndicatorProps {
  variant?: "dots" | "pulse" | "spinner" | "stages";
  text?: string;
  activeStage?: ThinkingStage;
  allStagesComplete?: boolean;
}

const stageInfo = {
  retrieving: {
    icon: Search,
    text: "Retrieving information",
  },
  processing: {
    icon: BookOpen,
    text: "Processing context",
  },
  generating: {
    icon: Loader2,
    text: "Generating response",
  },
  completing: {
    icon: Sparkles,
    text: "Finalizing answer",
  },
};

export function ThinkingIndicator({
  variant = "dots",
  text = "Thinking",
  activeStage = "retrieving",
  allStagesComplete = false
}: ThinkingIndicatorProps) {
  const [dots, setDots] = useState("");
  // Auto-advance stages for demo purposes
  const [currentStage, setCurrentStage] = useState<ThinkingStage>(activeStage);

  // Auto-advance stages every few seconds (for demo)
  useEffect(() => {
    if (variant !== "stages" || allStagesComplete) return;
    
    const stages: ThinkingStage[] = ["retrieving", "processing", "generating", "completing"];
    const currentIndex = stages.indexOf(currentStage);
    
    const timer = setTimeout(() => {
      if (currentIndex < stages.length - 1) {
        setCurrentStage(stages[currentIndex + 1]);
      }
    }, 2500 + Math.random() * 1500); // Random time between 2.5-4s
    
    return () => clearTimeout(timer);
  }, [variant, currentStage, allStagesComplete]);

  useEffect(() => {
    // Animate dots only for the dots variant
    if (variant !== "dots" && !variant.includes("stages")) return;

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return "";
        return prev + ".";
      });
    }, 400);

    return () => clearInterval(interval);
  }, [variant]);

  // Stages variant
  if (variant === "stages") {
    const stages: ThinkingStage[] = ["retrieving", "processing", "generating", "completing"];
    
    return (
      <div className="mt-2 space-y-2 animate-in fade-in duration-700">
        <div className="text-xs font-medium text-gray-400 mb-1">Processing your request</div>
        <div className="space-y-1.5">
          {stages.map((stage) => {
            const StageIcon = stageInfo[stage].icon;
            const stageText = stageInfo[stage].text;
            const isCurrentStage = stage === currentStage;
            const isCompleted = stages.indexOf(stage) < stages.indexOf(currentStage);
            const isPending = !isCurrentStage && !isCompleted;
            
            return (
              <div 
                key={stage}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all duration-500 ${isPending ? 'opacity-40' : 'opacity-100'} ${isCurrentStage ? 'bg-gray-800/50' : ''}`}
              >
                <div className={`relative`}>
                  <StageIcon className={`h-3 w-3 ${isCompleted ? 'text-blue-400' : isCurrentStage ? 'text-gray-200 animate-pulse' : 'text-gray-500'}`} />
                  {isCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-1 w-1 rounded-full bg-blue-400"></div>
                    </div>
                  )}
                </div>
                <div className="flex-1 text-xs">
                  {stageText}
                  {isCurrentStage && <span className="inline-block w-5 overflow-hidden">{dots}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === "spinner") {
    return (
      <div className="flex items-center text-gray-400 text-sm space-x-2 animate-pulse">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{text}</span>
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className="flex items-center space-x-1">
        <div className="flex space-x-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 w-1.5 bg-gray-400 rounded-full animate-pulse`}
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Default dots variant
  return (
    <div className="text-gray-400 text-sm">
      {text}
      <span className="inline-block w-8">{dots}</span>
    </div>
  );
}
