import { useState, useEffect } from "react";
import { Play, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ActivityTimerProps {
  activityId: string | null;
  activityName: string;
  onStop: (activityId: string, hours: number) => void;
  onCancel: () => void;
}

export function ActivityTimer({ activityId, activityName, onStop, onCancel }: ActivityTimerProps) {
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
    const hours = totalSeconds / 3600;
    
    onStop(activityId, hours);
    setIsActive(false);
    setPausedTime(0);
    setDisplayTime(0);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!activityId) return null;

  return (
    <Card className="fixed bottom-6 right-6 p-4 shadow-lg border-primary">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Cronometrando</p>
          <p className="font-semibold text-foreground">{activityName}</p>
          <p className="text-2xl font-mono text-primary">{formatTime(displayTime)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handlePause}>
            {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="default" size="icon" onClick={handleStop}>
            <Square className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
