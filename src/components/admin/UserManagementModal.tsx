import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, User, Mail, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Agent {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  is_online: boolean;
  avatar_url?: string;
}

interface UserManagementModalProps {
  open: boolean;
  onClose: () => void;
  user: Agent | null;
  mode: 'view' | 'edit' | 'delete';
  onSuccess: () => void;
}

export default function UserManagementModal({ open, onClose, user, mode, onSuccess }: UserManagementModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: 'agent' as 'admin' | 'supervisor' | 'agent',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        role: user.role as 'admin' | 'supervisor' | 'agent',
      });
    }
  }, [user]);

  const handleUpdate = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Update profile name
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name: formData.name })
        .eq('user_id', user.user_id);

      if (profileError) throw profileError;

      // Update role if changed
      if (formData.role !== user.role) {
        // Delete old role
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.user_id);

        if (deleteError) throw deleteError;

        // Insert new role
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: user.user_id, role: formData.role });

        if (insertError) throw insertError;
      }

      toast.success('Usuário atualizado com sucesso!');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating user:', err);
      toast.error('Erro ao atualizar usuário');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Remove role (this removes access)
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.user_id);

      if (roleError) throw roleError;

      toast.success('Acesso do usuário removido com sucesso!');
      onSuccess();
      onClose();
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Error removing user access:', err);
      toast.error('Erro ao remover acesso do usuário');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      supervisor: 'Supervisor',
      agent: 'Atendente',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      supervisor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      agent: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    };
    return colors[role] || 'bg-gray-500/20 text-gray-400';
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={open && !showDeleteConfirm} onOpenChange={onClose}>
        <DialogContent className="bg-[#161b22] border-[#30363d] text-[#e6edf3] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className={cn("text-lg", getRoleColor(user.role))}>
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="text-[#e6edf3]">
                  {mode === 'view' ? 'Detalhes do Usuário' : mode === 'edit' ? 'Editar Usuário' : 'Remover Acesso'}
                </span>
                <p className="text-xs text-[#8b949e] font-normal mt-0.5">
                  {user.is_online ? '🟢 Online' : '⚫ Offline'}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {mode === 'view' ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-[#21262d] rounded-lg">
                    <User className="h-4 w-4 text-[#8b949e]" />
                    <div>
                      <p className="text-xs text-[#8b949e]">Nome</p>
                      <p className="text-sm text-[#e6edf3]">{user.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-[#21262d] rounded-lg">
                    <Mail className="h-4 w-4 text-[#8b949e]" />
                    <div>
                      <p className="text-xs text-[#8b949e]">Email</p>
                      <p className="text-sm text-[#e6edf3]">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-[#21262d] rounded-lg">
                    <Shield className="h-4 w-4 text-[#8b949e]" />
                    <div>
                      <p className="text-xs text-[#8b949e]">Função</p>
                      <p className={cn("text-sm px-2 py-0.5 rounded inline-block mt-1", getRoleColor(user.role))}>
                        {getRoleLabel(user.role)}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : mode === 'edit' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#e6edf3]">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-[#21262d] border-[#30363d] text-[#e6edf3] focus:border-[#58a6ff]"
                    placeholder="Nome do usuário"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#8b949e]">Email (não editável)</Label>
                  <Input
                    id="email"
                    value={user.email}
                    disabled
                    className="bg-[#0d1117] border-[#30363d] text-[#8b949e]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-[#e6edf3]">Função</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value) => setFormData({ ...formData, role: value as 'admin' | 'supervisor' | 'agent' })}
                  >
                    <SelectTrigger className="bg-[#21262d] border-[#30363d] text-[#e6edf3]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#21262d] border-[#30363d]">
                      <SelectItem value="agent" className="text-[#e6edf3] focus:bg-[#30363d] focus:text-[#e6edf3]">
                        Atendente
                      </SelectItem>
                      <SelectItem value="supervisor" className="text-[#e6edf3] focus:bg-[#30363d] focus:text-[#e6edf3]">
                        Supervisor
                      </SelectItem>
                      <SelectItem value="admin" className="text-[#e6edf3] focus:bg-[#30363d] focus:text-[#e6edf3]">
                        Administrador
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="h-8 w-8 text-red-400" />
                </div>
                <p className="text-[#e6edf3] mb-2">
                  Tem certeza que deseja remover o acesso de <strong>{user.name}</strong>?
                </p>
                <p className="text-sm text-[#8b949e]">
                  O usuário perderá acesso ao sistema, mas poderá ser reaprovado posteriormente.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="border-[#30363d] text-[#e6edf3] hover:bg-[#30363d]"
            >
              {mode === 'view' ? 'Fechar' : 'Cancelar'}
            </Button>
            
            {mode === 'edit' && (
              <Button 
                onClick={handleUpdate}
                disabled={loading || !formData.name.trim()}
                className="bg-[#238636] hover:bg-[#2ea043] text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
              </Button>
            )}
            
            {mode === 'delete' && (
              <Button 
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading}
                variant="destructive"
                className="bg-[#f85149] hover:bg-[#da3633]"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Remover Acesso'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-[#161b22] border-[#30363d]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#e6edf3]">Confirmar Remoção</AlertDialogTitle>
            <AlertDialogDescription className="text-[#8b949e]">
              Esta ação removerá o acesso de <strong className="text-[#e6edf3]">{user.name}</strong> ao sistema. 
              O usuário poderá ser reaprovado posteriormente se necessário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#30363d] text-[#e6edf3] hover:bg-[#30363d]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={loading}
              className="bg-[#f85149] hover:bg-[#da3633] text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Remoção'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
