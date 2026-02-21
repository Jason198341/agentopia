import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load .env.local manually
const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
  { auth: { persistSession: false } }
);

// Check if tables already exist
const { error } = await supabase.from('counseling_posts').select('id').limit(0);
if (!error) {
  console.log('counseling_posts table already exists — migration already applied.');
  process.exit(0);
}

console.log('Tables do not exist. Running migration...');

// Read SQL and split into statements
const sql = readFileSync('supabase/migrations/006_counseling.sql', 'utf-8');

// Split on semicolons that are at end of line (not inside $$ blocks)
const statements = [];
let current = '';
let inDollarQuote = false;

for (const line of sql.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('--')) {
    continue; // skip comments
  }

  if (trimmed.includes('$$')) {
    inDollarQuote = !inDollarQuote;
  }

  current += line + '\n';

  if (!inDollarQuote && trimmed.endsWith(';')) {
    const stmt = current.trim();
    if (stmt.length > 1) {
      statements.push(stmt);
    }
    current = '';
  }
}

console.log(`Found ${statements.length} statements to execute`);

// Execute each statement via Supabase SQL endpoint
for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const preview = stmt.slice(0, 80).replace(/\n/g, ' ');

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL.trim()}/rest/v1/rpc/`,
      {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: stmt }),
      }
    );

    if (!response.ok) {
      // This approach won't work for DDL — need management API
      console.log(`Statement ${i + 1}: REST API doesn't support DDL`);
      break;
    }
    console.log(`[${i + 1}/${statements.length}] OK: ${preview}...`);
  } catch (err) {
    console.log(`[${i + 1}] Error: ${err.message}`);
    break;
  }
}

console.log('\nMigration needs to be run via Supabase Dashboard SQL Editor.');
console.log('Copy the contents of: supabase/migrations/006_counseling.sql');
console.log('Paste into: https://supabase.com/dashboard/project/jfcgagwxmlzygwdwyqpc/sql/new');
