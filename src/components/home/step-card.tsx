import { Card, CardContent } from '@/components/ui/card';

export function StepCard({
  icon: Icon,
  title,
  description,
  step,
}: {
  icon: any;
  title: string;
  description: string;
  step: number;
}) {
  return (
    <Card className="relative overflow-visible border-border/50 hover:border-border transition-colors">
      <CardContent className="p-6 space-y-4">
        {/* Step Number */}
        <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shadow-sm">
          {step}
        </div>

        {/* Icon */}
        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center">
          <Icon size={20} />
        </div>

        <h3 className="text-lg font-semibold">{title}</h3>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
