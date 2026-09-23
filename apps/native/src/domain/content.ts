import type { Challenge, Mode, Profile, Settings, TopicId } from "./types";

export const TOPICS: { id: TopicId; name: string; subtitle: string; color: string; visual: string }[] = [
  { id: "geography", name: "Around the world", subtitle: "A little closer to everywhere", color: "#B6F3C6", visual: "globe" },
  { id: "space", name: "Beyond Earth", subtitle: "Big universe. Little discoveries.", color: "#C8B6FF", visual: "planet" },
  { id: "science", name: "Everyday science", subtitle: "The why behind the ordinary", color: "#D9FF6B", visual: "planet" },
  { id: "history", name: "Time travelers", subtitle: "Connect the moments that matter", color: "#FFCBA4", visual: "globe" },
  { id: "art", name: "A closer look", subtitle: "Find a new way of seeing", color: "#F7C4D8", visual: "sunflower" },
  { id: "languages", name: "Little conversations", subtitle: "A few words open a whole world", color: "#C8B6FF", visual: "words" },
  { id: "memory", name: "Keep it in mind", subtitle: "Give your recall a little stretch", color: "#D9FF6B", visual: "shapes" },
  { id: "math", name: "Number playground", subtitle: "Small puzzles. Satisfying clicks.", color: "#B6F3C6", visual: "numbers" },
  { id: "logic", name: "Make the connection", subtitle: "Spot a pattern. Find your way.", color: "#C8B6FF", visual: "shapes" },
  { id: "nature", name: "Wild little wonders", subtitle: "Get curious about the living world", color: "#B6F3C6", visual: "leaf" },
  { id: "study", name: "Your knowledge", subtitle: "The things you want to remember", color: "#D9FF6B", visual: "words" },
  { id: "focus", name: "Back to your thing", subtitle: "A moment to find your intention", color: "#C8B6FF", visual: "focus" },
];

export const DEFAULT_PROFILE: Profile = {
  name: "", country: "Argentina", nativeLanguage: "English", learningLanguages: ["Spanish"],
  interests: ["geography", "science", "space"], level: "curious", goals: ["Curiosity"],
  dailyGoal: 5, defaultMode: "free", selectedApps: [], estimatedUsageMinutes: 120, onboardingComplete: false,
};
export const DEFAULT_SETTINGS: Settings = {
  mode: "free", intensity: "balanced", unlockMinutes: 5, haptics: true, sound: false,
  reminders: false, appearance: "system", currentTask: "", screenTimePermission: "not-requested",
  subscription: "not-configured",
};
export const MODE_CONFIG: Record<Mode, { title: string; description: string; message: string; color: string; defaultUnlockMinutes: number; sessionSize: number }> = {
  free: { title: "Free", description: "Follow your curiosity", message: "A little discovery goes a long way.", color: "#D9FF6B", defaultUnlockMinutes: 5, sessionSize: 3 },
  study: { title: "Study", description: "Make it stick", message: "Your next review is a small step forward.", color: "#C8B6FF", defaultUnlockMinutes: 3, sessionSize: 5 },
  work: { title: "Work", description: "Find your way back", message: "One small next step. You've got this.", color: "#B6F3C6", defaultUnlockMinutes: 3, sessionSize: 1 },
  sleep: { title: "Sleep", description: "Ease into the evening", message: "Nothing to catch up on. Just a softer moment.", color: "#C8B6FF", defaultUnlockMinutes: 10, sessionSize: 1 },
};

const choices = (...labels: string[]) => labels.map((label, index) => ({ id: String(index), label }));
const nasaVenus = { title: "NASA · Venus facts", url: "https://science.nasa.gov/venus/venus-facts/" };
const nasaSolar = { title: "NASA · Solar system facts", url: "https://science.nasa.gov/solar-system/solar-system-facts/" };
const moonSource = { title: "NASA · Apollo 11", url: "https://www.nasa.gov/mission/apollo-11/" };
const artSource = { title: "National Gallery · The Sunflowers", url: "https://www.nationalgallery.org.uk/paintings/learn-about-art/paintings-in-depth/the-sunflowers" };
const oceanSource = { title: "NOAA · The Pacific Ocean", url: "https://oceanexplorer.noaa.gov/ocean-fact/pacific-size/" };
const original = { title: "Goomi · Original practice exercise" };

