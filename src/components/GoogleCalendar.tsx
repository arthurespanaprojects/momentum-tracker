import { useEffect, useRef, useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import googleCalendarPlugin from '@fullcalendar/google-calendar';
import interactionPlugin from '@fullcalendar/interaction';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useGoogleAuth } from '@/contexts/GoogleAuthContext';
import { useToast } from '@/components/ui/use-toast';
import './GoogleCalendar.css';

interface GoogleCalendarProps {
  apiKey: string;
  calendarIds: string[];
  clientId: string;
}

interface EventInfo {
  id?: string;
  calendarId?: string;
  title: string;
  start: string;
  end?: string;
  description?: string;
  location?: string;
  isTask?: boolean;
  completed?: boolean;
}

interface EventFormData {
  title: string;
  description: string;
  startDate: string;
}

export function GoogleCalendar({ apiKey, calendarIds, clientId }: GoogleCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const { toast } = useToast();
  const googleAuth = useGoogleCalendar(clientId);
  const googleAuthContext = useGoogleAuth();
  
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventInfo | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [shouldRefetch, setShouldRefetch] = useState(false);
  const eventsCache = useRef<any[]>([]);
  
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    startDate: ''
  });

  const [editFormData, setEditFormData] = useState<EventFormData>({
    title: '',
    description: '',
    startDate: ''
  });

  // Memorizar eventSources para evitar recreación en cada render
  const eventSources = useMemo(() => {
    return calendarIds.map(id => ({
      googleCalendarId: id,
    }));
  }, [calendarIds]);

  useEffect(() => {
    if (!apiKey || apiKey === 'PEGA_AQUI_TU_API_KEY') {
      setError('Falta configurar VITE_GOOGLE_CALENDAR_API_KEY en el archivo .env');
    } else if (calendarIds.length === 0) {
      setError('No hay calendarios configurados');
    } else {
      setError(null);
    }
  }, [apiKey, calendarIds]);

  // Escuchar cambios del contexto para refrescar el calendario
  useEffect(() => {
    if (googleAuthContext.refreshTrigger > 0 && calendarRef.current && !isRefreshing) {
      setTimeout(() => {
        if (calendarRef.current) {
          calendarRef.current.getApi().refetchEvents();
        }
      }, 500);
    }
  }, [googleAuthContext.refreshTrigger]);

  // Polling automático para detectar cambios externos (cada 30 segundos)
  useEffect(() => {
    if (!googleAuth.isSignedIn) return;

    const intervalId = setInterval(() => {
      if (calendarRef.current && !isRefreshing && !isSubmitting) {
        calendarRef.current.getApi().refetchEvents();
      }
    }, 30000); // 30 segundos

    return () => clearInterval(intervalId);
  }, [googleAuth.isSignedIn, isRefreshing, isSubmitting]);

  const handleEventClick = (info: any) => {
    const event = info.event;
    const isTask = event.extendedProps.eventType === 'task' || !event.start;
    
    const eventId = event.id || event.extendedProps?.id || event._def?.publicId;
    const calendarId = event.source?.googleCalendarId || calendarIds[0];
    
    setSelectedEvent({
      id: eventId,
      calendarId: calendarId,
      title: event.title,
      start: event.start?.toISOString() || '',
      end: event.end?.toISOString(),
      description: event.extendedProps.description || 'Sin descripción',
      location: event.extendedProps.location || '',
      isTask,
      completed: event.extendedProps.status === 'completed'
    });
    setShowEventDialog(true);
  };

  const handleDateClick = (info: any) => {
    if (!googleAuth.isSignedIn) {
      toast({
        title: 'No autenticado',
        description: 'Por favor conecta tu cuenta de Google primero',
        variant: 'destructive'
      });
      return;
    }
    
    const date = info.date;
    setSelectedDate(date);
    
    // Inicializar formulario con fecha seleccionada
    const dateStr = date.toISOString().split('T')[0];
    setFormData({
      title: '',
      description: '',
      startDate: dateStr
    });
    
    setShowAddDialog(true);
  };

  const handleCreateEvent = async () => {
    if (!googleAuth.isSignedIn) {
      toast({
        title: 'No autenticado',
        description: 'Por favor inicia sesión primero',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: 'Error',
        description: 'El título es obligatorio',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const calendarId = calendarIds[0]; // Usar el calendario primario
      
      const event = {
        summary: formData.title,
        description: formData.description,
        start: {
          date: formData.startDate
        },
        end: {
          date: formData.startDate
        }
      };

      await googleAuth.createEvent(calendarId, event);
      
      toast({
        title: 'Tarea creada',
        description: 'La tarea se agregó correctamente'
      });
      
      setShowAddDialog(false);
      
      // Refrescar calendario de forma suave
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (calendarRef.current && !isRefreshing) {
            setIsRefreshing(true);
            setShouldRefetch(true);
            calendarRef.current.getApi().refetchEvents();
            setTimeout(() => {
              setIsRefreshing(false);
              setShouldRefetch(false);
            }, 1000);
          }
        }, 800);
      });
    } catch (error) {
      console.error('Error creando evento:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el evento',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = () => {
    if (!selectedEvent) return;
    
    const startDate = selectedEvent.start ? selectedEvent.start.split('T')[0] : '';
    
    setEditFormData({
      title: selectedEvent.title,
      description: selectedEvent.description || '',
      startDate: startDate
    });
    
    setShowEventDialog(false);
    setShowEditDialog(true);
  };

  const handleUpdateEvent = async () => {
    if (!googleAuth.isSignedIn || !selectedEvent?.id || !selectedEvent?.calendarId) {
      console.error('❌ Faltan datos:', {
        isSignedIn: googleAuth.isSignedIn,
        eventId: selectedEvent?.id,
        calendarId: selectedEvent?.calendarId
      });
      toast({
        title: 'Error',
        description: 'No se puede actualizar el evento',
        variant: 'destructive'
      });
      return;
    }

    if (!editFormData.title.trim()) {
      toast({
        title: 'Error',
        description: 'El título es obligatorio',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedEvent = {
        summary: editFormData.title,
        description: editFormData.description,
        start: {
          date: editFormData.startDate
        },
        end: {
          date: editFormData.startDate
        }
      };

      await googleAuth.updateEvent(selectedEvent.calendarId, selectedEvent.id, updatedEvent as any);
      
      toast({
        title: 'Tarea actualizada',
        description: 'Los cambios se guardaron correctamente'
      });
      
      setShowEditDialog(false);
      setSelectedEvent(null);
      
      // Refrescar calendario de forma suave
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (calendarRef.current && !isRefreshing) {
            setIsRefreshing(true);
            setShouldRefetch(true);
            calendarRef.current.getApi().refetchEvents();
            setTimeout(() => {
              setIsRefreshing(false);
              setShouldRefetch(false);
            }, 1000);
          }
        }, 800);
      });
    } catch (error) {
      console.error('Error actualizando evento:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la tarea',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    setShowEventDialog(false);
    setShowDeleteDialog(true);
  };

  const handleDeleteEvent = async () => {
    if (!googleAuth.isSignedIn || !selectedEvent?.id || !selectedEvent?.calendarId) {
      toast({
        title: 'Error',
        description: 'No se puede eliminar el evento',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await googleAuth.deleteEvent(selectedEvent.calendarId, selectedEvent.id);
      
      toast({
        title: 'Tarea eliminada',
        description: 'La tarea se eliminó correctamente'
      });
      
      setShowDeleteDialog(false);
      setSelectedEvent(null);
      
      // Refrescar calendario de forma suave
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (calendarRef.current && !isRefreshing) {
            setIsRefreshing(true);
            setShouldRefetch(true);
            calendarRef.current.getApi().refetchEvents();
            setTimeout(() => {
              setIsRefreshing(false);
              setShouldRefetch(false);
            }, 1000);
          }
        }, 800);
      });
    } catch (error) {
      console.error('Error eliminando evento:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la tarea',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!googleAuth.isSignedIn || !selectedEvent?.id || !selectedEvent?.calendarId) return;

    setIsSubmitting(true);
    try {
      await googleAuth.updateEvent(selectedEvent.calendarId, selectedEvent.id, {
        status: 'completed'
      } as any);
      
      toast({
        title: 'Tarea completada',
        description: 'La tarea ha sido marcada como completada'
      });
      
      setShowEventDialog(false);
      
      // Refrescar calendario de forma suave
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (calendarRef.current && !isRefreshing) {
            setIsRefreshing(true);
            setShouldRefetch(true);
            calendarRef.current.getApi().refetchEvents();
            setTimeout(() => {
              setIsRefreshing(false);
              setShouldRefetch(false);
            }, 1000);
          }
        }, 800);
      });
    } catch (error) {
      console.error('Error completando tarea:', error);
      toast({
        title: 'Error',
        description: 'No se pudo completar la tarea',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-destructive text-lg font-semibold mb-2">{error}</div>
        <div className="text-muted-foreground text-sm">
          Verifica tu configuración y reinicia el servidor
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="google-calendar-container">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, googleCalendarPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'customAuthButton'
          }}
          customButtons={{
            customAuthButton: {
              text: !googleAuth.isInitialized ? 'Cargando...' : (googleAuth.isSignedIn ? 'Cerrar sesión' : 'Conectar'),
              click: () => {
                if (!googleAuth.isInitialized) return;
                if (googleAuth.isSignedIn) {
                  googleAuth.signOut();
                } else {
                  googleAuth.signIn();
                }
              }
            }
          }}
          googleCalendarApiKey={apiKey}
          eventSources={eventSources}
          eventSourceFailure={(error) => {
            console.warn('⚠️ Error cargando un calendario:', error);
          }}
          eventClick={(info) => {
            info.jsEvent.preventDefault(); // Evitar que abra Google Calendar
            handleEventClick(info);
          }}
          height="auto"
          locale="es"
          firstDay={1}
          timeZone="America/La_Paz"
          buttonText={{
            today: 'Hoy',
            month: 'Mes'
          }}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }}
          displayEventTime={true}
          displayEventEnd={false}
          nowIndicator={true}
          editable={false}
          selectable={true}
          dateClick={handleDateClick}
          dayMaxEvents={false}
          weekends={true}
          fixedWeekCount={false}
          aspectRatio={1.8}
          eventClassNames={(arg) => {
            const classes = [];
            if (arg.event.extendedProps.status === 'completed') {
              classes.push('fc-event-completed');
            }
            if (arg.event.extendedProps.eventType === 'task') {
              classes.push('fc-event-task');
            }
            return classes;
          }}
          eventDataTransform={(event) => {
            // Solo actualizar cache durante refetch explícito
            if (shouldRefetch) {
              const idx = eventsCache.current.findIndex(e => e.id === event.id);
              if (idx >= 0) {
                eventsCache.current[idx] = event;
              } else {
                eventsCache.current.push(event);
              }
            }
            return event;
          }}
          lazyFetching={true}
          refetchResourcesOnNavigate={false}
          progressiveEventRendering={true}
        />
      </div>

      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
                {selectedEvent?.isTask && (
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="font-semibold text-foreground mb-2">Tarea</div>
                    <div className="text-sm">
                      Estado: {selectedEvent.completed ? 
                        <span className="text-emerald-500 font-semibold">Completada</span> : 
                        <span className="text-amber-500 font-semibold">Pendiente</span>
                      }
                    </div>
                  </div>
                )}
                
                {!selectedEvent?.isTask && selectedEvent?.start && (
                  <div>
                    <div className="font-semibold text-foreground">Fecha y hora</div>
                    <div className="text-base mt-1">
                      {new Date(selectedEvent.start).toLocaleString('es-BO', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'America/La_Paz'
                      })}
                      {selectedEvent?.end && ` - ${new Date(selectedEvent.end).toLocaleString('es-BO', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'America/La_Paz'
                      })}`}
                    </div>
                  </div>
                )}
                
                {selectedEvent?.location && (
                  <div>
                    <div className="font-semibold text-foreground">Ubicación</div>
                    <div className="text-base mt-1">{selectedEvent.location}</div>
                  </div>
                )}
                
                {selectedEvent?.description && selectedEvent.description !== 'Sin descripción' && (
                  <div>
                    <div className="font-semibold text-foreground">Descripción</div>
                    <div className="text-base mt-1 whitespace-pre-wrap">{selectedEvent.description}</div>
                  </div>
                )}
              </div>
          <div className="flex gap-2 justify-between mt-4">
            <div className="flex gap-2">
              {googleAuth.isSignedIn && (
                <>
                  <Button 
                    variant="destructive"
                    onClick={handleDeleteClick}
                  >
                    Eliminar
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleEditClick}
                  >
                    Editar
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                Cerrar
              </Button>
              {selectedEvent?.isTask && !selectedEvent.completed && googleAuth.isSignedIn && (
                <Button 
                  variant="default"
                  onClick={handleCompleteTask}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Marcando...' : 'Marcar como Completada'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Añadir tarea</DialogTitle>
          </DialogHeader>
          <div className="text-sm mb-4 text-muted-foreground">
            {selectedDate?.toLocaleDateString('es-BO', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: 'America/La_Paz'
            })}
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="¿Qué hay que hacer?"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalles adicionales..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateEvent} disabled={isSubmitting}>
              {isSubmitting ? 'Creando...' : 'Crear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Editar tarea</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                placeholder="¿Qué hay que hacer?"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Detalles adicionales..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-date">Fecha</Label>
              <Input
                id="edit-date"
                type="date"
                value={editFormData.startDate}
                onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateEvent} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>¿Eliminar tarea?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mt-4">
            Esta acción no se puede deshacer. La tarea se eliminará permanentemente.
          </p>
          <div className="flex gap-2 justify-end mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setShowEventDialog(true);
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteEvent}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
