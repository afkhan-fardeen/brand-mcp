1. Strict Multi-Tenant Parameter Enforcement
Never trust the AI to infer context. Every single MCP tool definition must require a brand_id or brand_name as a mandatory parameter.

The Standard: Your Next.js route handlers must validate this parameter against the database before executing any logic. If an AI requests a hero banner but fails to specify whether it is for Seissense or Love Boo, the tool must explicitly reject the request rather than guessing or defaulting to a primary brand.

2. Hyper-Descriptive Zod Schemas
In standard API development, schemas are for data validation. In MCP development, your schemas act as the literal instruction manual for the AI.

The Standard: Do not use basic descriptions like "Gets layout rules." Use exhaustive, scenario-based descriptions in your Zod schemas (e.g., "Use this tool to retrieve strict width, height, and negative space requirements BEFORE generating any e-commerce asset"). The more descriptive your Zod parameters are, the less prompt-engineering the user has to do in the chat interface.

3. Delegation of Prompt Engineering (The "Dumb AI" Rule)
Do not rely on Claude or Gemini to perfectly format the payload for your compositing API (like Photoroom or Imagen).

The Standard: The AI should only be responsible for creative reasoning and intent (e.g., "Saudi National Day theme"). Your Next.js backend must be responsible for mapping that intent to the exact technical JSON payload required by the image API. The MCP server acts as a translator between the LLM's natural language and the image API's rigid documentation.

4. Constructive Error Returns
When an API fails, returning a standard HTTP 500 error or a blank JSON object breaks the AI's flow. LLMs can self-correct if you tell them what went wrong.

The Standard: If a tool execution fails (e.g., the AI asks for a SKU that doesn't exist in Supabase), return a natural-language error string directly back to the AI. For example: Error: SKU-999 not found for Love Boo. Please ask the user to verify the product ID or use the search_product tool to find valid SKUs. The AI will read this, apologize to the user, and ask for clarification.

5. Streaming and Timeout Safety
Image generation and vector database searches can take time, and AI clients often have strict timeout windows for tool execution.

The Standard: Since you are using Server-Sent Events (SSE) via the Next.js App Router, ensure your background tasks (especially the call to the compositing API) are handled asynchronously. If the image generation takes longer than 15 seconds, the tool should return a "Generation started, please wait" status along with a unique job ID, rather than holding the HTTP connection open until it times out.