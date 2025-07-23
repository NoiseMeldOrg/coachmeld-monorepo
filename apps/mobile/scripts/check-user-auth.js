const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkUserAuth(email) {
  console.log(`\n=== Checking authentication for: ${email} ===\n`);

  try {
    // 1. Check if user exists in auth.users (requires service key)
    if (process.env.SUPABASE_SERVICE_KEY) {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error fetching auth users:', authError);
      } else {
        const user = authUsers.users.find(u => u.email === email);
        
        if (user) {
          console.log('✅ User found in auth.users:');
          console.log(`   - ID: ${user.id}`);
          console.log(`   - Email: ${user.email}`);
          console.log(`   - Created: ${new Date(user.created_at).toLocaleString()}`);
          console.log(`   - Confirmed: ${user.email_confirmed_at ? '✅ YES' : '❌ NO'}`);
          console.log(`   - Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
          console.log(`   - Identities: ${user.identities?.length || 0}`);
          
          if (!user.email_confirmed_at) {
            console.log('\n⚠️  WARNING: Email not confirmed! User needs to confirm email before logging in.');
          }
          
          // 2. Check profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (profileError) {
            console.log('\n❌ No profile found for user');
          } else {
            console.log('\n✅ Profile found:');
            console.log(`   - Full Name: ${profile.full_name || 'Not set'}`);
            console.log(`   - Test User: ${profile.is_test_user ? '✅ YES' : '❌ NO'}`);
            if (profile.is_test_user) {
              console.log(`   - Test Type: ${profile.test_user_type || 'Not set'}`);
              console.log(`   - Test Expires: ${profile.test_expires_at || 'Never'}`);
            }
          }
          
          // 3. Check subscriptions
          const { data: subs, error: subsError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id);
          
          if (!subsError && subs) {
            console.log(`\n📦 Subscriptions: ${subs.length}`);
            subs.forEach(sub => {
              console.log(`   - Coach: ${sub.coach_id}, Status: ${sub.status}, Test: ${sub.is_test_subscription ? 'YES' : 'NO'}`);
            });
          }
        } else {
          console.log('❌ User not found in auth.users');
        }
      }
    } else {
      console.log('ℹ️  Using anonymous key - limited access to auth data');
      
      // Try to check profile by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();
      
      if (profileError) {
        console.log('❌ No profile found with this email');
      } else {
        console.log('✅ Profile found but cannot verify auth status with anon key');
      }
    }

    // 4. Test login (only with test credentials)
    if (email === 'test@noisemeld.com') {
      console.log('\n🔐 Testing login with default test password...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: 'testpass123', // Default test password
      });
      
      if (error) {
        console.log(`❌ Login failed: ${error.message}`);
      } else {
        console.log('✅ Login successful!');
        await supabase.auth.signOut();
      }
    } else {
      console.log('\n💡 To test login, please use the app or provide password as argument');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Main execution
const email = process.argv[2] || 'michael@noisemeld.com';
checkUserAuth(email);