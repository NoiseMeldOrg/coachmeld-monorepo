import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.24.1'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChatRequest {
  prompt: string;
  systemPrompt?: string;
  userContext?: string;
  conversationContext?: string;
  knowledgeContext?: string;
  temperature?: number;
  maxOutputTokens?: number;
  topK?: number;
  topP?: number;
  userId?: string;
  coachId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)
    
    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const {
      prompt,
      systemPrompt,
      userContext,
      conversationContext,
      knowledgeContext,
      temperature = 0.7,
      maxOutputTokens = 2048,
      topK = 40,
      topP = 0.95,
      coachId,
    } = await req.json()

    // Check if user has premium access (if needed)
    if (coachId) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('coach_id', coachId)
        .eq('status', 'active')
        .single()

      // For now, allow all diet coaches (they might be free or premium)
      // You can add more logic here if needed
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Log the configuration for debugging
    console.log('Generation config:', {
      temperature,
      topK,
      topP,
      maxOutputTokens,
      model: 'gemini-1.5-flash'
    })
    
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature,
        topK,
        topP,
        maxOutputTokens,
      },
    })

    // Build the full prompt with all context
    let fullPrompt = ''
    
    if (systemPrompt) {
      // Add clear instruction separator
      fullPrompt += `SYSTEM INSTRUCTIONS:\n${systemPrompt}\n\n---\n\n`
    }
    
    if (conversationContext) {
      fullPrompt += `${conversationContext}\n\n`
    }
    
    if (userContext) {
      fullPrompt += `${userContext}\n\n`
    }
    
    if (knowledgeContext) {
      fullPrompt += `RELEVANT KNOWLEDGE:\n${knowledgeContext}\n\n`
    }
    
    fullPrompt += `User: ${prompt}\nAssistant:`

    // Log the full context being sent (only for testing with specific user)
    if (user.email === 'michael@noisemeld.com') {
      console.log('=== FULL PROMPT CONTEXT ===')
      console.log('System Prompt Length:', systemPrompt?.length || 0)
      console.log('Conversation Context Length:', conversationContext?.length || 0)
      console.log('User Context Length:', userContext?.length || 0)
      console.log('Knowledge Context Length:', knowledgeContext?.length || 0)
      console.log('Total Prompt Length:', fullPrompt.length)
      console.log('---')
      console.log('Knowledge Context Preview:', knowledgeContext?.substring(0, 500) || 'None')
      console.log('=========================')
    }

    const result = await model.generateContent(fullPrompt)
    const response = await result.response
    const text = response.text()

    return new Response(
      JSON.stringify({ 
        response: text,
        usage: {
          promptTokens: result.response.usageMetadata?.promptTokenCount,
          completionTokens: result.response.usageMetadata?.candidatesTokenCount,
          totalTokens: result.response.usageMetadata?.totalTokenCount,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error generating chat response:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 400,
      }
    )
  }
})