import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type Lang = "pt" | "en" | "es" | "fr" | "zh" | "ar";

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

const RTL_LANGS: Lang[] = ["ar"];

const STORAGE_KEY = "ingenium_lang";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, fallbackPT: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/** Translations dict. Keys are stable identifiers; PT comes from inline fallback. */
const dict: Record<string, Partial<Record<Lang, string>>> = {
  // ── NAV ─────────────────────────────────────────────────────
  "nav.home": { en: "Home", es: "Inicio", fr: "Accueil", zh: "首页", ar: "الرئيسية" },
  "nav.how": { en: "How it works", es: "Cómo funciona", fr: "Comment ça marche", zh: "运作方式", ar: "كيف يعمل" },
  "nav.services": { en: "Services", es: "Servicios", fr: "Services", zh: "服务", ar: "الخدمات" },
  "nav.contact": { en: "Contact us", es: "Contacto", fr: "Contactez-nous", zh: "联系我们", ar: "اتصل بنا" },
  "nav.login": { en: "Sign in", es: "Entrar", fr: "Connexion", zh: "登录", ar: "تسجيل الدخول" },
  "nav.signup": { en: "Create account", es: "Crear cuenta", fr: "Créer un compte", zh: "创建账户", ar: "إنشاء حساب" },
  "nav.area": { en: "My area", es: "Mi área", fr: "Mon espace", zh: "我的空间", ar: "حسابي" },
  "nav.menu": { en: "Menu", es: "Menú", fr: "Menu", zh: "菜单", ar: "القائمة" },

  // ── HERO ────────────────────────────────────────────────────
  "hero.badge": {
    en: "Capital raising · Governance · Underwriting · For developers",
    es: "Captación · Gobernanza · Underwriting · Para promotoras",
    fr: "Levée de fonds · Gouvernance · Underwriting · Pour promoteurs",
    zh: "募资 · 治理 · 风险评估 · 面向开发商",
    ar: "جمع رأس المال · الحوكمة · التقييم · للمطورين",
  },
  "hero.title.part1": { en: "Structure your", es: "Estructura tu", fr: "Structurez votre", zh: "构建您的", ar: "نظّم" },
  "hero.title.highlight": { en: "operation", es: "operación", fr: "opération", zh: "项目", ar: "عمليتك" },
  "hero.title.part2": { en: "ready to raise.", es: "lista para captar.", fr: "prête à lever.", zh: "为融资做好准备。", ar: "الجاهزة لجمع التمويل." },
  "hero.subtitle": {
    en: "Ingenium is the institutional layer that small and mid-sized real estate developers use to organize SPVs, improve underwriting, reduce perceived risk and increase the chance of funding.",
    es: "Ingenium es la capa institucional que pequeñas y medianas promotoras usan para organizar SPVs, mejorar underwriting, reducir el riesgo percibido y aumentar la posibilidad de financiación.",
    fr: "Ingenium est la couche institutionnelle utilisée par les promoteurs immobiliers de petite et moyenne taille pour structurer les SPV, améliorer l'underwriting, réduire le risque perçu et augmenter les chances de financement.",
    zh: "Ingenium 是中小型房地产开发商用以组织 SPV、改善承销、降低感知风险并提高融资机会的机构化平台。",
    ar: "Ingenium هي الطبقة المؤسسية التي تستخدمها شركات التطوير العقاري الصغيرة والمتوسطة لتنظيم الشركات ذات الغرض الخاص، وتحسين التقييم، وتقليل المخاطر المتصورة، وزيادة فرص التمويل.",
  },
  "hero.cta.signup": { en: "Get started free", es: "Comenzar gratis", fr: "Commencer gratuitement", zh: "免费开始", ar: "ابدأ مجانًا" },
  "hero.cta.area": { en: "Go to my area", es: "Ir a mi área", fr: "Aller à mon espace", zh: "进入我的空间", ar: "اذهب إلى حسابي" },
  "hero.cta.how": { en: "How it works", es: "Cómo funciona", fr: "Comment ça marche", zh: "运作方式", ar: "كيف يعمل" },
  "hero.trust.lgpd": { en: "LGPD & GDPR", es: "LGPD & GDPR", fr: "LGPD & GDPR", zh: "LGPD 与 GDPR", ar: "LGPD و GDPR" },
  "hero.trust.encrypted": { en: "Encrypted data", es: "Datos cifrados", fr: "Données chiffrées", zh: "数据加密", ar: "بيانات مشفّرة" },
  "hero.trust.match": { en: "Match in seconds", es: "Match en segundos", fr: "Match en secondes", zh: "数秒匹配", ar: "مطابقة في ثوانٍ" },
  "hero.stats.funds": { en: "funds in pool", es: "fondos en el pool", fr: "fonds dans le pool", zh: "资金池", ar: "صناديق في التجمع" },
  "hero.stats.capital": { en: "capital mapped", es: "capital mapeado", fr: "capital cartographié", zh: "已映射资本", ar: "رأس المال المُحدَّد" },
  "hero.stats.segments": { en: "segments covered", es: "segmentos cubiertos", fr: "segments couverts", zh: "覆盖领域", ar: "قطاعات مشمولة" },

  // ── COMO FUNCIONA ──────────────────────────────────────────
  "how.eyebrow": { en: "Process", es: "Proceso", fr: "Processus", zh: "流程", ar: "العملية" },
  "how.title": { en: "How it works", es: "Cómo funciona", fr: "Comment ça marche", zh: "运作方式", ar: "كيف يعمل" },
  "how.subtitle": {
    en: "Three steps to turn your operation into something an institutional fund will accept.",
    es: "Tres pasos para transformar tu operación en algo que un fondo institucional acepte.",
    fr: "Trois étapes pour transformer votre opération en quelque chose qu'un fonds institutionnel acceptera.",
    zh: "通过三步将您的项目转变为机构基金愿意接受的形式。",
    ar: "ثلاث خطوات لتحويل عمليتك إلى شيء يقبله الصندوق المؤسسي.",
  },
  "how.step1.title": { en: "Tell us about your operation", es: "Cuéntanos tu operación", fr: "Parlez-nous de votre opération", zh: "介绍您的项目", ar: "أخبرنا عن عمليتك" },
  "how.step1.desc": {
    en: "Memorandum, feasibility, SPV spreadsheet — send what you have. Copilot organizes everything in the format the fund expects to see.",
    es: "Memorial, viabilidad, hoja de SPV — envía lo que tengas. El Copilot organiza todo en el formato que el fondo espera ver.",
    fr: "Mémoire, étude de faisabilité, tableur SPV — envoyez ce que vous avez. Copilot organise tout au format attendu par le fonds.",
    zh: "项目说明、可行性报告、SPV 表格——发送您手头的任何资料。Copilot 会按基金期望的格式整理一切。",
    ar: "المذكرة، دراسة الجدوى، جدول الشركة ذات الغرض الخاص — أرسل ما لديك. سيقوم Copilot بتنظيم كل شيء بالصيغة التي يتوقعها الصندوق.",
  },
  "how.step2.title": { en: "AI shows what's missing", es: "La IA indica qué falta", fr: "L'IA identifie ce qu'il manque", zh: "AI 指出缺失之处", ar: "الذكاء الاصطناعي يكشف ما ينقص" },
  "how.step2.desc": {
    en: "Readiness, compliance and pending items calculated on the fly. You discover exactly what to adjust to be investable.",
    es: "Readiness, compliance y pendientes calculados al instante. Descubres exactamente qué ajustar para ser invertible.",
    fr: "Readiness, conformité et points en attente calculés à la volée. Vous découvrez exactement quoi ajuster pour être investissable.",
    zh: "即时计算成熟度、合规性与待处理项,清晰呈现需要调整的内容以获得投资价值。",
    ar: "يتم حساب الجاهزية والامتثال والبنود المعلقة فورًا. ستكتشف بالضبط ما يجب تعديله لتصبح قابلًا للاستثمار.",
  },
  "how.step3.title": { en: "We connect you with the right funds", es: "Te conectamos con los fondos adecuados", fr: "Nous vous connectons aux bons fonds", zh: "为您对接合适的基金", ar: "نربطك بالصناديق المناسبة" },
  "how.step3.desc": {
    en: "The engine cross-checks your thesis, schedule and governance with 300+ funds in the pool — and shows who matches you.",
    es: "El motor cruza tu tesis, cronograma y gobernanza con más de 300 fondos en el pool — y muestra quién encaja contigo.",
    fr: "Le moteur croise votre thèse, votre calendrier et votre gouvernance avec plus de 300 fonds — et montre qui correspond.",
    zh: "引擎将您的投资逻辑、时间表与治理与池内 300+ 基金进行交叉匹配,呈现最匹配方。",
    ar: "يقوم المحرك بمطابقة أطروحتك وجدولك الزمني وحوكمتك مع أكثر من 300 صندوق في التجمع — ويُظهر من يتطابق معك.",
  },

  // ── DASHBOARD PREVIEW ─────────────────────────────────────
  "dash.eyebrow": { en: "Platform", es: "Plataforma", fr: "Plateforme", zh: "平台", ar: "المنصة" },
  "dash.title.l1": { en: "Institutional analytics", es: "Analytics institucional", fr: "Analytique institutionnelle", zh: "机构级分析", ar: "تحليلات مؤسسية" },
  "dash.title.l2": { en: "in real time", es: "en tiempo real", fr: "en temps réel", zh: "实时呈现", ar: "في الوقت الفعلي" },
  "dash.subtitle": {
    en: "Executive dashboard with performance KPIs, match scoring, opportunity pipeline and compliance indicators — all on one screen.",
    es: "Dashboard ejecutivo con KPIs de desempeño, scoring de matches, pipeline de oportunidades e indicadores de compliance — todo en una pantalla.",
    fr: "Tableau de bord exécutif avec KPI, scoring de matches, pipeline d'opportunités et indicateurs de conformité — tout sur un écran.",
    zh: "高管仪表板,涵盖绩效 KPI、匹配评分、机会管道与合规指标——尽在一屏。",
    ar: "لوحة تحكم تنفيذية مع مؤشرات الأداء، وتقييم المطابقات، وخط الفرص، ومؤشرات الامتثال — كل ذلك في شاشة واحدة.",
  },
  "dash.li.1": { en: "Compatibility score per asset", es: "Score de compatibilidad por activo", fr: "Score de compatibilité par actif", zh: "每个资产的兼容性评分", ar: "نتيجة التوافق لكل أصل" },
  "dash.li.2": { en: "Kanban opportunity pipeline", es: "Pipeline kanban de oportunidades", fr: "Pipeline kanban d'opportunités", zh: "看板式机会管道", ar: "خط الفرص بأسلوب كانبان" },
  "dash.li.3": { en: "Instant match alerts", es: "Alertas de nuevos matches instantáneas", fr: "Alertes de nouveaux matchs instantanées", zh: "即时匹配提醒", ar: "تنبيهات فورية بالمطابقات الجديدة" },
  "dash.li.4": { en: "Automated due-diligence reports", es: "Informes de due diligence automatizados", fr: "Rapports de due diligence automatisés", zh: "自动化尽职调查报告", ar: "تقارير العناية الواجبة الآلية" },
  "dash.cta": { en: "See my dashboard", es: "Ver mi dashboard", fr: "Voir mon tableau de bord", zh: "查看我的仪表板", ar: "اعرض لوحة التحكم" },

  // ── SERVIÇOS ───────────────────────────────────────────────
  "svc.eyebrow": { en: "Services", es: "Servicios", fr: "Services", zh: "服务", ar: "الخدمات" },
  "svc.title": { en: "Intelligence for every stage", es: "Inteligencia para cada etapa", fr: "Intelligence pour chaque étape", zh: "覆盖每个阶段的智能", ar: "ذكاء لكل مرحلة" },
  "svc.subtitle": {
    en: "Modular solutions that adapt to your fund, your thesis and your investment moment.",
    es: "Soluciones modulares que se adaptan a tu fondo, tu tesis y tu momento de inversión.",
    fr: "Solutions modulaires qui s'adaptent à votre fonds, votre thèse et votre moment d'investissement.",
    zh: "模块化解决方案,匹配您的基金、投资逻辑与投资时机。",
    ar: "حلول معيارية تتكيف مع صندوقك وأطروحتك ولحظة استثمارك.",
  },
  "svc.learnMore": { en: "Learn more", es: "Saber más", fr: "En savoir plus", zh: "了解更多", ar: "اعرف المزيد" },
  "svc.matchmaking.title": { en: "AI-assisted fundraising", es: "Captación asistida por IA", fr: "Levée de fonds assistée par IA", zh: "AI 辅助募资", ar: "جمع تمويل بمساعدة الذكاء الاصطناعي" },
  "svc.matchmaking.short": {
    en: "We connect your operation to the funds whose thesis truly fits — once it's ready.",
    es: "Conectamos tu operación con los fondos cuya tesis realmente encaja — cuando esté lista.",
    fr: "Nous connectons votre opération aux fonds dont la thèse correspond vraiment — une fois prête.",
    zh: "在您准备就绪后,将您的项目与真正契合的基金对接。",
    ar: "نربط عمليتك بالصناديق التي تتطابق أطروحتها فعليًا — بعد أن تصبح جاهزة.",
  },
  "svc.under.title": { en: "Institutional underwriting", es: "Underwriting institucional", fr: "Underwriting institutionnel", zh: "机构级承销", ar: "التقييم المؤسسي" },
  "svc.under.short": {
    en: "Readiness score, compliance and automated pending items for your SPV.",
    es: "Score de readiness, compliance y pendientes automáticos para tu SPV.",
    fr: "Score de readiness, conformité et points en attente automatiques pour votre SPV.",
    zh: "为您的 SPV 提供成熟度评分、合规性与自动化待办事项。",
    ar: "نتيجة الجاهزية والامتثال والبنود المعلقة الآلية لشركتك ذات الغرض الخاص.",
  },
  "svc.gov.title": { en: "Continuous governance", es: "Gobernanza continua", fr: "Gouvernance continue", zh: "持续治理", ar: "حوكمة مستمرة" },
  "svc.gov.short": {
    en: "Data room, documentation and SPV follow-up — before and after funding.",
    es: "Data room, documentación y seguimiento de SPV — antes y después del funding.",
    fr: "Data room, documentation et suivi de SPV — avant et après le financement.",
    zh: "数据室、文件管理与 SPV 跟踪——融资前后均覆盖。",
    ar: "غرفة بيانات، توثيق ومتابعة الشركة ذات الغرض الخاص — قبل وبعد التمويل.",
  },
  "svc.copilot.title": { en: "Founder Copilot", es: "Copilot del emprendedor", fr: "Copilot de l'entrepreneur", zh: "创始人 Copilot", ar: "مساعد المطوّر" },
  "svc.copilot.short": {
    en: "Strategic assistant that guides structuring, fundraising and fund relations.",
    es: "Asistente estratégico que orienta estructuración, captación y relación con fondos.",
    fr: "Assistant stratégique pour la structuration, la levée de fonds et la relation avec les fonds.",
    zh: "战略助理,指导项目结构化、募资与基金关系。",
    ar: "مساعد استراتيجي يوجّه الهيكلة وجمع التمويل والعلاقات مع الصناديق.",
  },

  // ── MERCADO ────────────────────────────────────────────────
  "mkt.eyebrow": { en: "Market", es: "Mercado", fr: "Marché", zh: "市场", ar: "السوق" },
  "mkt.title.l1": { en: "Institutional capital", es: "Capital institucional", fr: "Capital institutionnel", zh: "机构资本", ar: "رأس المال المؤسسي" },
  "mkt.title.l2": { en: "meeting the best assets", es: "encontrando los mejores activos", fr: "rencontrant les meilleurs actifs", zh: "对接最优质资产", ar: "يلتقي بأفضل الأصول" },
  "mkt.subtitle": {
    en: "From logistics warehouses to corporate offices — Ingenium knows every segment of the Brazilian real-estate market.",
    es: "De galpones logísticos a oficinas corporativas — Ingenium conoce cada segmento del mercado inmobiliario brasileño.",
    fr: "Des entrepôts logistiques aux bureaux corporate — Ingenium connaît chaque segment du marché immobilier brésilien.",
    zh: "从物流仓库到企业写字楼——Ingenium 熟悉巴西房地产市场的每一个细分领域。",
    ar: "من المستودعات اللوجستية إلى المكاتب التجارية — تعرف Ingenium كل قطاع في سوق العقارات البرازيلي.",
  },
  "mkt.card.offices.label": { en: "Corporate offices", es: "Oficinas corporativas", fr: "Bureaux corporate", zh: "企业写字楼", ar: "المكاتب التجارية" },
  "mkt.card.offices.sub": { en: "São Paulo · High liquidity", es: "São Paulo · Alta liquidez", fr: "São Paulo · Forte liquidité", zh: "圣保罗 · 高流动性", ar: "ساو باولو · سيولة عالية" },
  "mkt.card.logistics.label": { en: "Logistics & industrial", es: "Logístico e industrial", fr: "Logistique & industriel", zh: "物流与工业", ar: "اللوجستيات والصناعي" },
  "mkt.card.logistics.sub": { en: "Greater SP · Anchor leases", es: "Gran SP · Contratos ancla", fr: "Grand SP · Baux d'ancrage", zh: "大圣保罗 · 锚定合约", ar: "ساو باولو الكبرى · عقود مرساة" },
  "mkt.card.resi.label": { en: "Premium residential", es: "Residencial premium", fr: "Résidentiel premium", zh: "高端住宅", ar: "سكني فاخر" },
  "mkt.card.resi.sub": { en: "High GSV · Proven demand", es: "Alto VGV · Demanda comprobada", fr: "Fort VGV · Demande prouvée", zh: "高总销售价值 · 需求验证", ar: "قيمة بيع إجمالية عالية · طلب مُثبت" },

  // ── CTA banner ─────────────────────────────────────────────
  "cta.title.l1": { en: "Ready to make the", es: "¿Listo para hacer el", fr: "Prêt à réaliser le", zh: "准备好达成", ar: "هل أنت مستعد لتحقيق" },
  "cta.title.highlight": { en: "perfect match", es: "match perfecto", fr: "match parfait", zh: "完美匹配", ar: "المطابقة المثالية" },
  "cta.title.q": { en: "?", es: "?", fr: " ?", zh: "?", ar: "؟" },
  "cta.subtitle": {
    en: "Join 300+ funds and hundreds of assets already using AI to invest with more precision.",
    es: "Únete a más de 300 fondos y cientos de activos que ya usan IA para invertir con más precisión.",
    fr: "Rejoignez plus de 300 fonds et des centaines d'actifs qui utilisent déjà l'IA pour investir avec plus de précision.",
    zh: "加入 300+ 基金与数百个资产,他们已在使用 AI 实现更精准的投资。",
    ar: "انضم إلى أكثر من 300 صندوق ومئات الأصول التي تستخدم الذكاء الاصطناعي بالفعل للاستثمار بدقة أكبر.",
  },
  "cta.signup": { en: "Create free account", es: "Crear cuenta gratis", fr: "Créer un compte gratuit", zh: "创建免费账户", ar: "أنشئ حسابًا مجانيًا" },
  "cta.specialist": { en: "Talk to a specialist", es: "Hablar con un especialista", fr: "Parler à un expert", zh: "联系专家", ar: "تحدّث مع خبير" },

  // ── CONTATO ────────────────────────────────────────────────
  "contact.eyebrow": { en: "Contact us", es: "Contacto", fr: "Contactez-nous", zh: "联系我们", ar: "تواصل معنا" },
  "contact.title": { en: "Let's talk", es: "Hablemos", fr: "Discutons", zh: "让我们聊聊", ar: "لنتحدث" },
  "contact.subtitle": {
    en: "Tell us about your thesis or your asset. Our team replies within 24h.",
    es: "Cuéntanos sobre tu tesis o tu activo. Nuestro equipo responde en hasta 24h.",
    fr: "Parlez-nous de votre thèse ou de votre actif. Notre équipe répond sous 24h.",
    zh: "告诉我们您的投资逻辑或资产。我们的团队会在 24 小时内回复。",
    ar: "أخبرنا عن أطروحتك أو أصلك. يردّ فريقنا خلال 24 ساعة.",
  },
  "contact.name": { en: "Your name", es: "Tu nombre", fr: "Votre nom", zh: "您的姓名", ar: "اسمك" },
  "contact.email": { en: "you@email.com", es: "tu@email.com", fr: "vous@email.com", zh: "you@email.com", ar: "you@email.com" },
  "contact.msg": { en: "How can we help?", es: "¿Cómo podemos ayudar?", fr: "Comment pouvons-nous aider ?", zh: "我们能如何帮助您?", ar: "كيف يمكننا المساعدة؟" },
  "contact.send": { en: "Send message", es: "Enviar mensaje", fr: "Envoyer le message", zh: "发送消息", ar: "إرسال الرسالة" },
  "contact.sending": { en: "Sending…", es: "Enviando…", fr: "Envoi…", zh: "发送中…", ar: "جارٍ الإرسال…" },
  "contact.fillAll": { en: "Please fill in all fields", es: "Completa todos los campos", fr: "Remplissez tous les champs", zh: "请填写所有字段", ar: "يرجى ملء جميع الحقول" },
  "contact.sent": { en: "Message sent!", es: "¡Mensaje enviado!", fr: "Message envoyé !", zh: "消息已发送!", ar: "تم إرسال الرسالة!" },
  "contact.sentDesc": { en: "Our team will get back to you shortly.", es: "Nuestro equipo se pondrá en contacto pronto.", fr: "Notre équipe vous recontactera bientôt.", zh: "我们的团队会尽快与您联系。", ar: "سيتواصل معك فريقنا قريبًا." },
  "contact.error": { en: "Send error", es: "Error al enviar", fr: "Erreur d'envoi", zh: "发送错误", ar: "خطأ في الإرسال" },
  "contact.errorDesc": { en: "Please try again in a moment.", es: "Inténtalo de nuevo en unos instantes.", fr: "Réessayez dans un instant.", zh: "请稍后重试。", ar: "حاول مرة أخرى بعد قليل." },
  "contact.email.label": { en: "Email", es: "Correo", fr: "E-mail", zh: "邮箱", ar: "البريد الإلكتروني" },
  "contact.wa.label": { en: "WhatsApp", es: "WhatsApp", fr: "WhatsApp", zh: "WhatsApp", ar: "واتساب" },

  // ── FOOTER ─────────────────────────────────────────────────
  "footer.tagline": {
    en: "Artificial intelligence in service of the institutional real-estate market. LGPD · GDPR · CCPA.",
    es: "Inteligencia artificial al servicio del mercado inmobiliario institucional. LGPD · GDPR · CCPA.",
    fr: "Intelligence artificielle au service du marché immobilier institutionnel. LGPD · GDPR · CCPA.",
    zh: "为机构房地产市场服务的人工智能。LGPD · GDPR · CCPA。",
    ar: "ذكاء اصطناعي في خدمة سوق العقارات المؤسسي. LGPD · GDPR · CCPA.",
  },
  "footer.platform": { en: "Platform", es: "Plataforma", fr: "Plateforme", zh: "平台", ar: "المنصة" },
  "footer.legal": { en: "Legal", es: "Legal", fr: "Légal", zh: "法律", ar: "قانوني" },
  "footer.privacy": { en: "Privacy", es: "Privacidad", fr: "Confidentialité", zh: "隐私", ar: "الخصوصية" },
  "footer.terms": { en: "Terms of use", es: "Términos de uso", fr: "Conditions d'utilisation", zh: "使用条款", ar: "شروط الاستخدام" },
  "footer.rights": { en: "All rights reserved.", es: "Todos los derechos reservados.", fr: "Tous droits réservés.", zh: "保留所有权利。", ar: "جميع الحقوق محفوظة." },
  "footer.status": { en: "All systems operational", es: "Sistemas operando con normalidad", fr: "Tous les systèmes opérationnels", zh: "所有系统运行正常", ar: "جميع الأنظمة تعمل بشكل طبيعي" },

  // ── WhatsApp ────────────────────────────────────────────────
  "wa.label": { en: "WhatsApp", es: "WhatsApp", fr: "WhatsApp", zh: "WhatsApp", ar: "واتساب" },
  "wa.aria": { en: "Talk to us on WhatsApp", es: "Habla con nosotros en WhatsApp", fr: "Parlez-nous sur WhatsApp", zh: "通过 WhatsApp 联系我们", ar: "تحدّث معنا عبر واتساب" },
  "wa.preset": {
    en: "Hi! I came from the Ingenium website.",
    es: "¡Hola! Vengo desde el sitio de Ingenium.",
    fr: "Bonjour ! Je viens du site Ingenium.",
    zh: "你好!我从 Ingenium 网站来。",
    ar: "مرحبًا! جئت من موقع Ingenium.",
  },

  // ── LANGUAGE SWITCHER ──────────────────────────────────────
  "lang.label": { en: "Language", es: "Idioma", fr: "Langue", zh: "语言", ar: "اللغة" },

  // ── LOGIN ──────────────────────────────────────────────────
  "login.title": { en: "Sign in", es: "Entrar", fr: "Connexion", zh: "登录", ar: "تسجيل الدخول" },
  "login.subtitle": { en: "Access your Ingenium area.", es: "Accede a tu área Ingenium.", fr: "Accédez à votre espace Ingenium.", zh: "进入您的 Ingenium 空间。", ar: "ادخل إلى منطقتك في Ingenium." },
  "login.google": { en: "Continue with Google", es: "Continuar con Google", fr: "Continuer avec Google", zh: "使用 Google 继续", ar: "تابع باستخدام جوجل" },
  "login.orEmail": { en: "or with email", es: "o con e-mail", fr: "ou par e-mail", zh: "或使用邮箱", ar: "أو عبر البريد الإلكتروني" },
  "login.email": { en: "Email", es: "Correo", fr: "E-mail", zh: "邮箱", ar: "البريد الإلكتروني" },
  "login.password": { en: "Password", es: "Contraseña", fr: "Mot de passe", zh: "密码", ar: "كلمة المرور" },
  "login.forgot": { en: "Forgot password", es: "Olvidé la contraseña", fr: "Mot de passe oublié", zh: "忘记密码", ar: "نسيت كلمة المرور" },
  "login.forgot.soon": { en: "Feature coming soon.", es: "Funcionalidad próximamente.", fr: "Fonctionnalité à venir.", zh: "功能即将推出。", ar: "الميزة قادمة قريبًا." },
  "login.submit": { en: "Sign in", es: "Entrar", fr: "Se connecter", zh: "登录", ar: "تسجيل الدخول" },
  "login.noAccount": { en: "Don't have an account?", es: "¿Aún no tienes cuenta?", fr: "Pas encore de compte ?", zh: "还没有账户?", ar: "ليس لديك حساب؟" },
  "login.signupLink": { en: "Sign up", es: "Regístrate", fr: "S'inscrire", zh: "注册", ar: "إنشاء حساب" },
  "login.err.fill": { en: "Please enter email and password.", es: "Completa correo y contraseña.", fr: "Saisissez e-mail et mot de passe.", zh: "请输入邮箱和密码。", ar: "أدخل البريد وكلمة المرور." },
  "login.err.fail": { en: "Unable to sign in. Please try again.", es: "No fue posible entrar. Inténtalo de nuevo.", fr: "Connexion impossible. Réessayez.", zh: "无法登录,请重试。", ar: "تعذر تسجيل الدخول. حاول مرة أخرى." },
  "login.security": { en: "Your credentials are protected with bcrypt encryption and httpOnly sessions.", es: "Tus credenciales están protegidas con cifrado bcrypt y sesiones httpOnly.", fr: "Vos identifiants sont protégés par chiffrement bcrypt et sessions httpOnly.", zh: "您的凭证通过 bcrypt 加密与 httpOnly 会话保护。", ar: "بياناتك محميّة بتشفير bcrypt وجلسات httpOnly." },

  // ── CADASTRO ───────────────────────────────────────────────
  "signup.title": { en: "Create account", es: "Crear cuenta", fr: "Créer un compte", zh: "创建账户", ar: "إنشاء حساب" },
  "signup.sub.1": { en: "Do you represent a fund or an asset?", es: "¿Representas un fondo o un activo?", fr: "Représentez-vous un fonds ou un actif ?", zh: "您代表基金还是资产?", ar: "هل تمثل صندوقًا أم أصلًا؟" },
  "signup.sub.2": { en: "Tell us a bit about yourself.", es: "Cuéntanos un poco sobre ti.", fr: "Parlez-nous un peu de vous.", zh: "请介绍一下您自己。", ar: "أخبرنا قليلًا عن نفسك." },
  "signup.sub.3": { en: "Company data to finish.", es: "Datos de la empresa para finalizar.", fr: "Données de l'entreprise pour finaliser.", zh: "请填写公司信息以完成。", ar: "بيانات الشركة لإتمام التسجيل." },
  "signup.step.profile": { en: "Profile", es: "Perfil", fr: "Profil", zh: "档案", ar: "الملف" },
  "signup.step.data": { en: "Data", es: "Datos", fr: "Données", zh: "信息", ar: "البيانات" },
  "signup.step.company": { en: "Company", es: "Empresa", fr: "Entreprise", zh: "公司", ar: "الشركة" },
  "signup.role.fund.title": { en: "I'm a Fund", es: "Soy un Fondo", fr: "Je suis un Fonds", zh: "我是基金", ar: "أنا صندوق" },
  "signup.role.fund.desc": { en: "I have capital to allocate and look for real-estate assets matching my thesis.", es: "Tengo capital para asignar y busco activos inmobiliarios compatibles con mi tesis.", fr: "J'ai du capital à allouer et je cherche des actifs immobiliers alignés à ma thèse.", zh: "我有资本可配置,寻找与投资逻辑匹配的房地产资产。", ar: "لديّ رأس مال للتخصيص وأبحث عن أصول عقارية تتطابق مع أطروحتي." },
  "signup.role.fund.b1": { en: "I receive deals filtered by the engine", es: "Recibo deals filtrados por el motor", fr: "Je reçois des deals filtrés par le moteur", zh: "我接收由引擎筛选的交易", ar: "أتلقى الصفقات المُفلترة بواسطة المحرك" },
  "signup.role.fund.b2": { en: "I compare opportunities side-by-side", es: "Comparo oportunidades lado a lado", fr: "Je compare les opportunités côte à côte", zh: "并排比较投资机会", ar: "أقارن الفرص جنبًا إلى جنب" },
  "signup.role.fund.b3": { en: "I track the pipeline and DD", es: "Sigo el pipeline y la DD", fr: "Je suis le pipeline et la DD", zh: "跟踪管道与尽调", ar: "أتابع خط الفرص والعناية الواجبة" },
  "signup.role.asset.title": { en: "I'm an Asset", es: "Soy un Activo", fr: "Je suis un Actif", zh: "我是资产", ar: "أنا أصل" },
  "signup.role.asset.desc": { en: "I'm a developer or SPV with a project seeking capital.", es: "Soy un promotor o SPV con un proyecto buscando capital.", fr: "Je suis un promoteur ou SPV avec un projet cherchant du capital.", zh: "我是寻求资本的开发商或 SPV。", ar: "أنا مطوّر أو شركة ذات غرض خاص أبحث عن رأس مال." },
  "signup.role.asset.b1": { en: "I'm presented to the right funds", es: "Me presentan a los fondos adecuados", fr: "Je suis présenté aux bons fonds", zh: "我被推荐给合适的基金", ar: "يتم تقديمي للصناديق المناسبة" },
  "signup.role.asset.b2": { en: "I track interest in real time", es: "Sigo el interés en tiempo real", fr: "Je suis l'intérêt en temps réel", zh: "实时跟踪兴趣", ar: "أتابع الاهتمام في الوقت الفعلي" },
  "signup.role.asset.b3": { en: "I manage my data room", es: "Gestiono mi data room", fr: "Je gère ma data room", zh: "管理我的数据室", ar: "أدير غرفة البيانات الخاصة بي" },
  "signup.continue": { en: "Continue", es: "Continuar", fr: "Continuer", zh: "继续", ar: "تابع" },
  "signup.back": { en: "Back", es: "Volver", fr: "Retour", zh: "返回", ar: "رجوع" },
  "signup.haveAccount": { en: "Already have an account?", es: "¿Ya tienes cuenta?", fr: "Déjà inscrit ?", zh: "已经有账户?", ar: "لديك حساب بالفعل؟" },
  "signup.name": { en: "Your name", es: "Tu nombre", fr: "Votre nom", zh: "您的姓名", ar: "اسمك" },
  "signup.fundName": { en: "Fund name", es: "Nombre del fondo", fr: "Nom du fonds", zh: "基金名称", ar: "اسم الصندوق" },
  "signup.spvName": { en: "Project/SPV name", es: "Nombre del proyecto/SPV", fr: "Nom du projet/SPV", zh: "项目/SPV 名称", ar: "اسم المشروع/الشركة" },
  "signup.email": { en: "Corporate email", es: "Correo corporativo", fr: "E-mail professionnel", zh: "企业邮箱", ar: "البريد المؤسسي" },
  "signup.password": { en: "Password", es: "Contraseña", fr: "Mot de passe", zh: "密码", ar: "كلمة المرور" },
  "signup.password.ph": { en: "Create a strong password", es: "Crea una contraseña fuerte", fr: "Créez un mot de passe fort", zh: "创建强密码", ar: "أنشئ كلمة مرور قوية" },
  "signup.phone": { en: "Phone", es: "Teléfono", fr: "Téléphone", zh: "电话", ar: "الهاتف" },
  "signup.segment": { en: "Main segment", es: "Segmento principal", fr: "Segment principal", zh: "主要领域", ar: "القطاع الرئيسي" },
  "signup.thesis.fund": { en: "Investment thesis (summary)", es: "Tesis de inversión (resumen)", fr: "Thèse d'investissement (résumé)", zh: "投资逻辑(摘要)", ar: "أطروحة الاستثمار (ملخص)" },
  "signup.thesis.asset": { en: "Describe the project", es: "Describe el proyecto", fr: "Décrivez le projet", zh: "项目描述", ar: "صف المشروع" },
  "signup.consent.lgpd.pre": { en: "I've read and accept the", es: "He leído y acepto la", fr: "J'ai lu et j'accepte la", zh: "我已阅读并接受", ar: "لقد قرأت وأوافق على" },
  "signup.consent.privacy": { en: "Privacy Policy", es: "Política de Privacidad", fr: "Politique de Confidentialité", zh: "隐私政策", ar: "سياسة الخصوصية" },
  "signup.consent.and": { en: "and the", es: "y los", fr: "et les", zh: "以及", ar: "و" },
  "signup.consent.terms": { en: "Terms of Use", es: "Términos de Uso", fr: "Conditions d'utilisation", zh: "使用条款", ar: "شروط الاستخدام" },
  "signup.consent.required": { en: "(required · LGPD art. 7º, I)", es: "(obligatorio · LGPD art. 7º, I)", fr: "(obligatoire · LGPD art. 7, I)", zh: "(必需 · LGPD 第 7 条 I 款)", ar: "(مطلوب · LGPD المادة 7، I)" },
  "signup.consent.marketing": { en: "I want to receive updates about new features, events and opportunities. (opt-in · revocable at any time)", es: "Quiero recibir comunicaciones sobre nuevas funcionalidades, eventos y oportunidades. (opt-in · revocable en cualquier momento)", fr: "Je souhaite recevoir des informations sur les nouveautés, événements et opportunités. (opt-in · révocable à tout moment)", zh: "我希望接收关于新功能、活动与机会的通讯。(选择加入 · 可随时撤销)", ar: "أود تلقي إشعارات بالميزات الجديدة والفعاليات والفرص. (اختياري · يمكن إلغاؤه في أي وقت)" },
  "signup.consent.analytics": { en: "I allow anonymous usage analytics to improve the platform. (opt-in · revocable at any time)", es: "Permito análisis de uso anónimo para mejorar la plataforma. (opt-in · revocable en cualquier momento)", fr: "J'autorise l'analyse d'usage anonyme pour améliorer la plateforme. (opt-in · révocable à tout moment)", zh: "允许匿名使用分析以改进平台。(选择加入 · 可随时撤销)", ar: "أسمح بتحليلات استخدام مجهولة الهوية لتحسين المنصة. (اختياري · يمكن إلغاؤه في أي وقت)" },
  "signup.afterNote": { en: "After creating the account you'll be taken to upload your company documents. You can skip and complete later.", es: "Después de crear la cuenta serás llevado al envío de los documentos de la empresa. Puedes saltar y completar después.", fr: "Après la création du compte, vous serez redirigé vers l'envoi des documents de l'entreprise. Vous pouvez passer et compléter plus tard.", zh: "创建账户后您将进入公司文件上传环节,可跳过并稍后完成。", ar: "بعد إنشاء الحساب، سيتم نقلك إلى تحميل وثائق الشركة. يمكنك التخطي وإكمالها لاحقًا." },
  "signup.submit": { en: "Create account", es: "Crear cuenta", fr: "Créer le compte", zh: "创建账户", ar: "إنشاء الحساب" },
  "signup.footer": { en: "Data validated in real time at Receita Federal · password protected with bcrypt.", es: "Datos validados en tiempo real en la Receita Federal · contraseña protegida con bcrypt.", fr: "Données validées en temps réel à la Receita Federal · mot de passe protégé par bcrypt.", zh: "数据通过巴西联邦税务局实时校验 · 密码使用 bcrypt 保护。", ar: "تُحقَّق البيانات فوريًا لدى Receita Federal · كلمة المرور محمية بـ bcrypt." },
  "signup.role.fund.account": { en: "Fund account", es: "Cuenta de Fondo", fr: "Compte de Fonds", zh: "基金账户", ar: "حساب صندوق" },
  "signup.role.asset.account": { en: "Asset account", es: "Cuenta de Activo", fr: "Compte d'Actif", zh: "资产账户", ar: "حساب أصل" },
  "signup.changeRole": { en: "Change profile", es: "Cambiar perfil", fr: "Changer de profil", zh: "切换档案", ar: "تغيير الملف" },
  "signup.err.fillPhoneSeg": { en: "Please fill in phone and segment.", es: "Completa teléfono y segmento.", fr: "Remplissez téléphone et segment.", zh: "请填写电话和领域。", ar: "يرجى تعبئة الهاتف والقطاع." },
  "signup.err.waitCnpj": { en: "Please wait for CNPJ validation at Receita Federal (or correct the number).", es: "Espera la validación del CNPJ en Receita Federal (o corrige el número).", fr: "Attendez la validation du CNPJ à Receita Federal (ou corrigez le numéro).", zh: "请等待 Receita Federal 校验 CNPJ(或修正号码)。", ar: "يرجى انتظار التحقق من CNPJ لدى Receita Federal (أو تصحيح الرقم)." },
  "signup.err.consent": { en: "You must accept the Privacy Policy and Terms of Use to continue.", es: "Debes aceptar la Política de Privacidad y los Términos de Uso para continuar.", fr: "Vous devez accepter la Politique de Confidentialité et les Conditions d'utilisation pour continuer.", zh: "您必须接受隐私政策和使用条款才能继续。", ar: "يجب قبول سياسة الخصوصية وشروط الاستخدام للمتابعة." },
  "signup.err.generic": { en: "Could not complete sign-up.", es: "No fue posible completar el registro.", fr: "Impossible de finaliser l'inscription.", zh: "无法完成注册。", ar: "تعذر إكمال التسجيل." },

  // ── SIDEBAR / LAYOUT ───────────────────────────────────────
  "side.dashboard": { en: "Dashboard", es: "Panel", fr: "Tableau de bord", zh: "仪表盘", ar: "لوحة التحكم" },
  "side.assistant": { en: "AI Assistant", es: "Asistente IA", fr: "Assistant IA", zh: "AI 助手", ar: "مساعد الذكاء الاصطناعي" },
  "side.funds": { en: "Funds", es: "Fondos", fr: "Fonds", zh: "基金", ar: "الصناديق" },
  "side.ops": { en: "Operations", es: "Operaciones", fr: "Opérations", zh: "运营", ar: "العمليات" },
  "side.register": { en: "Register fund/asset", es: "Registrar fondo/activo", fr: "Enregistrer fonds/actif", zh: "登记基金/资产", ar: "تسجيل صندوق/أصل" },
  "side.curate": { en: "Curate matches", es: "Curar matches", fr: "Curer les matches", zh: "审核匹配", ar: "تنسيق المطابقات" },
  "side.docsSent": { en: "Documents sent", es: "Documentos enviados", fr: "Documents envoyés", zh: "已发送文件", ar: "المستندات المرسلة" },
  "side.matchesGen": { en: "Generated matches", es: "Matches generados", fr: "Matches générés", zh: "生成的匹配", ar: "المطابقات المُولّدة" },
  "side.chat": { en: "Chat", es: "Chat", fr: "Chat", zh: "聊天", ar: "المحادثة" },
  "side.myArea": { en: "My area", es: "Mi área", fr: "Mon espace", zh: "我的空间", ar: "منطقتي" },
  "side.copilot": { en: "Developer Copilot", es: "Copilot del emprendedor", fr: "Copilote du promoteur", zh: "开发者 Copilot", ar: "كوبايلوت المطوّر" },
  "side.myMatches": { en: "My matches", es: "Mis matches", fr: "Mes matches", zh: "我的匹配", ar: "مطابقاتي" },
  "side.exploreOps": { en: "Explore operations", es: "Explorar operaciones", fr: "Explorer les opérations", zh: "浏览运营", ar: "استكشاف العمليات" },
  "side.docs": { en: "Documents", es: "Documentos", fr: "Documents", zh: "文件", ar: "المستندات" },
  "side.convs": { en: "Conversations", es: "Conversaciones", fr: "Conversations", zh: "对话", ar: "المحادثات" },
  "side.myOp": { en: "My operation", es: "Mi operación", fr: "Mon opération", zh: "我的运营", ar: "عمليّتي" },
  "side.structureOp": { en: "Structure operation", es: "Estructurar operación", fr: "Structurer l'opération", zh: "构建运营", ar: "تنظيم العملية" },
  "side.interestedFunds": { en: "Interested funds", es: "Fondos interesados", fr: "Fonds intéressés", zh: "感兴趣的基金", ar: "الصناديق المهتمة" },
  "side.dataRoom": { en: "Data room", es: "Data room", fr: "Data room", zh: "数据室", ar: "غرفة البيانات" },
  "side.back": { en: "Back to site", es: "Volver al sitio", fr: "Retour au site", zh: "返回网站", ar: "العودة إلى الموقع" },
  "side.menu.area": { en: "My area", es: "Mi área", fr: "Mon espace", zh: "我的空间", ar: "منطقتي" },
  "side.menu.config": { en: "Settings", es: "Configuración", fr: "Paramètres", zh: "设置", ar: "الإعدادات" },
  "side.menu.logout": { en: "Sign out", es: "Salir", fr: "Déconnexion", zh: "登出", ar: "تسجيل الخروج" },
  "side.role.admin": { en: "Administrator", es: "Administrador", fr: "Administrateur", zh: "管理员", ar: "مدير" },
  "side.role.fund": { en: "Fund", es: "Fondo", fr: "Fonds", zh: "基金", ar: "صندوق" },
  "side.role.asset": { en: "Asset", es: "Activo", fr: "Actif", zh: "资产", ar: "أصل" },
  "side.user.default": { en: "User", es: "Usuario", fr: "Utilisateur", zh: "用户", ar: "مستخدم" },
  "side.header.online": { en: "Platform online", es: "Plataforma en línea", fr: "Plateforme en ligne", zh: "平台在线", ar: "المنصة متصلة" },
  "side.header.adminView": { en: "Admin view", es: "Vista admin", fr: "Vue admin", zh: "管理员视图", ar: "عرض المسؤول" },
  "side.openMenu": { en: "Open menu", es: "Abrir menú", fr: "Ouvrir le menu", zh: "打开菜单", ar: "فتح القائمة" },
  "side.closeMenu": { en: "Close menu", es: "Cerrar menú", fr: "Fermer le menu", zh: "关闭菜单", ar: "إغلاق القائمة" },
  "side.settings": { en: "Settings", es: "Configuración", fr: "Paramètres", zh: "设置", ar: "الإعدادات" },

  // ── ADMIN DASHBOARD ────────────────────────────────────────
  "adash.title": { en: "Dashboard", es: "Panel", fr: "Tableau de bord", zh: "仪表盘", ar: "لوحة التحكم" },
  "adash.desc": { en: "Overview of the Ingenium network: monitored operations, capital under structuring and high-conviction matches.", es: "Visión general de la red Ingenium: operaciones monitoreadas, capital bajo estructuración y matches de alta convicción.", fr: "Vue d'ensemble du réseau Ingenium : opérations suivies, capital en structuration et matches à forte conviction.", zh: "Ingenium 网络概览:受监控的运营、结构化资本与高确信度匹配。", ar: "نظرة عامة على شبكة Ingenium: العمليات المراقبة ورأس المال قيد الهيكلة والمطابقات عالية اليقين." },
  "adash.users": { en: "Users", es: "Usuarios", fr: "Utilisateurs", zh: "用户", ar: "المستخدمون" },
  "adash.signups": { en: "Sign-ups", es: "Registros", fr: "Inscriptions", zh: "注册", ar: "التسجيلات" },
  "adash.matches": { en: "Matches", es: "Matches", fr: "Matches", zh: "匹配", ar: "المطابقات" },
  "adash.docs": { en: "Documents", es: "Documentos", fr: "Documents", zh: "文件", ar: "المستندات" },
  "adash.admin": { en: "Admin", es: "Admin", fr: "Admin", zh: "管理员", ar: "مسؤول" },
  "adash.kpi.opsMonitored": { en: "Monitored operations", es: "Operaciones monitoreadas", fr: "Opérations suivies", zh: "受监控运营", ar: "العمليات المراقبة" },
  "adash.kpi.fundsPool": { en: "Funds in pool", es: "Fondos en pool", fr: "Fonds dans le pool", zh: "池中基金", ar: "الصناديق في المجمع" },
  "adash.kpi.capital": { en: "Capital under structuring", es: "Capital bajo estructuración", fr: "Capital en structuration", zh: "结构化中的资本", ar: "رأس المال قيد الهيكلة" },
  "adash.kpi.readiness": { en: "Average readiness", es: "Readiness promedio", fr: "Readiness moyen", zh: "平均就绪度", ar: "متوسط الجاهزية" },
  "adash.highConv": { en: "High-conviction matches", es: "Matches de alta convicción", fr: "Matches à forte conviction", zh: "高确信度匹配", ar: "مطابقات عالية اليقين" },
  "adash.viewAll": { en: "View all", es: "Ver todos", fr: "Voir tout", zh: "查看全部", ar: "عرض الكل" },
  "adash.collapse": { en: "Collapse matches", es: "Contraer matches", fr: "Réduire les matches", zh: "收起匹配", ar: "طيّ المطابقات" },
  "adash.expand": { en: "Expand matches", es: "Expandir matches", fr: "Développer les matches", zh: "展开匹配", ar: "توسيع المطابقات" },
  "adash.noMatches": { en: "No matches generated yet. Run the engine on an asset.", es: "Aún no hay matches generados. Ejecuta el motor en un activo.", fr: "Aucun match généré. Lancez le moteur sur un actif.", zh: "尚未生成匹配。请在某个资产上运行引擎。", ar: "لم تُنشأ أي مطابقات بعد. شغّل المحرك على أحد الأصول." },
  "adash.score": { en: "Score", es: "Score", fr: "Score", zh: "分数", ar: "النتيجة" },
  "adash.distribution": { en: "Score distribution", es: "Distribución de scores", fr: "Distribution des scores", zh: "分数分布", ar: "توزيع النتائج" },
  "adash.activity": { en: "Recent activity", es: "Actividad reciente", fr: "Activité récente", zh: "近期活动", ar: "النشاط الأخير" },
  "adash.noActivity": { en: "No recent activity.", es: "Sin actividad reciente.", fr: "Aucune activité récente.", zh: "暂无近期活动。", ar: "لا يوجد نشاط أخير." },

  // ── AREA (FUNDO / ATIVO) ───────────────────────────────────
  "area.welcome": { en: "Welcome", es: "Bienvenido", fr: "Bienvenue", zh: "欢迎", ar: "أهلًا" },
  "area.fund.desc": { en: "Fund area. Set your thesis to receive opportunities.", es: "Área del fondo. Configura tu tesis para recibir oportunidades.", fr: "Espace du fonds. Configurez votre thèse pour recevoir des opportunités.", zh: "基金空间。设置您的投资逻辑以接收机会。", ar: "منطقة الصندوق. اضبط أطروحتك لتلقي الفرص." },
  "area.asset.desc": { en: "Asset area. Set up your project to attract funds.", es: "Área del activo. Configura tu proyecto para recibir fondos.", fr: "Espace de l'actif. Configurez votre projet pour attirer les fonds.", zh: "资产空间。设置您的项目以吸引基金。", ar: "منطقة الأصل. اضبط مشروعك لاستقطاب الصناديق." },
  "area.chatAI": { en: "Chat with AI", es: "Conversar con la IA", fr: "Discuter avec l'IA", zh: "与 AI 对话", ar: "تحدث مع الذكاء الاصطناعي" },
  "area.docs.title": { en: "Complete company documents", es: "Completa los documentos de la empresa", fr: "Complétez les documents de l'entreprise", zh: "完成公司文件", ar: "أكمل وثائق الشركة" },
  "area.docs.desc.pre": { en: "Missing", es: "Faltan", fr: "Il manque", zh: "缺少", ar: "ينقصك" },
  "area.docs.desc.mid": { en: "required document(s) to unlock qualified matches. Current progress:", es: "documento(s) obligatorio(s) para liberar matches calificados. Progreso actual:", fr: "document(s) requis pour débloquer des matches qualifiés. Progression actuelle :", zh: "份必填文件以解锁合格匹配。当前进度:", ar: "وثيقة (وثائق) مطلوبة لتفعيل المطابقات المؤهلة. التقدم الحالي:" },
  "area.docs.complete": { en: "Complete", es: "Completar", fr: "Compléter", zh: "完成", ar: "أكمل" },
  "area.f.matches": { en: "Matches", es: "Matches", fr: "Matches", zh: "匹配", ar: "المطابقات" },
  "area.f.matches.hint": { en: "start your thesis", es: "comienza tu tesis", fr: "démarrez votre thèse", zh: "开始您的投资逻辑", ar: "ابدأ أطروحتك" },
  "area.f.analysis": { en: "Under analysis", es: "En análisis", fr: "En analyse", zh: "分析中", ar: "قيد التحليل" },
  "area.f.analysis.hint": { en: "none in DD", es: "ninguno en DD", fr: "aucun en DD", zh: "无尽调", ar: "لا شيء في العناية الواجبة" },
  "area.f.capital": { en: "Allocated capital", es: "Capital asignado", fr: "Capital alloué", zh: "已配置资本", ar: "رأس المال المخصص" },
  "area.f.capital.hint": { en: "no closed deals", es: "sin deals cerrados", fr: "aucun deal conclu", zh: "无已完成交易", ar: "لا صفقات مغلقة" },
  "area.f.pipeline": { en: "Active pipeline", es: "Pipeline activo", fr: "Pipeline actif", zh: "活跃管道", ar: "خط أنابيب نشط" },
  "area.f.pipeline.hint": { en: "no opportunities", es: "sin oportunidades", fr: "aucune opportunité", zh: "无机会", ar: "لا فرص" },
  "area.f.selectedOps": { en: "Selected opportunities", es: "Oportunidades seleccionadas", fr: "Opportunités sélectionnées", zh: "精选机会", ar: "الفرص المختارة" },
  "area.f.empty.title": { en: "No matches yet", es: "Aún sin matches", fr: "Aucun match pour l'instant", zh: "暂无匹配", ar: "لا توجد مطابقات بعد" },
  "area.f.empty.has": { en: "Your thesis is set. As soon as compatible assets appear, they'll show here.", es: "Tu tesis está configurada. En cuanto aparezcan activos compatibles, se mostrarán aquí.", fr: "Votre thèse est configurée. Dès que des actifs compatibles apparaîtront, ils s'afficheront ici.", zh: "您的投资逻辑已设置。匹配资产出现后将在此显示。", ar: "تم ضبط أطروحتك. ستظهر الأصول المتوافقة هنا فور توفرها." },
  "area.f.empty.no": { en: "Set up your investment thesis so the engine can find compatible assets.", es: "Configura tu tesis de inversión para que el motor encuentre activos compatibles.", fr: "Configurez votre thèse d'investissement pour que le moteur trouve des actifs compatibles.", zh: "设置您的投资逻辑,以便引擎找到匹配的资产。", ar: "اضبط أطروحة استثمارك ليبحث المحرك عن أصول متوافقة." },
  "area.f.exploreAssets": { en: "Explore available assets", es: "Explorar activos disponibles", fr: "Explorer les actifs disponibles", zh: "浏览可用资产", ar: "استكشف الأصول المتاحة" },
  "area.f.configThesis": { en: "Set thesis", es: "Configurar tesis", fr: "Configurer la thèse", zh: "设置投资逻辑", ar: "اضبط الأطروحة" },
  "area.f.yourThesis": { en: "Your thesis", es: "Tu tesis", fr: "Votre thèse", zh: "您的投资逻辑", ar: "أطروحتك" },
  "area.f.segment": { en: "Segment", es: "Segmento", fr: "Segment", zh: "领域", ar: "القطاع" },
  "area.f.thesis": { en: "Thesis", es: "Tesis", fr: "Thèse", zh: "投资逻辑", ar: "الأطروحة" },
  "area.f.editThesis": { en: "Edit thesis", es: "Editar tesis", fr: "Modifier la thèse", zh: "编辑投资逻辑", ar: "تعديل الأطروحة" },
  "area.f.noThesis": { en: "You haven't set your investment thesis yet.", es: "Aún no has configurado tu tesis de inversión.", fr: "Vous n'avez pas encore configuré votre thèse d'investissement.", zh: "您尚未设置投资逻辑。", ar: "لم تضبط بعد أطروحة الاستثمار." },
  "area.f.configNow": { en: "Set up now", es: "Configurar ahora", fr: "Configurer maintenant", zh: "立即设置", ar: "اضبط الآن" },
  "area.f.notif": { en: "Notifications", es: "Notificaciones", fr: "Notifications", zh: "通知", ar: "الإشعارات" },
  "area.f.noNotif": { en: "No notifications for now.", es: "Sin notificaciones por ahora.", fr: "Aucune notification pour l'instant.", zh: "暂无通知。", ar: "لا توجد إشعارات حاليًا." },
  "area.f.pipeline.title": { en: "Opportunities pipeline", es: "Pipeline de oportunidades", fr: "Pipeline d'opportunités", zh: "机会管道", ar: "خط أنابيب الفرص" },
  "area.f.pipeline.empty": { en: "Empty pipeline", es: "Pipeline vacío", fr: "Pipeline vide", zh: "管道为空", ar: "خط الأنابيب فارغ" },
  "area.f.pipeline.desc": { en: "Approving engine matches will automatically move deals through pipeline stages.", es: "Aprobar matches del motor moverá deals automáticamente entre las fases del pipeline.", fr: "Approuver les matches du moteur déplace automatiquement les deals dans les étapes du pipeline.", zh: "审批引擎匹配将自动在管道阶段间移动交易。", ar: "ستؤدي الموافقة على مطابقات المحرك إلى نقل الصفقات تلقائيًا بين مراحل خط الأنابيب." },
  "area.a.progress": { en: "Fundraising progress", es: "Progreso de captación", fr: "Progression de la levée", zh: "募资进度", ar: "تقدم جمع التمويل" },
  "area.a.ofGoal": { en: "of undefined goal", es: "de meta no definida", fr: "d'objectif non défini", zh: "目标未定义", ar: "من هدف غير محدد" },
  "area.a.raised": { en: "raised", es: "captado", fr: "levé", zh: "已筹集", ar: "تم جمعه" },
  "area.a.config.hasProj": { en: "Set up the project's financial data (target ROI, term, fundraising goal).", es: "Configura los datos financieros del proyecto (ROI objetivo, plazo, meta de captación).", fr: "Configurez les données financières du projet (ROI cible, durée, objectif de levée).", zh: "设置项目财务数据(目标 ROI、期限、募资目标)。", ar: "اضبط البيانات المالية للمشروع (العائد المستهدف، المدة، هدف الجمع)." },
  "area.a.config.noProj": { en: "Tell us more about your project to start appearing to funds.", es: "Cuéntanos más sobre tu proyecto para empezar a aparecer ante los fondos.", fr: "Parlez-nous davantage de votre projet pour commencer à apparaître aux fonds.", zh: "请提供更多项目信息以便向基金展示。", ar: "أخبرنا أكثر عن مشروعك لبدء ظهوره للصناديق." },
  "area.a.editData": { en: "Edit data", es: "Editar datos", fr: "Modifier les données", zh: "编辑数据", ar: "تعديل البيانات" },
  "area.a.configProj": { en: "Set up project", es: "Configurar proyecto", fr: "Configurer le projet", zh: "设置项目", ar: "إعداد المشروع" },
  "area.a.s.interested": { en: "Interested funds", es: "Fondos interesados", fr: "Fonds intéressés", zh: "感兴趣的基金", ar: "الصناديق المهتمة" },
  "area.a.s.interested.hint": { en: "Ingenium curation", es: "curaduría Ingenium", fr: "curation Ingenium", zh: "Ingenium 精选", ar: "تنسيق Ingenium" },
  "area.a.s.contact": { en: "In contact", es: "En contacto", fr: "En contact", zh: "联系中", ar: "قيد التواصل" },
  "area.a.s.contact.hint": { en: "waiting", es: "esperando", fr: "en attente", zh: "等待中", ar: "بالانتظار" },
  "area.a.s.dd": { en: "DD in progress", es: "DD en curso", fr: "DD en cours", zh: "尽调进行中", ar: "العناية الواجبة قيد التنفيذ" },
  "area.a.s.proposals": { en: "Proposals", es: "Propuestas", fr: "Propositions", zh: "提案", ar: "العروض" },
  "area.a.interested.title": { en: "Interested funds", es: "Fondos interesados", fr: "Fonds intéressés", zh: "感兴趣的基金", ar: "الصناديق المهتمة" },
  "area.a.curation.title": { en: "Awaiting curation", es: "Esperando curaduría", fr: "En attente de curation", zh: "等待精选", ar: "بانتظار التنسيق" },
  "area.a.curation.desc": { en: "For privacy reasons, the fund catalog isn't public. The Ingenium team reviews your operation and presents only funds with a compatible thesis — they appear in 'Interested funds'.", es: "Por privacidad, el catálogo de fondos no es público. El equipo Ingenium analiza tu operación y presenta solo los fondos con tesis compatible — aparecen en 'Fondos interesados'.", fr: "Pour des raisons de confidentialité, le catalogue de fonds n'est pas public. L'équipe Ingenium analyse votre opération et ne présente que les fonds à thèse compatible — ils apparaissent dans « Fonds intéressés ».", zh: "出于隐私考量,基金目录不对外公开。Ingenium 团队分析您的运营,仅展示策略匹配的基金——显示在「感兴趣的基金」中。", ar: "لدواعي الخصوصية، كتالوج الصناديق ليس عامًا. يحلل فريق Ingenium عمليتك ويعرض فقط الصناديق ذات الأطروحة المتوافقة — وتظهر في «الصناديق المهتمة»." },
  "area.a.openMatches": { en: "Open matches inbox", es: "Abrir bandeja de matches", fr: "Ouvrir la boîte des matches", zh: "打开匹配收件箱", ar: "فتح صندوق المطابقات" },
  "area.a.nextSteps": { en: "Next steps", es: "Próximos pasos", fr: "Prochaines étapes", zh: "下一步", ar: "الخطوات التالية" },
  "area.a.todo.signup": { en: "Initial sign-up", es: "Registro inicial", fr: "Inscription initiale", zh: "初始注册", ar: "التسجيل الأولي" },
  "area.a.todo.company": { en: "Company data (CNPJ, phone)", es: "Datos de la empresa (CNPJ, teléfono)", fr: "Données de l'entreprise (CNPJ, téléphone)", zh: "公司数据(CNPJ、电话)", ar: "بيانات الشركة (CNPJ، الهاتف)" },
  "area.a.todo.proj": { en: "Project description", es: "Descripción del proyecto", fr: "Description du projet", zh: "项目描述", ar: "وصف المشروع" },
  "area.a.todo.docs": { en: "Required documents", es: "Documentos obligatorios", fr: "Documents obligatoires", zh: "必填文件", ar: "المستندات المطلوبة" },
  "area.a.openDocs": { en: "Open documents", es: "Abrir documentos", fr: "Ouvrir les documents", zh: "打开文件", ar: "افتح المستندات" },
  "area.waitingData": { en: "Awaiting real data", es: "Esperando datos reales", fr: "En attente de données réelles", zh: "等待真实数据", ar: "بانتظار البيانات الفعلية" },
};

function getInitial(): Lang {
  if (typeof window === "undefined") return "pt";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  const valid: Lang[] = ["pt", "en", "es", "fr", "zh", "ar"];
  if (stored && (valid as string[]).includes(stored)) return stored as Lang;
  return "pt";
}

function applyDir(lang: Lang) {
  if (typeof document === "undefined") return;
  document.documentElement.dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";
  document.documentElement.lang = lang;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getInitial);

  useEffect(() => {
    applyDir(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback(
    (key: string, fallbackPT: string) => {
      if (lang === "pt") return fallbackPT;
      return dict[key]?.[lang] ?? fallbackPT;
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL: RTL_LANGS.includes(lang) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback for components rendered before provider mounts — return PT.
    return {
      lang: "pt" as Lang,
      setLang: () => {},
      t: (_k: string, fallback: string) => fallback,
      isRTL: false,
    };
  }
  return ctx;
}
