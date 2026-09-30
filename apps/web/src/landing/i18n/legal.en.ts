import { APPLE_EULA, APPLE_REFUNDS, APPLE_SUBSCRIPTIONS, OWNER, SUPPORT_EMAIL } from "../config";
import type { LegalCopy, SupportCopy } from "./legal-types";

/**
 * Every statement here describes what Goomi actually does. It mirrors the code paths behind it
 * (analytics, billing, study AI, Screen Time, account deletion). When the app changes, change this and
 * the Spanish and Portuguese versions (legal.es.ts, legal.pt.ts) together, then bump LEGAL_UPDATED.
 */
export const enLegal: LegalCopy = {
  ui: {
    lang: "en",
    languageName: "English",
    updated: "Last updated",
    onThisPage: "On this page",
    contact: "Questions? Write to",
    otherLanguages: "Also available in",
  },
  privacy: {
    eyebrow: "Privacy policy",
    title: "Your learning stays yours.",
    lead: "Goomi is built to keep what you learn, and how you use your phone, on your phone. Here is exactly what that means.",
    pose: "read",
    metaTitle: "Privacy policy",
    metaDescription:
      "What Goomi keeps on your iPhone, what reaches its server, who else handles it, and your rights: Screen Time on-device, opt-in analytics, optional AI study and account deletion.",
    sections: [
      {
        id: "short",
        heading: "The short version",
        bullets: [
          "No ads. We don't sell your personal information or share it for advertising, and we don't track you across other companies' apps or websites.",
          "Which apps you use, and for how long, never leaves your iPhone.",
          "You can use Goomi without an account. Analytics is off until you turn it on.",
          "Your notes only leave your phone if you choose AI study for them, and you can delete them, or your whole account, from the app.",
        ],
      },
      {
        id: "who",
        heading: "Who is responsible for your data",
        body: [
          `Goomi is made and run by ${OWNER.name}, an independent developer based in ${OWNER.country}. He decides how the personal data described here is used, which makes him its controller under the privacy laws that apply to you. In this policy, “we” and “us” mean him.`,
          `For anything about your data, write to ${SUPPORT_EMAIL}. The same address is the contact channel for requests under Brazil's LGPD. If Goomi moves to a company, this page will name it, and your data will stay protected by this policy.`,
        ],
      },
      {
        id: "on-device",
        heading: "What stays on your iPhone",
        body: [
          "Your progress, answers, interests, goals and settings are saved on your device in Goomi's local storage. Goomi doesn't send them to its server, and they don't sync between devices.",
        ],
      },
      {
        id: "screen-time",
        heading: "Screen Time",
        body: [
          "Goomi uses Apple's Screen Time API (Family Controls, Managed Settings and Device Activity). When you choose apps, Apple's picker hands Goomi private tokens instead of app names. Those tokens stay on your iPhone, shared only between Goomi and its Screen Time extensions.",
          "Goomi can see how many apps, categories and websites you picked, never which ones. It doesn't read your Screen Time history. You can turn off Goomi's Screen Time access in iOS Settings at any time.",
        ],
      },
      {
        id: "account",
        heading: "Your account (optional)",
        body: [
          "Signing in is optional. If you continue with Apple or Google, Goomi's server stores your account: a user ID, and your name and email as the provider shares them. It exists so your Goomi Plus subscription can follow you to a new phone. Apple's “Hide My Email” is respected.",
          "You can delete your account in the app under Settings → Account → Delete account. That deletes your account and everything Goomi's server keeps for it, including your study materials and usage counters.",
        ],
      },
      {
        id: "study",
        heading: "Your study materials",
        body: [
          "Text you paste and the PDFs, slides and photos you add are first read on your iPhone, with Apple's PDFKit and on-device Vision text recognition. Photos are used only to read the text on them: Goomi doesn't recognize faces or collect biometric data.",
          "If you choose to keep a material on your phone, the extracted text and the concepts Goomi finds are saved with the rest of your learning data on your iPhone, and nothing is uploaded.",
          "Please don't add health records, other people's personal details or anything else sensitive to a material you send to AI study. Goomi doesn't need it to make questions.",
        ],
      },
      {
        id: "ai",
        heading: "AI study, only when you choose it",
        body: [
          "AI study is part of Goomi Plus. When you choose it for a material, Goomi sends that material's text to its server, plus images of any pages it couldn't read on your phone. Nothing is sent unless you agree on that screen, each time.",
        ],
        bullets: [
          "The text is processed by AI models from Alibaba Cloud (Qwen) and Google (Gemini) through Vercel AI Gateway, routed only to providers with zero-data-retention agreements: they don't store it or use it to train models.",
          "Page images are read once and never stored.",
          "Goomi's database (Neon, in the United States) stores the text, the passages it's split into and the questions made from them, so each question can show what your notes say. Once ready, the questions are also saved on your iPhone and work offline.",
          "Removing the material in Goomi deletes all of it from the server. Deleting your account deletes all your materials.",
          "Goomi records how much AI processing each account uses, to keep monthly limits fair. Your notes aren't used for anything else, and they're never used to train AI models.",
        ],
      },
      {
        id: "challenges",
        heading: "New challenges",
        body: [
          "Goomi downloads new challenges in the background, built from open collections such as Wikidata and the Art Institute of Chicago. Each challenge shows its source.",
          "To keep daily limits fair, Goomi sends a random ID created for this install, not linked to you. When you're signed in, it uses your account instead. Your answers and progress are never sent.",
        ],
      },
      {
        id: "purchases",
        heading: "Purchases",
        body: [
          "Subscriptions are sold and processed by Apple. We never see your card or payment details. Goomi uses RevenueCat to check whether Goomi Plus is active. RevenueCat receives your purchase information and an anonymous app ID (your Goomi account ID instead, if you're signed in), never your learning data.",
        ],
      },
      {
        id: "analytics",
        heading: "Analytics, off by default",
        body: [
          "Analytics is off unless you turn it on in Settings → Privacy. When it's on, Goomi sends a short, fixed list of product events to PostHog, such as “a challenge was completed” or “the mode changed”.",
        ],
        bullets: [
          "Events never include your answers, notes, document names, goals or anything you type.",
          "No person profile is created, and location lookup from your IP address is turned off.",
          "Turning analytics off stops collection and clears events that haven't been sent yet.",
        ],
      },
      {
        id: "reminders",
        heading: "Reminders",
        body: ["The daily reminder is scheduled on your iPhone as a local notification. No push server is involved."],
      },
      {
        id: "server",
        heading: "Goomi's server and this website",
        body: [
          "Goomi's server and goomi.app run on Vercel. Like any web service, it receives standard request data such as your IP address, device type and the time of the request. We use it to deliver the service, stop abuse and fix errors, and it's kept for a short time.",
          "The pages of goomi.app don't use cookies, analytics or trackers.",
        ],
      },
      {
        id: "legal-bases",
        heading: "Why we're allowed to use your data",
        body: ["Privacy laws such as Brazil's LGPD and Europe's GDPR ask us to name a legal basis for each use:"],
        bullets: [
          "To run your account, AI study and Goomi Plus: because you asked for them (performance of a contract).",
          "To send a material to AI study and to collect analytics: your consent, which you can withdraw at any time. Withdrawing it doesn't affect what was done before.",
          "To apply fair-use limits, keep the service secure and prevent abuse: our legitimate interest in keeping Goomi working for everyone.",
          "To keep purchase and accounting records, and to answer lawful requests from authorities: legal obligations.",
        ],
      },
      {
        id: "sharing",
        heading: "Who else handles your data",
        body: [
          "We share personal data only with the service providers that make Goomi work, only for the purposes above, and under their data processing terms:",
        ],
        bullets: [
          "Apple: Sign in with Apple, purchases and Screen Time.",
          "Google: Sign in with Google, and Gemini models for AI study.",
          "Alibaba Cloud: Qwen models for AI study.",
          "Vercel: hosting for Goomi's server and website, and the AI Gateway.",
          "Neon: Goomi's database.",
          "RevenueCat: subscription status.",
          "PostHog: product analytics, only if you turn it on.",
        ],
      },
      {
        id: "sharing-other",
        heading: "When else we might disclose it",
        body: [
          "We may disclose data if a valid legal order requires it, or to protect the safety of users or the public. If Goomi is transferred to a company we control, or to a new owner, your data goes with it and stays covered by this policy, and we'll tell you in advance.",
        ],
      },
      {
        id: "transfers",
        heading: "Data processed in other countries",
        body: [
          "Goomi's server, database and most of its providers are in the United States, so your data may be processed outside the country where you live. We rely on the data processing agreements these providers offer, which include standard contractual clauses where the law calls for them. For AI study, the consent screen also tells you your text will be processed abroad.",
        ],
      },
      {
        id: "retention",
        heading: "How long we keep it",
        bullets: [
          "Your account: until you delete it.",
          "Study materials and the questions made from them: until you remove them or delete your account.",
          "Usage counters for your account: deleted with your account. Counters for a random install ID hold only numbers per day or month and aren't linked to you.",
          "Records of AI processing costs: kept for accounting, but detached from your account when you delete it.",
          "Server logs: a short time, for security and debugging.",
          "Backups: deleted data can remain in our database provider's backups until they roll over, and is never restored into Goomi.",
        ],
      },
      {
        id: "security",
        heading: "Security",
        body: [
          "Data travels encrypted between the app and the server. The database is locked to Goomi's server, and your session is stored in the iPhone's secure storage. No system is perfectly secure, but if a breach puts your data at risk, we'll tell you and the relevant authorities as the law requires.",
        ],
      },
      {
        id: "children",
        heading: "Age",
        body: [
          "Goomi is for people aged 13 and older. If you're under the age of majority where you live, use Goomi with a parent's or guardian's permission. Children under 13 must not create an account.",
          `We don't knowingly collect personal data from children under 13. If you believe a child has created an account, write to ${SUPPORT_EMAIL} and we'll delete it.`,
        ],
      },
      {
        id: "rights",
        heading: "Your rights",
        body: [
          `Wherever you live, you can ask us for a copy of what Goomi's server keeps about you, ask us to correct or delete it, get it in a portable format, and withdraw any consent you gave. Write to ${SUPPORT_EMAIL} from the email linked to your account. We answer access requests within 10 days and correction or deletion requests within 5 business days, and we may ask you to confirm it's you. We won't treat you differently for using these rights.`,
        ],
        bullets: [
          "Brazil (LGPD): you also have the rights in article 18, including confirmation that we process your data, anonymization or blocking of unnecessary data, information about who we share it with, and review of automated decisions. You can complain to the ANPD (Autoridade Nacional de Proteção de Dados).",
          "Argentina (Law 25,326): you can access your data free of charge at intervals of at least six months, unless you show a legitimate interest to do so sooner (article 14, section 3). The Agencia de Acceso a la Información Pública, as the authority that enforces Law 25,326, handles complaints from anyone whose data protection rights have been breached.",
          "Rest of Latin America: you have the rights your local data protection law gives you, and you can complain to its authority.",
          "United States: we don't sell or share personal information as US state privacy laws define it, and we don't use it for targeted advertising or profiling. If we turn down a request, you can appeal by replying to our answer, and we'll explain the outcome.",
          "European Union, United Kingdom and Switzerland: you also have the right to object to processing based on legitimate interest, and to complain to your data protection authority.",
        ],
      },
      {
        id: "choices",
        heading: "Your choices in the app",
        bullets: [
          "Turn analytics on or off in Settings → Privacy.",
          "Turn off Screen Time access for Goomi in iOS Settings at any time.",
          "Remove any study material in Goomi to delete it from the server.",
          "Delete your account in Settings → Account.",
          "Reset Goomi on this phone in Settings to remove everything saved on your device. Deleting the app does the same.",
        ],
        links: [{ label: "How to delete your account", href: "/delete-account" }],
      },
      {
        id: "changes",
        heading: "Changes to this policy",
        body: [
          "If what Goomi does with your data changes, this page changes first, with a new date at the top. If the change is significant, we'll also tell you in the app before it takes effect, and ask for your consent again where the law requires it.",
        ],
      },
    ],
  },
  terms: {
    eyebrow: "Terms of use",
    title: "The rules, in plain words.",
    lead: "The agreement between you and Goomi. We kept it as short as we could, but please read it: it covers your subscription, your material and what happens if something goes wrong.",
    notice:
      "If you live in the United States, section “Disputes in the United States” requires you to resolve disputes with us through individual arbitration and waives class actions and jury trials, unless you opt out within 30 days. If you live anywhere else, your local consumer law decides where and how disputes are heard.",
    pose: "think",
    metaTitle: "Terms of use",
    metaDescription:
      "The agreement for using Goomi and Goomi Plus: who can use it, subscriptions and refunds, your study material, AI-made questions, liability and how disputes are resolved.",
    sections: [
      {
        id: "agreement",
        heading: "Who we are and this agreement",
        body: [
          `Goomi is made and run by ${OWNER.name}, an independent developer based in ${OWNER.country} (“we” or “us”). These terms are the agreement between you and us for using the Goomi app, Goomi Plus and goomi.app.`,
          "You accept them when you tap a button that says you agree, when you subscribe, or when you keep using Goomi after reading them. If you don't agree, please don't use Goomi. The privacy policy explains how we handle your data and is part of this agreement.",
        ],
        links: [{ label: "Privacy policy", href: "/privacy" }],
      },
      {
        id: "age",
        heading: "Who can use Goomi",
        body: [
          "You must be at least 13 years old. If you're under the age of majority where you live, you need a parent's or guardian's permission, and they accept these terms for you. Children under 13 must not create an account.",
        ],
      },
      {
        id: "using",
        heading: "What Goomi is, and what it isn't",
        body: [
          "Goomi turns the moments you reach for certain apps into short learning challenges. App moments rely on Apple's Screen Time, which you can switch off at any time. They're a friendly nudge, not a lock: they can be bypassed, iOS decides their exact timing, and they may stop working if Apple changes Screen Time.",
          "Goomi isn't a parental control, a medical or mental health treatment, or a guarantee that you'll use your phone less or get better grades. Results depend on you.",
        ],
      },
      {
        id: "account",
        heading: "Your account",
        body: [
          "You can use Goomi without an account. If you sign in with Apple or Google, keep that account secure: what happens under your Goomi account is your responsibility. You can delete your account in the app at any time.",
        ],
      },
      {
        id: "plus",
        heading: "Goomi Plus",
        bullets: [
          "Goomi Plus is an auto-renewing subscription sold by Apple through the App Store. Apple charges your Apple ID when you confirm the purchase.",
          "It renews automatically at the same price and length unless you cancel at least 24 hours before the end of the current period. Renewal is charged within the 24 hours before the period ends.",
          "Prices and plan lengths shown in the app come from the App Store, in your local currency, including any taxes Apple applies. If we change the price, Apple tells you first and, where the law requires it, asks for your consent before charging the new price.",
          "A free trial, when offered, depends on your App Store eligibility. If you don't cancel before it ends, the paid subscription starts. If you subscribe during a trial, the unused part of it ends.",
          "You can cancel in your App Store account settings. You keep Goomi Plus until the end of the period you paid for. Deleting the app or your Goomi account doesn't cancel the subscription.",
          "Plan features and limits, such as how many materials you can add each month, are shown in the app and may change. If a change takes away something you've paid for, it applies from your next renewal.",
        ],
        links: [{ label: "Manage subscriptions", href: APPLE_SUBSCRIPTIONS }],
      },
      {
        id: "refunds",
        heading: "Refunds and your right to withdraw",
        body: [
          "Because Apple sells the subscription, refunds are requested from Apple and decided under its policies. We can't issue them ourselves, but we'll help if you write to us.",
          "Your consumer law may give you a right to withdraw from an online purchase without giving a reason: 7 days in Brazil, 10 days in Argentina, 14 days in the European Union. You can use it by requesting a refund from Apple within that time, or by writing to us and we'll help you through it. Nothing in these terms limits that right.",
        ],
        links: [{ label: "Request a refund from Apple", href: APPLE_REFUNDS }],
      },
      {
        id: "restore",
        heading: "Restoring a purchase",
        body: ["Reinstalled Goomi or moved to a new iPhone with the same Apple ID? Use Restore purchases in Settings → Subscription."],
      },
      {
        id: "your-material",
        heading: "Your material",
        body: [
          "Notes, PDFs, slides and photos you add stay yours. When you choose AI study, you give us permission to copy, process and store that material only to make your study questions and show them to you, as the privacy policy describes. That permission ends when you remove the material or delete your account.",
          "Only add material you have the right to use, such as your own notes or course material you're allowed to study from. Don't add anything illegal or anything that infringes someone else's rights.",
        ],
      },
      {
        id: "content",
        heading: "Challenges and AI-made questions",
        body: [
          "Challenges are built from open collections such as Wikidata and the Art Institute of Chicago, and each one shows its source. Study questions are made by AI from the material you add. AI can get things wrong or leave things out, so check anything important against your own material and your teachers.",
          "Nothing in Goomi is professional, medical, legal or academic advice.",
        ],
      },
      {
        id: "rules",
        heading: "Fair use",
        body: ["Please use Goomi for your own learning and within the law. Don't:"],
        bullets: [
          "Try to disrupt Goomi's service, overload it, or get around its limits or its paywall.",
          "Access other people's accounts or data.",
          "Copy, resell or scrape Goomi's content or questions, or use them to train AI models.",
          "Reverse engineer the app, except where the law allows it.",
        ],
      },
      {
        id: "ours",
        heading: "What belongs to us",
        body: [
          "Goomi's name, mascot, design, code and original content belong to us. We give you a personal, non-transferable license to use the app on devices you own or control, under these terms and Apple's rules. Content from open collections keeps its own license. If you send us ideas or feedback, we may use them without owing you anything.",
        ],
      },
      {
        id: "third-party",
        heading: "Services from other companies",
        body: [
          "Goomi relies on Apple (App Store, Screen Time, Sign in with Apple), Google (Sign in with Google) and the providers listed in the privacy policy. Their own terms apply to how you use them, and we aren't responsible for their outages or decisions.",
        ],
      },
      {
        id: "changes",
        heading: "Changes and ending",
        body: [
          "We keep improving Goomi, so features can change or be removed. If we change these terms in a way that matters, we'll update this page with a new date and tell you in the app before the change takes effect. If you don't agree with the new terms, you can stop using Goomi and cancel your subscription.",
          "You can stop using Goomi at any time. We may suspend or close access for someone who seriously or repeatedly breaks these terms, and we'll tell you why unless the law or safety prevents it. If we ever shut Goomi down, we'll give you notice in the app, and your data will be deleted as the privacy policy describes.",
        ],
      },
      {
        id: "warranty",
        heading: "No guarantees",
        body: [
          "We work hard to keep Goomi available, accurate and secure, but we provide it “as is” and “as available”. To the extent the law allows, we don't promise that it will always work without interruption or errors, or that it will meet every need you have.",
        ],
      },
      {
        id: "liability",
        heading: "Limits on liability",
        body: [
          "To the extent the law allows, we aren't liable for indirect, incidental or consequential losses, such as lost data, lost opportunities or exam results, and our total liability for any claim related to Goomi is limited to the greater of what you paid for Goomi Plus in the 12 months before the claim or USD 50.",
          "None of this limits liability for fraud, for harm we cause intentionally or through gross negligence, or any right you have under consumer protection law that can't be waived by contract. If you're a consumer in Brazil, Argentina, the European Union or another place whose law doesn't allow some of these limits, they apply to you only as far as that law permits.",
        ],
      },
      {
        id: "disputes",
        heading: "If something goes wrong",
        body: [
          `Most problems can be solved with a message. Before starting any legal claim, write to ${SUPPORT_EMAIL} with your name, the email linked to your account (if you have one) and what you'd like us to do. We'll try to settle it with you within 60 days. This step doesn't stop any legal deadline from running and doesn't replace a consumer protection agency's process if you'd rather go there.`,
        ],
      },
      {
        id: "disputes-us",
        heading: "Disputes in the United States",
        body: [
          "This section applies only if you live in the United States. Please read it carefully: it affects your rights.",
          "Arbitration. If we can't resolve a dispute informally, you and we agree to resolve any dispute related to Goomi or these terms through final, binding arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules. The arbitration can take place online, by phone, or in the county where you live. Fees follow the AAA Consumer Rules, and you won't pay more to file than you would in court. The Federal Arbitration Act governs this section.",
          "Exceptions. Either of us may bring an individual claim in small claims court instead, and either of us may go to court over the misuse of intellectual property.",
          "No class actions. You and we may bring claims only individually, not as a plaintiff or class member in any class, collective, consolidated or representative proceeding, and the arbitrator can't combine claims of different people. You and we both waive the right to a jury trial.",
          "Mass filings. If 25 or more similar arbitration demands are filed by or with the help of the same lawyers or organizations, they will be administered in batches under the AAA's Mass Arbitration Supplementary Rules, and the statute of limitations is paused for demands waiting in a batch.",
          `Opting out. You can opt out of this arbitration agreement by emailing ${SUPPORT_EMAIL} within 30 days of first accepting these terms, with your name and the subject “Arbitration opt-out”. Opting out doesn't affect anything else in these terms.`,
          "If the class action waiver is found unenforceable for a claim, that claim goes to court and this arbitration agreement doesn't apply to it. Any claim for public injunctive relief that can't be waived is decided in court after the individual arbitration ends.",
        ],
      },
      {
        id: "disputes-elsewhere",
        heading: "Disputes elsewhere, and the law that applies",
        bullets: [
          "Brazil: these terms follow the Consumer Defense Code (Law 8,078/1990). You may take any claim to the courts of your domicile or to Procon, and no arbitration is imposed on you.",
          "Argentina: these terms follow Law 24,240 on consumer protection. You may take any claim to the courts of your domicile or to the consumer protection authorities.",
          "Rest of Latin America, the European Union and the United Kingdom: you keep the protections of the law where you live and can bring claims before its courts and consumer authorities.",
          `Everywhere else, and wherever your local law allows the choice: these terms are governed by the laws of the Argentine Republic, and the ordinary courts of ${OWNER.venue} have jurisdiction.`,
        ],
      },
      {
        id: "apple",
        heading: "Terms Apple asks us to include",
        body: [
          "These terms are between you and us, not Apple. Apple isn't responsible for Goomi or its content, and has no obligation to provide maintenance or support for it. If Goomi fails to meet a warranty that applies to it, you may tell Apple and Apple will refund what you paid for it; to the extent the law allows, Apple has no other warranty obligation for Goomi.",
          "We, not Apple, are responsible for handling claims about Goomi, including product liability claims, claims that Goomi doesn't meet a legal or regulatory requirement, consumer protection and privacy claims, and claims that Goomi infringes someone's intellectual property. You confirm that you're not in a country subject to a US Government embargo or on a US Government list of prohibited or restricted parties.",
          "Apple and its subsidiaries are third-party beneficiaries of these terms and may enforce them against you. Apple's standard Licensed Application End User License Agreement also applies to your use of Goomi. If it conflicts with these terms, these terms prevail where the law allows.",
        ],
        links: [{ label: "Apple's standard EULA", href: APPLE_EULA }],
      },
      {
        id: "general",
        heading: "The rest",
        body: [
          "If a court finds part of these terms invalid, the rest still applies. If we don't enforce a part right away, we haven't waived it. You can't transfer these terms to someone else. We may transfer them to a company we control, for example one we form to run Goomi, or to a new owner of Goomi, and your rights under them stay the same.",
          "These terms are available in English, Spanish and Portuguese. If you live in Brazil, the Portuguese version prevails; if you live in a Spanish-speaking country, the Spanish version prevails.",
        ],
      },
    ],
  },
  deleteAccount: {
    eyebrow: "Delete your account",
    title: "Leaving is one tap away.",
    lead: "How to delete your Goomi account and data, what gets deleted, and what we keep.",
    pose: "wave",
    metaTitle: "Delete your Goomi account",
    metaDescription: "How to delete your Goomi account from the app or by email, what data is deleted, what is kept and for how long.",
    sections: [
      {
        id: "in-app",
        heading: "Delete it in the app",
        bullets: [
          "Open Goomi and go to Settings.",
          "Under Account, tap Delete account.",
          "Confirm. If you signed in a while ago, Apple or Google asks you to confirm it's you. Deletion happens right away.",
        ],
      },
      {
        id: "by-email",
        heading: "No longer have the app?",
        body: [
          `Write to ${SUPPORT_EMAIL} from the email linked to your Goomi account, with the subject “Delete my account”. If you used Apple's Hide My Email, write from the Apple ID email and tell us, so we can find your account. We may ask you to confirm it's you, and we'll delete the account within 5 business days.`,
        ],
      },
      {
        id: "deleted",
        heading: "What gets deleted",
        bullets: [
          "Your account: user ID, name and email, and its sign-in links to Apple or Google.",
          "Every study material on the server: its text, passages, concepts and questions.",
          "Your usage counters and your Goomi Plus status on our server.",
        ],
      },
      {
        id: "kept",
        heading: "What we keep",
        bullets: [
          "Records of AI processing costs, detached from you, for accounting.",
          "Deleted data can remain in our database provider's backups until they roll over, and is never restored into Goomi.",
          "Apple and RevenueCat keep their own records of your purchases, under their own policies.",
        ],
      },
      {
        id: "phone",
        heading: "Data on your iPhone",
        body: [
          "Your progress and settings live on your phone, not on our server. To remove them, use Settings → Reset Goomi on this phone, or delete the app.",
        ],
      },
      {
        id: "subscription",
        heading: "Your subscription",
        body: [
          "Deleting your account doesn't cancel Goomi Plus. Cancel it in your App Store account settings so you're not charged again.",
        ],
        links: [{ label: "Manage subscriptions", href: APPLE_SUBSCRIPTIONS }],
      },
    ],
  },
};

