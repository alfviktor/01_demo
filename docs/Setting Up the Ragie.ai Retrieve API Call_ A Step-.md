<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# Setting Up the Ragie.ai Retrieve API Call: A Step-by-Step Guide

Ragie.ai provides a fully managed Retrieval-Augmented Generation (RAG) service that allows developers to easily index and retrieve information from various data sources. This guide will walk you through the process of setting up and using Ragie's retrieve API call to get relevant information from your indexed data.

## Getting Started with Ragie

### 3. Configure the Retrieve API Call

Once your data is indexed, you can make retrieval calls using the API:

#### Authentication

All API calls require authentication using your Ragie API key:

- Include your API key in the Authorization header as a Bearer token[^2]
- Example: `Authorization: Bearer &lt;YOUR_API_KEY&gt;`


#### Making a Basic Retrieval Call

Here's how to structure a basic retrieve API call:

```javascript
// Using fetch API
const response = await fetch('https://api.ragie.ai/retrievals/retrieve', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer &lt;YOUR_API_KEY&gt;'
  },
  body: JSON.stringify({
    "query": "Your search query here",
    "max_chunks_per_document": 3,
    "partition": "&lt;optional_partition_id&gt;"
  })
});
```


## Advanced Usage

### Using the TypeScript/JavaScript SDK

For TypeScript or JavaScript projects, you can use the Ragie SDK:

1. Install the SDK using your preferred package manager:

```bash
npm add ragie   # Using npm
pnpm add ragie  # Using pnpm
bun add ragie   # Using bun
yarn add ragie  # Using yarn
```

2. Import and use the SDK in your code:

```javascript
import { Ragie } from "ragie";

const ragie = new Ragie({
  auth: "&lt;YOUR_BEARER_TOKEN_HERE&gt;",
});

async function retrieveInfo() {
  const result = await ragie.retrievals.retrieve({
    query: "What is the best pizza place in SF?",
    max_chunks_per_document: 3,
    partition: "&lt;optional_partition_id&gt;"
  });
  
  console.log(result);
}

retrieveInfo();
```


### Additional Parameters for Retrieval

You can customize your retrieval with these parameters:

- `query` (string, required): The search query text
- `max_chunks_per_document` (number, optional): Limits the number of chunks returned per document
- `partition` (string, optional): Specifies which partition to search within
- `rerank` (boolean, default: true): When true, results are reranked by relevance[^8]
- `metadata-filters` (object, optional): Allows filtering results based on metadata attributes[^8]


### Using Model Context Protocol (MCP) Server

For AI applications, Ragie provides an MCP server that can be integrated with AI models:

1. Install and run the MCP server:

```bash
RAGIE_API_KEY=your_api_key npx @ragieai/mcp-server
```

2. Command line options for customization:

```bash
# With custom description
RAGIE_API_KEY=your_api_key npx @ragieai/mcp-server --description "Search the company knowledge base"

# With partition specified
RAGIE_API_KEY=your_api_key npx @ragieai/mcp-server --partition your_partition_id
```


## Example Retrieve API Response Structure

When you make a retrieve API call, you'll receive a response containing the most relevant chunks from your indexed documents. The response may include:

- Retrieved text chunks
- Relevance scores
- Source document information
- Metadata associated with the chunks


## Integrating with Other Systems

Ragie can be integrated with various platforms:

- Connect with HTTP/Webhook services like Pipedream[^6]
- Integrate with Google Docs or other document management systems[^10][^16]
- Build custom RAG applications using Ragie as the backend[^15]


## Conclusion

Setting up the Ragie.ai retrieve API call involves creating an account, indexing your data, and then making API calls to retrieve relevant information. By following this guide, you should be able to quickly implement RAG functionality in your applications, leveraging Ragie's advanced features like reranking, summary indexing, and entity extraction.

For more complex implementation or specific use cases, consider exploring Ragie's documentation or reaching out to their support team for assistance. The service is designed to make RAG implementation straightforward for developers while providing powerful retrieval capabilities.

<div style="text-align: center">⁂</div>

[^1]: https://github.com/ragieai/ragie-python/blob/main/docs/sdks/documents/README.md

[^2]: https://github.com/ragieai/ragie-python/blob/main/docs/sdks/retrievals/README.md

[^3]: https://www.youtube.com/watch?v=gweRh5Xtkq0

[^4]: https://www.ragic.com/intl/en/doc-kb/29/How-do-I-retrieve-detailed-user-information-with-HTTP-API%3F

[^5]: https://www.ragie.ai

[^6]: https://pipedream.com/apps/ragie/integrations/http

[^7]: https://github.com/ragieai/ragie-typescript

[^8]: https://docs.vectorize.io/rag-pipelines/retrieval-endpoint/

[^9]: https://www.youtube.com/watch?v=1fez4RG8bxc

