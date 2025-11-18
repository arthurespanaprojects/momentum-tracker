import { useState, useEffect } from "react";
import { Play, Pause, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivityTimerProps {
  activityId: string | null;
  activityName: string;
  previousMinutes: number;
  onStop: (activityId: string, minutes: number) => void;
  onCancel: () => void;
}

export function ActivityTimer({ activityId, activityName, previousMinutes, onStop, onCancel }: ActivityTimerProps) {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [pausedTime, setPausedTime] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);

  useEffect(() => {
    if (!activityId) {
      setIsActive(false);
      setPausedTime(0);
      setDisplayTime(0);
      return;
    }
    
    // Auto-start when activity is selected
    setIsActive(true);
    setStartTime(Date.now());
  }, [activityId]);

  useEffect(() => {
    if (!isActive || !activityId) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setDisplayTime(pausedTime + elapsed);
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, startTime, pausedTime, activityId]);

  const handlePause = () => {
    if (isActive) {
      setPausedTime(pausedTime + Math.floor((Date.now() - startTime) / 1000));
      setIsActive(false);
    } else {
      setStartTime(Date.now());
      setIsActive(true);
    }
  };

  const handleStop = () => {
    if (!activityId) return;
    
    const totalSeconds = pausedTime + (isActive ? Math.floor((Date.now() - startTime) / 1000) : 0);
    const minutes = Math.floor(totalSeconds / 60);
    
    onStop(activityId, minutes);
    setIsActive(false);
    setPausedTime(0);
    setDisplayTime(0);
  };

  const handleCancel = () => {
    setIsActive(false);
    setPausedTime(0);
    setDisplayTime(0);
    onCancel();
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  if (!activityId) return null;

  const newMinutes = Math.floor(displayTime / 60);
  const totalMinutes = previousMinutes + newMinutes;

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
      <div className="w-full max-w-2xl p-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-sm text-muted-foreground uppercase tracking-wider">
            Cronometrando
          </div>
          <h1 className="text-5xl font-bold text-foreground">
            {activityName}
          </h1>
        </div>

        {/* Main Timer Display */}
        <div className="text-center">
          <div className="text-8xl font-mono font-bold text-primary mb-4">
            {formatTime(displayTime)}
          </div>
          <div className="text-xl text-muted-foreground">
            {isActive ? "En progreso..." : "Pausado"}
          </div>
        </div>

        {/* Time Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Tiempo Previo</div>
            <div className="text-2xl font-semibold text-foreground">
              {formatMinutes(previousMinutes)}
            </div>
          </div>
          <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
            <div className="text-sm text-muted-foreground mb-1">Nuevo Tiempo</div>
            <div className="text-2xl font-semibold text-primary">
              {formatMinutes(newMinutes)}
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Total del Día</div>
            <div className="text-2xl font-semibold text-foreground">
              {formatMinutes(totalMinutes)}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handlePause}
            className="w-32 h-16 text-lg"
          >
            {isActive ? (
              <>
                <Pause className="mr-2 h-6 w-6" />
                Pausar
              </>
            ) : (
              <>
                <Play className="mr-2 h-6 w-6" />
                Reanudar
              </>
            )}
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={handleStop}
            className="w-32 h-16 text-lg"
          >
            <Square className="mr-2 h-6 w-6" />
            Terminar
          </Button>
          <Button
            variant="destructive"
            size="lg"
            onClick={handleCancel}
            className="w-32 h-16 text-lg"
          >
            <X className="mr-2 h-6 w-6" />
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
