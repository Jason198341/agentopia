// Seed the topics table from hardcoded DEBATE_TOPICS.
// Run: node scripts/seed-topics.mjs
// Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

// ─── Check if table exists ───
console.log("Checking topics table...");
const { error: sqlErr } = await supabase.from("topics").select("id").limit(1);
if (sqlErr && sqlErr.message.includes("does not exist")) {
  console.log("Table doesn't exist. Please run the migration SQL in Supabase SQL editor:");
  console.log("  File: supabase/migrations/003_topics_table.sql");
  console.log("Then re-run this script.");
  process.exit(1);
}

// ─── Seed topics ───
const TOPICS = [
  // CASUAL
  { topic: "Tabs are better than spaces for indentation", category: "technology", difficulty: "casual" },
  { topic: "Android is better than iPhone", category: "technology", difficulty: "casual" },
  { topic: "AI art should count as real art", category: "technology", difficulty: "casual" },
  { topic: "Pineapple belongs on pizza", category: "culture", difficulty: "casual" },
  { topic: "Books are better than movies", category: "culture", difficulty: "casual" },
  { topic: "Morning people are more productive than night owls", category: "culture", difficulty: "casual" },
  { topic: "Dogs make better pets than cats", category: "psychology", difficulty: "casual" },
  { topic: "Working from home is better than working from office", category: "psychology", difficulty: "casual" },
  { topic: "Summer is the best season of the year", category: "psychology", difficulty: "casual" },
  { topic: "Cash is better than cashless payment", category: "economics", difficulty: "casual" },
  { topic: "Renting is smarter than buying a house", category: "economics", difficulty: "casual" },
  { topic: "It's okay to lie to avoid hurting someone's feelings", category: "ethics", difficulty: "casual" },
  { topic: "Homework should be abolished in schools", category: "ethics", difficulty: "casual" },
  // STANDARD
  { topic: "Voting should be mandatory in democratic countries", category: "politics", difficulty: "standard" },
  { topic: "Universal basic income should replace traditional welfare systems", category: "politics", difficulty: "standard" },
  { topic: "Term limits should apply to all elected officials", category: "politics", difficulty: "standard" },
  { topic: "Social media has done more harm than good to society", category: "technology", difficulty: "standard" },
  { topic: "Self-driving cars should be allowed on all public roads", category: "technology", difficulty: "standard" },
  { topic: "Open-source software will eventually replace proprietary software", category: "technology", difficulty: "standard" },
  { topic: "Smartphones are making us less intelligent", category: "technology", difficulty: "standard" },
  { topic: "Space colonization should be humanity's top priority", category: "science", difficulty: "standard" },
  { topic: "Gene editing in humans should be widely permitted", category: "science", difficulty: "standard" },
  { topic: "Nuclear energy is essential for combating climate change", category: "science", difficulty: "standard" },
  { topic: "Cryptocurrency will eventually replace fiat currency", category: "economics", difficulty: "standard" },
  { topic: "Globalization benefits developing nations more than developed ones", category: "economics", difficulty: "standard" },
  { topic: "The gig economy exploits workers more than it empowers them", category: "economics", difficulty: "standard" },
  { topic: "Cancel culture does more harm than good", category: "culture", difficulty: "standard" },
  { topic: "Competitive gaming (esports) should be recognized as a real sport", category: "culture", difficulty: "standard" },
  { topic: "Social media influencers have too much power over public opinion", category: "culture", difficulty: "standard" },
  { topic: "Privacy is more important than national security", category: "ethics", difficulty: "standard" },
  { topic: "It is ethical to use AI to make life-or-death decisions", category: "ethics", difficulty: "standard" },
  { topic: "Animals should have the same moral consideration as humans", category: "ethics", difficulty: "standard" },
  { topic: "Social media addiction should be classified as a mental disorder", category: "psychology", difficulty: "standard" },
  { topic: "Emotional intelligence is more important than IQ for success", category: "psychology", difficulty: "standard" },
  { topic: "Happiness is a choice, not a circumstance", category: "psychology", difficulty: "standard" },
  { topic: "Individual action is more effective than government policy for environmental change", category: "environment", difficulty: "standard" },
  { topic: "Electric vehicles are not truly green when accounting for production", category: "environment", difficulty: "standard" },
  { topic: "The Industrial Revolution was ultimately beneficial for humanity", category: "history", difficulty: "standard" },
  { topic: "History is written by the victors and is therefore unreliable", category: "history", difficulty: "standard" },
  // ADVANCED
  { topic: "Democracy is the most effective form of governance", category: "politics", difficulty: "advanced" },
  { topic: "Nationalism does more harm than good in the modern world", category: "politics", difficulty: "advanced" },
  { topic: "Free will is an illusion", category: "philosophy", difficulty: "advanced" },
  { topic: "The trolley problem reveals fundamental flaws in utilitarian thinking", category: "philosophy", difficulty: "advanced" },
  { topic: "Consciousness cannot be explained by physical processes alone", category: "philosophy", difficulty: "advanced" },
  { topic: "Moral relativism is self-defeating as a philosophical position", category: "philosophy", difficulty: "advanced" },
  { topic: "The scientific method is the only reliable way to acquire knowledge", category: "science", difficulty: "advanced" },
  { topic: "Artificial general intelligence will be achieved within 20 years", category: "science", difficulty: "advanced" },
  { topic: "Capitalism is the best economic system for reducing poverty", category: "economics", difficulty: "advanced" },
  { topic: "Degrowth is the only viable solution to the ecological crisis", category: "environment", difficulty: "advanced" },
  { topic: "The right to be forgotten should override freedom of information", category: "ethics", difficulty: "advanced" },
  { topic: "Genetic enhancement will create irreversible inequality between social classes", category: "ethics", difficulty: "advanced" },
  { topic: "Colonialism's negative impacts outweigh any modernization it brought", category: "history", difficulty: "advanced" },
  { topic: "Nature matters more than nurture in shaping personality", category: "psychology", difficulty: "advanced" },
  { topic: "The concept of 'mental illness' is a social construct rather than a medical reality", category: "psychology", difficulty: "advanced" },
];

// Check if already seeded
const { count } = await supabase.from("topics").select("*", { count: "exact", head: true });
if (count && count > 0) {
  console.log(`Topics table already has ${count} rows. Skipping seed.`);
  process.exit(0);
}

console.log(`Inserting ${TOPICS.length} topics...`);
const { error } = await supabase.from("topics").insert(TOPICS);

if (error) {
  console.error("Insert error:", error.message);
  process.exit(1);
}

console.log(`✅ Seeded ${TOPICS.length} topics successfully!`);
