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
  title: "Terms of Service",
  updated: "Last updated: August 26, 2026",
  sections: [
    {
      heading: "1. Acceptance of Terms",
      paragraphs: [
        "By accessing or using Dukan (\"the Platform\"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.",
      ],
    },
    {
      heading: "2. Description of Service",
      paragraphs: [
        "Dukan provides an e-commerce platform enabling sellers to create online storefronts, list products, manage orders, and receive payments via QR codes. Buyers can browse storefronts, place orders, and track deliveries.",
      ],
    },
    {
      heading: "3. User Accounts",
      paragraphs: [
        "You must register for an account to use the Platform as a seller. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. You must be at least 18 years old to register as a seller.",
      ],
    },
    {
      heading: "4. Seller Obligations",
      paragraphs: [
        "As a seller, you agree to: (a) provide accurate information about your products and store; (b) fulfill orders in a timely manner; (c) comply with all applicable laws of the People's Republic of Bangladesh; (d) not list prohibited or illegal items; (e) maintain accurate records of transactions.",
      ],
    },
    {
      heading: "5. Prohibited Activities",
      paragraphs: [
        "You may not use the Platform to: (a) violate any law or regulation; (b) infringe on intellectual property rights; (c) distribute malware or engage in phishing; (d) harass, abuse, or harm others; (e) attempt to circumvent Platform security measures or access-control policies.",
      ],
    },
    {
      heading: "6. Subscriptions and Payments",
      paragraphs: [
        "Paid plans are billed monthly or annually as selected. Subscription fees are processed via QR payment. Refunds are handled on a case-by-case basis. We reserve the right to change pricing with 14 days' notice.",
      ],
    },
    {
      heading: "7. Limitation of Liability",
      paragraphs: [
        "Dukan is provided \"as is\" without warranties of any kind. We are not liable for disputes between buyers and sellers, losses from unauthorized account access, or service interruptions. Our total liability is limited to the amount you paid us in the 12 months preceding the claim.",
      ],
    },
    {
      heading: "8. Termination",
      paragraphs: [
        "We may suspend or terminate your account for violation of these terms, fraudulent activity, or conduct that harms the Platform or its users. You may terminate your account at any time by contacting us.",
      ],
    },
    {
      heading: "9. Governing Law",
      paragraphs: [
        "These terms are governed by the laws of the People's Republic of Bangladesh. Disputes shall be resolved in the courts of Dhaka, Bangladesh.",
      ],
    },
    {
      heading: "10. Contact",
      paragraphs: [
        "For questions about these terms: hello@dukan.example.com",
      ],
    },
  ],
};

