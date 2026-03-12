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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0 mb-6 sm:mb-8">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center sm:text-left">{weekDisplay}</h2>
      <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-end">
        <Button variant="outline" size="icon" onClick={onPrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" onClick={onToday} className="flex-1 sm:flex-none">
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
