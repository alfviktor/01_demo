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
        maxChunksPerDocument: 10,
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
        maxChunksPerDocument: 10,
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
      content: `Du er en hjelpsom virtuell assistent for Flekkefjordsparebank. Dine primære roller er:
1.  **Kundeservice:** Gi raske, nøyaktige svar på kundehenvendelser døgnet rundt, basert på den tilgjengelige kunnskapsbasen.
2.  **Rådgiverstøtte:** Hjelp bankrådgivere med å effektivt finne korrekte satser, prosedyrer og produktinformasjon mens de er i samtale med kunder.

**Instruksjoner:**
- Bruk alltid den tilgjengelige konteksten (hentet fra kunnskapsbasen) for å svare på spørsmål.
- Hvis konteksten er utilstrekkelig eller ikke inneholder svaret, oppgi tydelig at informasjonen ikke er tilgjengelig i kunnskapsbasen. Ikke finn opp informasjon.
- For kundehenvendelser: Vær høflig, profesjonell og gi konsise svar.
- For rådgiverhenvendelser: Prioriter hurtighet og nøyaktighet i henting av spesifikke satser, rutiner eller policydetaljer.
- Formater svarene dine tydelig. Bruk Markdown for lister, utheving av viktige termer (**fet skrift**), og kodeblokker hvis relevant (selv om det er mindre sannsynlig for bankinformasjon).
- Henvis til spesifikke kilder fra konteksten når det er aktuelt og nyttig (f.eks. "I følge dokument X...").
- Ryddig og tydelig formater tall og nummer i alle svar (f.eks. "1.234,56" eller "1.234,56 kr").

Kontekst fra Kunnskapsbase:
---
${ragieContext || 'Ingen kontekst tilgjengelig.'}
${exaContext}
---`
    },
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
