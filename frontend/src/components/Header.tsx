'use client';

import React from 'react';
import { 
  Truck, 
  Search, 
  Sparkles, 
  ShieldCheck, 
  Map, 
  Kanban, 
  Users, 
  BarChart3,
  Cpu,
  Clock,
  ChevronRight,
  Filter,
  Volume2,
  VolumeX,
  Keyboard,
  MapPin
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'visao_geral' | 'kanban' | 'mapa' | 'frota';
  setActiveTab: (tab: 'visao_geral' | 'kanban' | 'mapa' | 'frota') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isAiRoutingActive?: boolean;
  isAudioMuted?: boolean;
  onToggleAudioMute?: () => void;
  onOpenShortcutsModal?: () => void;
  onOpenStoreModal?: () => void;
  lojaNome?: string;
  lojaEndereco?: string;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  isAiRoutingActive = false,
  isAudioMuted = false,
  onToggleAudioMute,
  onOpenShortcutsModal,
  onOpenStoreModal,
  lojaNome = 'Filipéia Trattoria Central',
  lojaEndereco,
  searchInputRef
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl transition-all">
      <div className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        
        {/* LOGO E IDENTIDADE VOLTZ */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative group cursor-pointer" onClick={() => setActiveTab('visao_geral')}>
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-600 to-amber-500 text-white shadow-lg shadow-cyan-500/25 ring-1 ring-white/20 group-hover:scale-105 transition-all">
              <Truck className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-400"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-white tracking-tight leading-none flex items-center gap-1.5">
                VOLTZ <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-400 font-black">LOGISTICS</span>
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm">
                <Cpu className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span>DeepSeek v3.6 AI</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-400 hidden xl:flex items-center gap-2 mt-0.5">
              <button
                onClick={onOpenStoreModal}
                title="Clique para trocar o endereço da loja principal"
                className="font-semibold text-slate-200 hover:text-amber-400 flex items-center gap-1 bg-slate-900/90 hover:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-800 text-[11px] transition-all cursor-pointer shadow-sm group"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="truncate max-w-[220px] font-bold text-amber-300">{lojaNome}</span>
                <span className="text-[9px] text-amber-400 font-extrabold bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/30 ml-1">Trocar Loja</span>
              </button>
              <span className="text-slate-600">•</span>
              <span className="text-cyan-400 font-medium flex items-center gap-1">🌐 Cardápio Web</span>
              <span className="text-slate-600">+</span>
              <span className="text-amber-400 font-medium flex items-center gap-1">🛵 iFood Direct</span>
            </div>
          </div>
        </div>

        {/* BARRA DE PESQUISA CONSOLIDADA COM ATALHO [F] */}
        <div className="flex-1 max-w-md mx-2 hidden md:block">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400 group-focus-within:text-amber-400 transition-colors" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente, ID (#VOL-1089), comida ou entregador... [Tecla F]"
              className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 text-slate-100 placeholder-slate-500 text-xs rounded-xl pl-10 pr-14 py-2.5 outline-none transition-all shadow-inner font-medium"
            />
            
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 pointer-events-none">
              [F]
            </span>
          </div>
        </div>

        {/* NAVEGAÇÃO PRINCIPAL UNIFICADA (4 ABAS SIMPLIFICADAS) */}
        <nav aria-label="Navegação Principal" className="flex items-center bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-inner overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('visao_geral')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'visao_geral'
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/40'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-cyan-300" />
            <span>Visão Geral</span>
            <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/60 px-1 rounded">[1]</span>
          </button>

          <button
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'kanban'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 font-extrabold ring-1 ring-amber-300/50'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <Kanban className="w-3.5 h-3.5 text-slate-950 font-bold" />
            <span>Kanban</span>
            <span className="text-[9px] font-mono text-slate-950 bg-amber-400/80 px-1 rounded font-black">[2]</span>
          </button>

          <button
            onClick={() => setActiveTab('mapa')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'mapa'
                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/20 ring-1 ring-teal-400/40'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <Map className="w-3.5 h-3.5 text-cyan-300" />
            <span>Mapa</span>
            <span className="text-[9px] font-mono text-cyan-300 bg-teal-950/60 px-1 rounded">[3]</span>
          </button>

          <button
            onClick={() => setActiveTab('frota')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'frota'
                ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/25 font-black ring-1 ring-amber-300/60'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-slate-950 font-bold" />
            <span>Frota</span>
            <span className="text-[9px] font-mono text-slate-950 bg-amber-400/80 px-1 rounded font-black">[4]</span>
          </button>
        </nav>

        {/* BOTÕES DE UTILITÁRIOS: AUDIO MUTE & ATALHOS GUIADOS */}
        <div className="flex items-center gap-2">
          
          {/* Audio Notification Toggle */}
          {onToggleAudioMute && (
            <button
              onClick={onToggleAudioMute}
              title={isAudioMuted ? 'Ativar Alertas Sonoros' : 'Mutar Alertas Sonoros'}
              className={`p-2 rounded-xl transition-all border ${
                isAudioMuted
                  ? 'bg-slate-900 text-slate-500 border-slate-800'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-sm animate-pulse'
              }`}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}

          {/* Atalhos Guide Modal */}
          {onOpenShortcutsModal && (
            <button
              onClick={onOpenShortcutsModal}
              title="Guia de Atalhos de Teclado"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all"
            >
              <Keyboard className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">Atalhos</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
