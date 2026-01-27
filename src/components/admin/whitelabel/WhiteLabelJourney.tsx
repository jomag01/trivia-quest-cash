import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  CreditCard, 
  Settings, 
  Palette, 
  Globe, 
  Rocket,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

const journeySteps = [
  {
    step: 1,
    title: "Choose a Plan",
    description: "Client selects Starter, Professional, or Enterprise tier based on their needs",
    icon: UserPlus,
    color: "from-blue-500 to-cyan-500",
    details: ["Compare features", "Select billing cycle", "Review included systems"]
  },
  {
    step: 2,
    title: "Submit Application",
    description: "Client fills out company details and submits payment proof",
    icon: CreditCard,
    color: "from-green-500 to-emerald-500",
    details: ["Company information", "Payment method", "Proof of payment"]
  },
  {
    step: 3,
    title: "Admin Approval",
    description: "Admin reviews application and activates the subscription",
    icon: CheckCircle2,
    color: "from-amber-500 to-orange-500",
    details: ["Verify payment", "Review details", "Approve or reject"]
  },
  {
    step: 4,
    title: "System Setup",
    description: "Admin configures client's white-label instance",
    icon: Settings,
    color: "from-purple-500 to-indigo-500",
    details: ["Create database", "Set user limits", "Enable features"]
  },
  {
    step: 5,
    title: "Branding Config",
    description: "Client customizes their platform branding and theme",
    icon: Palette,
    color: "from-pink-500 to-rose-500",
    details: ["Upload logo", "Set colors", "Configure theme"]
  },
  {
    step: 6,
    title: "Domain Setup",
    description: "Connect custom domain and configure DNS",
    icon: Globe,
    color: "from-teal-500 to-cyan-500",
    details: ["Add DNS records", "SSL certificate", "Verify ownership"]
  },
  {
    step: 7,
    title: "Go Live!",
    description: "Platform is deployed and ready for users",
    icon: Rocket,
    color: "from-red-500 to-orange-500",
    details: ["Final testing", "Launch platform", "Onboard users"]
  },
];

export default function WhiteLabelJourney() {
  return (
    <Card className="p-3 md:p-4">
      <div className="flex items-center gap-2 mb-4">
        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
          User Journey
        </Badge>
        <h3 className="font-semibold text-sm">White-Label Onboarding Process</h3>
      </div>

      {/* Mobile: Vertical Timeline */}
      <div className="md:hidden space-y-3">
        {journeySteps.map((step, index) => (
          <div key={step.step} className="flex gap-3">
            {/* Timeline Line */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-xs font-bold shadow-md`}>
                {step.step}
              </div>
              {index < journeySteps.length - 1 && (
                <div className="w-0.5 h-full min-h-[40px] bg-gradient-to-b from-border to-transparent mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-3">
              <div className="flex items-center gap-2">
                <step.icon className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium text-sm">{step.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {step.details.map((detail, i) => (
                  <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0">
                    {detail}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Horizontal Flow */}
      <div className="hidden md:block overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {journeySteps.map((step, index) => (
            <div key={step.step} className="flex items-center">
              <div className="w-32 flex-shrink-0">
                <div className={`w-10 h-10 mx-auto rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-sm font-bold shadow-lg`}>
                  {step.step}
                </div>
                <div className="text-center mt-2">
                  <step.icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <h4 className="font-medium text-xs">{step.title}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 px-1">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < journeySteps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t">
        <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
          <div className="text-lg font-bold text-blue-600">7</div>
          <div className="text-[10px] text-muted-foreground">Steps</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-green-50 dark:bg-green-950">
          <div className="text-lg font-bold text-green-600">24h</div>
          <div className="text-[10px] text-muted-foreground">Avg. Setup</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-purple-50 dark:bg-purple-950">
          <div className="text-lg font-bold text-purple-600">∞</div>
          <div className="text-[10px] text-muted-foreground">Possibilities</div>
        </div>
      </div>
    </Card>
  );
}
