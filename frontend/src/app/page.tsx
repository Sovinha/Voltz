'use client';

import React, { useState } from 'react';
import { KanbanBoard } from '@/components/KanbanBoard';
import { MapTab } from '@/components/MapTab';
import { DriverTab } from '@/components/DriverTab';
import { AnalyticsTab } from '@/components/AnalyticsTab';
import { ConfigTab } from '@/components/ConfigTab';
import { Truck, Database, ShieldCheck, Kanban, Map, Smartphone, BarChart3, Settings } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'kanban' | 'map' | 'driver' | 'analytics' | 'config'>('kanban');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header Superior Principal */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo e Título */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-600 to-emerald-500 text-white shadow-lg shadow-sky-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight tracking-tight flex items-center gap-2">
                Gestão & Expedição Logística
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                  Fase 3 - Completa
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden xl:block">
                Filipéia Trattoria Express: <span className="text-emerald-400 font-medium">Cardápio Web</span> + <span className="text-red-400 font-medium">iFood</span>
              </p>
            </div>
          </div>

          {/* Navegação por Abas (Kanban, Mapa/Roteirizador, App Entregador, Analytics, Configurações) */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'kanban'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Kanban className="w-4 h-4" />
              <span>Quadro Kanban</span>
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'map'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>Mapa & Roteirizador</span>
            </button>

            <button
              onClick={() => setActiveTab('driver')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'driver'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>App do Entregador</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Analytics & Métricas</span>
            </button>

            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'config'
                  ? 'bg-slate-700 text-amber-400 border border-amber-500/30 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Settings className="w-4 h-4 text-amber-400" />
              <span>Configurações & Taxas</span>
            </button>
          </div>

          {/* Status do Sistema */}
          <div className="hidden 2xl:flex items-center gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/60">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Modo: <strong>Dual (Supabase/SQLite)</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/60">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Status: <strong>Online</strong></span>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal (Alternado por Abas) */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'kanban' && <KanbanBoard />}
        {activeTab === 'map' && <MapTab />}
        {activeTab === 'driver' && <DriverTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'config' && <ConfigTab />}
      </main>
    </div>
  );
}
