
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Utility function to extract entities from a query
function extractEntities(query: string) {
  // Basic entity extraction - in production would use more sophisticated NLP
  const entities: Record<string, string | number | null> = {
    age: null,
    gender: null,
    procedure: null,
    location: null,
    policyDuration: null,
  };
  
  // Extract age and gender
  const ageGenderMatch = query.match(/(\d+)(?:\s*[-,]?\s*)([MmFf])/);
  if (ageGenderMatch) {
    entities.age = parseInt(ageGenderMatch[1]);
    entities.gender = ageGenderMatch[2].toUpperCase();
  }
  
  // Extract procedure
  const procedures = ['knee surgery', 'heart surgery', 'appendectomy', 'cataract', 'dental'];
  for (const proc of procedures) {
    if (query.toLowerCase().includes(proc)) {
      entities.procedure = proc;
      break;
    }
  }
  
  // Extract location
  const locations = ['pune', 'mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai'];
  for (const loc of locations) {
    if (query.toLowerCase().includes(loc)) {
      entities.location = loc.charAt(0).toUpperCase() + loc.slice(1);
      break;
    }
  }
  
  // Extract policy duration
  const durationMatch = query.match(/(\d+)[\s-]*(month|year|day)s?[\s-]*(old\s+)?(policy|insurance)/i);
  if (durationMatch) {
    const amount = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    entities.policyDuration = `${amount} ${unit}${amount > 1 ? 's' : ''}`;
  }
  
  return entities;
}

// Function to create a structured decision with justification
function createDecision(
  documentContent: string, 
  entities: Record<string, string | number | null>
) {
  const decision = {
    approved: false,
    amount: 0,
    justification: "",
    relevantClauses: [] as string[],
  };
  
  // In production, this would be a more sophisticated analysis based on the actual document content
  
  // Find relevant clauses in the document content
  const clauseMatches = documentContent.match(/Section \d+\.\d+:[\s\S]+?(?=Section \d+\.\d+:|$)/g) || [];
  const relevantClauses: string[] = [];
  
  for (const clause of clauseMatches) {
    const clauseText = clause.trim();
    let isRelevant = false;
    
    // Check if clause mentions the procedure
    if (entities.procedure && clauseText.toLowerCase().includes(String(entities.procedure).toLowerCase())) {
      isRelevant = true;
    }
    
    // Check if clause mentions waiting period related to policy duration
    if (entities.policyDuration && 
        clauseText.toLowerCase().includes("waiting period") && 
        clauseText.toLowerCase().includes("month")) {
      isRelevant = true;
    }
    
    if (isRelevant) {
      relevantClauses.push(clauseText);
    }
  }
  
  // Make a decision based on extracted entities and relevant clauses
  let approved = false;
  let amount = 0;
  let justification = "Claim rejected: ";
  
  // Simple rules for demonstration
  // 1. If policy duration < 6 months, check for waiting period
  if (entities.policyDuration && entities.policyDuration.includes("month") && 
      parseInt(entities.policyDuration) < 6) {
    
    // Check if there's a waiting period clause for this procedure
    const waitingPeriodClause = relevantClauses.find(c => 
      c.toLowerCase().includes("waiting period") && 
      c.toLowerCase().includes(String(entities.procedure).toLowerCase())
    );
    
    if (waitingPeriodClause) {
      justification += `Policy duration (${entities.policyDuration}) is less than the required waiting period.`;
      decision.relevantClauses.push(waitingPeriodClause);
    } else {
      approved = true;
    }
  } else {
    approved = true;
  }
  
  // If approved, check coverage amount
  if (approved) {
    const coverageClause = relevantClauses.find(c => 
      c.toLowerCase().includes("coverage") || 
      c.toLowerCase().includes("amount") || 
      c.toLowerCase().includes("limit")
    );
    
    if (coverageClause) {
      // Extract amount from the clause (simplified)
      const amountMatch = coverageClause.match(/(\d{1,3}(,\d{3})*(\.\d+)?)\s*(Rs\.?|INR)/i);
      if (amountMatch) {
        amount = parseInt(amountMatch[1].replace(/,/g, ''));
      } else {
        // Default amount if not found
        amount = 50000;
      }
      
      justification = `Claim approved: ${entities.procedure} is covered under the policy.`;
      decision.relevantClauses.push(coverageClause);
    } else {
      // Default approval without specific amount
      amount = 30000;
      justification = `Claim approved: ${entities.procedure} is covered under the policy.`;
    }
  }
  
  decision.approved = approved;
  decision.amount = amount;
  decision.justification = justification;
  decision.relevantClauses = relevantClauses;
  
  return decision;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, document_content } = await req.json()
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Step 1: Extract entities from the query
    const entities = extractEntities(query);
    
    // Step 2: Get initial decision based on document content and entities
    const initialDecision = createDecision(document_content, entities);
    
    // Step 3: Use Gemini to enhance and validate the decision
    const prompt = `You are an insurance claim processing assistant. Review the following information and provide a detailed analysis.
    
Query: ${query}
Extracted Information: ${JSON.stringify(entities, null, 2)}

Policy Document Excerpt:
${document_content}

Initial Decision:
${JSON.stringify(initialDecision, null, 2)}

Please analyze the case and return a JSON object with the following fields:
1. "approved": Boolean indicating if the claim should be approved
2. "amount": Number indicating the payout amount in INR (0 if not approved)
3. "justification": String explaining the reason for approval/rejection
4. "relevantClauses": Array of strings containing exact policy clauses that support this decision

Your response MUST be valid JSON without any additional text or explanation.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`, {
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
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`)
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extract JSON from the response (in case it's wrapped in markdown)
    const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || [null, responseText];
    let finalDecision;
    
    try {
      finalDecision = JSON.parse(jsonMatch[1]);
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      finalDecision = initialDecision;
    }

    return new Response(
      JSON.stringify({ decision: finalDecision }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        decision: {
          approved: false,
          amount: 0,
          justification: "Error processing claim: " + error.message,
          relevantClauses: []
        }
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
