import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'

// Simple logger for Edge Functions (Deno environment)
const logger = {
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
  debug: (...args: any[]) => console.log('[DEBUG]', ...args),
}

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
logger.info('Stripe secret key configured:', stripeSecretKey ? 'Yes' : 'No');

const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get the JWT token from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    // Parse request body
    const { priceId } = await req.json()
    logger.info('Received priceId:', priceId);
    
    if (!priceId) {
      throw new Error('Price ID is required')
    }

    // Get or create Stripe customer
    let customerId: string

    // Check if user already has a Stripe customer ID
    logger.info('Fetching profile for user:', user.id);
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      logger.warn('Profile fetch error:', profileError);
      // If profile doesn't exist, that's ok - we'll create a stripe customer
    }

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id
      logger.info('Found existing Stripe customer:', customerId);
    } else {
      // Create new Stripe customer
      logger.info('Creating new Stripe customer for:', user.email);
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id
      logger.info('Created Stripe customer:', customerId);

      // Save customer ID to profile
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
      
      if (updateError) {
        logger.error('Failed to update profile with stripe_customer_id:', updateError);
      }
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        supabase_user_id: user.id,
      },
    })

    // Create ephemeral key for mobile SDK
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2023-10-16' }
    )

    // Get client secret from payment intent
    const invoice = subscription.latest_invoice as Stripe.Invoice
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent
    const clientSecret = paymentIntent.client_secret

    // Save subscription to database
    await supabaseClient.from('subscriptions').insert({
      user_id: user.id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      stripe_price_id: priceId,
      status: 'incomplete',
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })

    return new Response(
      JSON.stringify({
        clientSecret,
        ephemeralKey: ephemeralKey.secret,
        customerId,
        subscriptionId: subscription.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    logger.error('Create subscription error:', error);
    
    // Check if it's a Stripe error
    if (error.type === 'StripeError') {
      logger.error('Stripe error details:', {
        type: error.type,
        code: error.code,
        message: error.message,
        param: error.param,
      });
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.type === 'StripeError' ? {
          type: error.type,
          code: error.code,
          param: error.param,
        } : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})