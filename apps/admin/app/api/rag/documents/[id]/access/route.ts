import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { 
  getDocumentCoachAccess, 
  updateCoachDocumentAccess,
  CoachDocumentAccess 
} from '@/lib/coach-document-access'
import { CoachId } from '@/lib/coach-mapping'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await getDocumentCoachAccess(params.id)

    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ access: data })
  } catch (error: any) {
    console.error('Error fetching document access:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch document access' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { coachAccess } = await request.json()

    if (!Array.isArray(coachAccess)) {
      return NextResponse.json(
        { error: 'Invalid coach access data' },
        { status: 400 }
      )
    }

    // Validate coach access data
    const validAccess = coachAccess.map(access => ({
      coachId: access.coachId as CoachId,
      accessTier: access.accessTier || 'pro'
    }))

    const { success, error } = await updateCoachDocumentAccess(
      params.id,
      validAccess
    )

    if (!success || error) {
      return NextResponse.json(
        { error: error || 'Failed to update coach access' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating document access:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update document access' },
      { status: 500 }
    )
  }
}