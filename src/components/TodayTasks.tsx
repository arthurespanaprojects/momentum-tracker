import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useGoogleAuth } from '@/contexts/GoogleAuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  due?: string;
}

interface TodayTasksProps {
  calendarIds: string[];
  targetDate: Date;
  title: string;
}

export function TodayTasks({ calendarIds, targetDate, title }: TodayTasksProps) {
  const googleAuth = useGoogleAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '' });

  const loadTasks = async () => {
    if (!googleAuth.isSignedIn || !window.gapi?.client?.tasks) {
      setLoading(false);
      return;
    }

    try {
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      const allTasksData = await googleAuth.listTasks('@default');
      
      // Filtrar tareas por fecha de vencimiento
      const filteredTasks = allTasksData
        .filter((task: any) => {
          if (!task.due) return false;
          // Extraer fecha directamente sin conversión de timezone
          const taskDate = task.due.split('T')[0];
          return taskDate === dateStr;
        })
        .map((task: any) => ({
          id: task.id,
          title: task.title || 'Sin título',
          description: task.notes,
          completed: task.status === 'completed',
          due: task.due,
        }));

      // Actualizar solo si hay cambios reales
      setTasks(prevTasks => {
        // Si no hay tareas anteriores, actualizar directamente
        if (prevTasks.length === 0) return filteredTasks;
        
        // Comparar si hay cambios
        const hasChanges = filteredTasks.length !== prevTasks.length ||
          filteredTasks.some((task, idx) => 
            !prevTasks[idx] || 
            task.id !== prevTasks[idx].id ||
            task.title !== prevTasks[idx].title ||
            task.completed !== prevTasks[idx].completed
          );
        
        return hasChanges ? filteredTasks : prevTasks;
      });
    } catch (error) {
      console.error('Error loading tasks:', error);
      // En caso de error, mantener las tareas actuales
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (googleAuth.isSignedIn) {
      loadTasks();
    } else {
      setLoading(false);
    }
  }, [googleAuth.isSignedIn, targetDate]);

  // Polling automático para detectar cambios externos (cada 30 segundos)
  useEffect(() => {
    if (!googleAuth.isSignedIn) return;

    const intervalId = setInterval(() => {
      loadTasks();
    }, 30000); // 30 segundos

    return () => clearInterval(intervalId);
  }, [googleAuth.isSignedIn, targetDate]);

  // Escuchar cambios del contexto para refrescar las tareas
  useEffect(() => {
    if (googleAuth.refreshTrigger > 0 && googleAuth.isSignedIn) {
      // Solo recargar si no somos nosotros quienes disparamos el cambio
      setTimeout(() => {
        loadTasks();
      }, 200);
    }
  }, [googleAuth.refreshTrigger]);

  const handleToggleTask = async (task: Task) => {
    if (!googleAuth.isSignedIn) return;

    try {
      const newStatus = (task.completed ? 'needsAction' : 'completed') as 'needsAction' | 'completed';
      
      // Actualizar UI inmediatamente (optimistic update)
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id ? { ...t, completed: !t.completed } : t
        )
      );

      await googleAuth.updateTask('@default', task.id, {
        id: task.id,
        title: task.title,
        status: newStatus
      });

      // Notificar al contexto sin recargar (ya actualizamos la UI)
      googleAuth.triggerRefresh();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleAddTask = async () => {
    if (!googleAuth.isSignedIn || !formData.title.trim()) return;

    try {
      // Convertir fecha local a RFC3339 sin conversión de timezone
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      const dueRFC3339 = `${dateStr}T00:00:00.000Z`;

      const task = {
        title: formData.title,
        notes: formData.description,
        due: dueRFC3339,
        status: 'needsAction' as 'needsAction' | 'completed'
      };

      const newTask = await googleAuth.createTask('@default', task);
      
      // Actualizar UI inmediatamente
      setTasks(prev => [...prev, {
        id: newTask.id,
        title: newTask.title,
        description: newTask.notes,
        completed: false,
        due: newTask.due
      }]);

      setFormData({ title: '', description: '' });
      setShowAddDialog(false);
      
      // Notificar al contexto
      googleAuth.triggerRefresh();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleEditTask = async () => {
    if (!googleAuth.isSignedIn || !editingTask || !formData.title.trim()) return;

    try {
      // Convertir fecha local a RFC3339 sin conversión de timezone
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      const dueRFC3339 = `${dateStr}T00:00:00.000Z`;

      const updatedTask = {
        id: editingTask.id,
        title: formData.title,
        notes: formData.description,
        due: dueRFC3339,
        status: (editingTask.completed ? 'completed' : 'needsAction') as 'needsAction' | 'completed'
      };

      // Actualizar UI inmediatamente
      setTasks(prev =>
        prev.map(t =>
          t.id === editingTask.id
            ? { ...t, title: formData.title, description: formData.description }
            : t
        )
      );

      await googleAuth.updateTask('@default', editingTask.id, updatedTask);

      setFormData({ title: '', description: '' });
      setEditingTask(null);
      setShowEditDialog(false);
      
      // Notificar al contexto
      googleAuth.triggerRefresh();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const handleDeleteTask = async () => {
    if (!googleAuth.isSignedIn || !taskToDelete) return;

    try {
      // Actualizar UI inmediatamente (optimistic update)
      setTasks(prev => prev.filter(t => t.id !== taskToDelete.id));
      setShowDeleteDialog(false);
      const deletingTaskId = taskToDelete.id;
      setTaskToDelete(null);
      
      await googleAuth.deleteTask('@default', deletingTaskId);
      
      // Notificar al contexto
      googleAuth.triggerRefresh();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormData({ title: task.title, description: task.description || '' });
    setShowEditDialog(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">
              {title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {format(targetDate, "EEEE, d 'de' MMMM", { locale: es })}
            </p>
          </div>
          {googleAuth.isSignedIn && (
            <Button 
              size="sm" 
              onClick={() => {
                setFormData({ title: '', description: '' });
                setShowAddDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Añadir
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando tareas...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay tareas para este día</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors group"
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => handleToggleTask(task)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        task.completed
                          ? 'line-through text-muted-foreground'
                          : 'text-foreground'
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => openEditDialog(task)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => {
                        setTaskToDelete(task);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para añadir tarea */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Input
                placeholder="Título de la tarea"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Textarea
                placeholder="Descripción (opcional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTask}>
              Crear
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar tarea */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tarea</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Input
                placeholder="Título de la tarea"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <Textarea
                placeholder="Descripción (opcional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditTask}>
              Guardar
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
                setTaskToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteTask}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
