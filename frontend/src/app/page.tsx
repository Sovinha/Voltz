'use client';

import React, { useState } from 'react';
import { KanbanBoard } from '@/components/KanbanBoard';
import { MapTab } from '@/components/MapTab';
import { DriverTab } from '@/components/DriverTab';
import { AnalyticsTab } from '@/components/AnalyticsTab';
import { ConfigTab } from '@/components/ConfigTab';
import { 
  Truck, 
  Database, 
  ShieldCheck, 
  Kanban, 
  Map, 
  Smartphone, 
  BarChart3, 
  Settings,
  Sparkles,
  Zap
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'kanban' | 'map' | 'driver' | 'analytics' | 'config'>('kanban');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-10 selection:bg-sky-500 selection:text-white">
      {/* Header Superior Principal Glassmorphic */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl transition-all">
        <div className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo, Marca & Contexto */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-emerald-500 text-white shadow-lg shadow-sky-500/20 ring-1 ring-white/20 hover:scale-105 transition-transform">
              <Truck className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-tight leading-none">
                  VOLTZ <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">LOGISTICS</span>
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  v3.6 Live
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden xl:flex items-center gap-1.5 mt-0.5">
                <span className="font-medium text-slate-300">Filipéia Trattoria Express</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">🌐 Cardápio Web</span>
                <span className="text-slate-600">+</span>
                <span className="text-rose-400 font-semibold flex items-center gap-1">🔴 iFood</span>
              </p>
            </div>
          </div>

          {/* Navegação por Abas (Kanban, Mapa/Roteirizador, App Entregador, Analytics, Configurações) */}
          <nav aria-label="Navegação Principal" className="flex items-center bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800/80 shadow-inner overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'kanban'
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-lg shadow-sky-500/25 ring-1 ring-sky-400/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
              }`}
            >
              <Kanban className="w-4 h-4" />
              <span>Quadro Kanban</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'map'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 font-extrabold ring-1 ring-amber-300/40'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>Mapa & Roteirizador</span>
            </button>

            <button
              onClick={() => setActiveTab('driver')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'driver'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
              }`}
            >
              <Smartphone className="w-4 h-4 text-indigo-300" />
              <span>App do Entregador</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-300" />
              <span>Analytics & Métricas</span>
            </button>

            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'config'
                  ? 'bg-slate-800 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
              }`}
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Configurações & Taxas</span>
            </button>
          </nav>

          {/* Status do Sistema e Indicadores de Saúde */}
          <div className="hidden 2xl:flex items-center gap-2.5 text-xs">
            <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800/80 shadow-sm">
              <Database className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-slate-300">SQLite: <strong className="text-emerald-400 font-mono">WAL Active</strong></span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800/80 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-slate-300">OSRM: <strong className="text-sky-400 font-mono">João Pessoa</strong></span>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="w-full px-2 sm:px-4 pt-3 pb-2">
        {activeTab === 'kanban' && <KanbanBoard />}
        {activeTab === 'map' && <MapTab />}
        {activeTab === 'driver' && <DriverTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'config' && <ConfigTab />}
      </main>
    </div>
  );
}

