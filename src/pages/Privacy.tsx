import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import dokanLogo from "@/assets/dokan-logo.webp";

type Text = {
  title: string;
  updated: string;
  sections: { heading: string; paragraphs: string[] }[];
};

const EN: Text = {
  title: "Privacy Policy",
  updated: "Last updated: August 26, 2026",
  sections: [
    {
      heading: "1. Information We Collect",
      paragraphs: [
        "When you register for Dokan, we collect your email address and a password (stored as a salted hash). If you create a store, we collect the business information you provide: store name, slug, description, social media handles (Instagram, TikTok, Telegram), payment QR images, and product details including names, descriptions, prices, and images.",
        "When a customer places an order, we collect their name, phone number, and delivery address in order to process and fulfill that order.",
      ],
    },
    {
      heading: "2. How We Use Your Information",
      paragraphs: [
        "We use your information to operate the Dokan platform: display your store and products to visitors, process orders, send Telegram notifications (if configured), and manage your subscription. We do not sell your personal data to third parties.",
      ],
    },
    {
      heading: "3. Data Storage and Location",
      paragraphs: [
        "Your data is stored securely on cloud infrastructure provided by our hosting and database partners. We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.",
      ],
    },
    {
      heading: "4. Data Sharing",
      paragraphs: [
        "We share data with third-party service providers only as necessary to operate the platform: Supabase (database and authentication), payment QR processing, courier services for delivery, and Telegram (notification delivery). Each provider processes data under their own privacy obligations.",
      ],
    },
    {
      heading: "5. Your Rights",
      paragraphs: [
        "You have the right to access, correct, and request deletion of your personal data. You may also withdraw consent for data processing at any time. To exercise these rights, contact us at the email below.",
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
        "For privacy-related inquiries: dokan.mybd@gmail.com or +8801863413654",
      ],
    },
  ],
};

const BN: Text = {
  title: "গোপনীয়তা নীতি",
  updated: "সর্বশেষ হালনাগাদ: ২৬ আগস্ট ২০২৬",
  sections: [
    {
      heading: "১. আমরা কী তথ্য সংগ্রহ করি",
      paragraphs: [
        "আপনি যখন Dokan-এ নিবন্ধন করেন, আমরা আপনার ইমেইল ঠিকানা এবং একটি পাসওয়ার্ড (সল্টেড হ্যাশ আকারে সংরক্ষিত) সংগ্রহ করি। আপনি যদি একটি দোকান তৈরি করেন, আমরা আপনার দেওয়া ব্যবসায়িক তথ্য সংগ্রহ করি: দোকানের নাম, slug, বিবরণ, সামাজিক যোগাযোগ মাধ্যমের হ্যান্ডেল (Instagram, TikTok, Telegram), পেমেন্ট QR ছবি এবং পণ্যের বিবরণ (নাম, বিবরণ, দাম ও ছবি)।",
        "গ্রাহক যখন একটি অর্ডার দেন, তখন আমরা তাদের নাম, ফোন নম্বর এবং ডেলিভারি ঠিকানা সংগ্রহ করি যাতে সেই অর্ডার প্রক্রিয়া ও সম্পন্ন করা যায়।",
      ],
    },
    {
      heading: "২. আমরা আপনার তথ্য কীভাবে ব্যবহার করি",
      paragraphs: [
        "আমরা Dokan প্ল্যাটফর্ম পরিচালনার জন্য আপনার তথ্য ব্যবহার করি: দর্শনার্থীদের কাছে আপনার দোকান ও পণ্য প্রদর্শন, অর্ডার প্রক্রিয়াকরণ, Telegram নোটিফিকেশন পাঠানো (যদি কনফিগার করা থাকে) এবং আপনার সাবস্ক্রিপশন পরিচালনা। আমরা আপনার ব্যক্তিগত তথ্য তৃতীয় পক্ষের কাছে বিক্রি করি না।",
      ],
    },
    {
      heading: "৩. ডেটা সংরক্ষণ ও অবস্থান",
      paragraphs: [
        "আপনার ডেটা আমাদের হোস্টিং ও ডেটাবেস অংশীদারদের প্রদত্ত ক্লাউড অবকাঠামোতে নিরাপদে সংরক্ষিত থাকে। আমরা অননুমোদিত অ্যাক্সেস, পরিবর্তন, প্রকাশ বা ধ্বংস থেকে আপনার ব্যক্তিগত ডেটা রক্ষার জন্য যথাযথ প্রযুক্তিগত ও সাংগঠনিক ব্যবস্থা গ্রহণ করি।",
      ],
    },
    {
      heading: "৪. ডেটা ভাগাভাগি",
      paragraphs: [
        "আমরা শুধুমাত্র প্ল্যাটফর্ম পরিচালনার জন্য প্রয়োজন অনুযায়ী তৃতীয় পক্ষের পরিষেবা প্রদানকারীদের সাথে ডেটা ভাগ করি: Supabase (ডেটাবেস ও প্রমাণীকরণ), পেমেন্ট QR প্রক্রিয়াকরণ, ডেলিভারির জন্য কুরিয়ার পরিষেবা এবং Telegram (নোটিফিকেশন সরবরাহ)। প্রতিটি প্রদানকারী তাদের নিজ নিজ গোপনীয়তার বাধ্যবাধকতা অনুসারে ডেটা প্রক্রিয়া করে।",
      ],
    },
    {
      heading: "৫. আপনার অধিকার",
      paragraphs: [
        "আপনার ব্যক্তিগত ডেটা অ্যাক্সেস, সংশোধন এবং মুছে ফেলার অনুরোধ করার অধিকার আপনার রয়েছে। আপনি যেকোনো সময় ডেটা প্রক্রিয়াকরণের সম্মতি প্রত্যাহারও করতে পারেন। এই অধিকারগুলো প্রয়োগ করতে, নিচের ইমেইলে আমাদের সাথে যোগাযোগ করুন।",
      ],
    },
    {
      heading: "৬. কুকিজ",
      paragraphs: [
        "আমরা প্রমাণীকরণ ও সেশন পরিচালনার জন্য প্রয়োজনীয় কুকিজ ব্যবহার করি। কোনো ট্র্যাকিং বা বিজ্ঞাপনের কুকিজ ব্যবহার করা হয় না। আপনি আপনার ব্রাউজারে কুকি সেটিংস নিয়ন্ত্রণ করতে পারেন।",
      ],
    },
    {
      heading: "৭. যোগাযোগ",
      paragraphs: [
        "গোপনীয়তা সংক্রান্ত প্রশ্নের জন্য: dokan.mybd@gmail.com অথবা +8801863413654",
      ],
    },
  ],
};

const Privacy = () => {
  const { language } = useLanguage();
  const text = language === "bn" ? BN : EN;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> {language === "bn" ? "পিছনে" : "Back"}
        </Link>
        <div className="flex items-center gap-3 mb-10">
          <img src={dokanLogo} alt="Dokan" className="h-8 dark:invert" />
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
