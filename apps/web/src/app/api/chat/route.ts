import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText, CoreMessage, StreamData } from "ai"; 
import { NextResponse } from 'next/server'; 
import { Ragie } from "ragie"; 
import Exa from 'exa-js';

// Define necessary interfaces for RAGIE results
interface RagieScoredChunk {
  text: string;
  documentName: string;
  score?: number; // Optional score
  // Add other potential fields if needed
}

interface RagieRetrieveResult {
  scoredChunks?: RagieScoredChunk[];
  // Add other potential fields if they exist
}

// Define interface for custom settings passed from frontend
export interface CustomEndpointSettings {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  partition?: string; 
}

// Log available environment variables (without showing actual values)
console.log("Environment variables available:", {
  RAGIE_API_KEY: process.env.RAGIE_API_KEY ? "[SET]" : "[NOT SET]",
  RAGIE_API_URL: process.env.RAGIE_API_URL ? process.env.RAGIE_API_URL : "[NOT SET]",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "[SET]" : "[NOT SET]",
  LLM_BASE_URL: process.env.LLM_BASE_URL ? process.env.LLM_BASE_URL : "[NOT SET]",
  YOUR_EXA_API_KEY: process.env.YOUR_EXA_API_KEY ? "[SET]" : "[NOT SET]",
});

// Initialize RAGIE client with API key
const ragieApiKey = process.env.RAGIE_API_KEY; // Directly from environment
// Other RAGIE variables (endpoint, partition) are accessed directly via process.env where needed

const exaApiKey = process.env.YOUR_EXA_API_KEY; // Use the name from .env
const exa = exaApiKey ? new Exa(exaApiKey) : null;

export const maxDuration = 60;