const BN: Text = {
  title: "পরিষেবার শর্তাবলী",
  updated: "সর্বশেষ হালনাগাদ: ২৬ আগস্ট ২০২৬",
  sections: [
    {
      heading: "১. শর্তাবলী গ্রহণ",
      paragraphs: [
        "Dukan (\"প্ল্যাটফর্ম\") অ্যাক্সেস বা ব্যবহার করে, আপনি এই পরিষেবার শর্তাবলীতে আবদ্ধ হতে সম্মত হচ্ছেন। আপনি যদি সম্মত না হন, প্ল্যাটফর্ম ব্যবহার করবেন না।",
      ],
    },
    {
      heading: "২. পরিষেবার বিবরণ",
      paragraphs: [
        "Dukan একটি ই-কমার্স প্ল্যাটফর্ম প্রদান করে যা বিক্রেতাদের অনলাইন স্টোরফ্রন্ট তৈরি, পণ্য তালিকাভুক্ত, অর্ডার পরিচালনা এবং QR কোডের মাধ্যমে পেমেন্ট গ্রহণের সুযোগ দেয়। ক্রেতারা স্টোরফ্রন্ট ব্রাউজ করতে, অর্ডার দিতে এবং ডেলিভারি ট্র্যাক করতে পারেন।",
      ],
    },
    {
      heading: "৩. ব্যবহারকারী অ্যাকাউন্ট",
      paragraphs: [
        "বিক্রেতা হিসেবে প্ল্যাটফর্ম ব্যবহার করতে আপনাকে একটি অ্যাকাউন্টে নিবন্ধন করতে হবে। আপনার লগইন তথ্যের গোপনীয়তা বজায় রাখা এবং আপনার অ্যাকাউন্টের অধীনে হওয়া সমস্ত কার্যক্রমের জন্য আপনি দায়ী। বিক্রেতা হিসেবে নিবন্ধনের জন্য আপনার বয়স কমপক্ষে ১৮ বছর হতে হবে।",
      ],
    },
    {
      heading: "৪. বিক্রেতার দায়িত্ব",
      paragraphs: [
        "বিক্রেতা হিসেবে আপনি সম্মত হচ্ছেন: (ক) আপনার পণ্য ও দোকান সম্পর্কে সঠিক তথ্য প্রদান করতে; (খ) সময়মতো অর্ডার পূরণ করতে; (গ) গণপ্রজাতন্ত্রী বাংলাদেশের প্রযোজ্য সকল আইন মেনে চলতে; (ঘ) নিষিদ্ধ বা অবৈধ পণ্য তালিকাভুক্ত না করতে; (ঙ) লেনদেনের সঠিক রেকর্ড বজায় রাখতে।",
      ],
    },
    {
      heading: "৫. নিষিদ্ধ কার্যক্রম",
      paragraphs: [
        "আপনি প্ল্যাটফর্ম ব্যবহার করে নিম্নলিখিত কাজ করতে পারবেন না: (ক) কোনো আইন বা বিধি লঙ্ঘন; (খ) বৌদ্ধিক সম্পত্তির অধিকার লঙ্ঘন; (গ) ম্যালওয়্যার বিতরণ বা ফিশিংয়ে জড়িত হওয়া; (ঘ) অন্যদের হয়রানি, অপব্যবহার বা ক্ষতি করা; (ঙ) প্ল্যাটফর্মের নিরাপত্তা ব্যবস্থা বা অ্যাক্সেস-নিয়ন্ত্রণ নীতিগুলো বাইপাস করার চেষ্টা।",
      ],
    },
    {
      heading: "৬. সাবস্ক্রিপশন ও পেমেন্ট",
      paragraphs: [
        "পেইড প্ল্যানগুলো নির্বাচিত হিসাবে মাসিক বা বার্ষিক বিল করা হয়। QR পেমেন্টের মাধ্যমে সাবস্ক্রিপশন ফি প্রক্রিয়া করা হয়। রিফান্ড কেস-বাই-কেস ভিত্তিতে পরিচালিত হয়। ১৪ দিনের নোটিশ সহ আমরা মূল্য পরিবর্তনের অধিকার রাখি।",
      ],
    },
    {
      heading: "৭. দায়বদ্ধতার সীমাবদ্ধতা",
      paragraphs: [
        "Dukan কোনো ধরনের ওয়ারেন্টি ছাড়াই \"যেমন আছে তেমন\" প্রদান করা হয়। ক্রেতা ও বিক্রেতার মধ্যে বিবাদ, অননুমোদিত অ্যাকাউন্ট অ্যাক্সেসের কারণে ক্ষতি বা পরিষেবা বিঘ্নের জন্য আমরা দায়ী নই। দাবির পূর্ববর্তী ১২ মাসে আপনি আমাদের যে পরিমাণ অর্থ প্রদান করেছেন তার মধ্যে আমাদের মোট দায়বদ্ধতা সীমাবদ্ধ।",
      ],
    },
    {
      heading: "৮. সমাপ্তি",
      paragraphs: [
        "এই শর্তাবলী লঙ্ঘন, প্রতারণামূলক কার্যকলাপ বা প্ল্যাটফর্ম ও এর ব্যবহারকারীদের ক্ষতি করে এমন আচরণের জন্য আমরা আপনার অ্যাকাউন্ট স্থগিত বা বাতিল করতে পারি। আপনি যেকোনো সময় আমাদের সাথে যোগাযোগ করে আপনার অ্যাকাউন্ট বাতিল করতে পারেন।",
      ],
    },
    {
      heading: "৯. প্রযোজ্য আইন",
      paragraphs: [
        "এই শর্তাবলী গণপ্রজাতন্ত্রী বাংলাদেশের আইন দ্বারা পরিচালিত হয়। বিবাদ বাংলাদেশের ঢাকার আদালতে নিষ্পত্তি করা হবে।",
      ],
    },
    {
      heading: "১০. যোগাযোগ",
      paragraphs: [
        "এই শর্তাবলী সম্পর্কে প্রশ্নের জন্য: hello@dukan.example.com",
      ],
    },
  ],
};

const Terms = () => {
  const { language } = useLanguage();
  const text = language === "bn" ? BN : EN;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> {language === "bn" ? "পিছনে" : "Back"}
        </Link>
        <div className="flex items-center gap-3 mb-10">
          <img src={dukenLogo} alt="Dukan" className="h-8 dark:invert" />
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

export default Terms;
