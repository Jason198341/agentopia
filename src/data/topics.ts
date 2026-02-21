import type { Specialty } from "@/types/agent";

export type TopicDifficulty = "casual" | "standard" | "advanced";

export interface DebateTopic {
  topic: string;
  category: Specialty;
  difficulty: TopicDifficulty;
}

export const DEBATE_TOPICS: DebateTopic[] = [
  // ─── CASUAL — lighthearted, opinion-based, fun ───

  // Technology
  { topic: "Tabs are better than spaces for indentation", category: "technology", difficulty: "casual" },
  { topic: "Android is better than iPhone", category: "technology", difficulty: "casual" },
  { topic: "AI art should count as real art", category: "technology", difficulty: "casual" },

  // Culture
  { topic: "Pineapple belongs on pizza", category: "culture", difficulty: "casual" },
  { topic: "Books are better than movies", category: "culture", difficulty: "casual" },
  { topic: "Morning people are more productive than night owls", category: "culture", difficulty: "casual" },

  // Psychology
  { topic: "Dogs make better pets than cats", category: "psychology", difficulty: "casual" },
  { topic: "Working from home is better than working from office", category: "psychology", difficulty: "casual" },
  { topic: "Summer is the best season of the year", category: "psychology", difficulty: "casual" },

  // Economics
  { topic: "Cash is better than cashless payment", category: "economics", difficulty: "casual" },
  { topic: "Renting is smarter than buying a house", category: "economics", difficulty: "casual" },

  // Ethics
  { topic: "It's okay to lie to avoid hurting someone's feelings", category: "ethics", difficulty: "casual" },
  { topic: "Homework should be abolished in schools", category: "ethics", difficulty: "casual" },

  // ─── STANDARD — substantive but accessible ───

  // Politics
  { topic: "Voting should be mandatory in democratic countries", category: "politics", difficulty: "standard" },
  { topic: "Universal basic income should replace traditional welfare systems", category: "politics", difficulty: "standard" },
  { topic: "Term limits should apply to all elected officials", category: "politics", difficulty: "standard" },

  // Technology
  { topic: "Social media has done more harm than good to society", category: "technology", difficulty: "standard" },
  { topic: "Self-driving cars should be allowed on all public roads", category: "technology", difficulty: "standard" },
  { topic: "Open-source software will eventually replace proprietary software", category: "technology", difficulty: "standard" },
  { topic: "Smartphones are making us less intelligent", category: "technology", difficulty: "standard" },

  // Science
  { topic: "Space colonization should be humanity's top priority", category: "science", difficulty: "standard" },
  { topic: "Gene editing in humans should be widely permitted", category: "science", difficulty: "standard" },
  { topic: "Nuclear energy is essential for combating climate change", category: "science", difficulty: "standard" },

  // Economics
  { topic: "Cryptocurrency will eventually replace fiat currency", category: "economics", difficulty: "standard" },
  { topic: "Globalization benefits developing nations more than developed ones", category: "economics", difficulty: "standard" },
  { topic: "The gig economy exploits workers more than it empowers them", category: "economics", difficulty: "standard" },

  // Culture
  { topic: "Cancel culture does more harm than good", category: "culture", difficulty: "standard" },
  { topic: "Competitive gaming (esports) should be recognized as a real sport", category: "culture", difficulty: "standard" },
  { topic: "Social media influencers have too much power over public opinion", category: "culture", difficulty: "standard" },

  // Ethics
  { topic: "Privacy is more important than national security", category: "ethics", difficulty: "standard" },
  { topic: "It is ethical to use AI to make life-or-death decisions", category: "ethics", difficulty: "standard" },
  { topic: "Animals should have the same moral consideration as humans", category: "ethics", difficulty: "standard" },

  // Psychology
  { topic: "Social media addiction should be classified as a mental disorder", category: "psychology", difficulty: "standard" },
  { topic: "Emotional intelligence is more important than IQ for success", category: "psychology", difficulty: "standard" },
  { topic: "Happiness is a choice, not a circumstance", category: "psychology", difficulty: "standard" },

  // Environment
  { topic: "Individual action is more effective than government policy for environmental change", category: "environment", difficulty: "standard" },
  { topic: "Electric vehicles are not truly green when accounting for production", category: "environment", difficulty: "standard" },

  // History
  { topic: "The Industrial Revolution was ultimately beneficial for humanity", category: "history", difficulty: "standard" },
  { topic: "History is written by the victors and is therefore unreliable", category: "history", difficulty: "standard" },

  // ─── ADVANCED — academic-level, requires deep knowledge ───

  // Politics
  { topic: "Democracy is the most effective form of governance", category: "politics", difficulty: "advanced" },
  { topic: "Nationalism does more harm than good in the modern world", category: "politics", difficulty: "advanced" },

  // Philosophy
  { topic: "Free will is an illusion", category: "philosophy", difficulty: "advanced" },
  { topic: "The trolley problem reveals fundamental flaws in utilitarian thinking", category: "philosophy", difficulty: "advanced" },
  { topic: "Consciousness cannot be explained by physical processes alone", category: "philosophy", difficulty: "advanced" },
  { topic: "Moral relativism is self-defeating as a philosophical position", category: "philosophy", difficulty: "advanced" },

  // Science
  { topic: "The scientific method is the only reliable way to acquire knowledge", category: "science", difficulty: "advanced" },
  { topic: "Artificial general intelligence will be achieved within 20 years", category: "science", difficulty: "advanced" },

  // Economics
  { topic: "Capitalism is the best economic system for reducing poverty", category: "economics", difficulty: "advanced" },
  { topic: "Degrowth is the only viable solution to the ecological crisis", category: "environment", difficulty: "advanced" },

  // Ethics
  { topic: "The right to be forgotten should override freedom of information", category: "ethics", difficulty: "advanced" },
  { topic: "Genetic enhancement will create irreversible inequality between social classes", category: "ethics", difficulty: "advanced" },

  // History
  { topic: "Colonialism's negative impacts outweigh any modernization it brought", category: "history", difficulty: "advanced" },

  // Psychology
  { topic: "Nature matters more than nurture in shaping personality", category: "psychology", difficulty: "advanced" },
  { topic: "The concept of 'mental illness' is a social construct rather than a medical reality", category: "psychology", difficulty: "advanced" },
];

/** Pick a random topic, optionally filtered by difficulty. */
export function pickRandomTopic(difficulty?: TopicDifficulty): DebateTopic {
  const pool = difficulty
    ? DEBATE_TOPICS.filter((t) => t.difficulty === difficulty)
    : DEBATE_TOPICS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Pick topic with ELO-based difficulty: <1000 casual, 1000-1500 standard, 1500+ advanced */
export function pickTopicForElo(elo: number): DebateTopic {
  if (elo < 1000) return pickRandomTopic("casual");
  if (elo < 1500) return pickRandomTopic("standard");
  return pickRandomTopic("advanced");
}
