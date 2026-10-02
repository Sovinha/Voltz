'use client';

import React, { useState } from 'react';
import { 
  Inbox, 
  ChefHat, 
  PackageCheck, 
  Bike, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle,
  RefreshCw,
  CheckSquare,
  Square,
  Zap,
  ChevronRight,
  Trash2,
  Users,
  CreditCard,
  DollarSign,
  Package,
  Calendar,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { ExpandedPedido, Driver } from '@/lib/mockData';
import { ExpandedOrderCard } from './ExpandedOrderCard';
import { ColumnSetting, DEFAULT_COLUMN_SETTINGS } from './ColumnConfigModal';

interface ExpandedKanbanProps {
  pedidos: ExpandedPedido[];
  drivers: Driver[];
  searchQuery: string;
  onMoveStatus: (pedidoId: string, direction: 'next' | 'prev') => void;
  onAssignDriver: (pedidoId: string, driverId: string) => void;
  onSelectOrder: (pedido: ExpandedPedido) => void;
  onDeleteOrder: (pedidoId: string) => void;
  activeQuickFilter?: 'all' | 'delayed' | 'ifood' | 'web';
  selectedBairroFilter?: string;
  selectedBatchIds?: string[];
  onToggleSelectBatch?: (pedidoId: string) => void;
  onSelectAllBatch?: () => void;
  onClearBatchSelection?: () => void;
  onBatchAssignDriver?: (driverId: string) => void;
  onBatchAdvanceStatus?: () => void;
  onBatchDelete?: () => void;
  columnSettings?: ColumnSetting[];
}

export const ExpandedKanban: React.FC<ExpandedKanbanProps> = ({
  pedidos,
  drivers,
  searchQuery,
  onMoveStatus,
  onAssignDriver,
  onSelectOrder,
  onDeleteOrder,
  activeQuickFilter = 'all',
  selectedBairroFilter = 'todos',
  selectedBatchIds = [],
  onToggleSelectBatch,
  onSelectAllBatch,
  onClearBatchSelection,
  onBatchAssignDriver,
  onBatchAdvanceStatus,
  onBatchDelete,
  columnSettings = DEFAULT_COLUMN_SETTINGS
}) => {
  const [showBatchDriverDropdown, setShowBatchDriverDropdown] = useState(false);

  // Mapeamento de todos os 13 status padronizados (Imagem 2)
  const statusDefinitions: Record<string, { title: string; icon: any; color: string; bg: string }> = {
    entrada_automatica: { title: 'Pendente', icon: Inbox, color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', bg: 'from-cyan-950/40 via-slate-900 to-slate-900 border-cyan-500/30' },
    pendente: { title: 'Pendente', icon: Inbox, color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', bg: 'from-cyan-950/40 via-slate-900 to-slate-900 border-cyan-500/30' },
    pagamento_pendente: { title: 'Pagamento pendente', icon: CreditCard, color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', bg: 'from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/30' },
    aguardando_pagamento: { title: 'Aguardando pagamento', icon: DollarSign, color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', bg: 'from-yellow-950/40 via-slate-900 to-slate-900 border-yellow-500/30' },
    preparando: { title: 'Em preparação', icon: ChefHat, color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', bg: 'from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/30' },
    pronto: { title: 'Pronto', icon: PackageCheck, color: 'bg-teal-500/15 text-teal-400 border-teal-500/30', bg: 'from-teal-950/40 via-slate-900 to-slate-900 border-teal-500/30' },
    esperando_retirada: { title: 'Esperando retirada', icon: Package, color: 'bg-teal-500/15 text-teal-400 border-teal-500/30', bg: 'from-teal-950/40 via-slate-900 to-slate-900 border-teal-500/30' },
    saiu_entrega: { title: 'Saiu para entrega', icon: Bike, color: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-sm', bg: 'from-cyan-900/50 via-slate-900 to-slate-900 border-cyan-400/40' },
    em_rota: { title: 'Saiu para entrega', icon: Bike, color: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-sm', bg: 'from-cyan-900/50 via-slate-900 to-slate-900 border-cyan-400/40' },
    entregue: { title: 'Entregue', icon: CheckCircle2, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', bg: 'from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/30' },
    agendado: { title: 'Agendado', icon: Calendar, color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', bg: 'from-purple-950/40 via-slate-900 to-slate-900 border-purple-500/30' },
    finalizado: { title: 'Concluído', icon: CheckCircle2, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', bg: 'from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/30' },
    cancelando: { title: 'Cancelando', icon: AlertCircle, color: 'bg-rose-500/15 text-rose-400 border-rose-500/30', bg: 'from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/30' },
    cancelamento_solicitado: { title: 'Cancelamento solicitado', icon: AlertTriangle, color: 'bg-rose-500/15 text-rose-400 border-rose-500/30', bg: 'from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/30' },
    cancelado: { title: 'Cancelado', icon: XCircle, color: 'bg-slate-700 text-slate-400 border-slate-600', bg: 'from-slate-900 via-slate-900 to-slate-950 border-slate-800' }
  };

  // Filtragem global combinada
  const filtered = pedidos.filter(p => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = (
        p.cliente.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.bairro.toLowerCase().includes(q) ||
        (p.entregadorAssinado && p.entregadorAssinado.nome.toLowerCase().includes(q))
      );
      if (!match) return false;
    }

    if (activeQuickFilter === 'delayed' && !p.isCritico) return false;
    if (activeQuickFilter === 'ifood' && p.origem !== 'ifood') return false;
    if (activeQuickFilter === 'web' && p.origem !== 'web') return false;

    if (selectedBairroFilter !== 'todos' && p.bairro !== selectedBairroFilter) return false;

    return true;
  });

  // Filtrar colunas visíveis com base na configuração do usuário (Imagem 2)
  const visibleColumns = columnSettings.filter(c => c.visible);

  // Mapear cada coluna visível com seus pedidos
  const activeColumns = (visibleColumns.length > 0 ? visibleColumns : DEFAULT_COLUMN_SETTINGS.filter(c => c.visible)).map(col => {
    const statusKey = col.id === 'pendente' ? 'entrada_automatica' : col.id;
    const items = filtered.filter(p => p.status === statusKey || p.status === col.id);
    const def = statusDefinitions[statusKey] || {
      title: col.name,
      icon: Inbox,
      color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      bg: 'from-slate-900 via-slate-900 to-slate-950 border-slate-800'
    };

    return {
      id: col.id,
      name: col.name,
      title: def.title,
      icon: def.icon,
      badgeColor: def.color,
      headerBg: def.bg,
      count: items.length,
      pedidos: items
    };
  });

  return (
    <div className="relative w-full overflow-x-auto pb-6">
      
      {/* BARRA FLUTUANTE DE AÇÕES EM LOTE */}
      {selectedBatchIds.length > 0 && (
        <div className="sticky top-20 z-40 mb-3 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-cyan-500/50 rounded-2xl p-3 shadow-2xl glow-turquoise flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
            <strong className="text-sm font-black text-white">
              {selectedBatchIds.length} Pedido(s) Selecionado(s)
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowBatchDriverDropdown(!showBatchDriverDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-black text-xs shadow-md"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Alocar Entregador em Lote</span>
              </button>

              {showBatchDriverDropdown && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 p-2 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold px-2 py-1 block uppercase">Seleção de Entregador:</span>
                  {drivers.map((drv) => (
                    <button
                      key={drv.id}
                      onClick={() => {
                        if (onBatchAssignDriver) onBatchAssignDriver(drv.id);
                        setShowBatchDriverDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 rounded-xl flex items-center gap-2 text-xs text-slate-200"
                    >
                      <img src={drv.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} alt={drv.nome} className="w-5 h-5 rounded-full object-cover" />
                      <span className="truncate flex-1 font-bold">{drv.nome}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {onBatchAdvanceStatus && (
              <button
                onClick={onBatchAdvanceStatus}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md"
              >
                <ChevronRight className="w-4 h-4" />
                <span>Avançar Status ({selectedBatchIds.length})</span>
              </button>
            )}

            {onClearBatchSelection && (
              <button
                onClick={onClearBatchSelection}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                Limpar
              </button>
            )}
          </div>

        </div>
      )}

      {/* GRID RESPONSIVO DE KANBAN DE ACORDO COM AS COLUNAS HABILITADAS */}
      <div 
        className="grid gap-3.5 min-w-[1000px]"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, activeColumns.length)}, minmax(240px, 1fr))`
        }}
      >
        {activeColumns.map((col) => {
          const Icon = col.icon;
          const criticosNaColuna = col.pedidos.filter(p => p.isCritico).length;

          return (
            <div 
              key={col.id} 
              className="bg-slate-950/60 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-3 flex flex-col h-full min-h-[500px] shadow-2xl"
            >
              
              {/* CABEÇALHO DA COLUNA */}
              <div className={`bg-gradient-to-r ${col.headerBg} border px-3 py-2.5 rounded-xl mb-3 shadow-md`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                    <h3 className="text-xs font-black text-white uppercase tracking-wider truncate">
                      {col.title}
                    </h3>
                  </div>

                  <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${col.badgeColor}`}>
                    {col.count}
                  </span>
                </div>

                {criticosNaColuna > 0 && (
                  <div className="mt-1 flex items-center justify-end">
                    <span className="text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded-md animate-pulse">
                      ⚠️ {criticosNaColuna} crítico
                    </span>
                  </div>
                )}
              </div>

              {/* LISTA DE CARDS NA COLUNA */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[720px] pr-1">
                {col.pedidos.length === 0 ? (
                  <div className="border border-dashed border-slate-800/80 rounded-xl p-6 text-center text-slate-500 text-xs my-4">
                    Nenhum pedido nesta etapa
                  </div>
                ) : (
                  col.pedidos.map((pedido) => (
                    <ExpandedOrderCard
                      key={pedido.id}
                      pedido={pedido}
                      drivers={drivers}
                      onMoveStatus={onMoveStatus}
                      onAssignDriver={onAssignDriver}
                      onSelectOrder={onSelectOrder}
                      onDeleteOrder={onDeleteOrder}
                      isSelected={selectedBatchIds.includes(pedido.id)}
                      onToggleSelect={onToggleSelectBatch}
                    />
                  ))
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