/** A finite, reviewed starter library. No network or generated facts in the interruption path. */
export const STARTER_CHALLENGES: Challenge[] = [
  {
    id: "geo-argentina", conceptId: "argentina-size", topicId: "geography", type: "geography",
    title: "A little closer to home", prompt: "Which is the second-largest country in South America by area?",
    choices: choices("Chile", "Argentina", "Peru", "Colombia"), correctChoiceId: "1",
    explanation: "Argentina is South America's second-largest country by area, after Brazil. Its long shape stretches from subtropical regions to Patagonia.",
    memoryTip: "Brazil first, Argentina next. Picture Patagonia at the continent's southern end.",
    difficulty: "gentle", durationSeconds: 20, visual: "globe", country: "Argentina",
    source: { title: "Argentina's National Geographic Institute · Area report", url: "https://www.ign.gob.ar/descargas/geoespacial/Informe_supercies_de_Argentina.pdf" },
    relatedConceptIds: ["pacific-size"],
  },
  {
    id: "geo-pacific", conceptId: "pacific-size", topicId: "geography", type: "multiple-choice",
    title: "A world of water", prompt: "Which ocean is the largest on Earth?",
    choices: choices("Atlantic", "Indian", "Pacific", "Arctic"), correctChoiceId: "2",
    explanation: "The Pacific is Earth's largest and deepest ocean basin. It lies between the Americas and Asia and Australia.",
    memoryTip: "The biggest stretch of blue on a globe is the Pacific.",
    difficulty: "gentle", durationSeconds: 15, visual: "globe", source: oceanSource,
  },
  {
    id: "space-venus", conceptId: "venus-temperature", topicId: "space", type: "multiple-choice",
    title: "A surprising neighbor", prompt: "Which planet is the hottest in our solar system?",
    choices: choices("Mercury", "Venus", "Mars", "Jupiter"), correctChoiceId: "1",
    explanation: "Venus is hotter than Mercury. Its thick atmosphere traps heat in an intense greenhouse effect, even though Mercury is closer to the Sun.",
    memoryTip: "Venus wears a thick blanket of atmosphere.",
    difficulty: "curious", durationSeconds: 20, visual: "planet", source: nasaVenus,
    relatedConceptIds: ["greenhouse-effect", "planet-order"],
  },
  {
    id: "science-venus-review", conceptId: "greenhouse-effect", topicId: "science", type: "true-false",
    title: "The atmosphere matters", prompt: "A planet's atmosphere can make it hotter than a planet closer to the Sun.",
    choices: choices("True", "False"), correctChoiceId: "0",
    explanation: "True. Venus is the example: its thick atmosphere traps heat, making its surface hotter than Mercury's.",
    memoryTip: "Distance matters. The atmosphere matters too.",
    difficulty: "gentle", durationSeconds: 15, visual: "planet", source: nasaVenus,
    relatedConceptIds: ["venus-temperature"],
  },
  {
    id: "space-order", conceptId: "planet-order", topicId: "space", type: "sequence",
    title: "Outward from the Sun", prompt: "Put the first four planets in order, starting closest to the Sun.",
    items: [{ id: "earth", label: "Earth" }, { id: "mercury", label: "Mercury" }, { id: "mars", label: "Mars" }, { id: "venus", label: "Venus" }],
    correctOrder: ["mercury", "venus", "earth", "mars"],
    explanation: "Mercury, Venus, Earth, then Mars. These are the four inner, rocky planets.",
    memoryTip: "My Very Eager Mind: Mercury, Venus, Earth, Mars.",
    difficulty: "curious", durationSeconds: 25, visual: "planet", source: nasaSolar,
  },
  {
    id: "history-moon", conceptId: "apollo-11-year", topicId: "history", type: "multiple-choice",
    title: "One giant leap", prompt: "In which year did people first land on the Moon?",
    choices: choices("1959", "1965", "1969", "1972"), correctChoiceId: "2",
    explanation: "Apollo 11 landed on the Moon in July 1969. Neil Armstrong and Buzz Aldrin walked on its surface while Michael Collins orbited above.",
    memoryTip: "The first Moon landing closed out the 1960s: 1969.",
    difficulty: "gentle", durationSeconds: 20, visual: "moon", source: moonSource,
  },
  {
    id: "history-declaration", conceptId: "declaration-year", topicId: "history", type: "multiple-choice",
    title: "A date with history", prompt: "The US Declaration of Independence was approved in which year?",
    choices: choices("1492", "1776", "1789", "1865"), correctChoiceId: "1",
    explanation: "The Continental Congress approved the Declaration on July 4, 1776. Approval and the later signing are distinct events.",
    memoryTip: "Connect July 4 with 1776.", difficulty: "curious", durationSeconds: 20, visual: "words",
    source: { title: "Library of Congress · Declaration of Independence", url: "https://guides.loc.gov/declaration-of-independence" },
  },
  {
    id: "history-order", conceptId: "timeline-art-moon", topicId: "history", type: "historical-order",
    title: "Three moments, one timeline", prompt: "Arrange these events from earliest to latest.",
    items: [{ id: "moon", label: "First human Moon landing · 1969" }, { id: "declaration", label: "US Declaration approved · 1776" }, { id: "sunflowers", label: "Van Gogh paints Sunflowers · 1888" }],
    correctOrder: ["declaration", "sunflowers", "moon"],
    explanation: "1776 comes before 1888, which comes before 1969. Placing familiar events together helps build a mental timeline.",
    memoryTip: "Declaration → Sunflowers → Moon.", difficulty: "gentle", durationSeconds: 25, visual: "words",
    source: original, relatedConceptIds: ["declaration-year", "sunflowers-artist", "apollo-11-year"],
  },
  {
    id: "art-sunflowers", conceptId: "sunflowers-artist", topicId: "art", type: "art-identification",
    title: "A burst of yellow", prompt: "Who painted the famous Sunflowers series in Arles?",
    choices: choices("Claude Monet", "Frida Kahlo", "Vincent van Gogh", "Pablo Picasso"), correctChoiceId: "2",
    explanation: "Vincent van Gogh painted his Arles Sunflowers series beginning in 1888. He used shades of yellow to give the flowers remarkable life.",
    memoryTip: "Van Gogh's sunny yellow flowers.", difficulty: "gentle", durationSeconds: 20, visual: "sunflower", source: artSource,
  },
  {
    id: "language-hola", conceptId: "spanish-hola", topicId: "languages", type: "translation",
    title: "Your first little hello", prompt: "What does “hola” mean in English?",
    choices: choices("Goodbye", "Hello", "Please", "Thank you"), correctChoiceId: "1",
    explanation: "Hola means hello in Spanish. The h is silent: think “OH-lah.”",
    memoryTip: "A small hola starts a conversation.", difficulty: "gentle", durationSeconds: 15, visual: "words", language: "Spanish",
  },
  {
    id: "language-gracias", conceptId: "spanish-gracias", topicId: "languages", type: "vocabulary",
    title: "A useful little word", prompt: "Someone helps you. Which Spanish word means “thank you”?",
    choices: choices("Mañana", "Gracias", "Agua", "Hola"), correctChoiceId: "1",
    explanation: "Gracias means thank you. Muchas gracias adds emphasis: thank you very much.",
    memoryTip: "Gratitude → gracias.", difficulty: "gentle", durationSeconds: 15, visual: "words", language: "Spanish",
  },
  {
    id: "language-match", conceptId: "spanish-starter-pairs", topicId: "languages", type: "matching",
    title: "Make a little connection", prompt: "Match each Spanish word to its English meaning.",
    pairs: [
      { left: { id: "hola", label: "Hola" }, right: { id: "hello", label: "Hello" } },
      { left: { id: "gracias", label: "Gracias" }, right: { id: "thanks", label: "Thank you" } },
      { left: { id: "agua", label: "Agua" }, right: { id: "water", label: "Water" } },
    ],
    explanation: "Hola = hello. Gracias = thank you. Agua = water. These three words are useful in everyday conversations.",
    memoryTip: "Say hello, ask for water, say thank you.", difficulty: "curious", durationSeconds: 30, visual: "words", language: "Spanish",
    relatedConceptIds: ["spanish-hola", "spanish-gracias"],
  },
  {
    id: "memory-colors", conceptId: "memory-color-order", topicId: "memory", type: "memory",
    title: "A tiny memory stretch", prompt: "Which color was in the middle?",
    preview: ["Lavender", "Lime", "Coral"], previewSeconds: 4,
    choices: choices("Lavender", "Coral", "Lime", "Blue"), correctChoiceId: "2",
    explanation: "The order was Lavender, Lime, Coral. Lime sat in the middle. Try making a quick mental picture of the three colors.",
    memoryTip: "Picture lime tucked between lavender and coral.", difficulty: "gentle", durationSeconds: 15, visual: "shapes", source: original,
  },
  {
    id: "math-discount", conceptId: "percent-ten", topicId: "math", type: "mental-math",
    title: "A quick number win", prompt: "What's 10% of 80?",
    choices: choices("4", "8", "10", "18"), correctChoiceId: "1",
    explanation: "Ten percent means one tenth. Divide 80 by 10 to get 8.",
    memoryTip: "For 10%, divide by 10.", difficulty: "gentle", durationSeconds: 15, visual: "numbers", source: original,
  },
  {
    id: "math-halves", conceptId: "fraction-half", topicId: "math", type: "fill-blank",
    title: "Halfway there", prompt: "Half of 36 is ___.",
    acceptedAnswers: ["18", "eighteen"], answerLabel: "18",
    explanation: "36 ÷ 2 = 18. You can halve 30 to get 15 and halve 6 to get 3, then add them.",
    memoryTip: "Split a bigger number into smaller, friendlier pieces.", difficulty: "gentle", durationSeconds: 15, visual: "numbers", source: original,
  },
  {
    id: "logic-pattern", conceptId: "doubling-pattern", topicId: "logic", type: "pattern",
    title: "Spot the little rule", prompt: "Using the rule “double the last number,” what comes next?\n2 · 4 · 8 · 16 · ?",
    choices: choices("18", "24", "30", "32"), correctChoiceId: "3",
    explanation: "Each number doubles: 2 × 2 = 4, then 8, then 16, then 32.",
    memoryTip: "Find the operation between neighbors.", difficulty: "gentle", durationSeconds: 20, visual: "numbers", source: original,
  },
  {
    id: "logic-order", conceptId: "transitive-order", topicId: "logic", type: "logic",
    title: "Connect the clues", prompt: "Mia is taller than Leo. Leo is taller than Sam. Who is the shortest?",
    choices: choices("Mia", "Leo", "Sam", "We can't tell"), correctChoiceId: "2",
    explanation: "The clues give one chain: Mia > Leo > Sam. Sam is shortest.",
    memoryTip: "Turn two clues into a single ordered line.", difficulty: "curious", durationSeconds: 20, visual: "shapes", source: original,
  },
  {
    id: "logic-sudoku", conceptId: "sudoku-missing", topicId: "logic", type: "micro-sudoku",
    title: "One small square", prompt: "Each row, column and 2×2 box needs 1, 2, 3 and 4. What's missing?",
    grid: [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 0],
    choices: choices("1", "2", "3", "4"), correctChoiceId: "0",
    explanation: "The last row already has 4, 3 and 2, so it needs 1. The last column and bottom-right box need 1 too.",
    memoryTip: "Look for what isn't there yet.", difficulty: "curious", durationSeconds: 25, visual: "numbers", source: original,
  },
  {
    id: "nature-ocean", conceptId: "pacific-depth", topicId: "nature", type: "true-false",
    title: "Into the blue", prompt: "The Pacific is both the largest and the deepest ocean basin.",
    choices: choices("True", "False"), correctChoiceId: "0",
    explanation: "True. The Pacific holds both distinctions. Ocean basins differ in shape, area and depth.",
    memoryTip: "Pacific: biggest blue, deepest blue.", difficulty: "gentle", durationSeconds: 15, visual: "globe", source: oceanSource,
    relatedConceptIds: ["pacific-size"],
  },
];

export const WORK_CHALLENGE: Challenge = {
  id: "work-intention", conceptId: "work-intention", topicId: "focus", type: "reflection",
  title: "Back to your thing", prompt: "What's the smallest next step on the thing you were doing?",
  explanation: "Keep that one next step in mind. You can come back to it whenever you're ready.",
  memoryTip: "One next step is enough.", difficulty: "gentle", durationSeconds: 15, visual: "focus", actionLabel: "I've got my next step",
};
export const SLEEP_CHALLENGE: Challenge = {
  id: "sleep-breath", conceptId: "sleep-breath", topicId: "focus", type: "breathing",
  title: "A softer moment", prompt: "Let your shoulders settle. Take one slow, comfortable breath.",
  explanation: "There's nothing to finish here. Take this softer pace with you.",
  memoryTip: "No score. No catching up.", difficulty: "gentle", durationSeconds: 12, seconds: 12, visual: "moon", actionLabel: "A little more settled",
};
