import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import dukenLogo from "@/assets/duken-logo.webp";

type Text = {
  title: string;
  updated: string;
  sections: { heading: string; paragraphs: string[] }[];
};

const EN: Text = {
  title: "Privacy Policy",
  updated: "Last updated: May 11, 2026",
  sections: [
    {
      heading: "1. Information We Collect",
      paragraphs: [
        "When you register for Duken, we collect your email address and a password (stored as a salted hash). If you create a store, we collect the business information you provide: store name, slug, description, social media handles (Instagram, TikTok, Telegram), payment QR images, and product details including names, descriptions, prices, and images.",
        "For seller verification, we collect images of identity documents. This data is stored securely and used only for verification purposes.",
      ],
    },
    {
      heading: "2. How We Use Your Information",
      paragraphs: [
        "We use your information to operate the Duken platform: display your store and products to visitors, process orders, send Telegram notifications (if configured), and manage your subscription. We do not sell your personal data to third parties.",
      ],
    },
    {
      heading: "3. Data Storage and Location",
      paragraphs: [
        "Your data is stored on servers in the Republic of Kazakhstan and South Korea (Seoul), in compliance with the Law of the Republic of Kazakhstan \"On Personal Data and Their Protection.\" We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.",
      ],
    },
    {
      heading: "4. Data Sharing",
      paragraphs: [
        "We share data with third-party service providers only as necessary to operate the platform: Supabase (database and authentication), Kaspi Bank (payment QR processing), KazPost (shipping integration), and Telegram (notification delivery). Each provider processes data under their own privacy obligations.",
      ],
    },
    {
      heading: "5. Your Rights",
      paragraphs: [
        "Under Kazakhstan law, you have the right to access, correct, and request deletion of your personal data. You may also withdraw consent for data processing at any time. To exercise these rights, contact us at the email below.",
      ],
    },
    {
      heading: "6. Cookies",
      paragraphs: [
        "We use essential cookies for authentication and session management. No tracking or advertising cookies are used. You can control cookie settings in your browser.",
      ],
    },
    {
      heading: "7. Contact",
      paragraphs: [
        "For privacy-related inquiries: hello@duken.kz",
      ],
    },
  ],
};

const RU: Text = {
  title: "Политика конфиденциальности",
  updated: "Последнее обновление: 11 мая 2026 г.",
  sections: [
    {
      heading: "1. Какую информацию мы собираем",
      paragraphs: [
        "При регистрации в Duken мы собираем ваш адрес электронной почты и пароль (хранится в виде солевого хеша). Если вы создаете магазин, мы собираем предоставленную вами информацию о бизнесе: название магазина, slug, описание, ссылки на соцсети (Instagram, TikTok, Telegram), изображения QR-платежей, а также данные о товарах, включая названия, описания, цены и изображения.",
        "Для верификации продавца мы собираем изображения удостоверяющих личность документов. Эти данные хранятся безопасно и используются только для целей верификации.",
      ],
    },
    {
      heading: "2. Как мы используем вашу информацию",
      paragraphs: [
        "Мы используем вашу информацию для работы платформы Duken: отображения вашего магазина и товаров посетителям, обработки заказов, отправки уведомлений в Telegram (если настроено) и управления подпиской. Мы не продаем ваши персональные данные третьим лицам.",
      ],
    },
    {
      heading: "3. Хранение и расположение данных",
      paragraphs: [
        "Ваши данные хранятся на серверах в Республике Казахстан и Южной Корее (Сеул) в соответствии с Законом Республики Казахстан «О персональных данных и их защите». Мы применяем соответствующие технические и организационные меры для защиты ваших персональных данных от несанкционированного доступа, изменения, раскрытия или уничтожения.",
      ],
    },
    {
      heading: "4. Передача данных",
      paragraphs: [
        "Мы передаем данные сторонним поставщикам услуг только по мере необходимости для работы платформы: Supabase (база данных и аутентификация), Kaspi Bank (обработка QR-платежей), KazPost (интеграция доставки) и Telegram (доставка уведомлений). Каждый поставщик обрабатывает данные в соответствии со своими обязательствами по конфиденциальности.",
      ],
    },
    {
      heading: "5. Ваши права",
      paragraphs: [
        "В соответствии с законодательством Казахстана вы имеете право на доступ, исправление и удаление ваших персональных данных. Вы также можете в любое время отозвать согласие на обработку данных. Для осуществления этих прав свяжитесь с нами по электронной почте, указанной ниже.",
      ],
    },
    {
      heading: "6. Cookie",
      paragraphs: [
        "Мы используем обязательные cookie-файлы для аутентификации и управления сессией. Мы не используем отслеживающие или рекламные cookie-файлы. Вы можете управлять настройками cookie в своем браузере.",
      ],
    },
    {
      heading: "7. Контакты",
      paragraphs: [
        "По вопросам конфиденциальности: hello@duken.kz",
      ],
    },
  ],
};

