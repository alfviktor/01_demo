"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useChat, type Message as AiMessage } from "ai/react";
import {
  Menu,
  Paperclip,
  ArrowUp,
  Plus,
  Cog,
  MessageCircleWarning,
  BookOpen,
  Copy,
  CheckCheck,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Conversation } from "@fullmoon/database";
import { useSidebar } from "@/contexts/SidebarContext";
import MoonPhaseIcon from "@/components/icons/MoonPhaseIcon";
import { getCurrentMoonPhase } from "@/lib/utils";
import SettingsDialog from "@/components/SettingsDialog";
import { IndexedDBAdapter } from "@/lib/indexeddb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import readPDFText from "react-pdftotext";
import { ChatDrawer } from "@/components/ChatDrawer";
import { ShimmerText } from "@/components/ShimmerText";
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nightOwl } from 'react-syntax-highlighter/dist/cjs/styles/prism';

const db = new IndexedDBAdapter();

interface ConversationWithMessages extends Conversation {
  messages: AiMessage[];
}

interface ChatInterfaceProps {
  convo?: ConversationWithMessages;
}

const MAX_FILE_SIZE = 100 * 1024; // 100KB
const ALLOWED_FILE_TYPES = [
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
  "text/html",
  "text/javascript",
  "text/typescript",
  "text/css",
  "application/pdf",
];

interface CodeBlockType {
  language: string;
  code: string;
}

// Function to format message content with code blocks - more reliable split-based approach
const formatMessageContent = (content: string): React.ReactNode => {
  if (!content) return null;
  
  // Simple approach - split by code block delimiter
  const parts: React.ReactNode[] = [];
  const segments = content.split('```');
  
  // If no code blocks are found, return the whole content as a paragraph
  if (segments.length === 1) {
    return <p>{content}</p>;
  }
  
  // Process alternating text and code blocks
  segments.forEach((segment, index) => {
    // Even indices (0, 2, 4...) are regular text
    if (index % 2 === 0) {
      if (segment.trim()) {
        parts.push(<p key={`text-${index}`}>{segment}</p>);
      }
    } 
    // Odd indices (1, 3, 5...) are code blocks
    else {
      // Extract language from the first line
      const lines = segment.split('\n');
      const language = lines[0].trim() || 'text';
      
      // The rest is code (skip the first line which contains the language)
      const code = lines.slice(1).join('\n').trim();
      
      parts.push(
        <CodeBlock key={`code-${index}`} language={language} code={code} />
      );
    }
  });
  
  return <>{parts}</>;
};

