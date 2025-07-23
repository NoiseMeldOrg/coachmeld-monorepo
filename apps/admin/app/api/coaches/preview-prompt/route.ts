import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { prompt, coach } = body

    if (!prompt || !coach) {
      return NextResponse.json({ error: 'Prompt and coach data are required' }, { status: 400 })
    }

    // Replace template variables
    let processedPrompt = prompt
      .replace(/\{\{dietName\}\}/g, coach.name || '')
      .replace(/\{\{dietType\}\}/g, coach.coach_type || '')
      .replace(/\{\{specialties\}\}/g, (coach.features || []).join(', '))

    return NextResponse.json({ 
      preview: processedPrompt,
      variables: {
        dietName: coach.name || '',
        dietType: coach.coach_type || '',
        specialties: (coach.features || []).join(', ')
      }
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}