"use client";

import { useState, useRef, useCallback, useEffect, Fragment } from "react";
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
import Link from 'next/link';
import { Conversation } from "@fullmoon/database";

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

// Enhanced Markdown renderer with support for headers, lists, emphasis, links, and code blocks
const formatMessageContent = (content: string): React.ReactNode => {
  // First split by code blocks since they need special handling
  const segments = content.split('```');
  const parts: React.ReactNode[] = [];
  
  // If no code blocks are found, process the whole content for other Markdown elements
  if (segments.length === 1) {
    return <div className="markdown-content">{processMarkdownText(content)}</div>;
  }
  
  // Process alternating text and code blocks
  segments.forEach((segment, index) => {
    // Even indices (0, 2, 4...) are regular text - process for Markdown
    if (index % 2 === 0) {
      if (segment.trim()) {
        parts.push(
          <div key={`text-${index}`} className="markdown-content">
            {processMarkdownText(segment)}
          </div>
        );
      }
    } 
    // Odd indices (1, 3, 5...) are code blocks - process with syntax highlighting
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

// Helper function to process Markdown text elements excluding code blocks
const processMarkdownText = (text: string): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  let currentIndex = 0;
  
  // Split text into lines and process each line or group of lines
  const lines = text.split('\n');
  
  while (currentIndex < lines.length) {
    const line = lines[currentIndex].trim();
    
    // Process headings (# Heading)
    if (line.startsWith('#')) {
      const level = line.match(/^#+/)?.[0].length || 1;
      const content = line.replace(/^#+\s*/, '');
      
      if (level === 1) {
        elements.push(<h1 key={`h-${currentIndex}`} className="text-2xl font-bold mt-4 mb-2">{content}</h1>);
      } else if (level === 2) {
        elements.push(<h2 key={`h-${currentIndex}`} className="text-xl font-bold mt-3 mb-2">{content}</h2>);
      } else if (level === 3) {
        elements.push(<h3 key={`h-${currentIndex}`} className="text-lg font-bold mt-2 mb-1">{content}</h3>);
      } else {
        elements.push(<h4 key={`h-${currentIndex}`} className="text-base font-bold mt-2 mb-1">{content}</h4>);
      }
      currentIndex++;
      continue;
    }
    
    // Process unordered lists (- item or * item)
    if (line.match(/^[\-\*]\s/) || line.match(/^\d+\.\s/)) {
      const listItems: string[] = [];
      const isOrdered = line.match(/^\d+\.\s/) !== null;
      
      // Collect consecutive list items
      while (
        currentIndex < lines.length && 
        (lines[currentIndex].trim().match(/^[\-\*]\s/) || lines[currentIndex].trim().match(/^\d+\.\s/))
      ) {
        listItems.push(lines[currentIndex].trim().replace(/^[\-\*\d\.]+\s/, ''));
        currentIndex++;
      }
      
      if (isOrdered) {
        elements.push(
          <ol key={`ol-${currentIndex}`} className="list-decimal pl-6 my-2">
            {listItems.map((item, idx) => (
              <li key={`li-${idx}`} className="my-1">{processInlineMarkdown(item)}</li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${currentIndex}`} className="list-disc pl-6 my-2">
            {listItems.map((item, idx) => (
              <li key={`li-${idx}`} className="my-1">{processInlineMarkdown(item)}</li>
            ))}
          </ul>
        );
      }
      continue;
    }
    
    // Process blockquotes (> quote)
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      
      // Collect consecutive blockquote lines
      while (currentIndex < lines.length && lines[currentIndex].trim().startsWith('>')) {
        quoteLines.push(lines[currentIndex].trim().replace(/^>\s?/, ''));
        currentIndex++;
      }
      
      elements.push(
        <blockquote key={`quote-${currentIndex}`} className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-1 my-2 text-gray-700 dark:text-gray-300 italic">
          {processInlineMarkdown(quoteLines.join(' '))}
        </blockquote>
      );
      continue;
    }
    
    // If line is empty, add a spacing div
    if (line === '') {
      elements.push(<div key={`space-${currentIndex}`} className="h-2"></div>);
      currentIndex++;
      continue;
    }
    
    // Regular paragraph with inline markdown processing
    elements.push(
      <p key={`p-${currentIndex}`} className="my-1">
        {processInlineMarkdown(line)}
      </p>
    );
    currentIndex++;
  }
  
  return elements;
};

// Process inline Markdown elements (bold, italic, links, etc)
const processInlineMarkdown = (text: string): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  const currentText = text; // Fix: Use const as currentText is not reassigned
  let counter = 0; // Safety counter
  
  // Replace bold text (**text**)
  let boldMatch;
  const boldRegex = /\*\*(.+?)\*\*/g;
  while ((boldMatch = boldRegex.exec(currentText)) !== null && counter < 100) {
    if (boldMatch.index > lastIndex) {
      elements.push(currentText.substring(lastIndex, boldMatch.index));
    }
    elements.push(<strong key={`bold-${counter}`}>{boldMatch[1]}</strong>);
    lastIndex = boldMatch.index + boldMatch[0].length;
    counter++;
  }
  
  // Add remaining text
  if (lastIndex < currentText.length) {
    elements.push(currentText.substring(lastIndex));
  }
  
  // Convert simple links to <a> tags
  const processedElements = elements.map((element, idx) => {
    if (typeof element === 'string') {
      // Process URLs
      const parts: React.ReactNode[] = [];
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      let lastUrlIndex = 0;
      let urlMatch;
      let urlCounter = 0;
      
      while ((urlMatch = urlRegex.exec(element)) !== null && urlCounter < 100) {
        if (urlMatch.index > lastUrlIndex) {
          parts.push(element.substring(lastUrlIndex, urlMatch.index));
        }
        parts.push(
          <a 
            key={`link-${urlCounter}`} 
            href={urlMatch[1]} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {urlMatch[1]}
          </a>
        );
        lastUrlIndex = urlMatch.index + urlMatch[0].length;
        urlCounter++;
      }
      
      if (lastUrlIndex < element.length) {
        parts.push(element.substring(lastUrlIndex));
      }
      
      return parts.length > 0 ? <Fragment key={`url-wrap-${idx}`}>{parts}</Fragment> : element;
    }
    return element;
  });
  
  return processedElements;
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
    modelName: process.env.NEXT_PUBLIC_OPENAI_MODEL_NAME || "gpt-4.1", // Default to gpt-4.1
    partition: process.env.NEXT_PUBLIC_RAGIE_PARTITION || "",
  });

  useEffect(() => {
    db.getCustomEndpoint().then((dbSettings) => {
      // Determine partition first from env var or existing state
      const initialPartition = customEndpointSettings.partition || process.env.NEXT_PUBLIC_RAGIE_PARTITION || "";

      // If no DB settings found (or incomplete), set defaults using server API
      if (!dbSettings?.endpoint || !dbSettings?.modelName) {
        const defaultSettings = {
          endpoint: "/api/chat", // Use server API route
          modelName: process.env.NEXT_PUBLIC_OPENAI_MODEL_NAME || "gpt-4.1",
          apiKey: "", // API key handled by server
          partition: initialPartition, // Use determined partition
        };
        // Save settings to DB (excluding partition, which isn't stored there)
        db.setCustomEndpoint(
          defaultSettings.endpoint,
          defaultSettings.modelName,
          defaultSettings.apiKey
        ).then(() => {
          setCustomEndpointSettings(defaultSettings); // Update state
          setShowSettingsAlert(false); // Hide alert after setting defaults
        });
      } else {
        // Use settings from DB, but keep the determined partition
        setCustomEndpointSettings({
          endpoint: dbSettings.endpoint,
          modelName: dbSettings.modelName,
          apiKey: dbSettings.apiKey || "",
          partition: initialPartition, // Ensure partition isn't overwritten by lack of DB value
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

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
        setIsStreaming(true);
        // Do an initial scroll to the bottom when streaming starts (one time only)
        scrollToBottom(true);
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
        setIsStreaming(false);
      },
    });

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
    const fileNameToClear = attachedFileName; // Capture name before clearing state
    setAttachedFileName(null);
    // Clear the input field content related to the attachment
    // Find the start of the attachment text marker
    const attachmentMarker = `File: ${fileNameToClear}\n\`\`\``;
    const markerIndex = input.indexOf(attachmentMarker);
    if (markerIndex !== -1) {
      // Remove the marker and everything after it, trim whitespace
      handleInputChange({
        target: { value: input.substring(0, markerIndex).trim() },
      } as React.ChangeEvent<HTMLTextAreaElement>);
    } else {
       // Fallback if marker isn't found exactly as expected (e.g., user edited it)
       console.warn("Could not precisely find attachment text to clear.");
       // Attempt to clear the whole input as a last resort if it only contained the file
       if (input.startsWith(`File: ${fileNameToClear}`)) {
           handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLTextAreaElement>);
       }
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const [isStreaming, setIsStreaming] = useState(false);
  
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? "smooth" : "auto" 
    });
  }, []);

  useEffect(() => {
    // Only auto-scroll on these conditions to avoid constant scrolling during streaming:
    // 1. If it's the first message added
    // 2. If a new message is added (not just updated during streaming)
    // 3. If streaming ends (marked by isStreaming changing to false)
    // 4. If user sends a message (role is "user")
    const lastMessage = messages[messages.length - 1];
    
    if (messages.length > 0 && (
      messages.length === 1 ||
      lastMessage?.role === "user" ||
      !isStreaming
    )) {
      // Use immediate scrolling for user messages, smooth for others
      scrollToBottom(lastMessage?.role !== "user");
    }
  }, [messages, scrollToBottom, isStreaming]);

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
    const dbSettings = await db.getCustomEndpoint();
    // Preserve the current partition (from state or env var), as DB doesn't store it
    const currentPartition = customEndpointSettings.partition || process.env.NEXT_PUBLIC_RAGIE_PARTITION || "";
    setCustomEndpointSettings({
      endpoint: dbSettings.endpoint || "/api/chat", // Fallback to server api
      modelName: dbSettings.modelName || process.env.NEXT_PUBLIC_OPENAI_MODEL_NAME || "gpt-4.1", // Fallback to env or hardcoded
      apiKey: dbSettings.apiKey || "", // Fallback to empty
      partition: currentPartition, // Use the preserved partition
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependency array includes customEndpointSettings.partition if needed, but keeping it simple for now

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleMenuClick = () => {
    if (window.innerWidth < 640) {
      // sm breakpoint
      setIsDrawerOpen(true);
    } else {
      toggleSidebar();
    }
  };

  useEffect(() => {
    if (isAwaitingAssistant) {
      // Find the last message
      const lastMessage = messages[messages.length - 1];
      // If the last message is from the assistant and has content, hide the thinking effect
      if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content.trim().length > 0) {
        setShowThinkingEffect(false);
        setIsAwaitingAssistant(false); // Reset the flag
      }
    }
  }, [messages, isAwaitingAssistant]); // Depends on messages and the flag

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
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                        <span>{attachedFileName}</span>
                        <button 
                          onClick={clearAttachment} 
                          className="text-red-500 hover:text-red-700"
                          aria-label="Remove attached file"
                        >
                          &times;
                        </button>
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
