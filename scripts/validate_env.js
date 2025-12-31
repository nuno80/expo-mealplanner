const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const path = require("path");

// Load .env.local manually since we're running outside Expo
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log("🔍 Checking Environment Variables...");

if (!SUPABASE_URL) {
  console.error("❌ ERROR: EXPO_PUBLIC_SUPABASE_URL is missing in .env.local");
} else {
  console.log("✅ EXPO_PUBLIC_SUPABASE_URL found:", SUPABASE_URL);
}

if (!SUPABASE_KEY) {
  console.error("❌ ERROR: EXPO_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local");
} else {
  console.log("✅ EXPO_PUBLIC_SUPABASE_ANON_KEY found (length: " + SUPABASE_KEY.length + ")");
}

if (SUPABASE_URL && SUPABASE_KEY) {
  console.log("\n📡 Testing Supabase Connection...");
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Try to get session (doesn't require login, just checks connection to auth server)
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error("❌ Connection Failed:", error.message);
    } else {
      console.log("✅ Connection Successful!");
      console.log("   Session Status:", data.session ? "Active" : "None");
      console.log("\nSUCCESS: Credentials are valid.");
    }
  }).catch(err => {
    console.error("❌ Network/Client Error:", err);
  });
}
