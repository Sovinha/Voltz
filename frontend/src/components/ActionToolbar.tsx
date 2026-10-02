'use client';

import React from 'react';
import { 
  Flame, 
  PlusCircle, 
  Sparkles, 
  Filter, 
  AlertTriangle, 
  Globe, 
  ShoppingBag, 
  RotateCcw,
  Zap,
  SlidersHorizontal
} from 'lucide-react';

interface ActionToolbarProps {
  isDinnerFlowActive: boolean;
  onToggleDinnerFlow: () => void;
  onOpenNewOrderModal: () => void;
  onRunDeepSeekAiRouting: () => void;
  isAiRunning?: boolean;
  activeQuickFilter?: 'all' | 'delayed' | 'ifood' | 'web';
  setActiveQuickFilter?: (filter: 'all' | 'delayed' | 'ifood' | 'web') => void;
  selectedBairroFilter?: string;
  setSelectedBairroFilter?: (bairro: string) => void;
  onOpenColumnConfigModal?: () => void;
  onOpenStoreModal?: () => void;
  maxDeliveriesPerDriver?: number;
  setMaxDeliveriesPerDriver?: (max: number) => void;
}

export const ActionToolbar: React.FC<ActionToolbarProps> = ({
  isDinnerFlowActive,
  onToggleDinnerFlow,
  onOpenNewOrderModal,
  onRunDeepSeekAiRouting,
  isAiRunning = false,
  activeQuickFilter = 'all',
  setActiveQuickFilter,
  selectedBairroFilter = 'todos',
  setSelectedBairroFilter,
  onOpenColumnConfigModal,
  onOpenStoreModal,
  maxDeliveriesPerDriver = 4,
  setMaxDeliveriesPerDriver
}) => {
  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-3 shadow-xl mb-4 flex flex-wrap items-center justify-between gap-3">
      
      {/* LADO ESQUERDO: FILTROS RÁPIDOS & CONFIGURAÇÃO DE COLUNAS (IMAGEM 2) */}
      <div className="flex flex-wrap items-center gap-2">
        
        {/* Preset Button: Fluxo Jantar */}
        <button
          onClick={onToggleDinnerFlow}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border shadow-sm ${
            isDinnerFlowActive
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border-amber-300 shadow-amber-500/25 ring-2 ring-amber-400/40'
              : 'bg-slate-950/70 text-amber-400 border-amber-500/30 hover:bg-amber-950/40 hover:border-amber-500/60'
          }`}
        >
          <Flame className={`w-3.5 h-3.5 ${isDinnerFlowActive ? 'text-slate-950 animate-bounce' : 'text-amber-400'}`} />
          <span>Fluxo Jantar</span>
          <kbd className="text-[9px] px-1 bg-slate-950 text-amber-300 rounded font-mono">[J]</kbd>
        </button>

        <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>

        {/* 1-CLICK FILTERS */}
        {setActiveQuickFilter && (
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            
            <button
              onClick={() => setActiveQuickFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeQuickFilter === 'all' 
                  ? 'bg-slate-800 text-slate-100 shadow' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>

            <button
              onClick={() => setActiveQuickFilter('delayed')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                activeQuickFilter === 'delayed'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black'
                  : 'text-rose-400 hover:bg-rose-950/40'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>&gt;15min Críticos</span>
            </button>

            <button
              onClick={() => setActiveQuickFilter('ifood')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                activeQuickFilter === 'ifood'
                  ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🔴 iFood</span>
            </button>

            <button
              onClick={() => setActiveQuickFilter('web')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                activeQuickFilter === 'web'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🌐 Web</span>
            </button>

          </div>
        )}

        {/* Bairro Selector */}
        {setSelectedBairroFilter && (
          <select
            value={selectedBairroFilter}
            onChange={(e) => setSelectedBairroFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none focus:border-cyan-400"
          >
            <option value="todos">📍 Todos os Bairros</option>
            <option value="Manaíra">Manaíra</option>
            <option value="Tambaú">Tambaú</option>
            <option value="Bessa">Bessa</option>
            <option value="Cabo Branco">Cabo Branco</option>
            <option value="Altiplano">Altiplano</option>
            <option value="Jardim Oceania">Jardim Oceania</option>
          </select>
        )}

        {/* SELETOR DE MAX DE ENTREGAS POR MOTOBOY (RECOMENDADO: 4 ENTREGAS) */}
        {setMaxDeliveriesPerDriver && (
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-xl text-xs font-bold shadow-sm">
            <span className="text-cyan-400 font-extrabold text-[11px] flex items-center gap-1">
              🛵 Max/Moto:
            </span>
            <select
              value={maxDeliveriesPerDriver}
              onChange={(e) => setMaxDeliveriesPerDriver(Number(e.target.value))}
              className="bg-transparent text-amber-400 font-black outline-none cursor-pointer text-xs"
              title="Defina o número máximo recomendado de entregas por motoboy nas atribuições automáticas. Você pode incluir mais manualmente a qualquer momento."
            >
              <option value={1} className="bg-slate-900 text-slate-200">1 Entrega</option>
              <option value={2} className="bg-slate-900 text-slate-200">2 Entregas</option>
              <option value={3} className="bg-slate-900 text-slate-200">3 Entregas</option>
              <option value={4} className="bg-slate-900 text-amber-400 font-bold">4 Entregas (Recomendado ⭐)</option>
              <option value={5} className="bg-slate-900 text-slate-200">5 Entregas</option>
              <option value={6} className="bg-slate-900 text-slate-200">6 Entregas</option>
              <option value={8} className="bg-slate-900 text-slate-200">8 Entregas</option>
              <option value={99} className="bg-slate-900 text-slate-200">Sem Limite</option>
            </select>
          </div>
        )}

        {/* BOTÃO AJUSTAR COLUNAS (IMAGEM 2) */}
        {onOpenColumnConfigModal && (
          <button
            onClick={onOpenColumnConfigModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-300 font-bold text-xs transition-all shadow-sm"
            title="Ajustar e Configurar Colunas do Kanban (Imagem 2)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Ajustar Colunas</span>
          </button>
        )}

        {/* BOTÃO CONFIGURAR ENDEREÇO DA LOJA */}
        {onOpenStoreModal && (
          <button
            onClick={onOpenStoreModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-amber-500/30 text-amber-300 font-bold text-xs transition-all shadow-sm cursor-pointer"
            title="Trocar e Configurar o Endereço e Localização da Loja Principal"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>Endereço da Loja</span>
          </button>
        )}

      </div>

      {/* LADO DIREITO: AÇÕES PRINCIPAIS */}
      <div className="flex items-center gap-2 ml-auto">
        
        <button
          onClick={onOpenNewOrderModal}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 text-cyan-400" />
          <span>Novo Pedido</span>
          <kbd className="text-[9px] bg-slate-950 text-cyan-300 px-1.5 py-0.2 rounded font-mono font-bold">[N]</kbd>
        </button>

        <button
          onClick={onRunDeepSeekAiRouting}
          disabled={isAiRunning}
          className="relative group overflow-hidden flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-400 hover:from-cyan-300 hover:to-amber-300 shadow-lg shadow-cyan-500/20 border border-white/30 transition-all active:scale-95 disabled:opacity-75 cursor-pointer"
        >
          <Sparkles className={`w-4 h-4 text-slate-950 ${isAiRunning ? 'animate-spin' : 'group-hover:rotate-12'} transition-transform`} />
          <span className="tracking-tight uppercase">
            {isAiRunning ? 'Roteirizando...' : 'IA DeepSeek'}
          </span>
          <kbd className="bg-slate-950 text-amber-300 text-[9px] px-1.5 py-0.2 rounded font-mono font-extrabold border border-amber-400/40">
            [R]
          </kbd>
        </button>

      </div>

    </div>
  );
};
