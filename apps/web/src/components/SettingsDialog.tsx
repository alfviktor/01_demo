"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IndexedDBAdapter } from "@/lib/indexeddb";
import { Input } from "@/components/ui/input";
import MoonPhaseIcon from "./icons/MoonPhaseIcon";
import { getCurrentMoonPhase } from "@/lib/utils";
import { Check, ChevronRight, ChevronLeft, MoveUpRight } from "lucide-react";
import { useMemo } from "react";
// const db = new IndexedDBAdapter();

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsChange?: () => void;
}

export default function SettingsDialog({
  open,
  onOpenChange,
  onSettingsChange,
}: SettingsDialogProps): JSX.Element {
  const { theme, setTheme } = useTheme();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customEndpoint, setCustomEndpoint] = useState<string>("");
  const [customModelName, setCustomModelName] = useState<string>("");
  const [customApiKey, setCustomApiKey] = useState<string>("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [currentView, setCurrentView] = useState<
    "main" | "appearance" | "endpoint" | "chats" | "credits"
  >("main");
  const router = useRouter();

  const db = useMemo(() => new IndexedDBAdapter(), []);

  // Reset view when dialog closes
  useEffect(() => {
    let mounted = true;

    if (open) {
      db.getCustomEndpoint().then((settings) => {
        if (mounted) {
          console.log("Loading settings:", settings);
          setCustomEndpoint(settings.endpoint || "");
          setCustomModelName(settings.modelName || "");
          setCustomApiKey(settings.apiKey || "");
        }
      });
    } else {
      setCurrentView("main");
    }

    return () => {
      mounted = false;
    };
  }, [open, db]);

  const handleDeleteChats = async () => {
    try {
      const conversations = await db.listConversations();
      await Promise.all(
        conversations.map((conv) => db.deleteConversation(conv.id))
      );
      setShowDeleteConfirm(false);
      router.push("/");
    } catch (error) {
      console.error("Error deleting conversations:", error);
    }
  };

  const handleSaveEndpoint = async () => {
    try {
      setSaveSuccess(true);
      console.log("Saving settings:", {
        endpoint: customEndpoint || undefined,
        modelName: customModelName || undefined,
        apiKey: customApiKey || undefined,
      });
      await db.setCustomEndpoint(
        customEndpoint || undefined,
        customModelName || undefined,
        customApiKey || undefined
      );
      onSettingsChange?.();
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error saving endpoint settings:", error);
    }
  };

  const renderMainView = () => (
    <>
      <DialogHeader>
        <DialogTitle>settings</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        {/* First group */}
        <div className="overflow-hidden rounded-lg border bg-card">
          <Button
            variant="ghost"
            className="w-full justify-between border-b px-4 py-2 h-auto hover:bg-accent rounded-none"
            onClick={() => setCurrentView("appearance")}
          >
            appearance
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-between border-b px-4 py-2 h-auto hover:bg-accent rounded-none"
            onClick={() => setCurrentView("endpoint")}
          >
            model endpoint
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-between px-4 py-2 h-auto hover:bg-accent rounded-none"
            onClick={() => setCurrentView("chats")}
          >
            chats
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        {/* Credits section */}
        <div className="overflow-hidden rounded-lg border bg-card">
          <Button
            variant="ghost"
            className="w-full justify-between px-4 py-2 h-auto hover:bg-accent rounded-none"
            onClick={() => setCurrentView("credits")}
          >
            credits
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card">
          <a
            href="https://github.com/mainframecomputer/fullmoon-web"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-2 hover:bg-accent transition-colors border-b last:border-0 text-sm text-blue-400"
          >
            code
            <MoveUpRight className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
        <div className="flex flex-col items-center gap-2 pt-8 pb-8">
          <div className="text-muted-foreground">
            <MoonPhaseIcon
              phase={getCurrentMoonPhase()}
              size={14}
              color="currentColor"
            />
          </div>
          <p className="text-xs text-muted-foreground mb-2">version 0.1.0</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Made by</span>
            <a href="https://www.01.inc/" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
              Zero One Labs
            </a>
          </div>
        </div>
      </div>
    </>
  );

  const renderAppearanceView = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-6 w-6 p-0"
            onClick={() => setCurrentView("main")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex-1 text-sm">appearance</span>
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm">theme</div>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-[100px] focus:ring-0 focus:ring-offset-0 h-8">
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">system</SelectItem>
                <SelectItem value="light">light</SelectItem>
                <SelectItem value="dark">dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </>
  );

  const renderEndpointView = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-6 w-6 p-0"
            onClick={() => setCurrentView("main")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex-1 text-sm">model endpoint</span>
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border bg-card">
          <div className="space-y-px">
            <div className="px-4 py-2 border-b">
              <div className="text-xs text-muted-foreground mb-1">
                endpoint URL
              </div>
              <Input
                type="text"
                placeholder="openai compatible endpoint url"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                className="h-6 px-0 border-0 shadow-none focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/50 text-sm"
              />
            </div>
            <div className="px-4 py-2 border-b">
              <div className="text-xs text-muted-foreground mb-1">
                model name
              </div>
              <Input
                type="text"
                placeholder="model name (e.g. gpt-4)"
                value={customModelName}
                onChange={(e) => setCustomModelName(e.target.value)}
                className="h-6 px-0 border-0 shadow-none focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/50 text-sm"
              />
            </div>
            <div className="px-4 py-2">
              <div className="text-xs text-muted-foreground mb-1">
                api key (optional)
              </div>
              <Input
                type="password"
                placeholder="your api key"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                className="h-6 px-0 border-0 shadow-none focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/50 text-sm"
              />
            </div>
          </div>
        </div>
        <Button
          variant="secondary"
          className="w-full h-8"
          onClick={handleSaveEndpoint}
        >
          {saveSuccess ? (
            <Check className="h-4 w-4 animate-in zoom-in duration-300" />
          ) : (
            "save endpoint settings"
          )}
        </Button>
      </div>
    </>
  );

  const renderChatsView = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-6 w-6 p-0"
            onClick={() => setCurrentView("main")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex-1 text-sm">chats</span>
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <Button
          variant="destructive"
          className="h-8 px-3 w-full"
          onClick={() => setShowDeleteConfirm(true)}
        >
          delete all conversations
        </Button>
      </div>
    </>
  );

  const renderCreditsView = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="h-6 w-6 p-0"
            onClick={() => setCurrentView("main")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex-1 text-sm">credits</span>
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg border bg-card">
          <a
            href="https://mainfra.me"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-2 hover:bg-accent transition-colors border-b last:border-0 text-sm text-blue-400"
          >
            Mainframe
            <MoveUpRight className="h-4 w-4 text-muted-foreground" />
          </a>
          <a
            href="https://sdk.vercel.ai/docs/introduction"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-2 hover:bg-accent transition-colors border-b last:border-0 text-sm text-blue-400"
          >
            Vercel AI SDK
            <MoveUpRight className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[350px]">
          {currentView === "main" && renderMainView()}
          {currentView === "appearance" && renderAppearanceView()}
          {currentView === "endpoint" && renderEndpointView()}
          {currentView === "chats" && renderChatsView()}
          {currentView === "credits" && renderCreditsView()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              this will permanently delete all your conversations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChats}>
              delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
