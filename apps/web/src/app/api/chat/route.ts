import { createOpenAI } from "@ai-sdk/openai";
import { streamText, CoreMessage, StreamData } from "ai"; 
import { NextResponse } from 'next/server'; 
import { Ragie } from "ragie"; 

// Log available environment variables (without showing actual values)
console.log("Environment variables available:", {
  RAGIE_API_KEY: process.env.RAGIE_API_KEY ? "[SET]" : "[NOT SET]",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "[SET]" : "[NOT SET]",
  LLM_BASE_URL: process.env.LLM_BASE_URL ? "[SET]" : "[NOT SET]"
});

// Initialize RAGIE client with API key
const customRagieApiKey = process.env.RAGIE_API_KEY;
const customRagieEndpoint = process.env.RAGIE_API_ENDPOINT;
const customRagiePartition = process.env.RAGIE_PARTITION;

const ragieApiKey = customRagieApiKey || process.env.RAGIE_API_KEY;
const ragieApiEndpoint = customRagieEndpoint || process.env.RAGIE_API_ENDPOINT || 'https://api.ragie.ai';
const partitionToUse = customRagiePartition || process.env.RAGIE_PARTITION;

console.log('RAGIE Config:', { ragieApiEndpoint, partitionToUse, apiKeySet: !!ragieApiKey });

const ragie = new Ragie({
  auth: ragieApiKey || "",
  endpoint: ragieApiEndpoint,
});

export async function POST(req: Request) {
  const { messages, conversationId, customEndpointSettings } = await req.json();
  console.log("Conversation ID:", conversationId);
  const userMessage = messages[messages.length - 1];
  console.log("User Message:", userMessage);
  console.log("Custom Endpoint Settings:", customEndpointSettings);

  let ragieContext = "";
  let sources: string[] = []; // Array to hold source document names

  if (userMessage && userMessage.role === 'user' && typeof userMessage.content === 'string' && ragieApiKey) {
    try {
      console.log('Sending to RAGIE:', {
        query: userMessage.content,
        partition: partitionToUse,
        maxChunksPerDocument: 5
      });

      const retrieveResult = await ragie.retrievals.retrieve({
        query: userMessage.content,
        ...(partitionToUse ? { partition: partitionToUse } : {}),
        maxChunksPerDocument: 5,
      });

      console.log('Received from RAGIE:', JSON.stringify(retrieveResult, null, 2)); // Log the raw response

      let contextText = '';
      if (retrieveResult && Array.isArray(retrieveResult.scoredChunks) && retrieveResult.scoredChunks.length > 0) {
        // Correctly parse scoredChunks and extract unique document names
        const uniqueSources = new Set<string>();
        contextText = retrieveResult.scoredChunks
          .map((chunk: { text: string; documentName: string }) => {
            uniqueSources.add(chunk.documentName); // Add document name to Set
            return chunk.text;
          })
          .join('\n\n---\n\n'); // Join chunks with separator
        sources = Array.from(uniqueSources); // Convert Set to Array
        console.log("Extracted RAGIE context successfully.");
        console.log("Sources:", sources);
      } else {
        console.log("No scoredChunks found in RAGIE response or it's not an array.");
      }

      ragieContext = contextText; // Assign the extracted text

    } catch (error) {
      console.error("Error querying RAGIE.ai:", error);
      ragieContext = "Failed to retrieve context."; 
    }
  } else if (!ragieApiKey) {
      console.warn("RAGIE_API_KEY not found or empty. Skipping RAGIE.ai retrieval.");
      ragieContext = "Context retrieval skipped (configuration missing).";
  }

  const messagesForLLM: CoreMessage[] = [
    {
      role: 'system',
      content: `You are a helpful technical assistant with expertise in programming and software development. Use the following context retrieved from a knowledge base to provide thorough, accurate answers to the user's queries. If the context is empty or indicates a failure, answer based on your general knowledge.

When providing code examples or technical explanations:
1. Use Markdown formatting for clarity and readability
2. Always wrap code snippets in triple backticks with the appropriate language identifier (e.g. \`\`\`python, \`\`\`javascript)
3. Use bullet points or numbered lists for multi-step instructions or lists of items
4. Bold important terms or concepts using **bold syntax**
5. Provide concise and accurate explanations with specific examples when possible
6. When explaining complex concepts, break them down into smaller, digestible parts
7. Cite specific sources from the context when applicable

Context:
---
${ragieContext || 'No context provided.'}
---`
    },
    userMessage 
  ];

  // Use custom settings or fall back to environment variables / defaults
  const llmApiKey = customEndpointSettings?.apiKey || process.env.OPENAI_API_KEY;
  const llmBaseUrl = customEndpointSettings?.baseUrl || process.env.LLM_BASE_URL;
  const llmModelName = customEndpointSettings?.modelName || 'o4-mini'; // Changed default model

  console.log('Custom settings:', {
    endpoint: customEndpointSettings?.baseUrl || "[Not provided]",
    modelName: customEndpointSettings?.modelName || "[Not provided]",
    apiKeyProvided: customEndpointSettings?.apiKey ? "[PROVIDED]" : "[NOT PROVIDED]",
    partition: customEndpointSettings?.partition || "[Not provided]",
  });

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

  const openai = createOpenAI(openaiConfig);

  try {
    console.log("Streaming text from LLM with RAGIE context...");
    const data = new StreamData(); // Use standard StreamData

    try {
      const stream = await streamText({
        model: openai(llmModelName), // Use the potentially updated model name
        messages: messagesForLLM, 
        temperature: 1, // Must be 1 for o4-mini, override the SDK's default of 0
        onFinish: () => {
          // Append the source documents to the stream data when the stream finishes
          data.append({ sources: sources });
          data.close();
        },
      });

      // Return the streaming response along with the data
      return stream.toDataStreamResponse({ data });
    } catch (streamError) {
      // Make sure to close the stream data if streamText fails
      console.error("Error in streamText:", streamError);
      data.append({ error: 'Failed to generate response' });
      data.close();
      throw streamError; // Re-throw to be caught by outer try-catch
    }
  } catch (error) {
    console.error("Error streaming from LLM:", error);
    return new NextResponse(JSON.stringify({ error: 'Error generating response' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
