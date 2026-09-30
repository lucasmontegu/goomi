import { APPLE_EULA, APPLE_REFUNDS, APPLE_SUBSCRIPTIONS, OWNER, SUPPORT_EMAIL } from "../config";
import type { LegalCopy } from "./legal-types";

/**
 * Brazilian Portuguese version of legal.en.ts. Same facts, same sections; change both together.
 * The app's screens are in English, so in-app paths keep their English labels.
 */
export const ptLegal: LegalCopy = {
  ui: {
    lang: "pt-BR",
    languageName: "Português",
    updated: "Última atualização",
    onThisPage: "Nesta página",
    contact: "Dúvidas? Escreva para",
    otherLanguages: "Também disponível em",
  },
  privacy: {
    eyebrow: "Política de privacidade",
    title: "O que você aprende é seu.",
    lead: "O Goomi foi feito para que o que você aprende, e como você usa o celular, fique no seu celular. Aqui explicamos exatamente o que isso significa.",
    pose: "read",
    metaTitle: "Política de privacidade",
    metaDescription:
      "O que o Goomi guarda no seu iPhone, o que chega ao servidor, quem mais trata esses dados e quais são os seus direitos: Tempo de Uso no aparelho, análise opcional, estudo com IA opcional e exclusão de conta.",
    sections: [
      {
        id: "short",
        heading: "Em poucas palavras",
        bullets: [
          "Sem anúncios. Não vendemos seus dados pessoais nem os compartilhamos para publicidade, e não rastreamos você em apps ou sites de outras empresas.",
          "Quais apps você usa, e por quanto tempo, nunca sai do seu iPhone.",
          "Você pode usar o Goomi sem conta. A análise de uso fica desligada até você ligar.",
          "Suas anotações só saem do celular se você escolher o estudo com IA para elas, e você pode excluí-las, ou excluir a conta inteira, pelo app.",
        ],
      },
      {
        id: "who",
        heading: "Quem é o controlador dos seus dados",
        body: [
          `O Goomi é criado e mantido por ${OWNER.name}, desenvolvedor independente com domicílio na ${OWNER.country}. Ele decide como os dados pessoais descritos aqui são usados e, por isso, é o controlador desses dados nos termos da LGPD e das demais leis de privacidade que se aplicam a você. Nesta política, “nós” se refere a ele.`,
          `Para qualquer assunto sobre seus dados, escreva para ${SUPPORT_EMAIL}. Esse endereço é o canal de comunicação com titulares previsto na LGPD. Se o Goomi passar para uma empresa, esta página vai indicar qual, e seus dados continuarão protegidos por esta política.`,
        ],
      },
      {
        id: "on-device",
        heading: "O que fica no seu iPhone",
        body: [
          "Seu progresso, respostas, interesses, objetivos e ajustes ficam salvos no seu aparelho, no armazenamento local do Goomi. O Goomi não os envia ao servidor e eles não são sincronizados entre aparelhos.",
        ],
      },
      {
        id: "screen-time",
        heading: "Tempo de Uso",
        body: [
          "O Goomi usa a API de Tempo de Uso da Apple (Family Controls, Managed Settings e Device Activity). Quando você escolhe apps, o seletor da Apple entrega ao Goomi tokens privados em vez dos nomes dos apps. Esses tokens ficam no seu iPhone e só são compartilhados entre o Goomi e suas extensões de Tempo de Uso.",
          "O Goomi consegue ver quantos apps, categorias e sites você escolheu, nunca quais. Ele não lê seu histórico de Tempo de Uso. Você pode desligar o acesso do Goomi ao Tempo de Uso nos Ajustes do iOS quando quiser.",
        ],
      },
      {
        id: "account",
        heading: "Sua conta (opcional)",
        body: [
          "Entrar com uma conta é opcional. Se você continuar com a Apple ou o Google, o servidor do Goomi guarda sua conta: um ID de usuário, e seu nome e e-mail como o provedor os compartilha. Ela existe para que sua assinatura do Goomi Plus acompanhe você num celular novo. A opção “Ocultar Meu E-mail” da Apple é respeitada.",
          "Você pode excluir sua conta no app, em Settings → Account → Delete account. Isso exclui sua conta e tudo o que o servidor do Goomi guarda sobre ela, incluindo seus materiais de estudo e contadores de uso.",
        ],
      },
      {
        id: "study",
        heading: "Seus materiais de estudo",
        body: [
          "O texto que você cola e os PDFs, slides e fotos que você adiciona são lidos primeiro no seu iPhone, com o PDFKit da Apple e o reconhecimento de texto do Vision no aparelho. As fotos são usadas só para ler o texto que contêm: o Goomi não reconhece rostos nem coleta dados biométricos.",
          "Se você escolher manter um material no celular, o texto extraído e os conceitos que o Goomi encontra ficam salvos no seu iPhone com o resto dos seus dados de aprendizado, e nada é enviado.",
          "Por favor, não adicione prontuários médicos, dados pessoais de outras pessoas ou qualquer informação sensível a um material que você envie ao estudo com IA. O Goomi não precisa disso para criar perguntas.",
        ],
      },
      {
        id: "ai",
        heading: "Estudo com IA, só quando você escolhe",
        body: [
          "O estudo com IA faz parte do Goomi Plus. Quando você o escolhe para um material, o Goomi envia o texto desse material ao servidor, junto com imagens das páginas que não conseguiu ler no seu celular. Nada é enviado sem que você concorde naquela tela, todas as vezes.",
        ],
        bullets: [
          "O texto é processado por modelos de IA da Alibaba Cloud (Qwen) e do Google (Gemini) por meio do Vercel AI Gateway, que o encaminha só a provedores com acordos de retenção zero: eles não o armazenam nem o usam para treinar modelos.",
          "As imagens das páginas são lidas uma vez e nunca são guardadas.",
          "O banco de dados do Goomi (Neon, nos Estados Unidos) guarda o texto, os trechos em que ele é dividido e as perguntas criadas a partir deles, para que cada pergunta possa mostrar o que suas anotações dizem. Quando ficam prontas, as perguntas também são salvas no seu iPhone e funcionam offline.",
          "Remover o material no Goomi o exclui por completo do servidor. Excluir sua conta exclui todos os seus materiais.",
          "O Goomi registra quanto processamento de IA cada conta usa, para manter os limites mensais justos. Suas anotações não são usadas para mais nada, e nunca são usadas para treinar modelos de IA.",
        ],
      },
      {
        id: "challenges",
        heading: "Novos desafios",
        body: [
          "O Goomi baixa novos desafios em segundo plano, criados a partir de coleções abertas como o Wikidata e o Art Institute of Chicago. Cada desafio mostra sua fonte.",
          "Para manter os limites diários justos, o Goomi envia um ID aleatório criado para esta instalação, que não está ligado a você. Se você entrou com uma conta, ele usa a conta. Suas respostas e seu progresso nunca são enviados.",
        ],
      },
      {
        id: "purchases",
        heading: "Compras",
        body: [
          "As assinaturas são vendidas e processadas pela Apple. Nunca vemos seu cartão nem seus dados de pagamento. O Goomi usa o RevenueCat para verificar se o Goomi Plus está ativo. O RevenueCat recebe as informações da sua compra e um ID anônimo do app (ou o ID da sua conta Goomi, se você entrou com uma conta), nunca seus dados de aprendizado.",
        ],
      },
      {
        id: "analytics",
        heading: "Análise de uso, desligada por padrão",
        body: [
          "A análise de uso fica desligada, a menos que você a ligue em Settings → Privacy. Quando ligada, o Goomi envia ao PostHog uma lista curta e fixa de eventos do produto, como “um desafio foi concluído” ou “o modo mudou”.",
        ],
        bullets: [
          "Os eventos nunca incluem suas respostas, anotações, nomes de documentos, objetivos ou qualquer coisa que você digite.",
          "Nenhum perfil de pessoa é criado, e a localização a partir do seu endereço IP fica desativada.",
          "Desligar a análise interrompe a coleta e apaga os eventos que ainda não foram enviados.",
        ],
      },
      {
        id: "reminders",
        heading: "Lembretes",
        body: ["O lembrete diário é agendado no seu iPhone como notificação local. Nenhum servidor de notificações participa."],
      },
      {
        id: "server",
        heading: "O servidor do Goomi e este site",
        body: [
          "O servidor do Goomi e o goomi.app rodam na Vercel. Como qualquer serviço web, ele recebe dados padrão de cada requisição, como seu endereço IP, o tipo de aparelho e o horário. Usamos esses dados para prestar o serviço, impedir abusos e corrigir erros, e eles são guardados por pouco tempo.",
          "As páginas do goomi.app não usam cookies, análise de uso nem rastreadores.",
        ],
      },
      {
        id: "legal-bases",
        heading: "Com que base legal usamos seus dados",
        body: ["A LGPD e leis semelhantes pedem que indiquemos uma base legal para cada uso:"],
        bullets: [
          "Para manter sua conta, o estudo com IA e o Goomi Plus: porque você os pediu (execução de contrato).",
          "Para enviar um material ao estudo com IA e para a análise de uso: seu consentimento, que você pode revogar a qualquer momento. Revogar não afeta o que já foi feito antes.",
          "Para aplicar limites de uso justo, manter o serviço seguro e evitar abusos: nosso legítimo interesse em manter o Goomi funcionando para todos.",
          "Para manter registros de compras e contábeis, e atender a pedidos legítimos de autoridades: cumprimento de obrigação legal.",
        ],
      },
      {
        id: "sharing",
        heading: "Quem mais trata seus dados",
        body: [
          "Só compartilhamos dados pessoais com os operadores que fazem o Goomi funcionar, apenas para as finalidades acima e nos termos dos seus contratos de tratamento de dados:",
        ],
        bullets: [
          "Apple: login com a Apple, compras e Tempo de Uso.",
          "Google: login com o Google, e modelos Gemini para o estudo com IA.",
          "Alibaba Cloud: modelos Qwen para o estudo com IA.",
          "Vercel: hospedagem do servidor e do site do Goomi, e o AI Gateway.",
          "Neon: o banco de dados do Goomi.",
          "RevenueCat: status da assinatura.",
          "PostHog: análise de uso do produto, só se você ligar.",
        ],
      },
      {
        id: "sharing-other",
        heading: "Quando mais podemos divulgá-los",
        body: [
          "Podemos divulgar dados se uma ordem legal válida exigir, ou para proteger a segurança dos usuários ou do público. Se o Goomi for transferido para uma empresa que controlamos ou para um novo dono, seus dados vão junto e continuam protegidos por esta política, e avisaremos você antes.",
        ],
      },
      {
        id: "transfers",
        heading: "Transferência internacional de dados",
        body: [
          "O servidor do Goomi, o banco de dados e a maioria dos operadores ficam nos Estados Unidos, então seus dados podem ser tratados fora do Brasil. Nós nos apoiamos nos contratos de tratamento de dados que esses operadores oferecem, que incluem cláusulas contratuais padrão quando a lei as exige. No estudo com IA, a tela de consentimento também avisa que seu texto será processado no exterior.",
        ],
      },
      {
        id: "retention",
        heading: "Por quanto tempo guardamos",
        bullets: [
          "Sua conta: até você excluí-la.",
          "Materiais de estudo e as perguntas criadas com eles: até você removê-los ou excluir sua conta.",
          "Contadores de uso da sua conta: excluídos com a conta. Os contadores de um ID de instalação aleatório guardam só números por dia ou por mês e não estão ligados a você.",
          "Registros de custo de processamento com IA: mantidos para fins contábeis, mas desvinculados da sua conta quando você a exclui.",
          "Registros do servidor: por pouco tempo, para segurança e correção de erros.",
          "Backups: dados excluídos podem permanecer nos backups do nosso provedor de banco de dados até serem substituídos, e nunca são restaurados no Goomi.",
        ],
      },
      {
        id: "security",
        heading: "Segurança",
        body: [
          "Os dados trafegam criptografados entre o app e o servidor. O banco de dados só aceita o servidor do Goomi, e sua sessão fica no armazenamento seguro do iPhone. Nenhum sistema é perfeitamente seguro, mas se um incidente colocar seus dados em risco, avisaremos você e a ANPD, como a lei exige.",
        ],
      },
      {
        id: "children",
        heading: "Idade",
        body: [
          "O Goomi é para pessoas a partir de 13 anos. Se você for menor de idade, use o Goomi com a autorização dos seus pais ou responsáveis. Menores de 13 anos não devem criar uma conta.",
          `Não coletamos intencionalmente dados pessoais de menores de 13 anos. Se você acredita que uma criança criou uma conta, escreva para ${SUPPORT_EMAIL} e nós a excluiremos.`,
        ],
      },
      {
        id: "rights",
        heading: "Seus direitos",
        body: [
          `Onde quer que você more, pode pedir uma cópia do que o servidor do Goomi guarda sobre você, pedir correção ou exclusão, receber os dados em formato portável e revogar qualquer consentimento que tenha dado. Escreva para ${SUPPORT_EMAIL} a partir do e-mail ligado à sua conta. Respondemos pedidos de acesso em até 10 dias e pedidos de correção ou exclusão em até 5 dias úteis, e podemos pedir que você confirme sua identidade. Exercer esses direitos não muda a forma como tratamos você.`,
        ],
        bullets: [
          "Brasil (LGPD): você tem os direitos do artigo 18, incluindo a confirmação de que tratamos seus dados, o acesso, a correção, a anonimização, o bloqueio ou a eliminação de dados desnecessários, a portabilidade, a informação sobre com quem compartilhamos seus dados, a revogação do consentimento e a revisão de decisões automatizadas. Você pode peticionar à ANPD (Autoridade Nacional de Proteção de Dados).",
          "Argentina (Lei 25.326): você pode acessar seus dados gratuitamente em intervalos de pelo menos seis meses, a menos que demonstre interesse legítimo em fazê-lo antes (artigo 14, inciso 3). A Agencia de Acceso a la Información Pública, como órgão de controle da Lei 25.326, atende denúncias e reclamações de quem tiver seus direitos de proteção de dados violados.",
          "Resto da América Latina: você tem os direitos previstos na lei de proteção de dados do seu país e pode reclamar à respectiva autoridade.",
          "Estados Unidos: não vendemos nem compartilhamos dados pessoais conforme definido pelas leis estaduais de privacidade, e não os usamos para publicidade direcionada nem para criar perfis. Se recusarmos um pedido, você pode recorrer respondendo à nossa resposta, e explicaremos o resultado.",
          "União Europeia, Reino Unido e Suíça: você também tem o direito de se opor ao tratamento baseado em legítimo interesse e de reclamar à sua autoridade de proteção de dados.",
        ],
      },
      {
        id: "choices",
        heading: "Suas opções no app",
        bullets: [
          "Ligue ou desligue a análise de uso em Settings → Privacy.",
          "Desligue o acesso do Goomi ao Tempo de Uso nos Ajustes do iOS quando quiser.",
          "Remova qualquer material de estudo no Goomi para excluí-lo do servidor.",
          "Exclua sua conta em Settings → Account.",
          "Use Reset Goomi on this phone, em Settings, para apagar tudo o que está salvo no seu aparelho. Apagar o app faz o mesmo.",
        ],
        links: [{ label: "Como excluir sua conta", href: "/pt/delete-account" }],
      },
      {
        id: "changes",
        heading: "Mudanças nesta política",
        body: [
          "Se o que o Goomi faz com seus dados mudar, esta página muda primeiro, com uma nova data no topo. Se a mudança for relevante, também avisaremos você no app antes que ela entre em vigor, e pediremos seu consentimento de novo quando a lei exigir.",
        ],
      },
    ],
  },
  terms: {
    eyebrow: "Termos de uso",
    title: "As regras, em palavras simples.",
    lead: "O acordo entre você e o Goomi. Deixamos o mais curto que conseguimos, mas leia: ele explica sua assinatura, seu material e o que acontece se algo der errado.",
    notice:
      "Se você mora nos Estados Unidos, a seção “Disputas nos Estados Unidos” exige arbitragem individual e renuncia a ações coletivas e julgamento por júri, salvo se você optar por sair em 30 dias. Se você mora no Brasil, nenhuma arbitragem é imposta: valem o Código de Defesa do Consumidor e o foro do seu domicílio.",
    pose: "think",
    metaTitle: "Termos de uso",
    metaDescription:
      "O acordo para usar o Goomi e o Goomi Plus: quem pode usar, assinaturas e reembolsos, seu material de estudo, perguntas feitas com IA, responsabilidade e como as disputas são resolvidas.",
    sections: [
      {
        id: "agreement",
        heading: "Quem somos e este acordo",
        body: [
          `O Goomi é criado e mantido por ${OWNER.name}, desenvolvedor independente com domicílio na ${OWNER.country} (“nós”). Estes termos são o acordo entre você e nós para usar o app Goomi, o Goomi Plus e o goomi.app.`,
          "Você os aceita quando toca num botão que diz que concorda, quando assina ou quando continua usando o Goomi depois de lê-los. Se não concordar, por favor não use o Goomi. A política de privacidade explica como tratamos seus dados e faz parte deste acordo.",
        ],
        links: [{ label: "Política de privacidade", href: "/pt/privacy" }],
      },
      {
        id: "age",
        heading: "Quem pode usar o Goomi",
        body: [
          "Você precisa ter pelo menos 13 anos. Se for menor de idade, precisa da autorização dos seus pais ou responsáveis, que aceitam estes termos por você. Menores de 13 anos não devem criar uma conta.",
        ],
      },
      {
        id: "using",
        heading: "O que o Goomi é, e o que não é",
        body: [
          "O Goomi transforma os momentos em que você vai abrir certos apps em desafios de aprendizado curtos. Os momentos nos apps dependem do Tempo de Uso da Apple, que você pode desligar quando quiser. Eles são um empurrão amigável, não uma trava: podem ser contornados, o iOS decide o momento exato em que aparecem e podem parar de funcionar se a Apple mudar o Tempo de Uso.",
          "O Goomi não é controle parental, nem tratamento médico ou de saúde mental, nem garantia de que você vai usar menos o celular ou tirar notas melhores. Os resultados dependem de você.",
        ],
      },
      {
        id: "account",
        heading: "Sua conta",
        body: [
          "Você pode usar o Goomi sem conta. Se entrar com a Apple ou o Google, mantenha essa conta segura: o que acontece na sua conta Goomi é sua responsabilidade. Você pode excluir sua conta no app quando quiser.",
        ],
      },
      {
        id: "plus",
        heading: "Goomi Plus",
        bullets: [
          "O Goomi Plus é uma assinatura com renovação automática vendida pela Apple na App Store. A Apple cobra no seu Apple ID quando você confirma a compra.",
          "Ela é renovada automaticamente pelo mesmo preço e período, a menos que você cancele pelo menos 24 horas antes do fim do período atual. A renovação é cobrada nas 24 horas anteriores ao fim do período.",
          "Os preços e a duração dos planos mostrados no app vêm da App Store, na sua moeda local, com os impostos que a Apple aplicar. Se mudarmos o preço, a Apple avisa você antes e, quando a lei exige, pede seu consentimento antes de cobrar o novo preço.",
          "O teste grátis, quando oferecido, depende da sua elegibilidade na App Store. Se você não cancelar antes do fim do teste, a assinatura paga começa. Se assinar durante um teste, a parte não usada termina.",
          "Você pode cancelar nos ajustes da sua conta da App Store. O Goomi Plus continua ativo até o fim do período que você pagou. Apagar o app ou sua conta Goomi não cancela a assinatura.",
          "Os recursos e limites do plano, como quantos materiais você pode adicionar por mês, aparecem no app e podem mudar. Se uma mudança tirar algo que você já pagou, ela vale a partir da próxima renovação.",
        ],
        links: [{ label: "Gerenciar assinaturas", href: APPLE_SUBSCRIPTIONS }],
      },
      {
        id: "refunds",
        heading: "Reembolsos e direito de arrependimento",
        body: [
          "Como a assinatura é vendida pela Apple, os reembolsos são pedidos à Apple e decididos segundo as políticas dela. Nós não conseguimos emiti-los, mas ajudamos se você nos escrever.",
          "Pelo artigo 49 do Código de Defesa do Consumidor, você pode desistir de uma compra feita pela internet em até 7 dias, sem precisar dar motivo. Você pode exercer esse direito pedindo o reembolso à Apple nesse prazo, ou escrevendo para nós, e ajudamos você no processo. Nada nestes termos limita esse direito. Em outros países o prazo pode ser diferente: 10 dias na Argentina, 14 dias na União Europeia.",
        ],
        links: [{ label: "Pedir reembolso à Apple", href: APPLE_REFUNDS }],
      },
      {
        id: "restore",
        heading: "Restaurar uma compra",
        body: ["Reinstalou o Goomi ou trocou de iPhone com o mesmo Apple ID? Use Restore purchases em Settings → Subscription."],
      },
      {
        id: "your-material",
        heading: "Seu material",
        body: [
          "As anotações, PDFs, slides e fotos que você adiciona continuam sendo seus. Quando você escolhe o estudo com IA, nos autoriza a copiar, processar e guardar esse material só para criar suas perguntas de estudo e mostrá-las a você, como descreve a política de privacidade. Essa autorização termina quando você remove o material ou exclui sua conta.",
          "Adicione só material que você tem o direito de usar, como suas próprias anotações ou material de curso com o qual você pode estudar. Não adicione nada ilegal nem nada que viole direitos de outras pessoas.",
        ],
      },
      {
        id: "content",
        heading: "Desafios e perguntas feitas com IA",
        body: [
          "Os desafios são criados a partir de coleções abertas como o Wikidata e o Art Institute of Chicago, e cada um mostra sua fonte. As perguntas de estudo são feitas por IA a partir do material que você adiciona. A IA pode errar ou deixar coisas de fora, então confira o que for importante no seu próprio material e com seus professores.",
          "Nada no Goomi é orientação profissional, médica, jurídica ou acadêmica.",
        ],
      },
      {
        id: "rules",
        heading: "Uso justo",
        body: ["Use o Goomi para o seu próprio aprendizado e dentro da lei. Não:"],
        bullets: [
          "Tente interromper ou sobrecarregar o serviço do Goomi, nem contornar seus limites ou seu paywall.",
          "Acesse contas ou dados de outras pessoas.",
          "Copie, revenda ou extraia de forma automatizada o conteúdo ou as perguntas do Goomi, nem os use para treinar modelos de IA.",
          "Faça engenharia reversa do app, exceto quando a lei permitir.",
        ],
      },
      {
        id: "ours",
        heading: "O que é nosso",
        body: [
          "O nome, o mascote, o design, o código e o conteúdo original do Goomi são nossos. Damos a você uma licença pessoal e intransferível para usar o app em aparelhos que você possui ou controla, conforme estes termos e as regras da Apple. O conteúdo de coleções abertas mantém sua própria licença. Se você nos enviar ideias ou sugestões, podemos usá-las sem lhe dever nada.",
        ],
      },
      {
        id: "third-party",
        heading: "Serviços de outras empresas",
        body: [
          "O Goomi depende da Apple (App Store, Tempo de Uso, login com a Apple), do Google (login com o Google) e dos operadores listados na política de privacidade. Os termos deles regem o uso que você faz desses serviços, e não somos responsáveis pelas falhas ou decisões deles.",
        ],
      },
      {
        id: "changes",
        heading: "Mudanças e encerramento",
        body: [
          "Continuamos melhorando o Goomi, então recursos podem mudar ou ser removidos. Se mudarmos estes termos de forma relevante, vamos atualizar esta página com uma nova data e avisar você no app antes que a mudança entre em vigor. Se não concordar com os novos termos, você pode parar de usar o Goomi e cancelar sua assinatura.",
          "Você pode parar de usar o Goomi quando quiser. Podemos suspender ou encerrar o acesso de quem descumprir estes termos de forma grave ou repetida, e explicaremos o motivo, salvo se a lei ou a segurança impedirem. Se um dia encerrarmos o Goomi, avisaremos você no app, e seus dados serão excluídos como descreve a política de privacidade.",
        ],
      },
      {
        id: "warranty",
        heading: "Sem garantias",
        body: [
          "Trabalhamos para que o Goomi esteja disponível, correto e seguro, mas ele é oferecido “no estado em que se encontra” e “conforme disponível”. Na medida em que a lei permitir, não prometemos que ele sempre funcionará sem interrupções ou erros, nem que atenderá a todas as suas necessidades.",
        ],
      },
      {
        id: "liability",
        heading: "Limites de responsabilidade",
        body: [
          "Na medida em que a lei permitir, não respondemos por danos indiretos, incidentais ou consequentes, como perda de dados, oportunidades perdidas ou resultados de provas, e nossa responsabilidade total por qualquer reclamação ligada ao Goomi se limita ao maior destes valores: o que você pagou pelo Goomi Plus nos 12 meses anteriores à reclamação, ou USD 50.",
          "Nada disso limita a responsabilidade por fraude, por danos que causarmos com dolo ou culpa grave, nem qualquer direito que o Código de Defesa do Consumidor ou outra lei de proteção ao consumidor lhe garanta e que não possa ser renunciado por contrato. Para consumidores no Brasil, estes limites só valem na medida em que o Código de Defesa do Consumidor permitir.",
        ],
      },
      {
        id: "disputes",
        heading: "Se algo der errado",
        body: [
          `A maioria dos problemas se resolve com uma mensagem. Antes de iniciar qualquer reclamação judicial, escreva para ${SUPPORT_EMAIL} com seu nome, o e-mail ligado à sua conta (se tiver uma) e o que você gostaria que fizéssemos. Vamos tentar resolver com você em até 60 dias. Esse passo não suspende nenhum prazo legal e não substitui o Procon ou o consumidor.gov.br, se você preferir ir por lá.`,
        ],
      },
      {
        id: "disputes-us",
        heading: "Disputas nos Estados Unidos",
        body: [
          "Esta seção vale somente para quem mora nos Estados Unidos. Leia com atenção: ela afeta seus direitos.",
          "Arbitragem. Se não conseguirmos resolver uma disputa de forma amigável, você e nós concordamos em resolver qualquer disputa ligada ao Goomi ou a estes termos por arbitragem final e vinculante, administrada pela American Arbitration Association (AAA) segundo suas Consumer Arbitration Rules. A arbitragem pode acontecer online, por telefone ou no condado onde você mora. As taxas seguem as Consumer Rules da AAA, e você não pagará mais para iniciá-la do que pagaria num tribunal. Esta seção é regida pelo Federal Arbitration Act.",
          "Exceções. Qualquer das partes pode levar uma reclamação individual a um tribunal de pequenas causas (small claims court), e qualquer das partes pode ir ao tribunal por uso indevido de propriedade intelectual.",
          "Sem ações coletivas. Você e nós só podemos apresentar reclamações individualmente, não como autor ou membro de ação coletiva, consolidada ou representativa, e o árbitro não pode juntar reclamações de pessoas diferentes. Você e nós renunciamos ao direito a julgamento por júri.",
          "Pedidos em massa. Se 25 ou mais pedidos de arbitragem semelhantes forem apresentados pelos mesmos advogados ou organizações, ou com a ajuda deles, serão administrados em lotes segundo as Mass Arbitration Supplementary Rules da AAA, e o prazo prescricional fica suspenso para os pedidos que aguardam num lote.",
          `Opção de saída. Você pode sair deste acordo de arbitragem escrevendo para ${SUPPORT_EMAIL} em até 30 dias depois de aceitar estes termos pela primeira vez, com seu nome e o assunto “Arbitration opt-out”. Sair não afeta o resto destes termos.`,
          "Se a renúncia a ações coletivas for considerada inválida para uma reclamação, essa reclamação vai ao tribunal e este acordo de arbitragem não se aplica a ela. Qualquer pedido de tutela inibitória de interesse público que não possa ser renunciado é decidido no tribunal depois de terminada a arbitragem individual.",
        ],
      },
      {
        id: "disputes-elsewhere",
        heading: "Disputas em outros lugares e lei aplicável",
        bullets: [
          "Brasil: estes termos seguem o Código de Defesa do Consumidor (Lei 8.078/1990). Você pode levar qualquer reclamação ao foro do seu domicílio ou ao Procon, e nenhuma arbitragem é imposta a você.",
          "Argentina: estes termos seguem a Lei 24.240 de Defesa do Consumidor. Você pode levar qualquer reclamação aos tribunais do seu domicílio ou às autoridades de defesa do consumidor.",
          "Resto da América Latina, União Europeia e Reino Unido: você mantém as proteções da lei do lugar onde mora e pode apresentar reclamações aos tribunais e autoridades de consumo de lá.",
          `Em qualquer outro lugar, e onde sua lei local permitir a escolha: estes termos são regidos pelas leis da República Argentina, e são competentes os tribunais ordinários da ${OWNER.venue}.`,
        ],
      },
      {
        id: "apple",
        heading: "Condições que a Apple pede para incluir",
        body: [
          "Estes termos são entre você e nós, não com a Apple. A Apple não é responsável pelo Goomi nem pelo seu conteúdo, e não tem obrigação de oferecer manutenção ou suporte a ele. Se o Goomi não cumprir uma garantia aplicável, você pode avisar a Apple, e a Apple reembolsará o que você pagou por ele; na medida em que a lei permitir, a Apple não tem nenhuma outra obrigação de garantia sobre o Goomi.",
          "Nós, e não a Apple, somos responsáveis por atender às reclamações sobre o Goomi, incluindo as de responsabilidade pelo produto, de descumprimento de exigências legais ou regulatórias, de defesa do consumidor e privacidade, e de violação de propriedade intelectual de terceiros. Você confirma que não está num país sujeito a embargo do Governo dos Estados Unidos nem em uma lista de partes proibidas ou restritas desse Governo.",
          "A Apple e suas subsidiárias são terceiras beneficiárias destes termos e podem fazê-los valer contra você. O Contrato de Licença de Usuário Final padrão da Apple também se aplica ao seu uso do Goomi. Se ele conflitar com estes termos, prevalecem estes termos onde a lei permitir.",
        ],
        links: [{ label: "EULA padrão da Apple", href: APPLE_EULA }],
      },
      {
        id: "general",
        heading: "O restante",
        body: [
          "Se um tribunal considerar inválida uma parte destes termos, o restante continua valendo. Se não exigirmos o cumprimento de uma parte imediatamente, não estamos renunciando a ela. Você não pode transferir estes termos para outra pessoa. Nós podemos transferi-los para uma empresa que controlamos, por exemplo uma que criarmos para cuidar do Goomi, ou para um novo dono do Goomi, e seus direitos continuam os mesmos.",
          "Estes termos estão disponíveis em inglês, espanhol e português. Se você mora no Brasil, prevalece a versão em português.",
        ],
      },
    ],
  },
  deleteAccount: {
    eyebrow: "Excluir sua conta",
    title: "Sair está a um toque.",
    lead: "Como excluir sua conta e seus dados do Goomi, o que é excluído e o que guardamos.",
    pose: "wave",
    metaTitle: "Excluir sua conta Goomi",
    metaDescription: "Como excluir sua conta Goomi pelo app ou por e-mail, quais dados são excluídos, quais são mantidos e por quanto tempo.",
    sections: [
      {
        id: "in-app",
        heading: "Exclua pelo app",
        bullets: [
          "Abra o Goomi e vá em Settings.",
          "Em Account, toque em Delete account.",
          "Confirme. Se você entrou há algum tempo, a Apple ou o Google pedem que você confirme que é você. A exclusão é imediata.",
        ],
      },
      {
        id: "by-email",
        heading: "Não tem mais o app?",
        body: [
          `Escreva para ${SUPPORT_EMAIL} a partir do e-mail ligado à sua conta Goomi, com o assunto “Excluir minha conta”. Se você usou o “Ocultar Meu E-mail” da Apple, escreva do e-mail do seu Apple ID e nos avise, para encontrarmos sua conta. Podemos pedir que você confirme sua identidade, e excluiremos a conta em até 5 dias úteis.`,
        ],
      },
      {
        id: "deleted",
        heading: "O que é excluído",
        bullets: [
          "Sua conta: ID de usuário, nome e e-mail, e o vínculo de login com a Apple ou o Google.",
          "Todos os seus materiais de estudo no servidor: texto, trechos, conceitos e perguntas.",
          "Seus contadores de uso e o status do Goomi Plus no nosso servidor.",
        ],
      },
      {
        id: "kept",
        heading: "O que guardamos",
        bullets: [
          "Registros de custo de processamento com IA, desvinculados de você, para fins contábeis.",
          "Dados excluídos podem permanecer nos backups do nosso provedor de banco de dados até serem substituídos, e nunca são restaurados no Goomi.",
          "A Apple e o RevenueCat mantêm seus próprios registros das suas compras, segundo as políticas deles.",
        ],
      },
      {
        id: "phone",
        heading: "Os dados no seu iPhone",
        body: [
          "Seu progresso e seus ajustes ficam no seu celular, não no nosso servidor. Para apagá-los, use Settings → Reset Goomi on this phone, ou apague o app.",
        ],
      },
      {
        id: "subscription",
        heading: "Sua assinatura",
        body: [
          "Excluir sua conta não cancela o Goomi Plus. Cancele nos ajustes da sua conta da App Store para não ser cobrado de novo.",
        ],
        links: [{ label: "Gerenciar assinaturas", href: APPLE_SUBSCRIPTIONS }],
      },
    ],
  },
};
