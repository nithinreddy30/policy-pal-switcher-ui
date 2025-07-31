import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Document processing and text extraction
async function extractTextFromPDF(pdfUrl: string): Promise<string> {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    
    // For now, we'll use a simple text extraction approach
    // In production, you'd want to use a proper PDF parser
    const text = new TextDecoder().decode(pdfBytes);
    return text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

// Document chunking for better retrieval
function chunkDocument(text: string, chunkSize: number = 1000, overlap: number = 200): Array<{id: string, content: string, metadata: any}> {
  const chunks = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim() + '.';
    
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        id: `chunk_${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: {
          chunkIndex,
          startSentence: Math.max(0, i - Math.floor(currentChunk.split('.').length)),
          endSentence: i
        }
      });
      
      // Create overlap
      const overlapSentences = sentences.slice(Math.max(0, i - 2), i);
      currentChunk = overlapSentences.join('. ') + '. ';
      chunkIndex++;
    }
    
    currentChunk += sentence + ' ';
  }
  
  // Add the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: `chunk_${chunkIndex}`,
      content: currentChunk.trim(),
      metadata: {
        chunkIndex,
        startSentence: sentences.length - Math.floor(currentChunk.split('.').length),
        endSentence: sentences.length
      }
    });
  }
  
  return chunks;
}

// Simple embedding generation using text similarity
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const words2 = text2.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

// Semantic search function
function semanticSearch(query: string, chunks: Array<{id: string, content: string, metadata: any}>, topK: number = 5) {
  const scoredChunks = chunks.map(chunk => ({
    ...chunk,
    similarity: calculateTextSimilarity(query, chunk.content)
  }));
  
  return scoredChunks
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

// Extract structured query components
function extractQueryComponents(query: string): {intent: string, entities: string[], keywords: string[]} {
  const query_lower = query.toLowerCase();
  
  // Intent classification
  let intent = 'general_query';
  if (query_lower.includes('cover') || query_lower.includes('benefit')) intent = 'coverage_query';
  if (query_lower.includes('waiting period') || query_lower.includes('grace period')) intent = 'period_query';
  if (query_lower.includes('condition') || query_lower.includes('requirement')) intent = 'condition_query';
  if (query_lower.includes('limit') || query_lower.includes('amount')) intent = 'limit_query';
  
  // Entity extraction
  const medicalEntities = ['surgery', 'treatment', 'disease', 'procedure', 'condition', 'diagnosis'];
  const financialEntities = ['premium', 'deductible', 'copay', 'limit', 'amount', 'discount'];
  const timeEntities = ['period', 'waiting', 'grace', 'term', 'duration'];
  
  const entities = [];
  [...medicalEntities, ...financialEntities, ...timeEntities].forEach(entity => {
    if (query_lower.includes(entity)) entities.push(entity);
  });
  
  // Keyword extraction
  const keywords = query_lower.split(/\W+/).filter(word => 
    word.length > 3 && 
    !['what', 'does', 'this', 'policy', 'under', 'from', 'with', 'that', 'they', 'have', 'been'].includes(word)
  );
  
  return { intent, entities, keywords };
}

// Generate structured response using Gemini
async function generateStructuredResponse(
  query: string, 
  relevantChunks: Array<{id: string, content: string, metadata: any, similarity: number}>,
  queryComponents: {intent: string, entities: string[], keywords: string[]}
): Promise<any> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  
  const context = relevantChunks.map((chunk, idx) => 
    `[Relevant Context ${idx + 1}] (Similarity: ${chunk.similarity.toFixed(3)})\n${chunk.content}`
  ).join('\n\n');
  
  const prompt = `You are an intelligent document analysis system. Analyze the following query and provide a structured response.

Query: "${query}"
Query Intent: ${queryComponents.intent}
Extracted Entities: ${queryComponents.entities.join(', ')}
Keywords: ${queryComponents.keywords.join(', ')}

Relevant Document Context:
${context}

Provide a structured JSON response with the following format:
{
  "answer": "Direct answer to the question",
  "confidence": 0.95,
  "reasoning": "Explanation of how the answer was derived",
  "relevant_clauses": [
    {
      "clause_id": "section_x",
      "clause_text": "Exact text from document",
      "relevance_score": 0.9
    }
  ],
  "entities_found": ["entity1", "entity2"],
  "decision_factors": [
    {
      "factor": "Specific condition or requirement",
      "status": "met/not_met/conditional",
      "explanation": "Why this factor applies"
    }
  ],
  "metadata": {
    "query_type": "${queryComponents.intent}",
    "processing_time_ms": 150,
    "sources_used": ${relevantChunks.length}
  }
}

Ensure your response is valid JSON and provides clear, actionable information.`;

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + geminiApiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const responseText = data.candidates[0].content.parts[0].text;
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          // Fallback response
          return {
            answer: responseText,
            confidence: 0.7,
            reasoning: "Generated response but failed to parse structured format",
            relevant_clauses: [],
            entities_found: queryComponents.entities,
            decision_factors: [],
            metadata: {
              query_type: queryComponents.intent,
              processing_time_ms: 0,
              sources_used: relevantChunks.length
            }
          };
        }
      }
    }
    
    throw new Error('Invalid Gemini API response structure');
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const { documents, questions } = await req.json();
    
    console.log('Processing HackRx intelligent query request:', { 
      documentsUrl: documents, 
      questionsCount: questions?.length 
    });

    if (!documents || !questions || !Array.isArray(questions)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: documents (URL) and questions (array)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Extract text from document
    console.log('Extracting text from document...');
    const documentText = await extractTextFromPDF(documents);
    
    // Step 2: Chunk the document for better retrieval
    console.log('Chunking document...');
    const chunks = chunkDocument(documentText);
    console.log(`Created ${chunks.length} document chunks`);
    
    // Step 3: Process each question with RAG approach
    const structuredAnswers = [];
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`Processing question ${i + 1}/${questions.length}: ${question}`);
      
      try {
        // Extract query components
        const queryComponents = extractQueryComponents(question);
        
        // Perform semantic search
        const relevantChunks = semanticSearch(question, chunks, 5);
        
        // Generate structured response
        const structuredResponse = await generateStructuredResponse(
          question, 
          relevantChunks, 
          queryComponents
        );
        
        structuredAnswers.push(structuredResponse);
        
      } catch (questionError) {
        console.error(`Error processing question ${i + 1}:`, questionError);
        structuredAnswers.push({
          answer: `Failed to process this question: ${questionError.message}`,
          confidence: 0.0,
          reasoning: "Processing error occurred",
          relevant_clauses: [],
          entities_found: [],
          decision_factors: [],
          metadata: {
            query_type: "error",
            processing_time_ms: 0,
            sources_used: 0,
            error: questionError.message
          }
        });
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    // Format response according to HackRx requirements
    const response = {
      answers: structuredAnswers.map(sa => sa.answer),
      structured_responses: structuredAnswers,
      system_metadata: {
        total_processing_time_ms: totalTime,
        document_chunks_created: chunks.length,
        questions_processed: questions.length,
        avg_confidence: structuredAnswers.reduce((sum, sa) => sum + (sa.confidence || 0), 0) / structuredAnswers.length,
        system_version: "HackRx-RAG-v1.0"
      }
    };

    console.log(`HackRx processing completed in ${totalTime}ms`);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('HackRx intelligent query error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        system_metadata: {
          error_type: "system_error",
          timestamp: new Date().toISOString()
        }
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});