// Code block component with copy functionality
function CodeBlock({ language, code }: CodeBlockType) {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="relative my-3 bg-gray-900 rounded-md overflow-hidden">
      <div className="flex justify-between items-center px-4 py-1 bg-gray-800 text-xs text-gray-400 border-b border-gray-700">
        <span>{language}</span>
        <button 
          onClick={copyToClipboard}
          className="flex items-center gap-1 hover:text-gray-200 transition-colors duration-200"
        >
          {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={nightOwl}
          customStyle={{ margin: 0, background: 'transparent' }}
          codeTagProps={{ style: { fontFamily: 'monospace' } }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export function ChatInterface({ convo }: ChatInterfaceProps) {
  console.log("[ChatInterface] Component Rendering");

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showSettingsAlert, setShowSettingsAlert] = useState(false);
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(
    convo?.id || null
  );
  const [, setConversation] = useState<ConversationWithMessages | null>(
    convo || null
  );
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [showThinkingEffect, setShowThinkingEffect] = useState(false);
  const [isAwaitingAssistant, setIsAwaitingAssistant] = useState(false);

  const [customEndpointSettings, setCustomEndpointSettings] = useState({
    endpoint: process.env.NEXT_PUBLIC_RAGIE_API_ENDPOINT || "",
    apiKey: "", // Never store API keys directly in frontend state for production
    modelName: process.env.NEXT_PUBLIC_OPENAI_MODEL_NAME || "o4-mini", // Default to o4-mini
    partition: process.env.NEXT_PUBLIC_RAGIE_PARTITION || "",
  });

  useEffect(() => {
    db.getCustomEndpoint().then((endpointSettings) => {
      // If no settings found (or incomplete), set default values that use our server API
      if (!endpointSettings?.endpoint || !endpointSettings?.modelName) {
        // Set default values that will use the server-side API (which uses env vars)
        const defaultSettings = {
          endpoint: "/api/chat", // Use relative path to our own API
          modelName: process.env.NEXT_PUBLIC_OPENAI_MODEL_NAME || "o4-mini",  // Use default model
          apiKey: "",            // API key not needed for server-side endpoint
          partition: process.env.NEXT_PUBLIC_RAGIE_PARTITION || "", // Add default partition
        };
        
        // Save default settings to IndexedDB
        db.setCustomEndpoint(
          defaultSettings.endpoint,
          defaultSettings.modelName,
          defaultSettings.apiKey
        ).then(() => {
          // After saving, update state with these values
          setCustomEndpointSettings(defaultSettings);
          setShowSettingsAlert(false);
        });
      } else {
        // Ensure loaded settings include all properties, providing defaults if missing
        setCustomEndpointSettings({
          endpoint: endpointSettings.endpoint || "/api/chat",
          modelName: process.env.NEXT_PUBLIC_OPENAI_MODEL_NAME || "o4-mini", // Force default
          apiKey: endpointSettings.apiKey || "",
          partition: (endpointSettings as Partial<{partition: string}>).partition || process.env.NEXT_PUBLIC_RAGIE_PARTITION || "", 
        });
      }
    });
  }, []);

  useEffect(() => {
    setShowSettingsAlert(
      !customEndpointSettings?.endpoint || !customEndpointSettings?.modelName
    );
  }, [customEndpointSettings]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update conversationId when convo changes
  useEffect(() => {
    if (convo?.id) {
      setConversationId(convo.id);
      setConversation(convo);
    }
  }, [convo]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, data, setMessages } =
    useChat({
      initialMessages: convo?.messages || [],
      body: {
        conversationId,
        customEndpointSettings,
      },
      id: conversationId || "new",
      onResponse: () => {
        console.log("[ChatInterface] onResponse: streaming started");
      },
      onFinish: async (message) => {
        if (!conversationId) return;
        try {
          await db.createMessage({
            content: message.content,
            role: "assistant",
            conversationId: conversationId,
            createdAt: new Date(),
          });
        } catch (error) {
          console.error("Failed to save assistant message:", error);
        }
        // Reset all states after completion
        console.log("[ChatInterface] onFinish: Setting showThinkingEffect to false");
        setIsAwaitingAssistant(false);
      },
    });

  interface DataItem { // Define type for data items from useChat
    sources?: string[];
  }
  const [messageSources, setMessageSources] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (data && Array.isArray(data)) {
      // Check item type before processing to satisfy JSONValue[] type
      data.forEach((item) => { 
        if (typeof item === 'object' && item !== null && 'sources' in item) {
          const dataItem = item as DataItem; // Assert type after check
          if (dataItem.sources && Array.isArray(dataItem.sources) && messages.length > 0) {
            const lastMessageId = messages[messages.length - 1].id;
            if (lastMessageId) {
              // Ensure the assigned value is strictly string[]
              const sources = dataItem.sources as string[]; 
              setMessageSources(prevSources => ({
                ...prevSources,
                [lastMessageId]: sources, 
              }));
            }
          }
        }
      });
    }
  }, [data, messages]); // Add messages to dependency array

  useEffect(() => {
    if (isAwaitingAssistant) {
      const last = messages[messages.length-1];
      if (last && last.role === 'assistant' && last.content.trim().length > 0) {
        setShowThinkingEffect(false);
        setIsAwaitingAssistant(false);
      }
    }
  }, [messages, isAwaitingAssistant]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      alert("File size must be less than 100KB");
      return;
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      alert("Invalid file type. Only text and PDF files are allowed.");
      return;
    }

    try {
      let content: string;
      if (file.type === "application/pdf") {
        content = await readPDFText(file);
      } else {
        content = await file.text();
      }

      // Append the file content to the input
      const fileContent = input
        ? `${input}\n\nFile: ${file.name}\n\`\`\`\n${content}\n\`\`\``
        : `File: ${file.name}\n\`\`\`\n${content}\n\`\`\``;
      handleInputChange({
        target: { value: fileContent },
      } as React.ChangeEvent<HTMLTextAreaElement>);

      setAttachedFileName(file.name);
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Error reading file. Please try again.");
    }

    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearAttachment = () => {
    setAttachedFileName(null);
    handleInputChange({
      target: { value: "" },
    } as React.ChangeEvent<HTMLTextAreaElement>);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (conversationId) {
      if (input.trim()) {
        const event = new Event(
          "submit"
        ) as unknown as React.FormEvent<HTMLFormElement>;
        handleSubmit(event);
        clearAttachment();
      }
    }
    // We intentionally omit input and handleSubmit from deps
    // because we only want this to run when conversationId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const submitHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    console.log("[ChatInterface] submit: showThinkingEffect true");
    setShowThinkingEffect(true);
    setIsAwaitingAssistant(true);

    // Insert placeholder assistant message so shimmer can render
    const placeholderMsg: AiMessage = {
      id: 'thinking-placeholder-' + Date.now(),
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, placeholderMsg]);

    await handleSubmit(e as any);
  };

  const handleOpenChange = useCallback((open: boolean) => {
    setIsSettingsOpen(open);
  }, []);

  const refreshEndpointSettings = useCallback(async () => {
    const endpointSettings = await db.getCustomEndpoint();
    setCustomEndpointSettings({
      endpoint: endpointSettings.endpoint || "",
      modelName: endpointSettings.modelName || process.env.NEXT_PUBLIC_OPENAI_MODEL_NAME || "o4-mini",
      apiKey: endpointSettings.apiKey || "",
      partition: (endpointSettings as Partial<{partition: string}>).partition || "", // Use Partial type assertion
    });
  }, []);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleMenuClick = () => {
    if (window.innerWidth < 640) {
      // sm breakpoint
      setIsDrawerOpen(true);
    } else {
      toggleSidebar();
    }
  };

  return (
    <div
      className={`flex-1 flex justify-center transition-all duration-200 ease-in-out ${
        isSidebarOpen ? "pl-64" : "pl-0"
      }`}
    >
      <div className="fixed top-0 left-0 right-0 p-4 bg-background border-b">
        <div
          className={`flex items-center justify-between h-6 transition-all duration-200 ease-in-out ${
            isSidebarOpen ? "ml-64" : "ml-0 sm:ml-20"
          }`}
        >
          <button
            type="button"
            onClick={handleMenuClick}
            className="sm:hidden p-2 rounded-full bg-secondary hover:bg-secondary/80"
          >
            <Menu className="h-3 w-3" />
          </button>
          <h1 className="text-md font-bold text-center sm:text-left flex-1">
            {convo?.title || "chat"}
          </h1>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-gray-300"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Cog className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="fixed top-4 left-4 z-40 sm:flex hidden gap-2">
        <button
          type="button"
          onClick={handleMenuClick}
          className="p-2 rounded-full bg-secondary hover:bg-secondary/80"
        >
          <Menu className="h-3 w-3" />
        </button>
        <Link href="/" className="p-2 hover:rounded-full hover:bg-secondary/80">
          <Plus className="h-3 w-3" />
        </Link>
      </div>

      <main className="w-full max-w-2xl p-4 mt-16 mb-16">
        {messages.length === 0 ? (
          <div className="flex flex-col h-[calc(100vh-200px)]">
            <div className="flex-1 flex items-center justify-center">
              <MoonPhaseIcon
                phase={getCurrentMoonPhase()}
                size={48}
                color="currentColor"
              />
            </div>
            {showSettingsAlert && (
              <Alert className="w-full max-w-sm mx-auto">
                <MessageCircleWarning className="h-4 w-4" />
                <AlertTitle>setup required</AlertTitle>
                <AlertDescription className="text-sm">
                  please configure your API endpoint and model in settings to
                  start chatting.
                  <br />
                  <Button
                    variant="outline"
                    className="px-2 py-1 h-auto mt-2"
                    onClick={() => setIsSettingsOpen(true)}
                  >
                    open settings
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4 mb-16">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-3xl px-4 py-2 ${
                    message.role === "user"
                      ? "bg-secondary text-foreground"
                      : "text-foreground"
                  }`}
                >
                  <div className="whitespace-pre-wrap">
                    {formatMessageContent(message.content)}
                    {message.role === "assistant" && messageSources[message.id] && (
                      <div className="mt-3 pt-2 border-t border-gray-700">
                        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                          <BookOpen className="h-3 w-3" />
                          <span>Sources</span>
                        </div>
                        <div className="grid gap-1">
                          {messageSources[message.id].map((source, idx) => (
                            <div key={idx} className="text-xs bg-gray-800/50 px-2 py-1 rounded">
                              {source}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {/* Global shimmer indicator shown while awaiting assistant tokens */}
            {showThinkingEffect && (
              <div className="flex justify-start">
                <ShimmerText text="Thinking..." visible />
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <div className="fixed bottom-0 w-full bg-background">
        <form onSubmit={submitHandler} className="relative">
          <div className="max-w-2xl mx-auto w-full">
            <div className="flex flex-col m-4 px-2 py-1 bg-secondary rounded-3xl">
              <Textarea
                value={input}
                onChange={handleInputChange}
                placeholder="ask me anything..."
                rows={1}
                disabled={
                  !customEndpointSettings?.endpoint ||
                  !customEndpointSettings?.modelName ||
                  isLoading
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitHandler(e as unknown as React.FormEvent<HTMLFormElement>);
                  }
                }}
                className="w-full border-none text-foreground placeholder:text-gray-400 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[36px] align-middle shadow-none"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept={ALLOWED_FILE_TYPES.join(",")}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-gray-300"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={showSettingsAlert || isLoading}
                    >
                      <Paperclip className="h-3 w-3" />
                    </Button>
                    {attachedFileName && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400 truncate max-w-[150px]">
                          {attachedFileName}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 text-gray-400 hover:text-gray-300"
                          onClick={clearAttachment}
                        >
                          ×
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-gray-300"
                  disabled={isLoading || !input.trim()}
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={handleOpenChange}
        onSettingsChange={refreshEndpointSettings}
      />

      <ChatDrawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} />
    </div>
  );
}
