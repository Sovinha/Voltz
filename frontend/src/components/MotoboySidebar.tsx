'use client';

import React, { useState, useEffect } from 'react';
import { Users, Bike, Clock, CheckCircle2, ChevronRight, UserPlus, MessageSquare, Play } from 'lucide-react';
import { Entregador } from '@/lib/supabase';
import { getBackendUrl } from '@/lib/backend';

interface MotoboySidebarProps {
  onOpenChat: (entregador: Entregador) => void;
  onAssignMotoboy?: (entregadorId: string) => void;
}

export const MotoboySidebar: React.FC<MotoboySidebarProps> = ({ onOpenChat }) => {
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [showOffline, setShowOffline] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  const fetchDrivers = async () => {
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/entregadores`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEntregadores(data.map((d: any) => ({
            id: d.id,
            nome: d.nome,
            status: d.status === 'disponivel' ? 'na_fila' : d.status === 'em_rota' ? 'em_rota' : 'offline',
            corridasConcluidas: d.total_entregas || 0,
          })));
        }
      }
    } catch (e) {
      console.warn('Falha ao buscar entregadores:', e);
    }
  };

  useEffect(() => {
    fetchDrivers();
    const interval = setInterval(fetchDrivers, 3000);
    return () => clearInterval(interval);
  }, []);

  const naFila = entregadores.filter((e) => e.status === 'na_fila');
  const emRota = entregadores.filter((e) => e.status === 'em_rota');
  const offline = entregadores.filter((e) => e.status === 'offline');
  const onlineCount = naFila.length + emRota.length;

  const handleAddMotoboy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/entregadores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novoNome.trim().toUpperCase(),
          telefone: `839${Math.floor(10000000 + Math.random() * 90000008)}`,
          status: 'disponivel',
        })
      });
      if (res.ok) {
        fetchDrivers();
      }
    } catch (err) {
      console.warn('Erro ao cadastrar motoboy:', err);
    }

    setNovoNome('');
    setShowAddInput(false);
  };

  const toggleStatus = async (id: string) => {
    const target = entregadores.find(e => e.id === id);
    if (!target) return;
    const nextBackendStatus = target.status === 'na_fila' ? 'em_rota' : target.status === 'em_rota' ? 'offline' : 'disponivel';

    try {
      const backendUrl = getBackendUrl();
      await fetch(`${backendUrl}/api/entregadores/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextBackendStatus })
      });
      fetchDrivers();
    } catch (err) {
      console.warn('Erro ao alterar status:', err);
    }
  };

  return (
    <div className="w-full lg:w-72 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 backdrop-blur shadow-2xl flex flex-col">
      {/* Cabeçalho do Bloco de Entregadores */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
          <Bike className="w-4 h-4 text-sky-400" />
          Entregadores Online: <strong className="text-emerald-400 font-mono text-base">{onlineCount}</strong>
        </h3>
        <button
          onClick={() => setShowAddInput(!showAddInput)}
          className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 transition-colors"
          title="Cadastrar Novo Entregador"
        >
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Formulário Rápido para Adicionar Entregador */}
      {showAddInput && (
        <form onSubmit={handleAddMotoboy} className="space-y-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
          <input
            type="text"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome do Motoboy da Casa..."
            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
            autoFocus
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setShowAddInput(false)}
              className="px-2.5 py-1 text-[11px] rounded bg-slate-800 text-slate-400 hover:text-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-2.5 py-1 text-[11px] font-bold rounded bg-sky-600 text-white hover:bg-sky-500"
            >
              Adicionar
            </button>
          </div>
        </form>
      )}

      {/* BLOCO 1: Na Fila (Aguardando Corrida) */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
          <span>Na fila: <strong className="text-amber-400 font-mono">{naFila.length}</strong></span>
        </div>

        <div className="space-y-1.5">
          {naFila.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic">Nenhum motoboy na fila</p>
          ) : (
            naFila.map((motoboy, index) => (
              <div
                key={motoboy.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs transition-colors"
              >
                <span className="font-semibold text-slate-200">
                  <strong className="text-amber-400 mr-1 font-mono">{index + 1}.</strong>
                  {motoboy.nome} <span className="text-slate-500 text-[11px]">({motoboy.corridasConcluidas})</span>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenChat(motoboy)}
                    className="p-1 rounded text-sky-400 hover:bg-sky-500/20 transition-colors"
                    title="Abrir Chat"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleStatus(motoboy.id)}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-amber-500/20 text-slate-300 font-mono"
                    title="Alternar Status"
                  >
                    Saída
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* BLOCO 2: Em Rota (Realizando Entregas) */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
          <span>Em rota: <strong className="text-sky-400 font-mono">{emRota.length}</strong></span>
        </div>

        <div className="space-y-1.5">
          {emRota.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic">Nenhum motoboy em rota</p>
          ) : (
            emRota.map((motoboy) => (
              <div
                key={motoboy.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs"
              >
                <span className="font-semibold text-sky-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  {motoboy.nome}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenChat(motoboy)}
                    className="p-1 rounded text-sky-400 hover:bg-sky-500/20 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleStatus(motoboy.id)}
                    className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono"
                  >
                    Voltou
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* BLOCO 3: Botão Ver Offline */}
      <button
        onClick={() => setShowOffline(!showOffline)}
        className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 text-xs font-medium border border-slate-800 transition flex items-center justify-between"
      >
        <span>Ver Entregadores offline ({offline.length})</span>
        <ChevronRight className={`w-4 h-4 transition-transform ${showOffline ? 'rotate-90' : ''}`} />
      </button>

      {showOffline && (
        <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1 text-xs text-slate-400">
          {offline.length === 0 ? (
            <p className="italic text-[11px] p-1">Nenhum motoboy offline</p>
          ) : (
            offline.map((m) => (
              <div key={m.id} className="flex justify-between items-center p-1">
                <span>{m.nome}</span>
                <button
                  onClick={() => toggleStatus(m.id)}
                  className="text-[10px] text-sky-400 underline"
                >
                  Ativar
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
