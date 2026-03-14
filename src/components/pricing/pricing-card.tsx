import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PricingCard({
  name,
  price,
  description,
  features,
  button,
  highlight,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  button: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={cn(
        'flex flex-col border-border/50',
        highlight && 'border-primary shadow-lg',
      )}
    >
      <CardHeader className="space-y-2">
        <CardTitle className="text-xl font-semibold">{name}</CardTitle>

        <p className="text-muted-foreground text-sm">{description}</p>

        <div className="text-3xl font-bold pt-2">{price}</div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 space-y-6">
        <ul className="space-y-3 text-sm">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2">
              <Check size={16} className="text-primary" />
              {feature}
            </li>
          ))}
        </ul>

        <Button
          className="w-full mt-auto"
          variant={highlight ? 'default' : 'outline'}
        >
          {button}
        </Button>
      </CardContent>
    </Card>
  );
}
