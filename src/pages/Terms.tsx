import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import dukenLogo from "@/assets/duken-logo.webp";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>
        <div className="flex items-center gap-3 mb-10">
          <img src={dukenLogo} alt="Duken" className="h-8 dark:invert" />
          <span className="text-xs font-mono text-muted-foreground tracking-wider uppercase">Terms of Service</span>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none font-mono">
          <h1 className="text-xl font-semibold tracking-tight mb-8">Terms of Service</h1>
          <p className="text-muted-foreground text-xs">Last updated: May 11, 2026</p>

          <h2 className="text-sm font-semibold mt-8 mb-3">1. Acceptance of Terms</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            By accessing or using Duken ("the Platform"), you agree to be bound by these Terms of Service.
            If you do not agree, do not use the Platform.
          </p>

          <h2 className="text-sm font-semibold mt-8 mb-3">2. Description of Service</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Duken provides an e-commerce platform enabling sellers to create online storefronts,
            list products, manage orders, and receive payments through Kaspi QR codes.
            Buyers can browse storefronts, place orders, and track deliveries.
          </p>

          <h2 className="text-sm font-semibold mt-8 mb-3">3. User Accounts</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You must register for an account to use the Platform as a seller. You are responsible
            for maintaining the confidentiality of your login credentials and for all activities
            under your account. You must be at least 18 years old to register as a seller.
          </p>

          <h2 className="text-sm font-semibold mt-8 mb-3">4. Seller Obligations</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            As a seller, you agree to: (a) provide accurate information about your products and store;
            (b) fulfill orders in a timely manner; (c) comply with all applicable laws of the
            Republic of Kazakhstan; (d) not list prohibited or illegal items; (e) maintain accurate
            records of transactions.
          </p>

          <h2 className="text-sm font-semibold mt-8 mb-3">5. Prohibited Activities</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You may not use the Platform to: (a) violate any law or regulation; (b) infringe on
            intellectual property rights; (c) distribute malware or engage in phishing;
            (d) harass, abuse, or harm others; (e) attempt to circumvent Platform security measures
            or RLS policies.
          </p>

          <h2 className="text-sm font-semibold mt-8 mb-3">6. Subscriptions and Payments</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Paid plans are billed monthly or annually as selected. Subscription fees are processed
            via Kaspi QR payment. Refunds are handled on a case-by-case basis.
            We reserve the right to change pricing with 14 days' notice.
          </p>

          <h2 className="text-sm font-semibold mt-8 mb-3">7. Limitation of Liability</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Duken is provided "as is" without warranties of any kind. We are not liable for
            disputes between buyers and sellers, losses from unauthorized account access,
            or service interruptions. Our total liability is limited to the amount you paid us
            in the 12 months preceding the claim.
          </p>

          <h2 className="text-sm font-semibold mt-8 mb-3">8. Termination</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We may suspend or terminate your account for violation of these terms,
            fraudulent activity, or conduct that harms the Platform or its users.
            You may terminate your account at any time by contacting us.
          </p>

          <h2 className="text-sm font-semibold mt-8 mb-3">9. Governing Law</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            These terms are governed by the laws of the Republic of Kazakhstan.
            Disputes shall be resolved in the courts of Astana, Kazakhstan.
          </p>

          <h2 className="text-sm font-semibold mt-8 mb-3">10. Contact</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            For questions about these terms: <span className="text-foreground">hello@duken.kz</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terms;
