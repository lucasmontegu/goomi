export type Pose = "wave" | "read" | "globe" | "sleep" | "celebrate" | "think";
export type ModeId = "free" | "study" | "work" | "sleep";

export type ChallengeItem = {
  kind: string;
  question: string;
  choices: string[];
  /** Index into `choices`. */
  answer: number;
  explain: string;
};

export type ChallengeCopy = {
  before: string;
  unlocks: string;
  progress: string;
  of: string;
  correct: string;
  wrong: string;
  answerIs: string;
  memory: string;
  later: string;
  next: string;
  back: string;
  backDone: string;
  items: ChallengeItem[];
};

export type PhoneCopy = {
  pickTitle: string;
  pickHint: string;
  pickDone: string;
  categories: string[];
  shieldTitle: string;
  shieldBody: string;
  shieldCta: string;
  challengeKind: string;
  challengeQuestion: string;
  challengeChoices: string[];
  challengeCorrect: string;
  challengeExplain: string;
  challengeUnlock: string;
  unlocked: string;
  backNote: string;
};

export type ModesCopy = { eyebrow: string; title: string; lead: string; tablist: string; examples: string; items: ModeItem[] };
export type ModeItem = { id: ModeId; label: string; pose: Pose; title: string; body: string; examples: string[] };
export type StudyCard = { subject: string; question: string; answer: string; quote: string };
export type SurpriseType = { label: string; prompt: string; answer: string };

export type StudyCopy = {
  eyebrow: string;
  title: string;
  lead: string;
  sources: string[];
  deckLabel: string;
  flip: string;
  flipBack: string;
  nextCard: string;
  yourNotes: string;
  cards: StudyCard[];
  repetition: { title: string; missed: string; knew: string };
};

export type SurpriseCopy = {
  eyebrow: string;
  title: string;
  lead: string;
  spin: string;
  dragHint: string;
  answer: string;
  types: SurpriseType[];
};

/** Every locale implements this shape; add `es.ts` / `pt.ts` next to `en.ts` and register them in `index.ts`. */
export type LandingCopy = {
  meta: { title: string; description: string; ogAlt: string };
  nav: { home: string; links: { href: string; label: string }[]; skip: string };
  store: { live: { eyebrow: string; label: string }; soon: { eyebrow: string; label: string }; soonShort: string };
  hero: {
    note: string;
    titleStart: string;
    titleAccent: string;
    lead: string;
    tryOne: string;
    forIphone: string;
    sceneLabel: string;
    tilt: string;
  };
  challenge: ChallengeCopy;
  how: { eyebrow: string; title: string; lead: string; steps: { title: string; body: string }[]; phone: PhoneCopy };
  modes: ModesCopy;
  study: StudyCopy;
  surprise: SurpriseCopy;
  privacy: {
    eyebrow: string;
    title: string;
    lead: string;
    tokenCaption: string;
    tokenRows: string[];
    notLooking: string;
    points: { title: string; body: string }[];
    more: string;
  };
  plus: {
    eyebrow: string;
    title: string;
    lead: string;
    benefits: string[];
    trial: string;
    prices: string;
    legal: string;
  };
  faq: { eyebrow: string; title: string; items: { q: string; a: string }[] };
  final: { title: string; accent: string };
  footer: {
    tagline: string;
    product: string;
    legal: string;
    links: Record<"how" | "modes" | "plus" | "faq" | "privacy" | "terms" | "support", string>;
    rights: string;
    apple: string;
  };
  legal: { updated: string; onThisPage: string; contact: string };
};
