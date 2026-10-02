'use client';

import React, { useState } from 'react';
import { 
  Package, 
  DollarSign, 
  AlertTriangle, 
  Users, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  ArrowUpRight,
  Zap,
  CheckCircle2,
  Activity,
  Eye,
  EyeOff
} from 'lucide-react';
import { ExpandedPedido, Driver } from '@/lib/mockData';

interface KpiRowProps {
  pedidos: ExpandedPedido[];
  drivers: Driver[];
  isAiRoutingActive?: boolean;
  onSelectQuickFilter?: (filter: 'all' | 'delayed' | 'ifood' | 'web') => void;
  activeQuickFilter?: string;
}

export const KpiRow: React.FC<KpiRowProps> = ({
  pedidos,
  drivers,
  isAiRoutingActive = false,
  onSelectQuickFilter,
  activeQuickFilter = 'all'
}) => {
  // Estado para Ocultar/Exibir Faturamento (Privacidade)
  const [hideFaturamento, setHideFaturamento] = useState(false);

  // Calculando métricas dinâmicas
  const totalAtivos = pedidos.filter(p => p.status !== 'finalizado').length;
  const emPreparoCount = pedidos.filter(p => p.status === 'preparando').length;
  const emRotaCount = pedidos.filter(p => p.status === 'em_rota').length;
  const emEsperaCount = pedidos.filter(p => p.status === 'entrada_automatica' || p.status === 'pronto').length;

  const faturamentoHoje = pedidos.reduce((acc, curr) => acc + curr.valorTotal, 4250.90);
  const totalEntregasHoje = pedidos.length + 72;

  const criticosCount = pedidos.filter(p => p.isCritico && p.status !== 'finalizado').length;

  const driversOnlineList = drivers.filter(d => d.status === 'online' || d.status === 'em_rota');
  const driversOnlineCount = driversOnlineList.length;
  const driversTotal = drivers.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-4">
      
      {/* KPI 1: TOTAL DE PEDIDOS ATIVOS */}
      <div 
        onClick={() => onSelectQuickFilter && onSelectQuickFilter('all')}
        className={`relative group bg-slate-900/80 backdrop-blur-xl border p-4 rounded-2xl shadow-xl transition-all duration-300 hover:-translate-y-0.5 overflow-hidden cursor-pointer ${
          activeQuickFilter === 'all' ? 'border-cyan-500/60 ring-2 ring-cyan-500/20' : 'border-slate-800/90 hover:border-cyan-500/40'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pedidos Ativos</span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className="text-2xl font-black text-white tracking-tight">{totalAtivos}</span>
          <span className="text-[11px] font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-md">
            Operação Normal
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
          <span className="text-amber-400 font-bold">{emPreparoCount}</span> preparo • 
          <span className="text-cyan-400 font-bold">{emRotaCount}</span> em rota • 
          <span className="text-slate-300">{emEsperaCount}</span> fila
        </p>
      </div>

      {/* KPI 2: FATURAMENTO TOTAL (DIA) COM BOTÃO DE OCULTAR VALORES */}
      <div 
        onClick={() => onSelectQuickFilter && onSelectQuickFilter('all')}
        className="relative group bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 hover:border-amber-500/50 p-4 rounded-2xl shadow-xl transition-all duration-300 hover:-translate-y-0.5 overflow-hidden cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Faturamento (Dia)</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setHideFaturamento(!hideFaturamento);
            }}
            title={hideFaturamento ? "Exibir Faturamento" : "Ocultar Faturamento"}
            className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer"
          >
            {hideFaturamento ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          {hideFaturamento ? (
            <span className="text-2xl font-black text-amber-400 tracking-tight font-mono">
              R$ •••••••
            </span>
          ) : (
            <span className="text-2xl font-black text-amber-400 tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faturamentoHoje)}
            </span>
          )}
          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> +18.4%
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400 font-medium">
          <strong className="text-slate-200">{totalEntregasHoje}</strong> entregas concluídas hoje
        </p>
      </div>

      {/* KPI 3: PEDIDOS CRÍTICOS (>15MIN) - ALERTA PISCANTE SE HOUVER ATRASO */}
      <div 
        onClick={() => onSelectQuickFilter && onSelectQuickFilter('delayed')}
        className={`relative group backdrop-blur-xl p-4 rounded-2xl shadow-xl transition-all duration-300 hover:-translate-y-0.5 overflow-hidden cursor-pointer border ${
          activeQuickFilter === 'delayed'
            ? 'border-rose-400 ring-2 ring-rose-500/40 shadow-rose-950/60 bg-rose-950/30'
            : criticosCount > 0 
            ? 'border-rose-500 ring-2 ring-rose-500/50 shadow-2xl shadow-rose-950/80 bg-gradient-to-br from-rose-950/60 via-slate-900 to-rose-950/30 animate-pulse' 
            : 'bg-slate-900/80 border-slate-800/90'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pedidos Críticos (&gt;15min)</span>
          <div className={`p-2 rounded-xl border shadow-sm ${
            criticosCount > 0 
              ? 'bg-rose-500/30 text-rose-300 border-rose-500/60 animate-bounce' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between">
          <span className={`text-2xl font-black tracking-tight ${criticosCount > 0 ? 'text-rose-400 font-mono animate-pulse' : 'text-slate-100'}`}>
            {criticosCount} <span className="text-xs font-normal text-slate-400">pedidos</span>
          </span>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
            criticosCount > 0 
              ? 'bg-rose-500 text-slate-950 font-black border border-rose-400 shadow-md animate-pulse' 
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}>
            {criticosCount > 0 ? '🚨 URGENTE' : 'Filtrar [Clique]'}
          </span>
        </div>
        <p className="mt-2 text-[11px] font-medium truncate">
          {criticosCount > 0 ? (
            <span className="text-rose-300 font-extrabold flex items-center gap-1 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              ⚠️ {criticosCount} pedido(s) em atraso crítico!
            </span>
          ) : (
            <span className="text-emerald-400 font-medium">Nenhum pedido em atraso crítico</span>
          )}
        </p>
      </div>

      {/* KPI 4: ENTREGADORES ONLINE COM NOMES E STATUS (VERDE DISPONÍVEL / VERMELHO ROTA) */}
      <div className="relative group bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 hover:border-cyan-500/50 p-4 rounded-2xl shadow-xl transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entregadores Online</span>
          <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-sm">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-2xl font-black text-white tracking-tight">
            {driversOnlineCount} <span className="text-xs font-semibold text-slate-400">/ {driversTotal}</span>
          </span>
          <span className="text-[10px] font-bold text-teal-300 bg-teal-950/60 border border-teal-800/40 px-2 py-0.5 rounded-md">
            Frota Ativa
          </span>
        </div>

        {/* LISTA DE ENTREGADORES COM STATUS E PENDÊNCIAS */}
        <div className="mt-2 flex flex-wrap gap-1.5 max-h-[58px] overflow-y-auto pr-0.5 custom-scrollbar">
          {driversOnlineList.map(d => {
            const pendentesCount = pedidos.filter(p => p.entregadorAssinado?.id === d.id && p.status !== 'finalizado').length || d.pedidosAtivosCount || 0;
            const isEmRota = d.status === 'em_rota' || pendentesCount > 0;

            return (
              <span
                key={d.id}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${
                  isEmRota
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-950/50'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-950/50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isEmRota ? 'bg-rose-400 animate-ping' : 'bg-emerald-400'}`}></span>
                <span>{d.nome.split(' ')[0]}</span>
                <span className="opacity-90 font-mono">
                  {isEmRota ? `Rota (${pendentesCount} pend.)` : 'Disponível'}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      {/* KPI 5: IA DEEPSEEK ROTEIRIZANDO STATUS FEED */}
      <div className="relative group bg-gradient-to-br from-slate-900/90 via-slate-900/95 to-slate-950 border border-cyan-500/30 hover:border-cyan-400/60 p-4 rounded-2xl shadow-xl shadow-cyan-950/20 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            IA DeepSeek Roteirizando
          </span>
          <div className="flex items-center gap-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            LIVE FEED
          </div>
        </div>
        <div className="mt-2 text-xs font-medium text-slate-200 leading-snug">
          {isAiRoutingActive ? (
            <span className="text-amber-300 font-semibold flex items-center gap-1.5 animate-pulse">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Calculando 6 trajetos no Setor Manaíra...
            </span>
          ) : (
            <p className="line-clamp-2 text-[11px] text-slate-300">
              <strong className="text-cyan-300">DeepSeek-R1:</strong> Otimização de 6 entregas em Manaíra/Tambaú — Ganho de <strong className="text-amber-300">24.3%</strong> no tempo.
            </p>
          )}
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
          <span className="text-cyan-400 font-semibold flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-400" /> OSRM Hub Active
          </span>
          <span className="text-amber-400 font-bold">-3.2 km economizados</span>
        </div>
      </div>

    </div>
  );
};
