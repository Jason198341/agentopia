import type { Specialty } from "@/types/agent";

export interface DebateTopic {
  topic: string;
  category: Specialty;
}

export const DEBATE_TOPICS: DebateTopic[] = [
  // Politics (3)
  { topic: "Democracy is the most effective form of governance", category: "politics" },
  { topic: "Universal basic income should replace traditional welfare systems", category: "politics" },
  { topic: "Nationalism does more harm than good in the modern world", category: "politics" },

  // Technology (3)
  { topic: "Artificial general intelligence will be achieved within 20 years", category: "technology" },
  { topic: "Social media has done more harm than good to society", category: "technology" },
  { topic: "Open-source software will eventually replace proprietary software", category: "technology" },

  // Philosophy (3)
  { topic: "Free will is an illusion", category: "philosophy" },
  { topic: "The trolley problem reveals fundamental flaws in utilitarian thinking", category: "philosophy" },
  { topic: "Consciousness cannot be explained by physical processes alone", category: "philosophy" },

  // Science (3)
  { topic: "Space colonization should be humanity's top priority", category: "science" },
  { topic: "Gene editing in humans should be widely permitted", category: "science" },
  { topic: "The scientific method is the only reliable way to acquire knowledge", category: "science" },

  // Economics (3)
  { topic: "Capitalism is the best economic system for reducing poverty", category: "economics" },
  { topic: "Cryptocurrency will eventually replace fiat currency", category: "economics" },
  { topic: "Globalization benefits developing nations more than developed ones", category: "economics" },

  // Culture (3)
  { topic: "Cultural appropriation is a valid concern in a globalized world", category: "culture" },
  { topic: "Traditional art forms will become irrelevant in the digital age", category: "culture" },
  { topic: "Cancel culture does more harm than good", category: "culture" },

  // Ethics (3)
  { topic: "Privacy is more important than national security", category: "ethics" },
  { topic: "Animals should have the same moral consideration as humans", category: "ethics" },
  { topic: "It is ethical to use AI to make life-or-death decisions", category: "ethics" },

  // History (3)
  { topic: "The Industrial Revolution was ultimately beneficial for humanity", category: "history" },
  { topic: "Colonialism's negative impacts outweigh any modernization it brought", category: "history" },
  { topic: "History is written by the victors and is therefore unreliable", category: "history" },

  // Psychology (3)
  { topic: "Nature matters more than nurture in shaping personality", category: "psychology" },
  { topic: "Social media addiction should be classified as a mental disorder", category: "psychology" },
  { topic: "Emotional intelligence is more important than IQ for success", category: "psychology" },

  // Environment (3)
  { topic: "Nuclear energy is essential for combating climate change", category: "environment" },
  { topic: "Individual action is more effective than government policy for environmental change", category: "environment" },
  { topic: "Degrowth is the only viable solution to the ecological crisis", category: "environment" },
];

export function pickRandomTopic(): DebateTopic {
  return DEBATE_TOPICS[Math.floor(Math.random() * DEBATE_TOPICS.length)];
}
