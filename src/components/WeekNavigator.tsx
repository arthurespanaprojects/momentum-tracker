import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WeekNavigatorProps {
  weekDisplay: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function WeekNavigator({ weekDisplay, onPrevious, onNext, onToday }: WeekNavigatorProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-foreground">{weekDisplay}</h2>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={onPrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={onToday}>
          <Calendar className="h-4 w-4 mr-2" />
          Hoy
        </Button>
        <Button variant="outline" size="icon" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
