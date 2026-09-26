import { APPLE_EULA, APPLE_SUBSCRIPTIONS, SUPPORT_EMAIL } from "../config";
import type { LegalCopy } from "./legal-types";

/**
 * Every statement here describes what Goomi actually does. It mirrors the in-app documents in
 * apps/native/app/legal.tsx and the code paths behind them (analytics, billing, study AI, Screen Time,
 * account deletion). When the app changes, change this too.
 */
export const enLegal: LegalCopy = {
  privacy: {
    eyebrow: "Privacy policy",
    title: "Your learning stays yours.",
    lead: "Goomi is built to keep what you learn, and how you use your phone, on your phone. Here is exactly what that means.",
    pose: "read",
    metaTitle: "Privacy policy",
    metaDescription:
      "What Goomi keeps on your iPhone, what reaches its server, and the choices you have: Screen Time on-device, opt-in analytics, optional AI study and account deletion.",
    sections: [
      {
        id: "on-device",
        heading: "What stays on your iPhone",
        body: [
          "Your progress, answers, interests, goals and settings are saved on your device in Goomi's local storage. Goomi doesn't send them to a Goomi server, and they don't sync between devices.",
        ],
      },
      {
        id: "screen-time",
        heading: "Screen Time",
        body: [
          "Goomi uses Apple's Screen Time API (Family Controls, Managed Settings and Device Activity). When you choose apps, Apple's picker hands Goomi private tokens instead of app names. Those tokens stay on your iPhone, shared only between Goomi and its Screen Time extensions.",
          "Goomi can see how many apps, categories and websites you picked, never which ones. It doesn't read your Screen Time history. Which apps you use, and for how long, never leaves your device. You can turn off Goomi's Screen Time access in iOS Settings at any time.",
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
          "Text you paste and the PDFs, slides and photos you add are first read on your iPhone, with Apple's PDFKit and on-device Vision text recognition.",
          "If you choose to keep a material on your phone, the extracted text and the concepts Goomi finds are saved with the rest of your learning data on your iPhone, and nothing is uploaded.",
        ],
      },
      {
        id: "ai",
        heading: "AI study, only when you choose it",
        body: [
          "AI study is part of Goomi Plus. When you choose it for a material, Goomi sends that material's text to Goomi's server, plus images of any pages it couldn't read on your phone. Nothing is sent unless you agree on that screen, each time.",
        ],
        bullets: [
          "The text is processed by AI models from Alibaba Cloud (Qwen) and Google (Gemini) through Vercel AI Gateway, routed only to providers with zero-data-retention agreements: they don't store it or use it to train models.",
          "Page images are read once and never stored.",
          "Goomi's database (Neon, in the United States) stores the text, the passages it's split into and the questions made from them, so each question can show what your notes say. Once ready, the questions are also saved on your iPhone and work offline.",
          "Removing the material in Goomi deletes all of it from the server. Deleting your account deletes all your materials.",
          "Goomi records how much AI processing each account uses, to keep monthly limits fair. Your notes aren't used for anything else.",
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
          "Subscriptions are processed by Apple. Goomi uses RevenueCat to check whether Goomi Plus is active. RevenueCat receives your purchase information and an anonymous app ID (your Goomi account ID instead, if you're signed in), never your learning data.",
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
        id: "website",
        heading: "This website",
        body: [
          "The pages of goomi.app that describe Goomi don't use cookies, analytics or trackers. Our host, Vercel, processes standard request data such as IP addresses to deliver and protect the site.",
        ],
      },
      {
        id: "children",
        heading: "Everyone, including younger learners",
        body: [
          "Goomi works without an account, and nothing in this policy changes with age. If you believe a child has created an account and you want it removed, write to us and we'll delete it.",
        ],
      },
      {
        id: "choices",
        heading: "Your choices",
        bullets: [
          "Turn analytics on or off in Settings → Privacy.",
          "Turn off Screen Time access for Goomi in iOS Settings at any time.",
          "Remove any study material in Goomi to delete it from the server.",
          "Delete your account in Settings → Account.",
          "Reset Goomi on this phone in Settings to remove everything saved on your device. Deleting the app does the same.",
          `Ask for a copy of what Goomi's server keeps about your account, or for its deletion, at ${SUPPORT_EMAIL}.`,
        ],
      },
      {
        id: "changes",
        heading: "Changes to this policy",
        body: [
          "If what Goomi does with your data changes, this page changes first, with a new date at the top.",
        ],
      },
    ],
  },
  terms: {
    eyebrow: "Terms of use",
    title: "The short, honest version.",
    lead: "How Goomi and Goomi Plus work, without the fine-print maze.",
    pose: "think",
    metaTitle: "Terms of use",
    metaDescription: "How Goomi and the Goomi Plus subscription work: using Goomi, subscriptions, trials, restoring purchases and Apple's standard terms.",
    sections: [
      {
        id: "using",
        heading: "Using Goomi",
        body: [
          "Goomi turns the moments before a scroll into short learning moments. App moments rely on Apple's Screen Time, which you can switch off at any time. They're a friendly nudge, not a lock that can't be bypassed.",
          "Please use Goomi for yourself and within the law. Don't try to disrupt Goomi's service, get around its limits or access other people's data.",
        ],
      },
      {
        id: "content",
        heading: "Challenges and study questions",
        body: [
          "Challenges are built from open collections such as Wikidata and the Art Institute of Chicago, and each one shows its source. Study questions made with AI come from the material you add. We work hard to keep both accurate, but mistakes can happen, so check anything important against your own material.",
          "Goomi is a learning companion. It isn't professional, medical or academic advice.",
        ],
      },
      {
        id: "your-material",
        heading: "Your material",
        body: [
          "Notes, PDFs, slides and photos you add stay yours. By choosing AI study, you let Goomi process that material only to make your study questions, as described in the privacy policy. Only add material you have the right to use.",
        ],
        links: [{ label: "Privacy policy", href: "/privacy" }],
      },
      {
        id: "plus",
        heading: "Goomi Plus subscriptions",
        bullets: [
          "Goomi Plus is an auto-renewing subscription. Payment is charged to your Apple ID when you confirm the purchase.",
          "It renews automatically unless you cancel at least 24 hours before the end of the current period. Renewal is charged within the 24 hours before the period ends.",
          "Prices and plan lengths shown in the app come from the App Store, in your local currency.",
          "A free trial, when offered, depends on your App Store eligibility. If you subscribe during a trial, the unused part of it ends.",
          "You can manage or cancel your subscription in your App Store account settings. Deleting your Goomi account doesn't cancel it.",
        ],
        links: [{ label: "Manage subscriptions", href: APPLE_SUBSCRIPTIONS }],
      },
      {
        id: "restore",
        heading: "Restoring a purchase",
        body: ["Reinstalled Goomi or moved to a new iPhone with the same Apple ID? Use Restore purchases in Settings → Subscription."],
      },
      {
        id: "availability",
        heading: "Availability and changes",
        body: [
          "We keep improving Goomi, so features can change. Goomi is provided as it is, and to the extent the law allows, we aren't liable for indirect losses from using it. Nothing here limits rights you have under consumer law.",
          "If these terms change, this page changes first, with a new date at the top.",
        ],
      },
      {
        id: "apple",
        heading: "Apple's standard terms",
        body: ["Your use of Goomi is also covered by Apple's standard Licensed Application End User License Agreement."],
        links: [{ label: "Apple's standard EULA", href: APPLE_EULA }],
      },
    ],
  },
  support: {
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
        body: [
          "App moments need a physical iPhone on iOS 17.4 or later. Challenges, study and progress work everywhere Goomi runs.",
        ],
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
        heading: "Managing or cancelling Goomi Plus",
        body: [
          "Subscriptions live with your Apple ID. Manage or cancel yours in your App Store account settings, at least 24 hours before the current period ends.",
        ],
        links: [{ label: "Manage subscriptions", href: APPLE_SUBSCRIPTIONS }],
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
        links: [{ label: "Privacy policy", href: "/privacy" }],
      },
    ],
  },
};