const KK: Text = {
  title: "Құпиялылық саясаты",
  updated: "Соңғы жаңарту: 11 мамыр 2026 ж.",
  sections: [
    {
      heading: "1. Біз қандай ақпарат жинаймыз",
      paragraphs: [
        "Duken-ге тіркелген кезде біз сіздің электрондық поштаңызды және құпия сөзіңізді (тұзды хэш түрінде сақталады) жинаймыз. Егер сіз дүкен ашсаңыз, біз сіз берген бизнес ақпаратын жинаймыз: дүкен атауы, slug, сипаттамасы, әлеуметтік желі сілтемелері (Instagram, TikTok, Telegram), төлем QR-кескіндері және тауарлар туралы мәліметтер (атаулары, сипаттамалары, бағалары, кескіндері).",
        "Сатушыны растау үшін біз жеке басты куәландыратын құжаттардың кескіндерін жинаймыз. Бұл деректер қауіпсіз сақталады және тек растау мақсатында пайдаланылады.",
      ],
    },
    {
      heading: "2. Біз ақпаратыңызды қалай пайдаланамыз",
      paragraphs: [
        "Біз сіздің ақпаратыңызды Duken платформасын жұмыс істеу үшін пайдаланамыз: дүкеніңіз бен тауарларыңызды келушілерге көрсету, тапсырыстарды өңдеу, Telegram хабарландыруларын жіберу (егер конфигурацияланған болса) және жазылымыңызды басқару. Біз сіздің жеке деректеріңізді үшінші тұлғаларға сатпаймыз.",
      ],
    },
    {
      heading: "3. Деректерді сақтау және орналасуы",
      paragraphs: [
        "Сіздің деректеріңіз Қазақстан Республикасының «Жеке деректер және оларды қорғау туралы» Заңына сәйкес Қазақстан Республикасы мен Оңтүстік Кореядағы (Сеул) серверлерде сақталады. Біз сіздің жеке деректеріңізді рұқсатсыз кіруден, өзгертуден, жария етуден немесе жоюдан қорғау үшін тиісті техникалық және ұйымдастырушылық шараларды қолданамыз.",
      ],
    },
    {
      heading: "4. Деректерді бөлісу",
      paragraphs: [
        "Біз деректерді үшінші тарап қызмет провайдерлеріне тек платформаны жұмыс істеу үшін қажет болған жағдайда ғана береміз: Supabase (дерекқор және аутентификация), Kaspi Bank (QR-төлемдерді өңдеу), KazPost (жеткізу интеграциясы) және Telegram (хабарландыруларды жеткізу). Әрбір провайдер деректерді өздерінің құпиялылық міндеттемелеріне сәйкес өңдейді.",
      ],
    },
    {
      heading: "5. Сіздің құқықтарыңыз",
      paragraphs: [
        "Қазақстан заңнамасына сәйкес сіздің жеке деректеріңізге қол жеткізуге, түзетуге және жоюды талап етуге құқығыңыз бар. Сіз сондай-ақ кез келген уақытта деректерді өңдеуге келісіміңізді қайтарып ала аласыз. Осы құқықтарды жүзеге асыру үшін төмендегі электрондық пошта арқылы бізге хабарласыңыз.",
      ],
    },
    {
      heading: "6. Cookie файлдары",
      paragraphs: [
        "Біз аутентификация және сессияны басқару үшін қажетті cookie файлдарын пайдаланамыз. Бақылау немесе жарнама cookie файлдары пайдаланылмайды. Cookie параметрлерін браузеріңізде басқара аласыз.",
      ],
    },
    {
      heading: "7. Байланыс",
      paragraphs: [
        "Құпиялылық сұрақтары бойынша: hello@duken.kz",
      ],
    },
  ],
};

const Privacy = () => {
  const { language } = useLanguage();
  const text = language === "kk" ? KK : language === "ru" ? RU : EN;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> {language === "kk" ? "Артқа" : language === "ru" ? "Назад" : "Back"}
        </Link>
        <div className="flex items-center gap-3 mb-10">
          <img src={dukenLogo} alt="Duken" className="h-8 dark:invert" />
          <span className="text-xs font-mono text-muted-foreground tracking-wider uppercase">{text.title}</span>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none font-mono">
          <h1 className="text-xl font-semibold tracking-tight mb-8">{text.title}</h1>
          <p className="text-muted-foreground text-xs">{text.updated}</p>

          {text.sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-sm font-semibold mt-8 mb-3">{section.heading}</h2>
              {section.paragraphs.map((p, j) => (
                <p key={j} className="text-xs text-muted-foreground leading-relaxed mt-3">
                  {p}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Privacy;
