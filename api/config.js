// Serverless function to return environment variables for client
export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    // Try both uppercase and lowercase env var names
    supabase_url: process.env.SUPABASE_URL || process.env.supabase_url,
    supabase_anon_key: process.env.SUPABASE_ANON_KEY || process.env.supabase_anon_key,
  });
}