import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.10.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret)

    // Log the event
    console.log(`Processing webhook event: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.supabase_user_id

        if (!userId) {
          console.error('No user ID in subscription metadata')
          break
        }

        // Update subscription in database
        await supabaseClient.from('subscriptions').upsert({
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          stripe_price_id: subscription.items.data[0].price.id,
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          canceled_at: subscription.canceled_at 
            ? new Date(subscription.canceled_at * 1000).toISOString() 
            : null,
        }, {
          onConflict: 'stripe_subscription_id',
        })

        // Log event
        await supabaseClient.from('subscription_events').insert({
          user_id: userId,
          stripe_event_id: event.id,
          event_type: event.type,
          data: event.data.object,
        })

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata.supabase_user_id

        if (!userId) {
          console.error('No user ID in subscription metadata')
          break
        }

        // Update subscription status to canceled
        await supabaseClient
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)

        // Log event
        await supabaseClient.from('subscription_events').insert({
          user_id: userId,
          stripe_event_id: event.id,
          event_type: event.type,
          data: event.data.object,
        })

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string
        
        // Get subscription to find user ID
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const userId = subscription.metadata.supabase_user_id

        if (!userId) {
          console.error('No user ID in subscription metadata')
          break
        }

        // Record payment
        await supabaseClient.from('payments').insert({
          user_id: userId,
          stripe_payment_intent_id: invoice.payment_intent as string,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'succeeded',
          description: `Subscription payment for ${invoice.period_start} - ${invoice.period_end}`,
          metadata: {
            invoice_id: invoice.id,
            subscription_id: subscriptionId,
          },
        })

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string
        
        // Get subscription to find user ID
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const userId = subscription.metadata.supabase_user_id

        if (!userId) {
          console.error('No user ID in subscription metadata')
          break
        }

        // Record failed payment
        await supabaseClient.from('payments').insert({
          user_id: userId,
          stripe_payment_intent_id: invoice.payment_intent as string,
          amount: invoice.amount_due,
          currency: invoice.currency,
          status: 'failed',
          description: `Failed subscription payment`,
          metadata: {
            invoice_id: invoice.id,
            subscription_id: subscriptionId,
          },
        })

        // Update subscription status
        await supabaseClient
          .from('subscriptions')
          .update({ 
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId)

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})