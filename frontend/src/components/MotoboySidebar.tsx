'use client';

import React, { useState } from 'react';
import { Users, Bike, Clock, CheckCircle2, ChevronRight, UserPlus, MessageSquare, Play } from 'lucide-react';
import { Entregador } from '@/lib/supabase';

interface MotoboySidebarProps {
  onOpenChat: (entregador: Entregador) => void;
  onAssignMotoboy?: (entregadorId: string) => void;
}

export const MotoboySidebar: React.FC<MotoboySidebarProps> = ({ onOpenChat }) => {
  const [entregadores, setEntregadores] = useState<Entregador[]>([
    { id: '1', nome: 'ANDERSON', status: 'na_fila', corridasConcluidas: 1 },
    { id: '2', nome: 'MARCO', status: 'na_fila', corridasConcluidas: 0 },
    { id: '3', nome: 'ROBERTO', status: 'em_rota', corridasConcluidas: 3 },
    { id: '4', nome: 'CARLOS', status: 'offline', corridasConcluidas: 0 },
  ]);

  const [showOffline, setShowOffline] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  const naFila = entregadores.filter((e) => e.status === 'na_fila');
  const emRota = entregadores.filter((e) => e.status === 'em_rota');
  const offline = entregadores.filter((e) => e.status === 'offline');
  const onlineCount = naFila.length + emRota.length;

  const handleAddMotoboy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) return;

    const newMotoboy: Entregador = {
      id: Date.now().toString(),
      nome: novoNome.trim().toUpperCase(),
      status: 'na_fila',
      corridasConcluidas: 0,
    };

    setEntregadores([...entregadores, newMotoboy]);
    setNovoNome('');
    setShowAddInput(false);
  };

  const toggleStatus = (id: string) => {
    setEntregadores((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const nextStatus =
            e.status === 'na_fila'
              ? 'em_rota'
              : e.status === 'em_rota'
              ? 'offline'
              : 'na_fila';
          return { ...e, status: nextStatus };
        }
        return e;
      })
    );
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
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-sky-500/30 text-xs"
              >
                <span className="font-semibold text-sky-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
                  {motoboy.nome}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenChat(motoboy)}
                    className="p-1 rounded text-sky-400 hover:bg-sky-500/20"
                    title="Abrir Chat"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleStatus(motoboy.id)}
                    className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono hover:bg-emerald-500/30"
                    title="Retornou à Loja (Voltar para a Fila)"
                  >
                    Voltou
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* BLOCO 3: Sem Corrida / Offline */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
          <span>Sem corrida / Pausa: <strong className="text-slate-400 font-mono">{offline.length}</strong></span>
        </div>
      </div>

      {/* Botão Ver Entregadores Offline */}
      <button
        onClick={() => setShowOffline(!showOffline)}
        className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700/60 transition-colors"
      >
        {showOffline ? 'Ocultar Entregadores offline' : 'Ver Entregadores offline'}
      </button>

      {/* Lista de Offline */}
      {showOffline && (
        <div className="space-y-1.5 p-2 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
          {offline.length === 0 ? (
            <p className="text-[11px] text-slate-500 text-center py-1">Nenhum motoboy offline</p>
          ) : (
            offline.map((motoboy) => (
              <div key={motoboy.id} className="flex items-center justify-between p-1.5 text-slate-400">
                <span>{motoboy.nome} (Offline)</span>
                <button
                  onClick={() => toggleStatus(motoboy.id)}
                  className="text-[10px] px-2 py-0.5 rounded bg-sky-600/20 text-sky-400 hover:bg-sky-600/30 font-bold"
                >
                  Entrar na Fila
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
