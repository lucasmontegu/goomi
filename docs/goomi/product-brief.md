/goal Build the complete Goomi mobile experience using the existing repository, available design skills, MCP tools, simulator access, and the Goomi visual references/assets already provided.

PRODUCT: Goomi

CORE IDEA:
Goomi does NOT exist to reduce screen time.

Goomi turns moments of passive scrolling into moments of curiosity, learning, memory reinforcement, and cognitive engagement.

The user is already going to use their phone. Instead of fighting that behavior with another generic blocker, Goomi inserts short, delightful experiences into that behavior:

open Instagram → learn / recall / play → continue
5 minutes later → another useful interruption

The goal is:
"Make your screen time add up."

Goomi should feel like a playful curiosity companion living inside the user's phone.

DESIGN DIRECTION:
Use the existing Goomi design system and visual references as the source of truth.

The visual language is:
- modern
- relaxed
- playful
- tactile
- premium
- highly polished
- soft 3D
- expressive
- intelligent, but never academic
- friendly, but never childish

Avoid:
- generic AI app aesthetics
- editorial beige layouts
- serif typography
- purple AI gradients
- flat SaaS dashboards
- generic React Native cards
- excessive glassmorphism
- sterile productivity-app aesthetics
- childish edtech visuals

The app should feel closer to:
Airbnb's current dimensional illustration language
+
Duolingo-level product polish
+
Nintendo-like playfulness
+
Apple-level restraint

Do NOT copy those products literally.

Build Goomi's own identity.

BRAND SYSTEM:

Primary colors:
- Lime: #D9FF6B
- Charcoal: #0F0F10
- Ivory: #FAFAF8
- Lavender: #C8B6FF
- Mint: #B6F3C6

Semantic:
- Success: #22C55E
- Warning: #FACC15
- Error: #F87171
- Info: #60A5FA

Typography:
Primary UI:
Plus Jakarta Sans

Display / playful accents:
Balsamiq Sans

Use handwritten typography sparingly:
- section moments
- doodle annotations
- celebrations
- emotional copy

Never use it for dense UI or long body copy.

MASCOT:
Goomi is a soft lime-green 3D creature with:
- simple black oval eyes
- tiny expressive mouth
- rounded organic silhouette
- soft matte material
- white cushion/cloud forms
- lavender sphere accents

The mascot is a core product primitive, not decoration.

It should react to:
- onboarding
- successful answers
- incorrect answers
- thinking
- curiosity
- progress
- streaks
- study mode
- work mode
- sleep mode
- empty states
- loading
- achievements
- returning to task
- interruptions

Use existing Goomi assets whenever available.

If an asset is missing, create it in the SAME visual language.
Do not substitute generic emoji or stock illustrations.

MOTION IS PART OF THE DESIGN SYSTEM.

Use:
- react-native-reanimated
- gesture-handler
- native navigation
- haptics
- blur where appropriate
- Skia when it meaningfully improves the result
- Lottie/Rive only where they genuinely help

Motion should feel physical:
- squash
- stretch
- soft bounce
- settle
- float
- peek
- slide
- spring
- card stacking
- object rotation
- small parallax
- subtle breathing

No random motion.

Every animation should communicate state, hierarchy, reward, attention, or personality.

CORE PRODUCT MODES:

1. FREE MODE
Light friction.
Focus on:
- general knowledge
- languages
- geography
- history
- science
- art
- culture
- surprising facts
- memory
- mini cognitive games

2. STUDY MODE
More aggressive intervention.
Focus on:
- uploaded PDFs
- lecture notes
- screenshots
- slides
- active recall
- spaced repetition
- previously weak concepts
- exam preparation

3. WORK MODE
Reduce distraction and help users return to their task.
Interventions include:
- recall current task
- short cognitive resets
- intention prompts
- micro focus challenges
- return-to-task actions

4. SLEEP MODE
Low stimulation.
No competitive mechanics.
Calmer interventions and UI.

CORE LOOP:

The user selects distracting apps.

When they attempt to open one:
→ Goomi presents a very short experience
→ user completes it
→ app is unlocked temporarily

While using the distracting app:
→ after a configured usage threshold, e.g. ~5 minutes
→ Goomi interrupts again
→ another short experience appears

Experiences must have clear endings.

Never create another infinite feed.

CHALLENGE TYPES:

Design reusable systems for:

- multiple choice
- true / false
- image identification
- map / geography
- visual matching
- sequencing
- memory recall
- fill the blank
- vocabulary
- language translation
- listening comprehension
- pronunciation
- mini mental math
- logic
- pattern recognition
- micro sudoku
- historical ordering
- art identification
- spaced repetition recall
- "what did you learn earlier?"
- study material questions
- surprise / wildcard challenges

The surprise mechanic matters.

