#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCoachesAndSubscriptions() {
  console.log('🔍 Checking coaches in database...\n');

  // Get all coaches
  const { data: coaches, error: coachError } = await supabase
    .from('coaches')
    .select('*')
    .order('sort_order');

  if (coachError) {
    console.error('Error fetching coaches:', coachError);
    return;
  }

  console.log(`Total coaches: ${coaches.length}`);
  console.log('\nCoaches by type:');
  
  const byType = {};
  coaches.forEach(coach => {
    if (!byType[coach.coach_type]) {
      byType[coach.coach_type] = [];
    }
    byType[coach.coach_type].push(coach);
  });

  Object.entries(byType).forEach(([type, typeCoaches]) => {
    console.log(`\n${type.toUpperCase()} (${typeCoaches.length}):`);
    typeCoaches.forEach(coach => {
      console.log(`  - ${coach.name} ${coach.is_free ? '(FREE)' : '($' + coach.monthly_price + '/mo)'}`);
    });
  });

  // Check current user's subscriptions
  console.log('\n\n🔍 Checking user subscriptions...\n');
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.log('No authenticated user. Run this from the app or authenticate first.');
    return;
  }

  console.log(`User: ${user.email}`);

  // Get user's subscriptions
  const { data: subs, error: subsError } = await supabase
    .from('subscriptions')
    .select('*, coaches(name, coach_type)')
    .eq('user_id', user.id)
    .in('status', ['active', 'trial']);

  if (subsError) {
    console.error('Error fetching subscriptions:', subsError);
    return;
  }

  console.log(`\nActive subscriptions: ${subs.length}`);
  if (subs.length > 0) {
    subs.forEach(sub => {
      console.log(`  - ${sub.coaches.name} (${sub.status})`);
    });
  } else {
    console.log('  No active subscriptions found.');
  }

  // Check which coaches the user can access
  console.log('\n\n📋 Coaches accessible to user:');
  
  const freeCoaches = coaches.filter(c => c.is_free);
  console.log('\nFREE coaches:');
  freeCoaches.forEach(coach => {
    console.log(`  ✅ ${coach.name}`);
  });

  const subscribedCoachIds = subs.map(s => s.coach_id);
  const subscribedCoaches = coaches.filter(c => subscribedCoachIds.includes(c.id) && !c.is_free);
  
  if (subscribedCoaches.length > 0) {
    console.log('\nSUBSCRIBED coaches:');
    subscribedCoaches.forEach(coach => {
      console.log(`  ✅ ${coach.name}`);
    });
  }

  const inaccessibleCoaches = coaches.filter(c => !c.is_free && !subscribedCoachIds.includes(c.id));
  if (inaccessibleCoaches.length > 0) {
    console.log('\nNOT ACCESSIBLE (need subscription):');
    inaccessibleCoaches.forEach(coach => {
      console.log(`  ❌ ${coach.name}`);
    });
  }
}

checkCoachesAndSubscriptions();