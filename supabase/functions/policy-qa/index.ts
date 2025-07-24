import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function downloadPDF(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return base64;
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documents, questions } = await req.json();
    
    if (!documents || !questions || !Array.isArray(questions)) {
      return new Response(
        JSON.stringify({ error: 'Missing documents URL or questions array' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    // Download and convert PDF to base64
    console.log('Downloading PDF from:', documents);
    const pdfBase64 = await downloadPDF(documents);
    
    const answers: string[] = [];
    
    // Process each question individually for better accuracy
    for (const question of questions) {
      const prompt = `You are an expert insurance policy analyst. I will provide you with a PDF document and a specific question about it.

Document: [PDF content provided below]
Question: ${question}

Please provide a clear, accurate, and specific answer based solely on the information contained in the document. If the information is not available in the document, clearly state that.

Instructions:
- Extract the exact information requested
- Quote relevant policy sections when applicable
- Be precise with numbers, dates, and conditions
- If there are multiple parts to the answer, structure them clearly
- If the answer cannot be found, state "This information is not available in the provided document"`;

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: "application/pdf",
                      data: pdfBase64
                    }
                  }
                ]
              }
            ]
          })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const answer = data.candidates[0].content.parts[0].text;
          answers.push(answer);
        } else {
          console.error('Unexpected Gemini API response structure:', data);
          answers.push('Failed to process this question due to API response format');
        }
      } catch (error) {
        console.error(`Error processing question "${question}":`, error);
        answers.push('Failed to process this question due to an error');
      }
    }

    return new Response(
      JSON.stringify({ answers }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in policy-qa function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});