import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { 
  Shield, AlertTriangle, CheckCircle, XCircle, 
  Lock, Eye, Bot, Flag, Scale, Globe
} from "lucide-react";

export function ChatMateTermsSafety() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold">Terms & Safety</h1>
        <p className="text-muted-foreground">
          Your safety is our priority. Please review our guidelines.
        </p>
        <Badge variant="secondary" className="text-xs">
          Last updated: January 2026
        </Badge>
      </div>

      {/* Platform Nature */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Globe className="w-5 h-5" />
              Platform Nature
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <strong>Triviabees BeesMate Finder</strong> is an <strong>interest-based social chat feature</strong>. 
              It is designed for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Interest-based bees mates (hobbies, AI, business, games, faith, learning)</li>
              <li>AI-recommended conversations</li>
              <li>Local or global chat connections</li>
              <li>Game & quiz bees mates</li>
              <li>Business / affiliate networking chat</li>
            </ul>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <p className="font-medium text-blue-800 dark:text-blue-300">
                ⚠️ This is NOT a dating service and does not guarantee personal relationships.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Prohibited Behavior */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="w-5 h-5" />
              Prohibited Behavior
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { text: "MLM pitching inside chat", icon: AlertTriangle },
                { text: "Spam or solicitation", icon: AlertTriangle },
                { text: "Harassment or hate speech", icon: AlertTriangle },
                { text: "Requests for money", icon: AlertTriangle },
                { text: "External platform coercion", icon: AlertTriangle },
                { text: "Sharing explicit content", icon: AlertTriangle },
                { text: "Impersonation", icon: AlertTriangle },
                { text: "Scam attempts", icon: AlertTriangle },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Moderation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-500" />
              AI Moderation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              AI monitors chats for safety signals including:
            </p>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              {["Spam detection", "MLM pitch abuse detection", "Harassment filtering", "Link abuse patterns"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <Bot className="w-4 h-4 text-purple-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Violations may result in:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Auto mute</Badge>
                <Badge variant="secondary">Match restriction</Badge>
                <Badge variant="secondary">Trust score reduction</Badge>
                <Badge variant="destructive">Account suspension</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Trust Score System */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              Trust Score System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Every user starts with a trust score of 100. Your score affects visibility and matching priority.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                  🟢
                </div>
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">80-100: Trusted</p>
                  <p className="text-xs text-muted-foreground">Full access, priority matching</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-yellow-500 text-white flex items-center justify-center font-bold">
                  🟡
                </div>
                <div>
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">50-79: Caution</p>
                  <p className="text-xs text-muted-foreground">AI monitoring active, limited features</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center font-bold">
                  🔴
                </div>
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">0-49: Restricted</p>
                  <p className="text-xs text-muted-foreground">Auto-muted, under review</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Privacy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-500" />
              Privacy & Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <p>Chats are private by default and encrypted</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <p>AI analysis is automated and non-human reviewed unless flagged</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <p>Users may block or report anytime</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <p>Data deletion available upon request</p>
            </div>
            <div className="flex items-start gap-2">
              <Eye className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p>Profile visibility is user-controlled</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Reporting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-orange-500" />
              How to Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>If you encounter inappropriate behavior:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Tap the <strong>⋮ menu</strong> in any chat</li>
              <li>Select <strong>"Report User"</strong></li>
              <li>Choose the reason and provide details</li>
              <li>Our team will review within 24 hours</li>
            </ol>
            <p className="text-xs">
              False reports may affect your own trust score.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Compliance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/50 dark:border-green-800/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-green-600" />
              Legal Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Triviabees Chat Mate Finder complies with:
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                🇵🇭 PH Cybercrime Prevention Act
              </Badge>
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                🇪🇺 GDPR (EU)
              </Badge>
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                🇺🇸 US Online Safety Standards
              </Badge>
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                🌏 Data Privacy Act (PH)
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}