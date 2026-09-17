import React from 'react';
import { Clock, ChefHat, CheckCircle2, Truck } from 'lucide-react';
import { OrdemStatus } from '@/lib/supabase';

interface StatusBadgeProps {
  status: OrdemStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'pendente':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Clock className="w-3 h-3" />
          Pendente
        </span>
      );
    case 'preparando':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <ChefHat className="w-3 h-3" />
          Em Preparo
        </span>
      );
    case 'pronto':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Pronto
        </span>
      );
    case 'despachado':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Truck className="w-3 h-3" />
          Despachado
        </span>
      );
    default:
      return null;
  }
};