export const enSupport: SupportCopy = {
  eyebrow: "Support",
  title: "Little answers to good questions.",
  lead: "How Goomi moments, unlocks and purchases work, and how to reach a human.",
  pose: "wave",
  metaTitle: "Support",
  metaDescription: "Help with Goomi: how app moments and unlocks work, Screen Time, restoring purchases, reminders, and how to contact support.",
  contactTitle: "Still stuck?",
  contactBody: "Write to us and a real person will get back to you. Tell us your iPhone model and iOS version if something isn't working.",
  contactCta: "Email support",
  sections: [
    {
      id: "moments",
      heading: "How Goomi moments work",
      body: [
        "You pick apps with Apple's picker and turn on Goomi moments. When you open one of those apps, iOS shows Goomi's shield. Answer a short challenge in Goomi, then head back to your app.",
        "On iOS 26.5 and later, the button on the shield opens Goomi for you. On earlier versions, open Goomi yourself and your challenge will be waiting.",
      ],
    },
    {
      id: "minutes",
      heading: "What “minutes between moments” means",
      body: [
        "After a challenge, your selected apps open for a usage budget of 3, 5 or 10 minutes. That's minutes of actual use, added up across all your selected apps, not minutes on the clock. When it's used up, the shield comes back.",
        "There's also a safety window. If you stop using those apps, they re-lock when the window ends anyway: three times your budget, never shorter than 15 minutes and never longer than 90. iOS decides the exact timing, so it can drift a little.",
      ],
    },
    {
      id: "screen-time-off",
      heading: "If Screen Time was turned off",
      body: [
        "If Screen Time access for Goomi is switched off, moments pause. Open Screen Time in Goomi and tap Reconnect. If iOS doesn't ask again, allow access for Goomi in iOS Settings, then come back.",
      ],
    },
    {
      id: "requirements",
      heading: "What you need",
      body: ["App moments need a physical iPhone on iOS 17.4 or later. Challenges, study and progress work everywhere Goomi runs."],
    },
    {
      id: "restore",
      heading: "Restoring purchases",
      body: [
        "Subscribed before? In Settings, under Subscription, tap Restore purchases. Goomi asks the App Store for an active Goomi Plus on your Apple ID and tells you what it found.",
      ],
    },
    {
      id: "cancel",
      heading: "Managing, cancelling or getting a refund",
      body: [
        "Subscriptions live with your Apple ID. Manage or cancel yours in your App Store account settings, at least 24 hours before the current period ends. Refunds are requested from Apple.",
      ],
      links: [
        { label: "Manage subscriptions", href: APPLE_SUBSCRIPTIONS },
        { label: "Request a refund", href: APPLE_REFUNDS },
      ],
    },
    {
      id: "reminders",
      heading: "Reminders not showing up?",
      body: [
        "The daily reminder needs notifications allowed for Goomi in iOS Settings. Turn the reminder off and on again in Goomi's Settings to reschedule it.",
      ],
    },
    {
      id: "delete",
      heading: "Deleting your data",
      body: [
        "Signed in? Delete your account in Settings → Account → Delete account. It removes your account and everything Goomi's server keeps for it. It doesn't cancel an App Store subscription.",
        "To clear what's saved on your iPhone, use Reset Goomi on this phone in Settings, or delete the app.",
      ],
      links: [
        { label: "Delete your account", href: "/delete-account" },
        { label: "Privacy policy", href: "/privacy" },
      ],
    },
  ],
};