Users should NOT always know what type of challenge appears next.

CONTENT PRINCIPLE:

Goomi is not trivia spam.

Content should progressively create a personal knowledge graph around:
- what the user knows
- what they forget
- their interests
- their country/culture
- their selected languages
- uploaded study material
- previous mistakes
- previous exposure
- spaced repetition scheduling

The interface should communicate:
"I am accumulating knowledge over time."

PRIMARY METRICS SHOWN TO USERS:

Prefer:
- Things learned
- Things still remembered
- Retention %
- Concepts mastered
- Knowledge this week
- Learning streak
- Areas improving

Avoid making "time spent inside Goomi" a success metric.

ONBOARDING:

Create a LONG, highly polished onboarding.

Do NOT interpret "long" as boring forms.

Every screen should:
- communicate one idea
- require one easy action
- visually progress the narrative
- use Goomi heavily
- build emotional commitment
- feel fast

Design roughly 12–18 onboarding moments.

Include:

01 Splash / brand introduction

02 Meet Goomi

03 Problem framing
"You already reach for your phone dozens of times a day."

04 Product promise
"Make those moments worth something."

05 Curiosity framing

06 Select interests
- History
- Geography
- Science
- Art
- Languages
- Technology
- Psychology
- Nature
- Space
- Business
- Pop culture
- Philosophy
- etc.

07 Country / cultural context

08 Native language

09 Languages the user wants to learn

10 Self-assessed knowledge level

11 What would they like to improve?
- general knowledge
- memory
- English
- concentration
- curiosity
- study

12 Screen-time behavior

13 Which apps consume their attention?

14 Estimated usage

15 Select preferred intensity

16 Select default mode

17 Explain how Goomi interventions work

18 Screen Time permission

19 Configure first blocked app

20 First REAL challenge

21 Show immediate reward/progress

22 Personalized result screen

23 PAYWALL

The onboarding should feel like a transformation story.

Do NOT build a tutorial teaching UI controls.

PAYWALL:

There is no permanent free tier.

At most:
- free trial

The paywall is intentionally strong and should appear during the first session AFTER the user experiences the core product value.

Test visual hierarchy around:

GOOMI PLUS

"Invest in a more curious you."

Benefits:
- Unlimited challenges
- All topics
- Personalized learning path
- Spaced repetition
- Study mode
- PDF / notes learning
- Language practice
- Memory tracking
- Full app intervention system
- Progress insights

Plans:
Monthly
Annual

Annual should be visually preferred.

CTA:
Start free trial

The paywall must:
- feel premium
- remain transparent
- clearly communicate price and renewal
- avoid fake urgency
- avoid manipulative countdowns

CORE APP NAVIGATION:

Bottom navigation:

Home
Explore
Create / Add
Stats
Profile

Use Goomi visual language throughout.

HOME:

Design the home around:

Greeting
Goomi contextual pose

Today's goal

Mode switcher:
Study
Work
Free
Sleep

Current progress

Next interruption / unlock card

Example:
"A quick challenge before Instagram?"

Things learned

Retention %

Streak

Continue your path

Topics / learning paths

Contextual Goomi message

The Home should NOT look like a dashboard made from identical cards.

Use scale, asymmetry, illustration, whitespace, motion, and dimensional composition.

EXPLORE:

Create a discovery surface for:
- subjects
- learning paths
- topics
- saved interests
- trending curiosity topics
- language packs
- local knowledge
- personalized recommendations

Users should be able to intentionally explore Goomi, but Explore must never become an infinite social-style feed.

Use finite clusters and clear endpoints.

STUDY MODE:

Allow:
- upload PDF
- upload screenshots
- upload slides
- paste text
- add notes

Design:
Upload state
Processing state
Content extraction state
Generated concepts
Course overview
Study path
Review queue
Weak concepts
Mastered concepts

Goomi should visually react while processing material.

CHALLENGE EXPERIENCE:

This is one of the most important parts of the app.

Treat challenges almost like mini game screens.

They may use:
- light mode
- dark mode
- full-screen imagery
- 3D objects
- maps
- illustrations
- audio
- tactile answer choices

For interruption challenges, prefer a dark immersive surface.

Show:
- category
- subtle progress
- question
- primary visual
- answer interaction
- what will unlock

Example:
"Unlocks Instagram for 5 minutes"

After answering:
do NOT simply show green/red.

Create a satisfying response:
- Goomi reaction
- haptic
- motion
- explanation
- context
- interesting fact
- memory reinforcement

Example:

Correct!

That's Argentina 🇦🇷

Argentina is the second-largest country in South America...

+1 to memory

Then:
Continue
or
Unlock Instagram

INCORRECT ANSWERS:

Never punish.

Use the moment to teach.

Show:
- correct answer
- short explanation
- memorable visual connection
- when relevant: "We'll bring this back later."