[^10]: https://pipedream.com/apps/ragie/integrations/google-docs

[^11]: https://www.ragic.com/intl/en/doc-api/25/Other-GET-parameters

[^12]: https://learn.microsoft.com/en-us/answers/questions/2150175/rag-application-document-retrieval-based-on-the-us

[^13]: https://github.com/ragieai/ragie-mcp-server

[^14]: https://www.youtube.com/watch?v=zmBehQ_Gkfw

[^15]: https://github.com/ragieai/rag-demo

[^16]: https://pipedream.com/apps/ragie/integrations/eagle-doc

[^17]: https://ubos.tech/mcp/ragie-model-context-protocol-server/

[^18]: https://docs.ragie.ai/docs/getting-started

[^19]: https://docs.ragie.ai/docs/connections

[^20]: https://docs.ragie.ai/docs/summary-index

[^21]: https://docs.ragie.ai/reference/retrieve

[^22]: https://docs.ragie.ai/docs/retrievals-recency-bias

[^23]: https://docs.ragie.ai/reference/listdocuments

[^24]: https://docs.ragie.ai/docs/step-2-upload-documents

[^25]: https://docs.nango.dev/integrations/all/ragieai

[^26]: https://docs.ragie.ai/docs/tutorial

[^27]: https://github.com/ragieai/ragie-python

[^28]: https://docs.ragie.ai/docs/step-4-generate

[^29]: https://docs.ragie.ai/docs/entity-extraction

[^30]: https://docs.ragie.ai/docs/step-3-retrieve-chunks

[^31]: https://docs.ragie.ai/reference/createdocument

[^32]: https://blog.dailydoseofds.com/p/ragie-connect-build-rag-apps-over

[^33]: https://docs.ragie.ai/docs/metadata-filters

[^34]: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/rag-api

[^35]: https://pypi.org/project/ragie/1.4.3/

[^36]: https://python.langchain.com/docs/integrations/providers/pebblo/pebblo_retrieval_qa/

[^37]: https://dev.to/vivekyadav200988/building-a-retrieval-augmented-generation-rag-api-and-frontend-with-fastapi-and-react-native-2n7k

[^38]: https://www.ragic.com/intl/en/doc-api

[^39]: https://r2r-docs.sciphi.ai/api-and-sdks/introduction

[^40]: https://github.com/ragieai/ragie-python-ref-app

[^41]: https://www.ragic.com/intl/en/doc-kb/29/How-do-I-retrieve-detailed-user-information-with-HTTP-API%3F

[^42]: https://www.bentoml.com/blog/serving-a-llamaindex-rag-app-as-rest-apis

[^43]: https://python.langchain.com/docs/tutorials/rag/

[^44]: https://github.com/ragieai/ragie-python/blob/main/RELEASES.md

[^45]: https://qdrant.tech/blog/building-search-rag-open-api/

[^46]: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/rag-api-v1

[^47]: https://community.openai.com/t/easy-rag-implementation-for-testing/686735

[^48]: https://docs.ragie.ai/docs/ragie-typescript

[^49]: https://github.com/ragieai/ragie-python/activity

[^50]: https://github.com/ragieai/ragie-python/blob/main/docs/sdks/partitions/README.md

[^51]: https://github.com/ragieai/ragie-python/blob/main/docs/sdks/documents/README.md

[^52]: https://github.com/ragieai/ragie-typescript/actions/runs/14232161547

[^53]: https://github.com/ragieai/ragie-typescript/actions/runs/14346147922

[^54]: https://github.com/ragieai/ragie-typescript/blob/main/tsconfig.json

[^55]: https://ragflow.io/docs/dev/http_api_reference

[^56]: https://pathway.com/developers/templates/rag-customization/rest-api

[^57]: https://github.com/ragieai/ragie-python/blob/main/docs/sdks/retrievals/README.md

[^58]: https://pipedream.com/apps/ragie/integrations/all-images-ai

[^59]: https://www.ragic.com/intl/en/doc-api?onepage

[^60]: https://www.ragie.ai

[^61]: https://hackernoon.com/how-to-turn-your-openapi-specification-into-an-ai-chatbot-with-rag

[^62]: https://github.com/vblagoje/openapi-rag-service

[^63]: https://pipedream.com/apps/ragie/integrations/alibaba-cloud

[^64]: https://www.youtube.com/watch?v=bQL-yok_0qw

[^65]: https://www.youtube.com/watch?v=roLpKNTeG5A

[^66]: https://github.com/ragieai/ragie-python/releases

[^67]: https://github.com/ragieai/ragie-python/blob/main/USAGE.md

[^68]: https://github.com/ragieai/ragie-python/blob/main/pyproject.toml

[^69]: https://github.com/ragieai/ragie-typescript/blob/main/FUNCTIONS.md

