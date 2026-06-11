const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});
const supabase = createClient(env['EXPO_PUBLIC_SUPABASE_URL'], env['EXPO_PUBLIC_SUPABASE_ANON_KEY']);

async function test() {
  // Test johndriver login
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'johndriver@school.com', password: 'school123'
  });
  if (error) {
    console.log('johndriver with school123 FAILED:', error.message);
    console.log('Password was likely already changed. Needs DB reset.');
  } else {
    console.log('johndriver login OK');
    console.log('needs_password_change:', data.user.user_metadata.needs_password_change);
    await supabase.auth.signOut();
  }
}
test();
