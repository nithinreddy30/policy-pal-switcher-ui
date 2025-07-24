import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pdf1_content, pdf2_content } = await req.json()
    
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const prompt = `You are a compliance analysis expert. Compare these two documents and provide a detailed compliance analysis.

Reference Document (Document 1):
${pdf1_content}

Comparison Document (Document 2):
${pdf2_content}

Please analyze these documents and provide:
1. A detailed comparison highlighting key differences
2. Compliance status for each major category (Data Privacy, Financial Reporting, Risk Management, Audit Requirements)
3. Specific areas of concern or non-compliance
4. Recommendations for addressing any issues

Format your response as JSON with this structure:
{
  "summary": "Overall summary of the comparison",
  "categories": [
    {
      "category": "Category Name",
      "status": "compliant|warning|non-compliant", 
      "details": "Detailed explanation"
    }
  ],
  "recommendations": ["List of recommendations"]
}`

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
          temperature: 0.1,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`)
    }

    const result = await response.json()
    const analysisText = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // Try to parse JSON from the response
    let analysis
    try {
      // Extract JSON from the response (in case it's wrapped in markdown)
      const jsonMatch = analysisText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || [null, analysisText]
      analysis = JSON.parse(jsonMatch[1])
    } catch {
      // Fallback if JSON parsing fails
      analysis = {
        summary: analysisText,
        categories: [
          { category: "Overall Analysis", status: "warning", details: analysisText }
        ],
        recommendations: ["Review the detailed analysis above"]
      }
    }

    return new Response(
      JSON.stringify({ analysis }),
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