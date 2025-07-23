import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check database connection
    const serviceClient = createServiceClient()
    const { error } = await serviceClient
      .from('document_sources')
      .select('id')
      .limit(1)
      .single()
    
    // It's OK if no records exist, we just want to verify connection
    const dbHealthy = !error || error.code === 'PGRST116'
    
    const health = {
      status: dbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbHealthy ? 'connected' : 'disconnected',
        supabase: dbHealthy ? 'operational' : 'error'
      }
    }

    return NextResponse.json(health, {
      status: dbHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Health check failed',
      responseTime: Date.now() - startTime
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}