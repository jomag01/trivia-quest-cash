import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import pptxgen from "pptxgenjs";

export const AppPresentationGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePresentation = async () => {
    setIsGenerating(true);
    
    try {
      const pptx = new pptxgen();
      pptx.author = "Triviabees";
      pptx.title = "Triviabees - Complete Platform Guide";
      pptx.subject = "Earning Opportunities & Features";

      // Slide 1: Title
      let slide = pptx.addSlide();
      slide.addText("TRIVIABEES", {
        x: 0.5, y: 1.5, w: 9, h: 1.5,
        fontSize: 48, bold: true, color: "F59E0B",
        align: "center"
      });
      slide.addText("Your Complete Guide to Earning", {
        x: 0.5, y: 3, w: 9, h: 0.8,
        fontSize: 24, color: "374151",
        align: "center"
      });
      slide.addText("Gems • Diamonds • Cash", {
        x: 0.5, y: 4, w: 9, h: 0.5,
        fontSize: 18, color: "6B7280",
        align: "center"
      });

      // Slide 2: Platform Overview
      slide = pptx.addSlide();
      slide.addText("Platform Overview", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: "F59E0B"
      });
      const overviewPoints = [
        "🎮 Play Games & Earn Diamonds",
        "🛒 Shop Merchandise & Earn Rewards",
        "🤖 AI-Powered Content Creation",
        "📺 Live Streaming with Monetization",
        "🍔 Food Ordering & Delivery",
        "📅 Service Booking Platform",
        "👥 Affiliate Commission System"
      ];
      slide.addText(overviewPoints.map(p => ({ text: p + "\n", options: { bullet: false } })), {
        x: 0.5, y: 1.5, w: 9, h: 4,
        fontSize: 20, color: "374151",
        valign: "top"
      });

      // Slide 3: Currency System
      slide = pptx.addSlide();
      slide.addText("Currency System", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: "F59E0B"
      });
      slide.addText("💎 DIAMONDS", {
        x: 0.5, y: 1.5, w: 4, h: 0.5,
        fontSize: 22, bold: true, color: "3B82F6"
      });
      slide.addText("• Premium currency\n• Earned from purchases\n• Can be sold in marketplace\n• Used for withdrawals", {
        x: 0.5, y: 2, w: 4, h: 2,
        fontSize: 16, color: "374151"
      });
      slide.addText("💠 GEMS", {
        x: 5, y: 1.5, w: 4, h: 0.5,
        fontSize: 22, bold: true, color: "10B981"
      });
      slide.addText("• Game rewards (Levels 1-9)\n• Convertible to Diamonds\n• Earn through gameplay\n• Default ratio: 100:1", {
        x: 5, y: 2, w: 4, h: 2,
        fontSize: 16, color: "374151"
      });

      // Slide 4: Ways to Earn
      slide = pptx.addSlide();
      slide.addText("5 Ways to Earn", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: "F59E0B"
      });
      const earningWays = [
        { title: "1. Play Games", desc: "Complete levels, earn gems & diamonds" },
        { title: "2. Buy Products", desc: "Earn diamond rewards on every purchase" },
        { title: "3. Refer Friends", desc: "Earn commissions from your network" },
        { title: "4. Sell Products", desc: "Become a verified seller" },
        { title: "5. AI Credits", desc: "Purchase AI credits, earn affiliate bonuses" }
      ];
      let yPos = 1.5;
      earningWays.forEach(way => {
        slide.addText(way.title, { x: 0.5, y: yPos, w: 9, h: 0.4, fontSize: 18, bold: true, color: "1F2937" });
        slide.addText(way.desc, { x: 0.5, y: yPos + 0.4, w: 9, h: 0.3, fontSize: 14, color: "6B7280" });
        yPos += 0.85;
      });

      // Slide 5: Commission Systems Overview
      slide = pptx.addSlide();
      slide.addText("4 Commission Systems", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: "F59E0B"
      });
      const commSystems = [
        { name: "Unilevel (7 Levels)", desc: "Earn from 7 levels of referrals", color: "3B82F6" },
        { name: "Stair-Step Plan", desc: "Advance ranks, earn higher %", color: "10B981" },
        { name: "Leadership Bonus", desc: "2% override from same-rank leaders", color: "8B5CF6" },
        { name: "Affiliate System", desc: "AI credit purchases only", color: "F59E0B" }
      ];
      yPos = 1.5;
      commSystems.forEach(sys => {
        slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: yPos, w: 9, h: 0.9, fill: { color: "F3F4F6" } });
        slide.addText(sys.name, { x: 0.7, y: yPos + 0.1, w: 4, h: 0.4, fontSize: 18, bold: true, color: sys.color });
        slide.addText(sys.desc, { x: 0.7, y: yPos + 0.5, w: 8, h: 0.3, fontSize: 14, color: "6B7280" });
        yPos += 1.1;
      });

      // Slide 6: Unilevel Commission
      slide = pptx.addSlide();
      slide.addText("Unilevel Commission (7 Levels)", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: "3B82F6"
      });
      slide.addText("Earn from purchases made by your referral network:", {
        x: 0.5, y: 1.3, w: 9, h: 0.5,
        fontSize: 16, color: "374151"
      });
      const levels = [
        { level: "Level 1 (Direct)", pct: "4%" },
        { level: "Level 2", pct: "3%" },
        { level: "Level 3", pct: "2.5%" },
        { level: "Level 4", pct: "2%" },
        { level: "Level 5", pct: "1.5%" },
        { level: "Level 6", pct: "1%" },
        { level: "Level 7", pct: "0.5%" }
      ];
      yPos = 1.9;
      levels.forEach(l => {
        slide.addText(l.level, { x: 1, y: yPos, w: 4, h: 0.4, fontSize: 16, color: "374151" });
        slide.addText(l.pct, { x: 6, y: yPos, w: 2, h: 0.4, fontSize: 16, bold: true, color: "3B82F6" });
        yPos += 0.45;
      });

      // Slide 7: Stair-Step Plan
      slide = pptx.addSlide();
      slide.addText("Stair-Step MLM Plan", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: "10B981"
      });
      slide.addText("Advance through ranks by meeting sales quotas:", {
        x: 0.5, y: 1.3, w: 9, h: 0.5,
        fontSize: 16, color: "374151"
      });
      const steps = [
        { step: "Step 1 - Bronze", rate: "2%", req: "Entry level" },
        { step: "Step 2 - Silver", rate: "5%", req: "Meet quota" },
        { step: "Step 3 - Gold", rate: "8%", req: "Higher quota" },
        { step: "Step 4+ - Diamond", rate: "Up to 21%", req: "Top performers" }
      ];
      yPos = 1.9;
      steps.forEach(s => {
        slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: yPos, w: 9, h: 0.8, fill: { color: "ECFDF5" } });
        slide.addText(s.step, { x: 0.7, y: yPos + 0.1, w: 3, h: 0.3, fontSize: 16, bold: true, color: "059669" });
        slide.addText(s.rate, { x: 4, y: yPos + 0.1, w: 1.5, h: 0.3, fontSize: 16, bold: true, color: "10B981" });
        slide.addText(s.req, { x: 5.5, y: yPos + 0.1, w: 3.5, h: 0.3, fontSize: 14, color: "6B7280" });
        yPos += 0.95;
      });
      slide.addText("💡 Maintain rank for 3 months to lock position permanently!", {
        x: 0.5, y: 4.8, w: 9, h: 0.5,
        fontSize: 14, italic: true, color: "F59E0B"
      });

      // Slide 8: Leadership Breakaway
      slide = pptx.addSlide();
      slide.addText("Leadership Breakaway Bonus", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: "8B5CF6"
      });
      slide.addText("When you reach the top rank (21%):", {
        x: 0.5, y: 1.5, w: 9, h: 0.5,
        fontSize: 18, color: "374151"
      });
      slide.addText("✓ Earn 2% override from all direct downlines also at 21%", {
        x: 0.5, y: 2.2, w: 9, h: 0.5,
        fontSize: 16, color: "374151"
      });
      slide.addText("✓ Extends 7 levels deep through your leader network", {
        x: 0.5, y: 2.7, w: 9, h: 0.5,
        fontSize: 16, color: "374151"
      });
      slide.addText("✓ Separate from regular stair-step earnings", {
        x: 0.5, y: 3.2, w: 9, h: 0.5,
        fontSize: 16, color: "374151"
      });
      slide.addShape(pptx.ShapeType.rect, { x: 1.5, y: 4, w: 7, h: 1, fill: { color: "EDE9FE" } });
      slide.addText("Build a team of leaders = Passive income stream", {
        x: 1.5, y: 4.2, w: 7, h: 0.6,
        fontSize: 18, bold: true, color: "7C3AED",
        align: "center"
      });

      // Slide 9: Affiliate System (AI Credits)
      slide = pptx.addSlide();
      slide.addText("Affiliate System (AI Credits)", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: "F59E0B"
      });
      slide.addText("Exclusive for AI Credit Purchases:", {
        x: 0.5, y: 1.3, w: 9, h: 0.5,
        fontSize: 18, color: "374151"
      });
      const binaryFeatures = [
        "• Auto-placement in weaker leg",
        "• Cycle-based commission earnings",
        "• Daily earning cap for sustainability",
        "• Auto credit replenishment from earnings",
        "• Separate from product commissions"
      ];
      slide.addText(binaryFeatures.join("\n"), {
        x: 0.5, y: 2, w: 9, h: 2.5,
        fontSize: 16, color: "374151",
        valign: "top"
      });
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 4.3, w: 9, h: 0.8, fill: { color: "FEF3C7" } });
      slide.addText("⚠️ Only triggered by AI credit tier purchases", {
        x: 0.5, y: 4.5, w: 9, h: 0.4,
        fontSize: 16, bold: true, color: "D97706",
        align: "center"
      });

      // Slide 10: AI Hub Features
      slide = pptx.addSlide();
      slide.addText("AI Hub - Create Content", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: "F59E0B"
      });
      const aiFeatures = [
        { icon: "🖼️", name: "Image Generation", desc: "Create stunning images from text" },
        { icon: "🎬", name: "Video Generation", desc: "Text-to-video with fal.ai & Grok" },
        { icon: "🎤", name: "Voiceover", desc: "Google Cloud TTS in 50+ languages" },
        { icon: "🔬", name: "Deep Research", desc: "AI-powered research assistant" },
        { icon: "📹", name: "Content Creator", desc: "Full video production pipeline" }
      ];
      yPos = 1.5;
      aiFeatures.forEach(f => {
        slide.addText(f.icon + " " + f.name, { x: 0.5, y: yPos, w: 4, h: 0.4, fontSize: 18, bold: true, color: "1F2937" });
        slide.addText(f.desc, { x: 4.5, y: yPos, w: 5, h: 0.4, fontSize: 14, color: "6B7280" });
        yPos += 0.65;
      });

      // Slide 11: Shop & Marketplace
      slide = pptx.addSlide();
      slide.addText("Shop & Marketplace", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: "F59E0B"
      });
      slide.addText("As a Buyer:", {
        x: 0.5, y: 1.4, w: 4, h: 0.4,
        fontSize: 20, bold: true, color: "3B82F6"
      });
      slide.addText("• Earn diamonds on every purchase\n• Virtual try-on for fashion\n• AI product recommendations\n• Track orders in real-time", {
        x: 0.5, y: 1.9, w: 4.3, h: 1.8,
        fontSize: 14, color: "374151"
      });
      slide.addText("As a Seller:", {
        x: 5, y: 1.4, w: 4, h: 0.4,
        fontSize: 20, bold: true, color: "10B981"
      });
      slide.addText("• Requirements: 2 referrals + verified\n• Set your own prices\n• Admin sets diamond rewards\n• Integrated shipping calculator", {
        x: 5, y: 1.9, w: 4.5, h: 1.8,
        fontSize: 14, color: "374151"
      });

      // Slide 12: Live Streaming
      slide = pptx.addSlide();
      slide.addText("Live Streaming", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: "F59E0B"
      });
      slide.addText("Monetize your content live:", {
        x: 0.5, y: 1.3, w: 9, h: 0.5,
        fontSize: 18, color: "374151"
      });
      const liveFeatures = [
        "🎁 Receive diamond gifts from viewers",
        "🛍️ Showcase products during streams",
        "💬 Real-time chat & engagement",
        "📊 Sales count toward commissions",
        "👥 Up to 200 concurrent viewers"
      ];
      slide.addText(liveFeatures.join("\n\n"), {
        x: 0.5, y: 2, w: 9, h: 3,
        fontSize: 18, color: "374151",
        valign: "top"
      });

      // Slide 13: Food & Services
      slide = pptx.addSlide();
      slide.addText("Food & Service Booking", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: "F59E0B"
      });
      slide.addText("🍔 Food Ordering", {
        x: 0.5, y: 1.4, w: 4, h: 0.4,
        fontSize: 20, bold: true, color: "EF4444"
      });
      slide.addText("• Order from local restaurants\n• Real-time delivery tracking\n• Earn diamonds on orders\n• Become a delivery rider", {
        x: 0.5, y: 1.9, w: 4.3, h: 1.8,
        fontSize: 14, color: "374151"
      });
      slide.addText("📅 Service Booking", {
        x: 5, y: 1.4, w: 4, h: 0.4,
        fontSize: 20, bold: true, color: "8B5CF6"
      });
      slide.addText("• Book professional services\n• Offer your own services\n• Manage availability\n• Referral commissions apply", {
        x: 5, y: 1.9, w: 4.5, h: 1.8,
        fontSize: 14, color: "374151"
      });

      // Slide 14: Requirements to Earn
      slide = pptx.addSlide();
      slide.addText("Requirements to Earn", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: "F59E0B"
      });
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.4, w: 9, h: 1.2, fill: { color: "FEE2E2" } });
      slide.addText("To Earn Commissions & Withdraw:", {
        x: 0.7, y: 1.5, w: 8.5, h: 0.4,
        fontSize: 18, bold: true, color: "DC2626"
      });
      slide.addText("✓ At least 2 affiliate referrals  AND  ✓ 150+ diamonds in wallet", {
        x: 0.7, y: 2, w: 8.5, h: 0.4,
        fontSize: 16, color: "374151"
      });
      slide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 2.9, w: 9, h: 1.2, fill: { color: "DBEAFE" } });
      slide.addText("To Become a Seller/Service Provider:", {
        x: 0.7, y: 3, w: 8.5, h: 0.4,
        fontSize: 18, bold: true, color: "2563EB"
      });
      slide.addText("✓ 2 referrals  +  ✓ 150 diamonds  +  ✓ Admin verification", {
        x: 0.7, y: 3.5, w: 8.5, h: 0.4,
        fontSize: 16, color: "374151"
      });

      // Slide 15: Diamond Marketplace
      slide = pptx.addSlide();
      slide.addText("Diamond Marketplace", {
        x: 0.5, y: 0.5, w: 9, h: 0.8,
        fontSize: 32, bold: true, color: "F59E0B"
      });
      slide.addText("Convert diamonds to cash:", {
        x: 0.5, y: 1.3, w: 9, h: 0.5,
        fontSize: 18, color: "374151"
      });
      const marketFeatures = [
        "💎 List your diamonds for sale",
        "💰 Set your own price per diamond",
        "🔄 Buy diamonds from other users",
        "📈 Track transaction history",
        "✅ Secure peer-to-peer trading"
      ];
      slide.addText(marketFeatures.join("\n\n"), {
        x: 0.5, y: 2, w: 9, h: 3,
        fontSize: 18, color: "374151",
        valign: "top"
      });
      slide.addText("Base price: ₱10.00 per diamond (admin configurable)", {
        x: 0.5, y: 4.8, w: 9, h: 0.4,
        fontSize: 14, italic: true, color: "6B7280"
      });

      // Slide 16: Get Started
      slide = pptx.addSlide();
      slide.addText("Get Started Today!", {
        x: 0.5, y: 1, w: 9, h: 1,
        fontSize: 40, bold: true, color: "F59E0B",
        align: "center"
      });
      const startSteps = [
        "1️⃣  Sign up with a referral code",
        "2️⃣  Explore games & earn gems",
        "3️⃣  Shop products to earn diamonds",
        "4️⃣  Refer friends to build your network",
        "5️⃣  Unlock commissions at 2 referrals + 150 diamonds"
      ];
      slide.addText(startSteps.join("\n\n"), {
        x: 1, y: 2.2, w: 8, h: 3,
        fontSize: 18, color: "374151",
        align: "center"
      });

      // Save the presentation
      await pptx.writeFile({ fileName: "Triviabees_Complete_Guide.pptx" });
      toast.success("Presentation downloaded successfully!");
    } catch (error) {
      console.error("Error generating presentation:", error);
      toast.error("Failed to generate presentation");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="h-5 w-5 text-amber-600" />
          Learn About Triviabees
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Download a comprehensive presentation explaining all earning opportunities, commission systems, and platform features.
        </p>
        <Button 
          onClick={generatePresentation} 
          disabled={isGenerating}
          className="w-full bg-amber-600 hover:bg-amber-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download Presentation (PowerPoint)
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
