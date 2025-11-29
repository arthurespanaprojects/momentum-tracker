import { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, X, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ActivityTimerProps {
  activityId: string | null;
  activityName: string;
  forDate: string;
  previousMinutes: number;
  dailyGoalMinutes?: number;
  onStop: (activityId: string, minutes: number) => void;
  onCancel: () => void;
}

export function ActivityTimer({ activityId, activityName, forDate, previousMinutes, dailyGoalMinutes, onStop, onCancel }: ActivityTimerProps) {
  const [isActive, setIsActive] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [pausedTime, setPausedTime] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [goalReached, setGoalReached] = useState(false);
  const [showGoalAlert, setShowGoalAlert] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timerSyncIdRef = useRef<string | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!activityId) {
      setIsActive(false);
      setPausedTime(0);
      setDisplayTime(0);
      timerSyncIdRef.current = null;
      return;
    }
    
    const loadTimerState = async () => {
      // Buscar cronómetro activo en Supabase
      const { data, error } = await supabase
        .from('timer_sync')
        .select('*')
        .eq('activity_id', activityId)
        .eq('for_date', forDate)
        .maybeSingle();
      
      if (error) {
        console.error('Error loading timer state:', error);
      }
      
      if (data) {
        // Cargar estado existente
        timerSyncIdRef.current = data.id;
        setIsActive(data.is_active);
        setStartTime(data.start_time);
        setPausedTime(data.paused_time);
        lastSyncTimeRef.current = Date.now();
      } else {
        // Crear nuevo cronómetro
        const now = Date.now();
        const { data: newTimer, error: insertError } = await supabase
          .from('timer_sync')
          .insert({
            activity_id: activityId,
            activity_name: activityName,
            for_date: forDate,
            is_active: true,
            start_time: now,
            paused_time: 0
          })
          .select()
          .single();
        
        if (insertError) {
          console.error('Error creating timer:', insertError);
        } else {
          timerSyncIdRef.current = newTimer.id;
          setIsActive(true);
          setStartTime(now);
          setPausedTime(0);
          lastSyncTimeRef.current = Date.now();
        }
      }
    };
    
    loadTimerState();
  }, [activityId, activityName, forDate]);

  // Sincronizar estado con Supabase cuando cambie
  useEffect(() => {
    if (!activityId || !timerSyncIdRef.current) return;
    
    const syncToSupabase = async () => {
      const { error } = await supabase
        .from('timer_sync')
        .update({
          is_active: isActive,
          start_time: startTime,
          paused_time: pausedTime
        })
        .eq('id', timerSyncIdRef.current);
      
      if (error) {
        console.error('Error syncing timer:', error);
      } else {
        lastSyncTimeRef.current = Date.now();
      }
    };
    
    syncToSupabase();
  }, [activityId, isActive, startTime, pausedTime]);

  // Polling cada 30 segundos cuando el cronómetro está activo
  useEffect(() => {
    if (!activityId || !isActive || !timerSyncIdRef.current) return;
    
    const pollInterval = setInterval(async () => {
      const { data, error } = await supabase
        .from('timer_sync')
        .select('*')
        .eq('id', timerSyncIdRef.current)
        .single();
      
      if (error) {
        console.error('Error polling timer:', error);
        return;
      }
      
      if (data) {
        // Solo actualizar si ha cambiado desde otro dispositivo
        const dataUpdateTime = new Date(data.updated_at).getTime();
        if (dataUpdateTime > lastSyncTimeRef.current) {
          setIsActive(data.is_active);
          setStartTime(data.start_time);
          setPausedTime(data.paused_time);
          lastSyncTimeRef.current = Date.now();
        }
      }
    }, 30000); // 30 segundos
    
    return () => clearInterval(pollInterval);
  }, [activityId, isActive]);

  useEffect(() => {
    if (!isActive || !activityId) return;

    // Usar requestAnimationFrame en lugar de setInterval para evitar pausas en segundo plano
    let animationFrameId: number;
    
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setDisplayTime(pausedTime + elapsed);
      
      // Verificar si se alcanzó la meta diaria
      if (dailyGoalMinutes && !goalReached) {
        const newMinutes = Math.floor((pausedTime + elapsed) / 60);
        const totalMinutes = previousMinutes + newMinutes;
        
        if (totalMinutes >= dailyGoalMinutes) {
          setGoalReached(true);
          setShowGoalAlert(true);
          
          // Reproducir sonido
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS56+mjUBELTaXh8bllHgU2jdXzzn0vBSh+zPLaizsKGGC36OylUxELTKPf8bllHwU1i9T0z4IxBSd8yvLcizsKF160qOyrVhELTKPf8bllHwU1i9Tzz4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8bllHwU1i9T0z4IxBSh8yvLcizsKF1606OyjUBELTKPf8Q==');
          audio.play().catch(e => console.log('Audio play failed:', e));
          
          // Ocultar alerta después de 3 segundos
          setTimeout(() => {
            setShowGoalAlert(false);
          }, 3000);
        }
      }
      
      animationFrameId = requestAnimationFrame(updateTimer);
    };
    
    animationFrameId = requestAnimationFrame(updateTimer);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isActive, startTime, pausedTime, activityId, dailyGoalMinutes, goalReached, previousMinutes]);

  const handlePause = () => {
    if (isActive) {
      setPausedTime(pausedTime + Math.floor((Date.now() - startTime) / 1000));
      setIsActive(false);
    } else {
      setStartTime(Date.now());
      setIsActive(true);
    }
  };

  const handleStop = async () => {
    if (!activityId) return;
    
    const totalSeconds = pausedTime + (isActive ? Math.floor((Date.now() - startTime) / 1000) : 0);
    const minutes = Math.floor(totalSeconds / 60);
    
    // Eliminar de Supabase
    if (timerSyncIdRef.current) {
      await supabase
        .from('timer_sync')
        .delete()
        .eq('id', timerSyncIdRef.current);
      timerSyncIdRef.current = null;
    }
    
    onStop(activityId, minutes);
    setIsActive(false);
    setPausedTime(0);
    setDisplayTime(0);
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = async () => {
    // Eliminar de Supabase
    if (timerSyncIdRef.current) {
      await supabase
        .from('timer_sync')
        .delete()
        .eq('id', timerSyncIdRef.current);
      timerSyncIdRef.current = null;
    }
    
    setIsActive(false);
    setPausedTime(0);
    setDisplayTime(0);
    setShowCancelConfirm(false);
    onCancel();
  };

  const handleCancelDismiss = () => {
    setShowCancelConfirm(false);
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

  const currentTotal = totalMinutes;
  const goalMinutes = dailyGoalMinutes || 0;
  const progressPercentage = goalMinutes > 0 ? Math.min((currentTotal / goalMinutes) * 100, 100) : 0;

  return (
    <div className={isFullscreen ? "fixed inset-0 z-50 bg-background" : "fixed bottom-4 right-4 z-50"}>
      {/* Goal Alert */}
      {showGoalAlert && (
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div className="bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-2xl animate-bounce text-sm font-bold">
            🎉 ¡Meta Alcanzada! 🎉
          </div>
        </div>
      )}

      {/* Cancel Confirmation */}
      {showCancelConfirm && (
        <div className="absolute bottom-full mb-2 left-0 right-0">
          <div className="bg-card border-2 border-destructive rounded-lg shadow-2xl p-3 space-y-2">
            <div className="text-sm font-semibold text-foreground">¿Cancelar cronómetro?</div>
            <div className="text-xs text-muted-foreground">Se perderá el tiempo registrado</div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmCancel}
                className="flex-1"
              >
                Sí, cancelar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelDismiss}
                className="flex-1"
              >
                No
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className={`${isFullscreen ? 'h-full flex flex-col' : ''} bg-card border-2 border-border rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${showGoalAlert ? 'scale-105' : ''} ${goalReached ? 'border-emerald-500' : ''}`}>
        {/* Progress Bar */}
        {goalMinutes > 0 && (
          <div className="h-1 bg-muted">
            <div 
              className={`h-full transition-all duration-500 ${goalReached ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
        
        <div className={`${isFullscreen ? 'flex-1 flex flex-col justify-center p-8 space-y-8' : 'p-4 space-y-3 min-w-[320px]'}`}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className={`${isFullscreen ? 'text-base' : 'text-xs'} text-muted-foreground`}>Cronometrando</div>
              <div className={`${isFullscreen ? 'text-3xl' : 'text-sm'} font-semibold text-foreground truncate`}>{activityName}</div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={`${isFullscreen ? 'h-8 w-8' : 'h-6 w-6'}`}
              >
                <Maximize className={`${isFullscreen ? 'h-5 w-5' : 'h-4 w-4'}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancelClick}
                className={`${isFullscreen ? 'h-8 w-8' : 'h-6 w-6'}`}
              >
                <X className={`${isFullscreen ? 'h-5 w-5' : 'h-4 w-4'}`} />
              </Button>
            </div>
          </div>

          {/* Time Display */}
          <div className={`flex ${isFullscreen ? 'flex-col' : 'items-center justify-between'} ${isFullscreen ? 'text-base space-y-6' : 'text-xs'}`}>
            {isFullscreen ? (
              <>
                <div className={`text-center text-9xl font-mono font-bold ${goalReached ? 'text-emerald-500' : 'text-primary'}`}>
                  {formatTime(displayTime)}
                </div>
                <div className="flex justify-around w-full">
                  <div className="text-center">
                    <div className="text-lg text-muted-foreground">Actual</div>
                    <div className={`text-4xl font-mono font-bold ${goalReached ? 'text-emerald-500' : 'text-foreground'}`}>
                      {formatMinutes(currentTotal)}
                    </div>
                  </div>
                  {goalMinutes > 0 && (
                    <div className="text-center">
                      <div className="text-lg text-muted-foreground">Meta</div>
                      <div className="text-4xl font-mono font-bold text-muted-foreground">
                        {formatMinutes(goalMinutes)}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="text-muted-foreground">Actual</div>
                  <div className={`text-lg font-mono font-bold ${goalReached ? 'text-emerald-500' : 'text-foreground'}`}>
                    {formatMinutes(currentTotal)}
                  </div>
                </div>
                
                <div className={`text-4xl font-mono font-bold ${goalReached ? 'text-emerald-500' : 'text-primary'}`}>
                  {formatTime(displayTime)}
                </div>
                
                {goalMinutes > 0 && (
                  <div className="text-center">
                    <div className="text-muted-foreground">Meta</div>
                    <div className="text-lg font-mono font-bold text-muted-foreground">
                      {formatMinutes(goalMinutes)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Controls */}
          <div className={`flex gap-2 ${isFullscreen ? 'max-w-md mx-auto w-full' : ''}`}>
            <Button
              variant="outline"
              size={isFullscreen ? "lg" : "sm"}
              onClick={handlePause}
              className={`flex-1 ${isFullscreen ? 'text-lg py-6' : ''}`}
            >
              {isActive ? (
                <>
                  <Pause className={`mr-2 ${isFullscreen ? 'h-6 w-6' : 'h-4 w-4'}`} />
                  Pausar
                </>
              ) : (
                <>
                  <Play className={`mr-2 ${isFullscreen ? 'h-6 w-6' : 'h-4 w-4'}`} />
                  Reanudar
                </>
              )}
            </Button>
            <Button
              variant="default"
              size={isFullscreen ? "lg" : "sm"}
              onClick={handleStop}
              className={`flex-1 ${isFullscreen ? 'text-lg py-6' : ''}`}
            >
              <Square className={`mr-2 ${isFullscreen ? 'h-6 w-6' : 'h-4 w-4'}`} />
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
