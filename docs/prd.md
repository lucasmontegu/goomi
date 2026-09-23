## Goomi PRD v0.1

**Visión**

> Turn everyday screen time into something you keep.

Goomi no intenta que uses menos el teléfono. Detecta momentos de consumo automático y los transforma en pequeñas experiencias de curiosidad, aprendizaje y active recall.

**ICP inicial**

18–35 años, iPhone-heavy, usa Instagram/TikTok/YouTube frecuentemente, siente que consume demasiado contenido vacío y quiere aprender más, pero no mantiene hábitos como leer, estudiar idiomas o usar apps educativas.

Segundo ICP: universitarios que se distraen mientras estudian.

**Core loop**

`quiero abrir Instagram → Goomi aparece → experiencia de 15–90s → aprendo/recuerdo algo → 5 min de Instagram → nueva interrupción → recall o contenido nuevo`

No todo es quiz. Puede aparecer pronunciación, mapas, imágenes, audio, ordenar eventos, memoria, mini lógica, sudoku ultracorto, vocabulario o una pequeña historia.

**Modos**

`Free` prioriza cultura general, sorpresa e idiomas.

`Study` prioriza PDFs, apuntes, active recall y conceptos que el usuario está olvidando.

`Work` usa fricción mayor y experiencias orientadas a devolver al usuario a su tarea.

`Sleep` reduce estimulación y elimina mecánicas competitivas.

**Learning engine**

Cada usuario mantiene un `Knowledge Graph` personal. Por concepto guardamos exposición, respuestas, confianza estimada, dificultad, última revisión y siguiente revisión.

Una mezcla inicial razonable:

`40% intereses`  
`25% contexto cultural/local`  
`20% spaced repetition`  
`15% wildcard`

El wildcard es importante. Goomi debe conservar el “¿qué me tocará ahora?” sin convertirse en un feed infinito.

**Contenido**

General knowledge, historia, geografía, ciencia, arte, cultura, idiomas, tecnología, naturaleza y posteriormente contenido del usuario.

Los usuarios Study pueden subir PDF, imagen, slides o apuntes. AI extrae conceptos y crea ejercicios, pero el PDF no debería convertirse simplemente en “20 multiple choice generados por LLM”.

**Onboarding**

Acá sí usaría un onboarding largo, pero con ritmo de juego:

`problema → aspiración → intereses → país → idiomas → nivel → hábitos → apps que consume → tiempo estimado → objetivo → elegir modo → configurar Screen Time → primera experiencia → resultado personalizado → paywall`

15 pantallas pueden funcionar si cada pantalla requiere una decisión minúscula y visual. No 15 formularios.

**Paywall**

No freemium.

Primera sesión gratuita suficiente para experimentar el mecanismo y luego:

`7-day trial`  
`Monthly`  
`Annual` destacado

No pondría el paywall antes de que vea **Goomi interceptar una app al menos una vez**.

**Home**

La home que diseñamos funciona:

- mascota Goomi contextual
- progreso diario
- modo actual
- próxima intervención
- “things learned”
- “still remembered”
- streak
- learning paths
- acceso a Explore

El KPI protagonista debería ser **retención**, no minutos dentro de Goomi.

**Gamificación**

XP, streak, paths, milestones, pequeñas ligas y eventualmente battles.

Pero una regla: Goomi nunca crea un segundo doomscroll.

Cada experiencia tiene principio y final.

**MVP**

Yo sería brutal con el scope:

`Expo app`  
`Screen Time interception`  
`Free / Study mode`  
`General Knowledge + Languages`  
`PDF upload`  
`6–8 formatos de challenge`  
`Spaced repetition`  
`Knowledge Graph básico`  
`Home + Stats`  
`RevenueCat`  
`Onboarding + paywall`  
`mascota + motion`

Dejaría battles, amigos, padres, niños y rankings para después.

**Stack**

```
apps/
  mobile     Expo + HeroUI
  web        Next.js

packages/
  db         Prisma
  auth       Better Auth
  ai         AI SDK
  ui
  schemas
  analytics

API          Hono → Vercel
DB           Neon Postgres
Auth         Better Auth
ORM          Prisma
AI           AI SDK → cheap multimodal model
Storage      Vercel Blob / R2
Billing      RevenueCat
Analytics    PostHog
Mobile       Expo development builds
```

