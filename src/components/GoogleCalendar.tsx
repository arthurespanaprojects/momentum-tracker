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
import { format } from 'date-fns';
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
  const eventsCache = useRef<any[]>([]);
  const [googleTasks, setGoogleTasks] = useState<any[]>([]);
  const lastTasksUpdate = useRef<number>(0);
  const loadTasksTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
    const calendarSources = calendarIds.map(id => ({
      googleCalendarId: id,
    }));

    // Agregar tareas de Google Tasks como eventos
    const taskEvents = googleTasks
      .filter(task => task.due) // Solo tareas con fecha
      .map(task => {
        // Extraer fecha directamente sin conversión de timezone
        const dateStr = task.due.split('T')[0];
        
        return {
          id: `task-${task.id}`,
          title: task.title,
          start: dateStr,
          allDay: true,
          backgroundColor: task.status === 'completed' ? '#10b981' : '#f59e0b',
          borderColor: task.status === 'completed' ? '#10b981' : '#f59e0b',
          extendedProps: {
            isGoogleTask: true,
            taskId: task.id,
            description: task.notes || '',
            status: task.status,
            completed: task.status === 'completed'
          }
        };
      });

    return [
      ...calendarSources,
      {
        id: 'google-tasks',
        events: taskEvents,
        color: '#f59e0b'
      }
    ];
  }, [calendarIds, googleTasks]);

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
    if (googleAuthContext.refreshTrigger > 0 && googleAuth.isSignedIn) {
      loadGoogleTasks();
    }
  }, [googleAuthContext.refreshTrigger]);

  // Cargar tareas de Google Tasks con debounce
  const loadGoogleTasks = async (immediate = false) => {
    if (!googleAuth.isSignedIn || !window.gapi?.client?.tasks) return;

    // Evitar múltiples llamadas en menos de 300ms
    const now = Date.now();
    if (!immediate && now - lastTasksUpdate.current < 300) {
      return;
    }

    // Cancelar timeout anterior si existe
    if (loadTasksTimeoutRef.current) {
      clearTimeout(loadTasksTimeoutRef.current);
    }

    const doLoad = async () => {
      try {
        const tasks = await googleAuth.listTasks('@default');
        // Solo actualizar si hay cambios (evita parpadeos innecesarios)
        setGoogleTasks(prevTasks => {
          // Si no hay tareas anteriores, actualizar directamente
          if (prevTasks.length === 0) return tasks;
          
          // Comparar si realmente hay cambios
          const hasChanges = tasks.length !== prevTasks.length ||
            tasks.some((task: any, idx: number) => 
              !prevTasks[idx] || 
              task.id !== prevTasks[idx].id ||
              task.title !== prevTasks[idx].title ||
              task.status !== prevTasks[idx].status ||
              task.due !== prevTasks[idx].due
            );
          
          return hasChanges ? tasks : prevTasks;
        });
        lastTasksUpdate.current = Date.now();
      } catch (error) {
        console.error('Error loading Google Tasks:', error);
        // En caso de error, mantener las tareas actuales (no limpiar)
      }
    };

    if (immediate) {
      await doLoad();
    } else {
      loadTasksTimeoutRef.current = setTimeout(doLoad, 100);
    }
  };

  // Cargar tareas al iniciar y cuando cambie el estado de autenticación
  useEffect(() => {
    if (googleAuth.isSignedIn) {
      loadGoogleTasks(true);
    }
  }, [googleAuth.isSignedIn]);

  // Actualizar solo los eventos de tareas cuando cambien
  useEffect(() => {
    if (!calendarRef.current || !googleAuth.isSignedIn) return;
    
    const calendarApi = calendarRef.current.getApi();
    const taskSource = calendarApi.getEventSourceById('google-tasks');
    
    if (taskSource) {
      // Refetch solo el source de tareas, no todos los eventos
      taskSource.refetch();
    }
  }, [googleTasks]);

  // Cleanup para el timeout de loadGoogleTasks
  useEffect(() => {
    return () => {
      if (loadTasksTimeoutRef.current) {
        clearTimeout(loadTasksTimeoutRef.current);
      }
    };
  }, []);

  // Polling automático para detectar cambios externos (cada 30 segundos)
  useEffect(() => {
    if (!googleAuth.isSignedIn) return;

    const intervalId = setInterval(() => {
      if (!isRefreshing && !isSubmitting) {
        // Solo recargar tareas - el useMemo actualizará el calendario automáticamente
        loadGoogleTasks();
      }
    }, 30000); // 30 segundos

    return () => clearInterval(intervalId);
  }, [googleAuth.isSignedIn]);

  const handleEventClick = (info: any) => {
    const event = info.event;
    const isGoogleTask = event.extendedProps.isGoogleTask;
    
    if (isGoogleTask) {
      // Es una tarea de Google Tasks
      const taskId = event.extendedProps.taskId;
      const task = googleTasks.find(t => t.id === taskId);
      
      if (task) {
        setSelectedEvent({
          id: taskId,
          calendarId: '@default',
          title: task.title,
          start: task.due || '',
          description: task.notes || 'Sin descripción',
          isTask: true,
          completed: task.status === 'completed'
        });
        setShowEventDialog(true);
      }
    } else {
      // Es un evento de Calendar
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
    }
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
      // Crear como tarea en Google Tasks
      // Crear RFC3339 sin conversión de timezone (mantener fecha local)
      const dueRFC3339 = `${formData.startDate}T00:00:00.000Z`;

      const task = {
        title: formData.title,
        notes: formData.description,
        due: dueRFC3339,
        status: 'needsAction' as 'needsAction' | 'completed'
      };

      await googleAuth.createTask('@default', task);
      
      toast({
        title: 'Tarea creada',
        description: 'La tarea se agregó correctamente'
      });

      setShowAddDialog(false);
      
      // Recargar tareas inmediatamente (el useMemo actualizará el calendario automáticamente)
      await loadGoogleTasks(true);
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
    if (!googleAuth.isSignedIn || !selectedEvent?.id) {
      toast({
        title: 'Error',
        description: 'No se puede actualizar',
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
      if (selectedEvent.calendarId === '@default') {
        // Es una Google Task
        // Crear RFC3339 sin conversión de timezone (mantener fecha local)
        const dueRFC3339 = `${editFormData.startDate}T00:00:00.000Z`;

        const updatedTask = {
          id: selectedEvent.id,
          title: editFormData.title,
          notes: editFormData.description,
          due: dueRFC3339,
          status: (selectedEvent.completed ? 'completed' : 'needsAction') as 'needsAction' | 'completed'
        };

        await googleAuth.updateTask('@default', selectedEvent.id, updatedTask);
      } else {
        // Es un Calendar Event
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
      }
      
      toast({
        title: selectedEvent.calendarId === '@default' ? 'Tarea actualizada' : 'Evento actualizado',
        description: 'Los cambios se guardaron correctamente'
      });
      
      setShowEditDialog(false);
      setSelectedEvent(null);
      
      // Recargar según el tipo
      if (selectedEvent.calendarId === '@default') {
        await loadGoogleTasks(true);
      } else {
        // Solo refrescar eventos de calendario
        if (calendarRef.current) {
          calendarRef.current.getApi().refetchEvents();
        }
      }
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
    if (!googleAuth.isSignedIn || !selectedEvent?.id) {
      toast({
        title: 'Error',
        description: 'No se puede eliminar',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedEvent.calendarId === '@default') {
        // Es una Google Task
        await googleAuth.deleteTask('@default', selectedEvent.id);
      } else {
        // Es un Calendar Event
        await googleAuth.deleteEvent(selectedEvent.calendarId, selectedEvent.id);
      }
      
      toast({
        title: selectedEvent.calendarId === '@default' ? 'Tarea eliminada' : 'Evento eliminado',
        description: selectedEvent.calendarId === '@default' ? 'La tarea se eliminó correctamente' : 'El evento se eliminó correctamente'
      });
      
      setShowDeleteDialog(false);
      setSelectedEvent(null);
      
      // Recargar según el tipo
      if (selectedEvent.calendarId === '@default') {
        await loadGoogleTasks(true);
      } else {
        // Solo refrescar eventos de calendario
        if (calendarRef.current) {
          calendarRef.current.getApi().refetchEvents();
        }
      }
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
    if (!googleAuth.isSignedIn || !selectedEvent?.id) return;

    setIsSubmitting(true);
    try {
      if (selectedEvent.calendarId === '@default') {
        // Es una Google Task
        const task = googleTasks.find(t => t.id === selectedEvent.id);
        if (task) {
          await googleAuth.updateTask('@default', selectedEvent.id, {
            id: selectedEvent.id,
            title: task.title,
            status: 'completed' as 'needsAction' | 'completed'
          });
        }
      } else {
        // Es un Calendar Event
        await googleAuth.updateEvent(selectedEvent.calendarId, selectedEvent.id, {
          status: 'completed'
        } as any);
      }
      
      toast({
        title: 'Tarea completada',
        description: 'La tarea ha sido marcada como completada'
      });
      
      setShowEventDialog(false);
      
      // Recargar según el tipo
      if (selectedEvent.calendarId === '@default') {
        await loadGoogleTasks(true);
      } else {
        // Solo refrescar eventos de calendario
        if (calendarRef.current) {
          calendarRef.current.getApi().refetchEvents();
        }
      }
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
            // Actualizar cache de eventos
            const idx = eventsCache.current.findIndex(e => e.id === event.id);
            if (idx >= 0) {
              eventsCache.current[idx] = event;
            } else {
              eventsCache.current.push(event);
            }
            return event;
          }}
          lazyFetching={true}
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
