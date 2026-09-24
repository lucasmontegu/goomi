export const LANGS = ["en", "es", "pt-BR"] as const;
export type Lang = (typeof LANGS)[number];
/** Labels keyed by language; English is always present, others only when the source has them. */
export type Labels = { en: string } & Partial<Record<Exclude<Lang, "en">, string>>;

export const label = (labels: Labels, lang: Lang): string | undefined => labels[lang]?.trim() || undefined;

/** Replaces {name} placeholders; throws on a missing value so a half-filled prompt never ships. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    if (value === undefined) throw new Error(`Missing template value: ${key}`);
    return String(value);
  });
}

type Strings = Record<Lang, string>;
/** Every user-facing template string, per language. Keep the placeholders identical across languages. */
export const T = {
  capital: {
    title: { en: "Capital cities", es: "Capitales del mundo", "pt-BR": "Capitais do mundo" },
    prompt: { en: "What is the capital of {country}?", es: "¿Cuál es la capital de {country}?", "pt-BR": "Qual é a capital de {country}?" },
    explanation: { en: "{capital} is the capital of {country}, in {region}.", es: "{capital} es la capital de {country}, en {region}.", "pt-BR": "{capital} é a capital de {country}, em {region}." },
    tip: { en: "Picture {country} on the map of {region}, then pin {capital} on it.", es: "Imagina {country} en el mapa de {region} y clava ahí a {capital}.", "pt-BR": "Imagine {country} no mapa de {region} e marque {capital} nele." },
  },
  capitalMatch: {
    title: { en: "Match the capitals", es: "Une las capitales", "pt-BR": "Ligue as capitais" },
    prompt: { en: "Match each country in {region} with its capital.", es: "Une cada país de {region} con su capital.", "pt-BR": "Ligue cada país de {region} à sua capital." },
    explanation: { en: "{pairs}.", es: "{pairs}.", "pt-BR": "{pairs}." },
    tip: { en: "Say each pair out loud once: country, then capital.", es: "Di cada par en voz alta una vez: país y luego capital.", "pt-BR": "Diga cada par em voz alta uma vez: país e depois capital." },
  },
  flag: {
    title: { en: "Flags of the world", es: "Banderas del mundo", "pt-BR": "Bandeiras do mundo" },
    prompt: { en: "Which country does this flag belong to?", es: "¿De qué país es esta bandera?", "pt-BR": "De qual país é esta bandeira?" },
    alt: { en: "A national flag", es: "Una bandera nacional", "pt-BR": "Uma bandeira nacional" },
    explanation: { en: "This is the flag of {country}, in {region}.", es: "Esta es la bandera de {country}, en {region}.", "pt-BR": "Esta é a bandeira de {country}, em {region}." },
    tip: { en: "Link one detail of the flag to {country} — a colour, a symbol or a stripe.", es: "Asocia un detalle de la bandera con {country}: un color, un símbolo o una franja.", "pt-BR": "Associe um detalhe da bandeira a {country}: uma cor, um símbolo ou uma faixa." },
  },
  area: {
    title: { en: "Bigger on the map", es: "Más grande en el mapa", "pt-BR": "Maior no mapa" },
    prompt: { en: "Which of these countries in {region} is the largest by area?", es: "¿Cuál de estos países de {region} es el más grande por superficie?", "pt-BR": "Qual destes países de {region} é o maior em área?" },
    explanation: { en: "{country} covers about {area} km², the largest of these four.", es: "{country} ocupa unos {area} km², el mayor de estos cuatro.", "pt-BR": "{country} ocupa cerca de {area} km², o maior destes quatro." },
    tip: { en: "Rank them in your head from smallest to largest; {country} tops the list.", es: "Ordénalos mentalmente de menor a mayor; {country} encabeza la lista.", "pt-BR": "Ordene-os mentalmente do menor ao maior; {country} lidera a lista." },
  },
  artist: {
    title: { en: "A closer look", es: "Mira de cerca", "pt-BR": "Olhe de perto" },
    prompt: { en: "Who made “{title}”?", es: "¿Quién creó «{title}»?", "pt-BR": "Quem criou “{title}”?" },
    explanation: { en: "“{title}” ({date}) is by {artist}. It is in the collection of the {museum}.", es: "«{title}» ({date}) es obra de {artist}. Forma parte de la colección del {museum}.", "pt-BR": "“{title}” ({date}) é de {artist}. Faz parte do acervo do {museum}." },
    tip: { en: "Connect one thing you see here with the name {artist}.", es: "Conecta algo que veas aquí con el nombre {artist}.", "pt-BR": "Ligue algo que você vê aqui ao nome {artist}." },
  },
  century: {
    title: { en: "When was it made?", es: "¿Cuándo se hizo?", "pt-BR": "Quando foi feito?" },
    prompt: { en: "In which century was “{title}” by {artist} made?", es: "¿En qué siglo se creó «{title}» de {artist}?", "pt-BR": "Em que século foi criado “{title}”, de {artist}?" },
    explanation: { en: "“{title}” is dated {date}.", es: "«{title}» está fechada en {date}.", "pt-BR": "“{title}” é datada de {date}." },
    tip: { en: "Anchor {artist} to the {century} with one other thing from that time.", es: "Ancla a {artist} en el {century} con otra cosa de esa época.", "pt-BR": "Ancore {artist} no {century} com outra coisa dessa época." },
  },
  elementSymbol: {
    title: { en: "Elements", es: "Elementos", "pt-BR": "Elementos" },
    prompt: { en: "Which element has the symbol {symbol}?", es: "¿Qué elemento tiene el símbolo {symbol}?", "pt-BR": "Qual elemento tem o símbolo {symbol}?" },
    explanation: { en: "{symbol} is {element}, atomic number {number}.", es: "{symbol} es {element}, número atómico {number}.", "pt-BR": "{symbol} é {element}, número atômico {number}." },
    tip: { en: "Say “{symbol} — {element}” and picture it on the periodic table at number {number}.", es: "Di «{symbol}: {element}» e imagínalo en la tabla periódica en el número {number}.", "pt-BR": "Diga “{symbol}: {element}” e imagine-o na tabela periódica no número {number}." },
  },
  elementMatch: {
    title: { en: "Symbols and elements", es: "Símbolos y elementos", "pt-BR": "Símbolos e elementos" },
    prompt: { en: "Match each element with its symbol.", es: "Une cada elemento con su símbolo.", "pt-BR": "Ligue cada elemento ao seu símbolo." },
    explanation: { en: "{pairs}.", es: "{pairs}.", "pt-BR": "{pairs}." },
    tip: { en: "Symbols that don't match the name often come from Latin — look for those first.", es: "Los símbolos que no coinciden con el nombre suelen venir del latín: búscalos primero.", "pt-BR": "Símbolos que não batem com o nome costumam vir do latim: procure-os primeiro." },
  },
  timeline: {
    title: { en: "Time travelers", es: "Viajeros del tiempo", "pt-BR": "Viajantes do tempo" },
    prompt: { en: "When were these invented or discovered? Put them in order, earliest first.", es: "¿Cuándo se inventaron o descubrieron? Ordénalos del más antiguo al más reciente.", "pt-BR": "Quando foram inventados ou descobertos? Coloque em ordem, do mais antigo ao mais recente." },
    explanation: { en: "{timeline}.", es: "{timeline}.", "pt-BR": "{timeline}." },
    tip: { en: "Hang each one on a century you already know well.", es: "Cuelga cada uno de un siglo que ya conozcas bien.", "pt-BR": "Pendure cada um em um século que você já conhece bem." },
  },
  inventor: {
    title: { en: "Who came up with it?", es: "¿A quién se le ocurrió?", "pt-BR": "Quem inventou?" },
    prompt: { en: "{thing}: who is credited with it?", es: "{thing}: ¿a quién se le atribuye?", "pt-BR": "{thing}: a quem é atribuído?" },
    explanation: { en: "{thing}: credited to {person} ({year}).", es: "{thing}: se atribuye a {person} ({year}).", "pt-BR": "{thing}: atribuído a {person} ({year})." },
    tip: { en: "Picture {person} in {year}, working on it.", es: "Imagina a {person} en {year}, trabajando en ello.", "pt-BR": "Imagine {person} em {year}, trabalhando nisso." },
  },
  translation: {
    title: { en: "Little conversations", es: "Pequeñas conversaciones", "pt-BR": "Pequenas conversas" },
    prompt: { en: "What does “{sentence}” mean?", es: "¿Qué significa «{sentence}»?", "pt-BR": "O que significa “{sentence}”?" },
    explanation: { en: "“{sentence}” means “{meaning}”.", es: "«{sentence}» significa «{meaning}».", "pt-BR": "“{sentence}” significa “{meaning}”." },
    tip: { en: "Say the sentence out loud once, then its meaning.", es: "Di la frase en voz alta una vez y luego su significado.", "pt-BR": "Diga a frase em voz alta uma vez e depois o significado." },
  },
} satisfies Record<string, Record<string, Strings>>;

export const CENTURY: Record<Lang, (century: number) => string> = {
  en: (c) => `${c}${c % 10 === 1 && c !== 11 ? "st" : c % 10 === 2 && c !== 12 ? "nd" : c % 10 === 3 && c !== 13 ? "rd" : "th"} century`,
  es: (c) => `siglo ${toRoman(c)}`,
  "pt-BR": (c) => `século ${toRoman(c)}`,
};

export function toRoman(value: number): string {
  const numerals: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let rest = value;
  let out = "";
  for (const [amount, numeral] of numerals) while (rest >= amount) { out += numeral; rest -= amount; }
  return out;
}

export const listJoin: Record<Lang, string> = { en: " · ", es: " · ", "pt-BR": " · " };
export const numberFormat = (lang: Lang, value: number) => new Intl.NumberFormat(lang, { maximumFractionDigits: 0 }).format(value);

export const capitalize = (value: string) => value.charAt(0).toLocaleUpperCase() + value.slice(1);