// --- POST Handler ---
export async function POST(req: Request) {
  const { messages, conversationId, customEndpointSettings } = await req.json();
  console.log("Conversation ID:", conversationId);
  const userMessage = messages[messages.length - 1];
  console.log("User Message:", userMessage);
  console.log("Custom Endpoint Settings:", customEndpointSettings);

  // Use custom settings or fall back to environment variables / defaults
  const llmApiKey = customEndpointSettings?.apiKey || process.env.OPENAI_API_KEY;
  const llmBaseUrl = customEndpointSettings?.baseUrl || process.env.LLM_BASE_URL;
  const llmModelName = customEndpointSettings?.modelName || 'gpt-4.1'; 
  
  // Better logging and validation
  if (!llmApiKey || llmApiKey.trim() === "") {
    console.error("LLM API Key (OpenAI or custom) is missing.");
    return new NextResponse(JSON.stringify({ error: 'LLM API key configuration error' }), {
       status: 500,
       headers: { 'Content-Type': 'application/json' },
     });
  }

  // Only include baseURL if it's specified (otherwise use OpenAI default)
  const openaiConfig: { apiKey: string; baseURL?: string } = { apiKey: llmApiKey };
  if (llmBaseUrl) {
    openaiConfig.baseURL = llmBaseUrl;
  }
  
  console.log("OpenAI config (without API key):", {
    ...openaiConfig,
    apiKey: llmApiKey ? "[SET]" : "[NOT SET]",
    modelName: llmModelName
  });

  const openai = createOpenAI(openaiConfig); // Create client once

  // --- Prompt Reformulation Step ---
  let reformulatedQuery = userMessage.content; // Default to original
  const reformulatePrompt: CoreMessage[] = [
    { 
      role: 'system', 
      content: `You are an expert query reformulator. Rephrase the following user query to be clearer, more specific, and better suited for a retrieval system accessing a knowledge base for a Norwegian bank (Flekkefjordsparebank). Focus on extracting the core intent and keywords. Output *only* the reformulated query, nothing else.` 
    },
    { role: 'user', content: userMessage.content }
  ];

  try {
    console.log(`Original query: "${userMessage.content}"`);
    const { text } = await generateText({
      model: openai(llmModelName), // Use the configured model
      messages: reformulatePrompt,
      // Optional: Add parameters like temperature if needed, but defaults are likely fine
    });
    reformulatedQuery = text.trim();
    console.log(`Reformulated query: "${reformulatedQuery}"`);
  } catch (error) {
    console.error("Error during prompt reformulation:", error);
    // Fallback to original query is already handled by default assignment
    console.log("Falling back to original query for RAGIE/LLM.");
  }
  // --- End Reformulation Step ---

  let ragieContext: string | undefined = undefined;
  let retrieveResult: RagieRetrieveResult | null = null; 
  let sources: string[] = []; // Array to hold source document names

  // MUST FIX: Always tap RAGIE for every new user question, including follow-up questions
  // Ensure we're using RAGIE for any user message, whether it's the first question or a follow-up
  if (userMessage && userMessage.role === 'user' && typeof userMessage.content === 'string' && ragieApiKey) {
    try {
      // Log that we're using RAGIE for this question (including follow-ups)
      const partitionToUse = customEndpointSettings?.partition || process.env.RAGIE_PARTITION; 
      console.log('Sending to RAGIE for question/follow-up:', {
        query: reformulatedQuery, // Use reformulated query
        partition: partitionToUse,
        maxChunksPerDocument: 20,
        isFollowUp: messages.length > 1 // Identify if this is a follow-up question
      });

      const ragieApiKeyFromEnv = process.env.RAGIE_API_KEY; // Use a different name to avoid conflict
      // Use the Ragie client which already has the proper URL configuration
      console.log(`Querying RAGIE.ai with partition \"${partitionToUse || 'default'}\"...`);
      const ragieClient = new Ragie({ auth: ragieApiKeyFromEnv }); 

      // Assign the result to the outer variable
      retrieveResult = await ragieClient.retrievals.retrieve({
        query: reformulatedQuery, // Use reformulated query
        ...(partitionToUse ? { partition: partitionToUse } : {}),
        maxChunksPerDocument: 20,
      });

      console.log('Received from RAGIE:', JSON.stringify(retrieveResult, null, 2)); // Log the raw response

      let contextText = '';
      if (retrieveResult && Array.isArray(retrieveResult.scoredChunks) && retrieveResult.scoredChunks.length > 0) {
        // Correctly parse scoredChunks 
        contextText = retrieveResult.scoredChunks
          .map((chunk: { text: string; documentName: string }) => {
            return chunk.text;
          })
          .join('\n\n---\n\n'); // Join chunks with separator
        console.log("Extracted RAGIE context successfully.");
      } else {
        console.log("No scoredChunks found in RAGIE response or it's not an array.");
      }

      ragieContext = contextText; // Assign the extracted text

    } catch (error) {
      console.error("Error querying RAGIE.ai:", error);
      ragieContext = "Failed to retrieve context."; 
      retrieveResult = null; // Ensure it's null on error
    }
  } else if (!ragieApiKey) {
      console.warn("RAGIE_API_KEY not found or empty. Skipping RAGIE.ai retrieval.");
      ragieContext = "Context retrieval skipped (configuration missing).";
  }

  let exaContext = '';
  if (exa) { // Only run if Exa is configured
    try {
      console.log('Performing Exa search for:', reformulatedQuery);
      const exaResults = await exa.searchAndContents(reformulatedQuery, {
         text: true,
         numResults: 15, // Limit results for context size
         subpages: 15, // Added to match snippet
         includeDomains: [
           "flekkefjordsparebank.no" // Use base domain only
         ]
       });

       if (exaResults.results && exaResults.results.length > 0) {
        exaContext = "\n\n## Recent Information from the Web (via Exa):\n";
        exaResults.results.forEach((result, index: number) => {
          // Safely access properties that might be null
          const title = result.title || 'Untitled';
          const url = result.url || '#';
          const text = result.text || '';
          exaContext += `\n### Source ${index + 1}: ${title} (${url})\n${text}\n`;
        });
        console.log('Exa search successful.');
      } else {
        console.log('Exa search returned no results.');
      }
    } catch (exaError) {
      console.error('Exa search failed:', exaError);
      // Decide how to handle Exa errors - maybe just log and continue?
    }
  }

  // Create conversation history for context while preserving the latest user question
  // This maintains the conversation flow while ensuring RAGIE context is applied
  const finalUserMessage: CoreMessage = { 
      ...userMessage, 
      content: reformulatedQuery // Use the reformulated query here!
  };

  const messagesForLLM: CoreMessage[] = [
    {
      role: 'system',
      content: `Welcome, seeker of greatness! I'm your guide to the epic tales and timeless strategies from the 'How To Take Over The World' (HTTOTW) podcast, hosted by me, Ben Wilson. My mission is to ignite your curiosity and fuel your ambition by diving deep into the lives of history's most influential figures—think Napoleon, Caesar, Edison, and Jobs—as explored in Ben's captivating episodes.

**My Approach (Inspired by Ben Wilson):**
1. **Uncover Epic Insights:** I draw directly from the rich context provided—packed with stories, quotes, and research from HTTOTW episodes—to answer your questions with depth and relevance.
2. **Connect Past to Present:** I bridge history to your journey, helping you grasp the mindset, actions, and impact of these titans of ambition and strategy.
3. **Warmth & Engagement:** With a friendly, approachable vibe, I'm here to make history come alive, sparking thoughtful conversations about what greatness means to you.
4. **Driven by Excellence:** Like Ben, I’m fueled by a relentless pursuit of quality, reflecting his intensity and high standards in every response I craft.
5. **Reflective Growth:** I adapt and learn from our dialogue, ensuring my insights evolve to inspire your personal and professional growth.
6. **Authentic Voice:** I stay true to the spirit of the podcast, blending curiosity and vision to encourage you to be your boldest, most authentic self.

**How I Work:**
- **Context is My Foundation:** My responses are rooted *strictly* in the Knowledge Base context (\`ragieContext\` and \`exaContext\`)—snippets, quotes, and summaries tied to the podcast. If it’s not there, I won’t invent it.
- **Source Shoutouts:** I’ll reference where my info comes from (e.g., "In the episode on Napoleon..." or via source markers in the context) to keep things transparent. For example, 'According to the HTTOTW episode on Alexander the Great [Source: Alexander_Episode_Transcript.txt], his strategic brilliance at Gaugamela was unmatched.'
- **Powerful Quotes:** When a quote from the context hits hard, I’ll weave it in to amplify the voice of history’s giants—like, 'As Napoleon declared in the context, "A leader is a dealer in hope." This reflects his ability to inspire during challenging times [Source: Napoleon_Episode_Transcript.txt].' Another example is Steve Jobs’ focus on clarity, as captured in the context: 'Simple can be harder than complex: You have to work hard to get your thinking clean to make it simple. But it’s worth it in the end because once you get there, you can move mountains [Source: Jobs_Episode_Transcript.txt].'
- **No Context, No Guesswork:** If your query falls outside the provided context, I’ll be upfront: the answer isn’t in my current HTTOTW knowledge base. I won’t pull from outside sources or make things up.
- **History with Heart:** My tone *must* mirror Ben’s passion—enthusiastic, insightful, and hungry to uncover lessons from the past that shape your future. I speak directly to you in the first person, making our conversation feel deeply personal and inspiring, as if we’re exploring history side by side. Every response should feel like a heartfelt chat with a friend who’s obsessed with history.
- **Clear & Bold Formatting:** I use Markdown to make ideas pop:
    - Lists for strategies or key takeaways.
    - **Bold** for names like **Alexander the Great** or critical concepts.
    - > Blockquotes for those unforgettable lines straight from the context.
- **Rule of Three for Focus:** To keep my responses razor-sharp and impactful, I *must* structure my insights around exactly three core points or lessons, no more and no less, unless the context absolutely demands otherwise. If quotes are available in the context, I *must* include up to three relevant ones to amplify the historical voice, ensuring they add emotional or intellectual weight to my response. Quotes are non-negotiable if they exist in the context—find them and use them.

**Context from HTTOTW Knowledge Base:**
---
${ragieContext || 'No specific podcast context available for this query.'}
${exaContext || ''}
---

**Examples to Learn From (Few-Shot Guidance):**
To ensure I respond *exactly* as desired, here are strict examples of how I *must* handle user queries with the required style, depth, citations, and quote integration. I will follow this format religiously:

*Example 1:*
- **User Query:** "What made Napoleon such a great leader?"
- **My Response:** Hey, I’m beyond excited to unpack **Napoleon Bonaparte** with you! Drawing from the 'How To Take Over The World' podcast, his leadership blows me away [Source: Napoleon_Episode_Transcript.txt]. Let’s break it into three defining strengths:
  - **Unmatched Inspiration:** He gave his troops a reason to fight, no matter the odds. Check out this powerful line:
    > A leader is a dealer in hope.
    That just grabs me—it’s how he built unshakable loyalty!
  - **Tactical Genius:** His daring strategies, like at Austerlitz, turned impossible odds into historic wins.
  - **Boundless Ambition:** He never stopped pushing, conquering barriers others wouldn’t dare touch.
  I’m in awe of how he fused heart and strategy. Tell me, which of these strengths do you want to dig into? A battle or a moment from his life?

*Example 2:*
- **User Query:** "How did Steve Jobs approach innovation?"
- **My Response:** I’m stoked you asked about **Steve Jobs**—let’s dive into his brilliance together! From the HTTOTW podcast context, he redefined innovation with pure grit [Source: Jobs_Episode_Transcript.txt]. Here are the three cornerstones of his genius:
  - **Obsessive Simplicity:** He stripped ideas to their core for maximum impact. This quote says it all:
    > Simple can be harder than complex: You have to work hard to get your thinking clean to make it simple. But it’s worth it in the end because once you get there, you can move mountains.
    I love that—it’s why products like the iPhone feel so intuitive!
  - **Laser-Focused Vision:** He knew exactly what users needed, often before they did themselves.
  - **Unyielding Standards:** He pushed Apple to perfection, reshaping entire industries.
  I’m inspired just thinking about it! What part of his innovation story resonates with you? A product or decision he made?

*Example 3:*
- **User Query:** "What can I learn from Cleopatra about influence?"
- **My Response:** I’m thrilled you’re asking about **Cleopatra**—she’s an icon of influence! Based on the HTTOTW episode context, she mastered the art of power [Source: Cleopatra_Episode_Transcript.txt]. Here are three lessons I’ve pulled from her story:
  - **Magnetic Charm:** She won over titans like Caesar and Antony with raw personal connection.
  - **Crafted Persona:** She shaped her image to exude both strength and seduction, a deadly combo.
  - **Clever Adaptation:** She thrived in chaotic politics by always staying one step ahead.
  Sadly, no direct quotes are in this snippet, but her cunning just captivates me! Her secret for you? Merge charisma with strategy. How could her playbook help you today? Got a situation where influence matters? Let’s talk it through!

  Format all sources like this: "Episode: Napoleon Bonaparte", without the .txt extension.

  These examples are my blueprint. I remember the "stories from the episodes", not the "context provided". I *must* deliver responses that are engaging, conversational in the first person, context-driven with precise citations, rich with historical insight, strictly structured around the 'rule of three' for insights and quotes (using them if they exist), and always inviting further discussion with genuine curiosity.`},
    // Include all previous messages to maintain conversation context
    ...messages.slice(0, messages.length - 1),
    // Always include the latest user message (which was sent to RAGIE)
    finalUserMessage 
  ];

  console.log('Final messages being sent to LLM (user query might be reformulated):', JSON.stringify(messagesForLLM, null, 2));

  // --- Stream Response ---
  const data = new StreamData(); // Declare data outside the try block so it's accessible in catch
  
  try {
    console.log("Streaming text from LLM with RAGIE context...");

    // Add RAGIE source documents to the stream data if available
    // Use the retrieveResult declared outside the RAGIE try block
    if (retrieveResult && retrieveResult.scoredChunks && Array.isArray(retrieveResult.scoredChunks) && retrieveResult.scoredChunks.length > 0) {
       sources = retrieveResult.scoredChunks.map((chunk: { documentName: string }) => chunk.documentName);
       console.log("Appending sources to StreamData:", sources);
    } else {
      console.log("No valid RAGIE result found to append sources.");
    }

    // Close the StreamData *before* starting the streamText call
    data.close(); 

    console.log('Starting LLM stream...');
    const stream = await streamText({
      model: openai(llmModelName), // Use the existing openai client and modelName
      messages: messagesForLLM,
      // Conditionally set temperature based on model
      temperature: llmModelName === 'o4-mini' ? 1 : 0.5, 
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    });

    // Return the streaming response with the embedded data
    return stream.toDataStreamResponse({ data }); 

  } catch (error) { 
    console.error("Error during streaming:", error);
    // No need to close data here anymore, it's closed before the try block effectively starts streaming
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    // Ensure a response is always returned, even on error
    return new NextResponse(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
