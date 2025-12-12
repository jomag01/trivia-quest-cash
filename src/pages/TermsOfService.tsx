import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-8">Terms of Service</h1>
        
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Last updated: {new Date().toLocaleDateString()}</p>

          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing or using TriviaBees, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Description of Service</h2>
            <p>TriviaBees is a platform that provides gaming, marketplace, AI content creation, and affiliate marketing services. Users can earn diamonds and credits through various activities including games, referrals, and purchases.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate and complete information when creating an account</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You must be at least 13 years old to use this service</li>
              <li>One account per person is allowed</li>
              <li>A valid referral code is required for registration</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Affiliate Program</h2>
            <p>By participating in our affiliate program, you agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Not engage in fraudulent referral activities</li>
              <li>Not create fake accounts to earn referral bonuses</li>
              <li>Accept that commission rates may change with notice</li>
              <li>Comply with all applicable laws regarding affiliate marketing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Virtual Currency (Diamonds & Credits)</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Diamonds and credits have no real-world monetary value outside the platform</li>
              <li>Virtual currency is non-refundable except as required by law</li>
              <li>We reserve the right to modify the value and exchange rates</li>
              <li>Abuse of the virtual currency system may result in account termination</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Marketplace Rules</h2>
            <p>When using our marketplace:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Sellers must provide accurate product descriptions</li>
              <li>All products must comply with applicable laws</li>
              <li>Prohibited items may not be listed</li>
              <li>We may remove listings that violate our policies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. User Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Spread malware or engage in hacking</li>
              <li>Use bots or automated systems to manipulate the platform</li>
              <li>Create multiple accounts for fraudulent purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Intellectual Property</h2>
            <p>All content on TriviaBees, including but not limited to text, graphics, logos, and software, is the property of TriviaBees or its licensors and is protected by copyright and other intellectual property laws.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">9. Limitation of Liability</h2>
            <p>TriviaBees shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">10. Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time for violations of these terms or for any other reason at our discretion.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">11. Changes to Terms</h2>
            <p>We may modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">12. Governing Law</h2>
            <p>These terms shall be governed by and construed in accordance with the laws of the jurisdiction in which TriviaBees operates.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">13. Contact</h2>
            <p>For questions about these Terms of Service, contact us at support@triviabees.com</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