PROGRESS:

Make progress emotionally rewarding.

Include:
- retention %
- things learned
- concepts still remembered
- streak
- weekly goal
- category growth
- knowledge over time
- mastered areas
- weak areas

Avoid corporate analytics aesthetics.

Use:
- organic charts
- animated bars
- Goomi reactions
- 3D markers
- playful graphs

PROFILE:

Include:
- avatar / Goomi state
- stats
- interests
- learning goals
- languages
- study materials
- modes
- Screen Time settings
- intervention frequency
- appearance
- reminders
- subscription
- help
- privacy

CREATE / ADD:

The center navigation action should allow:

Upload PDF
Take photo
Upload image
Paste text
Add topic
Add learning goal
Create language pack

Treat it as a beautiful native sheet.

SYSTEM STATES:

Design ALL states, not just happy paths.

Include:

loading
empty
offline
AI generation
processing document
uploading
success
failure
retry
Screen Time permission denied
Screen Time permission revoked
subscription expired
trial ending
no internet
no generated content
no study material
no progress yet
streak lost
streak milestone
daily goal reached

Every state belongs to the Goomi design language.

DO NOT use generic spinners wherever a Goomi animation could communicate the same state.

MICROCOPY:

Copy should be:
short
warm
curious
slightly playful
smart
never preachy

Avoid:
"You should spend less time on your phone."

Prefer:
"Want something better than another scroll?"

Avoid guilt.

Avoid moralizing screen time.

DESIGN QUALITY BAR:

The app must look like a well-funded consumer product designed by a multidisciplinary team.

Every screen should demonstrate:
- deliberate composition
- excellent spacing
- typography hierarchy
- dimensionality
- custom motion
- custom illustration
- thoughtful transitions
- polished empty states
- tactile interactions
- strong product narrative

Do not optimize for implementation convenience at the expense of product quality.

TECH:

React Native + Expo

Use:
- Expo Router
- HeroUI where useful
- React Native Reanimated
- Gesture Handler
- Expo Haptics
- native blur
- Skia where useful
- RevenueCat
- PostHog

Do NOT let HeroUI dictate the design.

HeroUI is infrastructure, not the visual identity.

Build custom components whenever required to match Goomi.

NATIVE REQUIREMENTS:

This product relies heavily on iOS Screen Time APIs.

Use an Expo development build.

Create native modules/extensions where necessary for:

FamilyControls
ManagedSettings
DeviceActivity

The intervention and temporary unlock experience must feel native and reliable.

REFERENCE WORKFLOW:

Before implementing:
- inspect ALL Goomi visual references
- inspect ALL existing mascot assets
- inspect ALL design-system assets
- inspect ALL existing screens
- inspect existing navigation
- understand the current product architecture

Do not start coding before understanding the system.

Then work iteratively:

reference
→ implement
→ run
→ interact
→ screenshot
→ compare
→ fix
→ repeat

Launch your own dedicated iPhone simulator.

Prefer current large iPhone Pro dimensions.

Inspect the real application continuously.

Take screenshots and recordings.

Compare:
- spacing
- typography
- safe areas
- image crops
- component proportions
- mascot scale
- motion
- gesture behavior
- animation easing
- transitions
- loading states
- bottom sheets
- keyboard states
- navigation

Do NOT accept "close enough."

If something looks generic, redesign it.

If a screen feels like a template, redesign it.

If the mascot feels pasted on instead of integrated, redesign it.

If every section becomes a rounded rectangle card, redesign it.

If motion doesn't add meaning, remove or improve it.

If a feature isn't explicitly represented in the existing references, infer how Goomi's design team would solve it from the established system.

ASSETS:

Do not use placeholders.

Use existing assets first.

If assets are missing:
create production-quality assets consistent with Goomi.

Keep mascot proportions and materials consistent.

Assets should be reusable and exportable separately when possible.

PERFORMANCE:

Despite rich visuals, the app must feel extremely fast.

Especially:
- app interception
- challenge launch
- answer feedback
- temporary unlock

Preload/cache challenge content.

Do not make the user wait for an LLM when attempting to open Instagram.

Animations must remain smooth at 60fps.

FINAL EXPECTATION:

Do not stop after achieving a working build.

The first working version is the beginning.

Continue iterating until:
- the entire application feels cohesive
- every core flow feels intentional
- onboarding feels premium
- the paywall feels native to the product
- challenges feel delightful
- motion feels authored
- Goomi feels alive
- the app does not look generated
- no generic AI UI remains
- no default React Native aesthetic remains

The finished product should feel as if at least:
- one senior product designer
- one motion designer
- one illustrator / 3D artist
- one senior mobile engineer
- one product engineer

worked together on it.

The product should make someone think:

"I actually want this thing living on my phone."