const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables (need SUPABASE_SERVICE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function listAllUsers() {
  console.log('\n=== Listing all users in the system ===\n');

  try {
    // List auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return;
    }

    console.log(`Total users: ${authUsers.users.length}\n`);

    if (authUsers.users.length === 0) {
      console.log('❌ No users found in the system');
      console.log('\n💡 To create a user:');
      console.log('   1. Use the app\'s Sign Up screen');
      console.log('   2. Or run: node scripts/create-test-user.js');
      return;
    }

    // List each user
    for (const user of authUsers.users) {
      console.log(`📧 ${user.email}`);
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Confirmed: ${user.email_confirmed_at ? '✅' : '❌ (needs email confirmation)'}`);
      console.log(`   - Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`   - Last Login: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
      
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, is_test_user, test_user_type')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        console.log(`   - Name: ${profile.full_name || 'Not set'}`);
        if (profile.is_test_user) {
          console.log(`   - Test User: ✅ (${profile.test_user_type || 'beta'})`);
        }
      }
      console.log('');
    }

    // Check for @noisemeld.com users
    const noisemeldUsers = authUsers.users.filter(u => u.email?.includes('@noisemeld.com'));
    if (noisemeldUsers.length === 0) {
      console.log('⚠️  No users with @noisemeld.com domain found');
      console.log('\n💡 Users with @noisemeld.com domain automatically get test access');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

listAllUsers();