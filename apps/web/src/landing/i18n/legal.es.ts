import { APPLE_EULA, APPLE_REFUNDS, APPLE_SUBSCRIPTIONS, OWNER, SUPPORT_EMAIL } from "../config";
import type { LegalCopy } from "./legal-types";

/**
 * Spanish version of legal.en.ts. Same facts, same sections; change both together.
 * The app's screens are in English, so in-app paths keep their English labels.
 */
export const esLegal: LegalCopy = {
  ui: {
    lang: "es",
    languageName: "Español",
    updated: "Última actualización",
    onThisPage: "En esta página",
    contact: "¿Dudas? Escríbenos a",
    otherLanguages: "También disponible en",
  },
  privacy: {
    eyebrow: "Política de privacidad",
    title: "Lo que aprendes es tuyo.",
    lead: "Goomi está hecho para que lo que aprendes, y cómo usas tu teléfono, se quede en tu teléfono. Aquí te explicamos qué significa eso exactamente.",
    pose: "read",
    metaTitle: "Política de privacidad",
    metaDescription:
      "Qué guarda Goomi en tu iPhone, qué llega a su servidor, quién más lo trata y cuáles son tus derechos: Tiempo en pantalla en el dispositivo, analítica opcional, estudio con IA opcional y borrado de cuenta.",
    sections: [
      {
        id: "short",
        heading: "En pocas palabras",
        bullets: [
          "Sin publicidad. No vendemos tus datos personales ni los compartimos con fines publicitarios, y no te rastreamos en apps o sitios web de otras empresas.",
          "Qué apps usas, y durante cuánto tiempo, nunca sale de tu iPhone.",
          "Puedes usar Goomi sin cuenta. La analítica está apagada hasta que tú la enciendas.",
          "Tus apuntes solo salen de tu teléfono si eliges el estudio con IA para ellos, y puedes borrarlos, o borrar tu cuenta entera, desde la app.",
        ],
      },
      {
        id: "who",
        heading: "Quién es responsable de tus datos",
        body: [
          `Goomi lo crea y lo gestiona ${OWNER.name}, desarrollador independiente con domicilio en ${OWNER.country}. Él decide cómo se usan los datos personales que se describen aquí, por lo que es el responsable de su tratamiento según las leyes de privacidad que te aplican. En esta política, “nosotros” se refiere a él.`,
          `Para cualquier consulta sobre tus datos, escribe a ${SUPPORT_EMAIL}. Esa misma dirección es el canal de contacto para solicitudes bajo la LGPD de Brasil. Si Goomi pasa a una empresa, esta página indicará cuál, y tus datos seguirán protegidos por esta política.`,
        ],
      },
      {
        id: "on-device",
        heading: "Lo que se queda en tu iPhone",
        body: [
          "Tu progreso, respuestas, intereses, objetivos y ajustes se guardan en tu dispositivo, en el almacenamiento local de Goomi. Goomi no los envía a su servidor y no se sincronizan entre dispositivos.",
        ],
      },
      {
        id: "screen-time",
        heading: "Tiempo en pantalla",
        body: [
          "Goomi usa la API de Tiempo en pantalla de Apple (Family Controls, Managed Settings y Device Activity). Cuando eliges apps, el selector de Apple le entrega a Goomi tokens privados en lugar de nombres de apps. Esos tokens se quedan en tu iPhone y solo los comparten Goomi y sus extensiones de Tiempo en pantalla.",
          "Goomi puede ver cuántas apps, categorías y sitios web elegiste, nunca cuáles. No lee tu historial de Tiempo en pantalla. Puedes quitarle a Goomi el acceso a Tiempo en pantalla en los Ajustes de iOS cuando quieras.",
        ],
      },
      {
        id: "account",
        heading: "Tu cuenta (opcional)",
        body: [
          "Iniciar sesión es opcional. Si continúas con Apple o Google, el servidor de Goomi guarda tu cuenta: un ID de usuario, y tu nombre y correo tal como los comparte el proveedor. Existe para que tu suscripción a Goomi Plus te acompañe a un teléfono nuevo. Se respeta la opción “Ocultar mi correo” de Apple.",
          "Puedes borrar tu cuenta en la app, en Settings → Account → Delete account. Eso borra tu cuenta y todo lo que el servidor de Goomi guarda sobre ella, incluidos tus materiales de estudio y tus contadores de uso.",
        ],
      },
      {
        id: "study",
        heading: "Tus materiales de estudio",
        body: [
          "El texto que pegas y los PDF, diapositivas y fotos que agregas se leen primero en tu iPhone, con PDFKit de Apple y el reconocimiento de texto de Vision en el dispositivo. Las fotos solo se usan para leer el texto que contienen: Goomi no reconoce rostros ni recoge datos biométricos.",
          "Si eliges guardar un material en tu teléfono, el texto extraído y los conceptos que encuentra Goomi se guardan en tu iPhone junto con el resto de tus datos de aprendizaje, y no se sube nada.",
          "Por favor, no agregues historias clínicas, datos personales de otras personas ni nada sensible a un material que envíes al estudio con IA. Goomi no lo necesita para hacer preguntas.",
        ],
      },
      {
        id: "ai",
        heading: "Estudio con IA, solo cuando lo eliges",
        body: [
          "El estudio con IA es parte de Goomi Plus. Cuando lo eliges para un material, Goomi envía el texto de ese material a su servidor, junto con imágenes de las páginas que no pudo leer en tu teléfono. No se envía nada si no lo aceptas en esa pantalla, cada vez.",
        ],
        bullets: [
          "El texto lo procesan modelos de IA de Alibaba Cloud (Qwen) y Google (Gemini) a través de Vercel AI Gateway, que lo dirige solo a proveedores con acuerdos de retención cero: no lo guardan ni lo usan para entrenar modelos.",
          "Las imágenes de páginas se leen una vez y nunca se guardan.",
          "La base de datos de Goomi (Neon, en Estados Unidos) guarda el texto, los fragmentos en que se divide y las preguntas creadas a partir de ellos, para que cada pregunta pueda mostrar qué dicen tus apuntes. Cuando están listas, las preguntas también se guardan en tu iPhone y funcionan sin conexión.",
          "Quitar el material en Goomi lo borra por completo del servidor. Borrar tu cuenta borra todos tus materiales.",
          "Goomi registra cuánto procesamiento de IA usa cada cuenta, para que los límites mensuales sean justos. Tus apuntes no se usan para nada más, y nunca se usan para entrenar modelos de IA.",
        ],
      },
      {
        id: "challenges",
        heading: "Retos nuevos",
        body: [
          "Goomi descarga retos nuevos en segundo plano, creados a partir de colecciones abiertas como Wikidata y el Art Institute of Chicago. Cada reto muestra su fuente.",
          "Para que los límites diarios sean justos, Goomi envía un ID aleatorio creado para esta instalación, que no está vinculado a ti. Si iniciaste sesión, usa tu cuenta en su lugar. Tus respuestas y tu progreso nunca se envían.",
        ],
      },
      {
        id: "purchases",
        heading: "Compras",
        body: [
          "Las suscripciones las vende y procesa Apple. Nunca vemos tu tarjeta ni tus datos de pago. Goomi usa RevenueCat para comprobar si Goomi Plus está activo. RevenueCat recibe la información de tu compra y un ID anónimo de la app (o tu ID de cuenta de Goomi, si iniciaste sesión), nunca tus datos de aprendizaje.",
        ],
      },
      {
        id: "analytics",
        heading: "Analítica, apagada por defecto",
        body: [
          "La analítica está apagada salvo que la enciendas en Settings → Privacy. Si está encendida, Goomi envía a PostHog una lista corta y fija de eventos de producto, como “se completó un reto” o “cambió el modo”.",
        ],
        bullets: [
          "Los eventos nunca incluyen tus respuestas, apuntes, nombres de documentos, objetivos ni nada que escribas.",
          "No se crea un perfil de persona, y la ubicación a partir de tu dirección IP está desactivada.",
          "Apagar la analítica detiene la recolección y borra los eventos que todavía no se enviaron.",
        ],
      },
      {
        id: "reminders",
        heading: "Recordatorios",
        body: ["El recordatorio diario se programa en tu iPhone como una notificación local. No interviene ningún servidor de notificaciones."],
      },
      {
        id: "server",
        heading: "El servidor de Goomi y este sitio web",
        body: [
          "El servidor de Goomi y goomi.app funcionan en Vercel. Como cualquier servicio web, recibe datos estándar de cada solicitud, como tu dirección IP, el tipo de dispositivo y la hora. Los usamos para prestar el servicio, frenar abusos y corregir errores, y se guardan por poco tiempo.",
          "Las páginas de goomi.app no usan cookies, analítica ni rastreadores.",
        ],
      },
      {
        id: "legal-bases",
        heading: "Con qué base legal usamos tus datos",
        body: ["Leyes como la LGPD de Brasil y el RGPD europeo nos piden indicar una base legal para cada uso:"],
        bullets: [
          "Para gestionar tu cuenta, el estudio con IA y Goomi Plus: porque tú los pediste (ejecución de un contrato).",
          "Para enviar un material al estudio con IA y para la analítica: tu consentimiento, que puedes retirar en cualquier momento. Retirarlo no afecta lo que ya se hizo antes.",
          "Para aplicar límites de uso justo, mantener el servicio seguro y evitar abusos: nuestro interés legítimo en que Goomi funcione para todos.",
          "Para conservar registros de compras y contables, y responder a pedidos legítimos de autoridades: obligaciones legales.",
        ],
      },
      {
        id: "sharing",
        heading: "Quién más trata tus datos",
        body: [
          "Solo compartimos datos personales con los proveedores que hacen funcionar Goomi, solo para los fines descritos y bajo sus condiciones de tratamiento de datos:",
        ],
        bullets: [
          "Apple: inicio de sesión con Apple, compras y Tiempo en pantalla.",
          "Google: inicio de sesión con Google, y modelos Gemini para el estudio con IA.",
          "Alibaba Cloud: modelos Qwen para el estudio con IA.",
          "Vercel: alojamiento del servidor y del sitio web de Goomi, y el AI Gateway.",
          "Neon: la base de datos de Goomi.",
          "RevenueCat: estado de la suscripción.",
          "PostHog: analítica de producto, solo si la enciendes.",
        ],
      },
      {
        id: "sharing-other",
        heading: "Otros casos en que podríamos revelarlos",
        body: [
          "Podemos revelar datos si una orden legal válida lo exige, o para proteger la seguridad de los usuarios o del público. Si Goomi se transfiere a una empresa que controlamos o a un nuevo dueño, tus datos pasan con él y siguen protegidos por esta política, y te avisaremos antes.",
        ],
      },
      {
        id: "transfers",
        heading: "Datos tratados en otros países",
        body: [
          "El servidor de Goomi, su base de datos y la mayoría de sus proveedores están en Estados Unidos, así que tus datos pueden tratarse fuera del país donde vives. Nos apoyamos en los acuerdos de tratamiento de datos que ofrecen estos proveedores, que incluyen cláusulas contractuales tipo cuando la ley las exige. En el estudio con IA, la pantalla de consentimiento también te avisa que tu texto se procesará en el exterior.",
        ],
      },
      {
        id: "retention",
        heading: "Cuánto tiempo los guardamos",
        bullets: [
          "Tu cuenta: hasta que la borres.",
          "Los materiales de estudio y las preguntas creadas con ellos: hasta que los quites o borres tu cuenta.",
          "Los contadores de uso de tu cuenta: se borran con tu cuenta. Los contadores de un ID de instalación aleatorio solo guardan números por día o por mes y no están vinculados a ti.",
          "Los registros de costos de procesamiento con IA: se conservan por motivos contables, pero se desvinculan de tu cuenta cuando la borras.",
          "Los registros del servidor: poco tiempo, por seguridad y para corregir errores.",
          "Las copias de seguridad: los datos borrados pueden quedar en las copias de nuestro proveedor de base de datos hasta que se renuevan, y nunca se restauran en Goomi.",
        ],
      },
      {
        id: "security",
        heading: "Seguridad",
        body: [
          "Los datos viajan cifrados entre la app y el servidor. La base de datos solo acepta al servidor de Goomi, y tu sesión se guarda en el almacenamiento seguro del iPhone. Ningún sistema es perfectamente seguro, pero si una brecha pone en riesgo tus datos, te avisaremos a ti y a las autoridades que corresponda, como exige la ley.",
        ],
      },
      {
        id: "children",
        heading: "Edad",
        body: [
          "Goomi es para personas de 13 años en adelante. Si eres menor de edad según la ley de tu país, usa Goomi con permiso de tu madre, padre o tutor. Los menores de 13 años no deben crear una cuenta.",
          `No recogemos a sabiendas datos personales de menores de 13 años. Si crees que un menor creó una cuenta, escribe a ${SUPPORT_EMAIL} y la borraremos.`,
        ],
      },
      {
        id: "rights",
        heading: "Tus derechos",
        body: [
          `Vivas donde vivas, puedes pedirnos una copia de lo que el servidor de Goomi guarda sobre ti, pedirnos que lo corrijamos o lo borremos, recibirlo en un formato portable y retirar cualquier consentimiento que hayas dado. Escribe a ${SUPPORT_EMAIL} desde el correo vinculado a tu cuenta. Respondemos los pedidos de acceso en 10 días y los de rectificación o supresión en 5 días hábiles, y podemos pedirte que confirmes tu identidad. Usar estos derechos no cambia cómo te tratamos.`,
        ],
        bullets: [
          "Brasil (LGPD): tienes además los derechos del artículo 18, como la confirmación de que tratamos tus datos, la anonimización o el bloqueo de datos innecesarios, la información sobre con quién los compartimos y la revisión de decisiones automatizadas. Puedes reclamar ante la ANPD (Autoridade Nacional de Proteção de Dados).",
          "Argentina (Ley 25.326): el titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley Nº 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.",
          "Resto de América Latina: tienes los derechos que te da la ley de protección de datos de tu país, y puedes reclamar ante su autoridad.",
          "Estados Unidos: no vendemos ni compartimos datos personales según la definición de las leyes estatales de privacidad, y no los usamos para publicidad dirigida ni para elaborar perfiles. Si rechazamos un pedido, puedes apelar respondiendo a nuestra respuesta, y te explicaremos el resultado.",
          "Unión Europea, Reino Unido y Suiza: tienes además derecho a oponerte al tratamiento basado en interés legítimo y a reclamar ante tu autoridad de protección de datos.",
        ],
      },
      {
        id: "choices",
        heading: "Tus opciones en la app",
        bullets: [
          "Enciende o apaga la analítica en Settings → Privacy.",
          "Quítale a Goomi el acceso a Tiempo en pantalla en los Ajustes de iOS cuando quieras.",
          "Quita cualquier material de estudio en Goomi para borrarlo del servidor.",
          "Borra tu cuenta en Settings → Account.",
          "Usa Reset Goomi on this phone, en Settings, para borrar todo lo guardado en tu dispositivo. Borrar la app hace lo mismo.",
        ],
        links: [{ label: "Cómo borrar tu cuenta", href: "/es/delete-account" }],
      },
      {
        id: "changes",
        heading: "Cambios en esta política",
        body: [
          "Si cambia lo que Goomi hace con tus datos, primero cambia esta página, con una fecha nueva arriba. Si el cambio es importante, también te avisaremos en la app antes de que empiece a aplicarse, y te pediremos de nuevo tu consentimiento cuando la ley lo exija.",
        ],
      },
    ],
  },
  terms: {
    eyebrow: "Términos de uso",
    title: "Las reglas, en palabras simples.",
    lead: "El acuerdo entre tú y Goomi. Lo hicimos lo más corto que pudimos, pero léelo: explica tu suscripción, tu material y qué pasa si algo sale mal.",
    notice:
      "Si vives en Estados Unidos, la sección “Disputas en Estados Unidos” te obliga a resolver las disputas con nosotros mediante arbitraje individual y renuncia a las demandas colectivas y a los juicios con jurado, salvo que te excluyas dentro de los 30 días. Si vives en cualquier otro lugar, la ley de consumo de tu país decide dónde y cómo se resuelven las disputas.",
    pose: "think",
    metaTitle: "Términos de uso",
    metaDescription:
      "El acuerdo para usar Goomi y Goomi Plus: quién puede usarlo, suscripciones y reembolsos, tu material de estudio, preguntas hechas con IA, responsabilidad y cómo se resuelven las disputas.",
    sections: [
      {
        id: "agreement",
        heading: "Quiénes somos y este acuerdo",
        body: [
          `Goomi lo crea y lo gestiona ${OWNER.name}, desarrollador independiente con domicilio en ${OWNER.country} (“nosotros”). Estos términos son el acuerdo entre tú y nosotros para usar la app Goomi, Goomi Plus y goomi.app.`,
          "Los aceptas cuando tocas un botón que indica que estás de acuerdo, cuando te suscribes o cuando sigues usando Goomi después de leerlos. Si no estás de acuerdo, por favor no uses Goomi. La política de privacidad explica cómo tratamos tus datos y forma parte de este acuerdo.",
        ],
        links: [{ label: "Política de privacidad", href: "/es/privacy" }],
      },
      {
        id: "age",
        heading: "Quién puede usar Goomi",
        body: [
          "Debes tener al menos 13 años. Si eres menor de edad según la ley de tu país, necesitas el permiso de tu madre, padre o tutor, que acepta estos términos por ti. Los menores de 13 años no deben crear una cuenta.",
        ],
      },
      {
        id: "using",
        heading: "Qué es Goomi y qué no es",
        body: [
          "Goomi convierte los momentos en que vas a abrir ciertas apps en retos de aprendizaje cortos. Los momentos en apps dependen de Tiempo en pantalla de Apple, que puedes desactivar cuando quieras. Son un empujón amable, no un candado: se pueden saltar, iOS decide exactamente cuándo aparecen y pueden dejar de funcionar si Apple cambia Tiempo en pantalla.",
          "Goomi no es un control parental, ni un tratamiento médico o de salud mental, ni una garantía de que vayas a usar menos el teléfono o a sacar mejores notas. Los resultados dependen de ti.",
        ],
      },
      {
        id: "account",
        heading: "Tu cuenta",
        body: [
          "Puedes usar Goomi sin cuenta. Si inicias sesión con Apple o Google, mantén esa cuenta segura: lo que pase en tu cuenta de Goomi es tu responsabilidad. Puedes borrar tu cuenta en la app cuando quieras.",
        ],
      },
      {
        id: "plus",
        heading: "Goomi Plus",
        bullets: [
          "Goomi Plus es una suscripción de renovación automática que vende Apple a través de la App Store. Apple cobra a tu Apple ID cuando confirmas la compra.",
          "Se renueva automáticamente al mismo precio y por el mismo periodo, salvo que la canceles al menos 24 horas antes del final del periodo actual. La renovación se cobra dentro de las 24 horas previas al final del periodo.",
          "Los precios y la duración de los planes que ves en la app vienen de la App Store, en tu moneda local e incluyen los impuestos que aplique Apple. Si cambiamos el precio, Apple te avisa primero y, cuando la ley lo exige, te pide consentimiento antes de cobrar el precio nuevo.",
          "La prueba gratis, cuando se ofrece, depende de tu elegibilidad en la App Store. Si no cancelas antes de que termine, empieza la suscripción paga. Si te suscribes durante una prueba, la parte que no usaste termina.",
          "Puedes cancelar desde la configuración de tu cuenta de la App Store. Conservas Goomi Plus hasta el final del periodo que pagaste. Borrar la app o tu cuenta de Goomi no cancela la suscripción.",
          "Las funciones y los límites del plan, como cuántos materiales puedes agregar por mes, se muestran en la app y pueden cambiar. Si un cambio te quita algo que ya pagaste, se aplica a partir de tu próxima renovación.",
        ],
        links: [{ label: "Administrar suscripciones", href: APPLE_SUBSCRIPTIONS }],
      },
      {
        id: "refunds",
        heading: "Reembolsos y tu derecho de arrepentimiento",
        body: [
          "Como la suscripción la vende Apple, los reembolsos se le piden a Apple y se deciden según sus políticas. Nosotros no podemos emitirlos, pero te ayudamos si nos escribes.",
          "La ley de consumo de tu país puede darte derecho a arrepentirte de una compra en línea sin dar motivos: 7 días en Brasil, 10 días en Argentina, 14 días en la Unión Europea. Puedes ejercerlo pidiendo el reembolso a Apple dentro de ese plazo, o escribiéndonos y te acompañamos en el trámite. Nada de estos términos limita ese derecho.",
        ],
        links: [{ label: "Pedir un reembolso a Apple", href: APPLE_REFUNDS }],
      },
      {
        id: "restore",
        heading: "Restaurar una compra",
        body: ["¿Reinstalaste Goomi o cambiaste a un iPhone nuevo con el mismo Apple ID? Usa Restore purchases en Settings → Subscription."],
      },
      {
        id: "your-material",
        heading: "Tu material",
        body: [
          "Los apuntes, PDF, diapositivas y fotos que agregas siguen siendo tuyos. Cuando eliges el estudio con IA, nos das permiso para copiar, procesar y guardar ese material solo para crear tus preguntas de estudio y mostrártelas, como describe la política de privacidad. Ese permiso termina cuando quitas el material o borras tu cuenta.",
          "Agrega solo material que tengas derecho a usar, como tus propios apuntes o el material de un curso con el que puedas estudiar. No agregues nada ilegal ni nada que infrinja derechos de otras personas.",
        ],
      },
      {
        id: "content",
        heading: "Retos y preguntas hechas con IA",
        body: [
          "Los retos se crean a partir de colecciones abiertas como Wikidata y el Art Institute of Chicago, y cada uno muestra su fuente. Las preguntas de estudio las hace una IA a partir del material que agregas. La IA puede equivocarse u omitir cosas, así que verifica lo importante con tu propio material y con tus docentes.",
          "Nada en Goomi es asesoramiento profesional, médico, legal ni académico.",
        ],
      },
      {
        id: "rules",
        heading: "Uso justo",
        body: ["Usa Goomi para tu propio aprendizaje y dentro de la ley. No debes:"],
        bullets: [
          "Intentar interrumpir o sobrecargar el servicio de Goomi, ni saltarte sus límites o su muro de pago.",
          "Acceder a cuentas o datos de otras personas.",
          "Copiar, revender o extraer de forma automatizada el contenido o las preguntas de Goomi, ni usarlos para entrenar modelos de IA.",
          "Hacer ingeniería inversa de la app, salvo donde la ley lo permita.",
        ],
      },
      {
        id: "ours",
        heading: "Lo que nos pertenece",
        body: [
          "El nombre, la mascota, el diseño, el código y el contenido original de Goomi nos pertenecen. Te damos una licencia personal e intransferible para usar la app en dispositivos que te pertenecen o que controlas, según estos términos y las reglas de Apple. El contenido de colecciones abiertas mantiene su propia licencia. Si nos envías ideas o comentarios, podemos usarlos sin deberte nada.",
        ],
      },
      {
        id: "third-party",
        heading: "Servicios de otras empresas",
        body: [
          "Goomi depende de Apple (App Store, Tiempo en pantalla, inicio de sesión con Apple), de Google (inicio de sesión con Google) y de los proveedores que enumera la política de privacidad. Sus propios términos rigen cómo los usas, y no somos responsables de sus caídas ni de sus decisiones.",
        ],
      },
      {
        id: "changes",
        heading: "Cambios y finalización",
        body: [
          "Seguimos mejorando Goomi, así que las funciones pueden cambiar o desaparecer. Si cambiamos estos términos de una forma que importe, actualizaremos esta página con una fecha nueva y te avisaremos en la app antes de que el cambio se aplique. Si no estás de acuerdo con los nuevos términos, puedes dejar de usar Goomi y cancelar tu suscripción.",
          "Puedes dejar de usar Goomi cuando quieras. Podemos suspender o cerrar el acceso de quien incumpla estos términos de forma grave o repetida, y te diremos por qué salvo que la ley o la seguridad lo impidan. Si algún día cerramos Goomi, te avisaremos en la app, y tus datos se borrarán como describe la política de privacidad.",
        ],
      },
      {
        id: "warranty",
        heading: "Sin garantías",
        body: [
          "Trabajamos para que Goomi esté disponible, sea preciso y seguro, pero lo ofrecemos “tal cual” y “según disponibilidad”. En la medida en que la ley lo permita, no prometemos que funcione siempre sin interrupciones ni errores, ni que cubra todas tus necesidades.",
        ],
      },
      {
        id: "liability",
        heading: "Límites de responsabilidad",
        body: [
          "En la medida en que la ley lo permita, no respondemos por daños indirectos, incidentales o consecuentes, como pérdida de datos, oportunidades perdidas o resultados de exámenes, y nuestra responsabilidad total por cualquier reclamo relacionado con Goomi se limita al mayor de estos montos: lo que pagaste por Goomi Plus en los 12 meses anteriores al reclamo, o USD 50.",
          "Nada de esto limita la responsabilidad por fraude, por daños que causemos con intención o culpa grave, ni ningún derecho que te dé la ley de defensa del consumidor y que no se pueda renunciar por contrato. Si eres consumidor en Brasil, Argentina, la Unión Europea u otro lugar cuya ley no permita algunos de estos límites, se te aplican solo en la medida en que esa ley lo permita.",
        ],
      },
      {
        id: "disputes",
        heading: "Si algo sale mal",
        body: [
          `La mayoría de los problemas se resuelven con un mensaje. Antes de iniciar cualquier reclamo legal, escribe a ${SUPPORT_EMAIL} con tu nombre, el correo vinculado a tu cuenta (si tienes una) y qué te gustaría que hagamos. Intentaremos resolverlo contigo dentro de 60 días. Este paso no detiene ningún plazo legal y no reemplaza el trámite ante un organismo de defensa del consumidor si prefieres ir allí.`,
        ],
      },
      {
        id: "disputes-us",
        heading: "Disputas en Estados Unidos",
        body: [
          "Esta sección se aplica solo si vives en Estados Unidos. Léela con atención: afecta tus derechos.",
          "Arbitraje. Si no podemos resolver una disputa de manera informal, tú y nosotros acordamos resolver cualquier disputa relacionada con Goomi o con estos términos mediante arbitraje final y vinculante, administrado por la American Arbitration Association (AAA) según sus Consumer Arbitration Rules. El arbitraje puede hacerse en línea, por teléfono o en el condado donde vives. Las tasas siguen las Consumer Rules de la AAA, y no pagarás más por iniciarlo de lo que pagarías en un tribunal. Esta sección se rige por la Federal Arbitration Act.",
          "Excepciones. Cualquiera de las partes puede presentar un reclamo individual ante un tribunal de menor cuantía (small claims court), y cualquiera de las partes puede acudir a un tribunal por el uso indebido de propiedad intelectual.",
          "Sin demandas colectivas. Tú y nosotros solo podemos presentar reclamos a título individual, no como demandante o miembro de una acción de clase, colectiva, acumulada o representativa, y el árbitro no puede combinar reclamos de distintas personas. Tú y nosotros renunciamos al derecho a un juicio con jurado.",
          "Presentaciones masivas. Si 25 o más demandas de arbitraje similares se presentan por los mismos abogados u organizaciones, o con su ayuda, se administrarán por lotes según las Mass Arbitration Supplementary Rules de la AAA, y el plazo de prescripción queda suspendido para las demandas que esperan en un lote.",
          `Exclusión. Puedes excluirte de este acuerdo de arbitraje escribiendo a ${SUPPORT_EMAIL} dentro de los 30 días desde que aceptaste estos términos por primera vez, con tu nombre y el asunto “Arbitration opt-out”. Excluirte no afecta el resto de estos términos.`,
          "Si se declara inaplicable la renuncia a las acciones colectivas para un reclamo, ese reclamo va a un tribunal y este acuerdo de arbitraje no se le aplica. Cualquier reclamo de medidas cautelares de interés público que no pueda renunciarse se decide en un tribunal después de terminado el arbitraje individual.",
        ],
      },
      {
        id: "disputes-elsewhere",
        heading: "Disputas en otros lugares y ley aplicable",
        bullets: [
          "Brasil: estos términos respetan el Código de Defensa del Consumidor (Ley 8.078/1990). Puedes llevar cualquier reclamo a los tribunales de tu domicilio o al Procon, y no se te impone ningún arbitraje.",
          "Argentina: estos términos respetan la Ley 24.240 de Defensa del Consumidor. Puedes llevar cualquier reclamo a los tribunales de tu domicilio o a las autoridades de defensa del consumidor.",
          "Resto de América Latina, Unión Europea y Reino Unido: mantienes las protecciones de la ley del lugar donde vives y puedes presentar reclamos ante sus tribunales y autoridades de consumo.",
          `En cualquier otro lugar, y donde tu ley local permita elegir: estos términos se rigen por las leyes de la República Argentina, y son competentes los tribunales ordinarios de la ${OWNER.venue}.`,
        ],
      },
      {
        id: "apple",
        heading: "Condiciones que Apple nos pide incluir",
        body: [
          "Estos términos son entre tú y nosotros, no con Apple. Apple no es responsable de Goomi ni de su contenido, y no tiene obligación de darle mantenimiento ni soporte. Si Goomi no cumple una garantía que le aplique, puedes avisarle a Apple y Apple te reembolsará lo que pagaste por él; en la medida en que la ley lo permita, Apple no tiene ninguna otra obligación de garantía sobre Goomi.",
          "Nosotros, no Apple, somos responsables de atender los reclamos sobre Goomi, incluidos los de responsabilidad por producto, los de incumplimiento de requisitos legales o regulatorios, los de protección del consumidor y privacidad, y los de infracción de propiedad intelectual de terceros. Confirmas que no estás en un país sujeto a un embargo del Gobierno de Estados Unidos ni en una lista de partes prohibidas o restringidas de ese Gobierno.",
          "Apple y sus subsidiarias son terceros beneficiarios de estos términos y pueden hacerlos valer frente a ti. El Contrato de Licencia de Usuario Final estándar de Apple también se aplica a tu uso de Goomi. Si contradice estos términos, prevalecen estos términos donde la ley lo permita.",
        ],
        links: [{ label: "EULA estándar de Apple", href: APPLE_EULA }],
      },
      {
        id: "general",
        heading: "Lo demás",
        body: [
          "Si un tribunal declara inválida una parte de estos términos, el resto sigue vigente. Si no hacemos valer una parte de inmediato, no renunciamos a ella. No puedes ceder estos términos a otra persona. Nosotros podemos cederlos a una empresa que controlemos, por ejemplo una que creemos para gestionar Goomi, o a un nuevo dueño de Goomi, y tus derechos seguirán siendo los mismos.",
          "Estos términos están disponibles en inglés, español y portugués. Si vives en Brasil, prevalece la versión en portugués; si vives en un país de habla hispana, prevalece la versión en español.",
        ],
      },
    ],
  },
  deleteAccount: {
    eyebrow: "Borrar tu cuenta",
    title: "Irte está a un toque.",
    lead: "Cómo borrar tu cuenta y tus datos de Goomi, qué se borra y qué conservamos.",
    pose: "wave",
    metaTitle: "Borrar tu cuenta de Goomi",
    metaDescription: "Cómo borrar tu cuenta de Goomi desde la app o por correo, qué datos se borran, cuáles se conservan y por cuánto tiempo.",
    sections: [
      {
        id: "in-app",
        heading: "Bórrala desde la app",
        bullets: [
          "Abre Goomi y ve a Settings.",
          "En Account, toca Delete account.",
          "Confirma. Si iniciaste sesión hace tiempo, Apple o Google te piden confirmar que eres tú. El borrado es inmediato.",
        ],
      },
      {
        id: "by-email",
        heading: "¿Ya no tienes la app?",
        body: [
          `Escribe a ${SUPPORT_EMAIL} desde el correo vinculado a tu cuenta de Goomi, con el asunto “Borrar mi cuenta”. Si usaste “Ocultar mi correo” de Apple, escribe desde el correo de tu Apple ID y avísanos, así encontramos tu cuenta. Podemos pedirte que confirmes tu identidad, y borraremos la cuenta dentro de 5 días hábiles.`,
        ],
      },
      {
        id: "deleted",
        heading: "Qué se borra",
        bullets: [
          "Tu cuenta: ID de usuario, nombre y correo, y su vínculo de inicio de sesión con Apple o Google.",
          "Todos tus materiales de estudio en el servidor: su texto, fragmentos, conceptos y preguntas.",
          "Tus contadores de uso y el estado de Goomi Plus en nuestro servidor.",
        ],
      },
      {
        id: "kept",
        heading: "Qué conservamos",
        bullets: [
          "Los registros de costos de procesamiento con IA, desvinculados de ti, por motivos contables.",
          "Los datos borrados pueden quedar en las copias de seguridad de nuestro proveedor de base de datos hasta que se renuevan, y nunca se restauran en Goomi.",
          "Apple y RevenueCat conservan sus propios registros de tus compras, según sus propias políticas.",
        ],
      },
      {
        id: "phone",
        heading: "Los datos en tu iPhone",
        body: [
          "Tu progreso y tus ajustes viven en tu teléfono, no en nuestro servidor. Para borrarlos, usa Settings → Reset Goomi on this phone, o borra la app.",
        ],
      },
      {
        id: "subscription",
        heading: "Tu suscripción",
        body: [
          "Borrar tu cuenta no cancela Goomi Plus. Cancélala desde la configuración de tu cuenta de la App Store para que no se te vuelva a cobrar.",
        ],
        links: [{ label: "Administrar suscripciones", href: APPLE_SUBSCRIPTIONS }],
      },
    ],
  },
};
