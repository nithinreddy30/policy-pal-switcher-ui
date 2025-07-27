import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function downloadPDF(url: string): Promise<string> {
  try {
    console.log('Starting PDF download from:', url);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log('PDF downloaded, size:', arrayBuffer.byteLength, 'bytes');
    
    // Check file size (limit to 10MB)
    if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
      throw new Error('PDF file too large. Maximum size is 10MB.');
    }
    
    // Convert to base64 using safer chunked approach
    const uint8Array = new Uint8Array(arrayBuffer);
    const chunkSize = 8192; // Process in 8KB chunks
    let base64 = '';
    
    try {
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        // Convert chunk to string more safely
        let chunkString = '';
        for (let j = 0; j < chunk.length; j++) {
          chunkString += String.fromCharCode(chunk[j]);
        }
        base64 += btoa(chunkString);
      }
      
      console.log('Base64 conversion completed, length:', base64.length);
      return base64;
    } catch (conversionError) {
      console.error('Base64 conversion error:', conversionError);
      throw new Error('Failed to convert PDF to base64 format');
    }
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
        console.log(`Processing question ${questions.indexOf(question) + 1}/${questions.length}: ${question}`);
        
        const requestBody = {
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
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 32,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        };
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Gemini API error for question "${question}":`, {
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText,
            pdfSize: pdfBase64.length
          });
          answers.push(`API Error (${response.status}): Failed to process this question`);
          continue;
        }

        const data = await response.json();
        console.log(`Question ${questions.indexOf(question) + 1} - Gemini API response status:`, response.status);
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
          const answer = data.candidates[0].content.parts[0].text;
          answers.push(answer.trim());
          console.log(`Successfully processed question ${questions.indexOf(question) + 1}`);
        } else if (data.error) {
          console.error('Gemini API returned error:', data.error);
          answers.push(`API Error: ${data.error.message || 'Unknown error'}`);
        } else {
          console.error('Unexpected Gemini API response structure for question:', question, JSON.stringify(data, null, 2));
          answers.push('Failed to process this question due to unexpected API response format');
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