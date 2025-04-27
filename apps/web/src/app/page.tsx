"use client";

import { useEffect, useState } from "react";
import { ChatInterface } from "@/components/ChatInterface";
import { ChatSidebar } from "@/components/ChatSidebar";

export default function Chat() {
  // Use a unique key to force the ChatInterface to fully reset when this page is loaded
  const [key, setKey] = useState<string>(Date.now().toString());
  
  // Reset the key on mount to ensure a fresh instance
  useEffect(() => {
    setKey(Date.now().toString());
  }, []);

  return (
    <div className="flex h-screen">
      <ChatSidebar />
      <div className="flex-1">
        {/* The key prop forces React to recreate the component when changed */}
        <ChatInterface key={key} />
      </div>
    </div>
  );
}
