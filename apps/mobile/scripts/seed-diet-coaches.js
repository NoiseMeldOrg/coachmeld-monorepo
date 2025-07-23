#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const dietCoaches = [
  {
    name: 'Carnivore Coach Pro',
    description: 'Expert carnivore diet guidance',
    coach_type: 'carnivore',
    is_free: false,
    monthly_price: 9.99,
    color_theme: {
      primary: '#FF6B6B',
      secondary: '#FFE0E0',
      accent: '#FF4444',
    },
    icon_name: 'food-steak',
    icon_rotation: -90,
    features: [
      'Unlimited personalized guidance',
      'Advanced meal planning',
      'Nutrient tracking & optimization',
      'Direct meat sourcing tips',
      'Adaptation troubleshooting',
      'Priority support',
    ],
    is_active: true,
    sort_order: 1,
    // Free tier configuration
    free_tier_enabled: true,
    free_tier_daily_limit: 5,
    free_tier_features: [
      'Basic carnivore principles',
      'Limited to 5 messages/day',
      'General meal ideas',
      'Community support',
    ],
  },
  {
    name: 'Paleo Coach',
    description: 'Your ancestral health guide',
    coach_type: 'paleo',
    is_free: false,
    monthly_price: 9.99,
    color_theme: {
      primary: '#8B4513',
      secondary: '#F5DEB3',
      accent: '#654321',
    },
    icon_name: 'leaf',
    icon_rotation: 0,
    features: [
      'Paleo principles & philosophy',
      'Whole food recipes',
      'Ancestral lifestyle tips',
      'Modern paleo adaptations',
    ],
    is_active: true,
    sort_order: 2,
  },
  {
    name: 'Low Carb Coach',
    description: 'Your low-carb lifestyle mentor',
    coach_type: 'lowcarb',
    is_free: false,
    monthly_price: 9.99,
    color_theme: {
      primary: '#4169E1',
      secondary: '#E6F2FF',
      accent: '#1E90FF',
    },
    icon_name: 'nutrition',
    icon_rotation: 0,
    features: [
      'Carb counting & tracking',
      'Low-carb meal planning',
      'Blood sugar management',
      'Sustainable weight loss',
    ],
    is_active: true,
    sort_order: 3,
  },
  {
    name: 'Keto Coach',
    description: 'Your ketogenic diet specialist',
    coach_type: 'keto',
    is_free: false,
    monthly_price: 9.99,
    color_theme: {
      primary: '#9370DB',
      secondary: '#F3E8FF',
      accent: '#8A2BE2',
    },
    icon_name: 'water',
    icon_rotation: 0,
    features: [
      'Ketosis optimization',
      'Macro calculations',
      'Keto flu prevention',
      'Fat adaptation strategies',
    ],
    is_active: true,
    sort_order: 4,
  },
  {
    name: 'Ketovore Coach',
    description: 'Your keto-carnivore hybrid guide',
    coach_type: 'ketovore',
    is_free: false,
    monthly_price: 9.99,
    color_theme: {
      primary: '#FF8C00',
      secondary: '#FFF4E6',
      accent: '#FF6347',
    },
    icon_name: 'food-drumstick',
    icon_rotation: 0,
    features: [
      'Ketovore meal balance',
      'Plant food selection',
      'Transition guidance',
      'Flexibility strategies',
    ],
    is_active: true,
    sort_order: 5,
  },
  {
    name: 'Lion Diet Coach',
    description: 'Your elimination diet expert',
    coach_type: 'lion',
    is_free: false,
    monthly_price: 9.99,
    color_theme: {
      primary: '#DAA520',
      secondary: '#FFFACD',
      accent: '#B8860B',
    },
    icon_name: 'paw',
    icon_rotation: 0,
    features: [
      'Ruminant meat focus',
      'Elimination protocol',
      'Reintroduction guidance',
      'Healing optimization',
    ],
    is_active: true,
    sort_order: 6,
  },
];

async function seedDietCoaches() {
  console.log('🌱 Seeding diet coaches...\n');

  try {
    // Check existing coaches
    const { data: existingCoaches, error: fetchError } = await supabase
      .from('coaches')
      .select('name, coach_type');

    if (fetchError) {
      console.error('Error fetching existing coaches:', fetchError);
      return;
    }

    console.log('Existing coaches:', existingCoaches?.map(c => c.name).join(', ') || 'None');

    // Insert diet coaches
    for (const coach of dietCoaches) {
      // Check if coach already exists
      const exists = existingCoaches?.some(c => c.coach_type === coach.coach_type && c.name === coach.name);
      
      if (exists) {
        console.log(`⏭️  Skipping ${coach.name} - already exists`);
        continue;
      }

      const { data, error } = await supabase
        .from('coaches')
        .insert(coach)
        .select()
        .single();

      if (error) {
        console.error(`❌ Error inserting ${coach.name}:`, error);
      } else {
        console.log(`✅ Added ${coach.name}`);
      }
    }

    // For testing, give the current user a test subscription to all coaches
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      console.log('\n🎁 Adding test subscriptions for current user...');
      
      const { data: allCoaches } = await supabase
        .from('coaches')
        .select('id, name');

      for (const coach of allCoaches || []) {
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: user.id,
            coach_id: coach.id,
            status: 'active',
            is_test_subscription: true,
            start_date: new Date().toISOString(),
          }, {
            onConflict: 'user_id,coach_id,status'
          });

        if (!error) {
          console.log(`✅ Test subscription added for ${coach.name}`);
        }
      }
    }

    console.log('\n🎉 Diet coaches seeded successfully!');

  } catch (error) {
    console.error('Error seeding coaches:', error);
  }
}

seedDietCoaches();