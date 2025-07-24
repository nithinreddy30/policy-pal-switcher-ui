
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple entity extraction function - would be more sophisticated in production
function extractEntities(query: string) {
  const entities: Record<string, string | null> = {};
  
  // Look for keywords in the query
  const keywords = ["age", "gender", "procedure", "surgery", "hospital", "location", "policy", "insurance"];
  
  for (const keyword of keywords) {
    const pattern = new RegExp(`${keyword}\\s*:?\\s*([\\w\\s-]+)`, 'i');
    const match = query.match(pattern);
    if (match) {
      entities[keyword] = match[1].trim();
    }
  }
  
  // Try to extract age
  const ageMatch = query.match(/(\d+)(?:\s*[-,]?\s*)(?:year|yr|y)?s?(?:\s*[-,]?\s*)(?:old)?/i);
  if (ageMatch) {
    entities["age"] = ageMatch[1];
  }
  
  // Try to extract gender
  if (query.toLowerCase().includes("male")) {
    entities["gender"] = "male";
  } else if (query.toLowerCase().includes("female")) {
    entities["gender"] = "female";
  }
  
  return entities;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pdf_content, question } = await req.json()
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Extract text from PDF (simplified - in production would use proper PDF parsing)
    const pdfText = pdf_content // Assuming base64 decoded text for now
    
    // Extract entities from question
    const entities = extractEntities(question);
    
    const prompt = `You are an AI assistant specialized in analyzing documents. 
    
Document content:
${pdfText}

User question: ${question}

Extracted entities from the question: ${JSON.stringify(entities)}

Please provide a detailed, accurate answer based on the document content. 

Your response should include:
1. A direct answer to the question
2. The specific sections or clauses from the document that support your answer (quote them exactly)
3. Any conditions or limitations that apply

If the answer cannot be found in the document, say so clearly and explain what information would be needed.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`)
    }

    const result = await response.json()
    const answer = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate response'

    // Attempt to identify relevant sections that were referenced
    const sections: string[] = [];
    const sectionMatches = answer.match(/Section \d+\.\d+:[\s\S]+?(?=\n\n|\n$|$)/g);
    if (sectionMatches) {
      sections.push(...sectionMatches);
    }

    return new Response(
      JSON.stringify({ 
        answer,
        entities,
        relevantSections: sections
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
