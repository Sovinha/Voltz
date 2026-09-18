'use client';

import React, { useState } from 'react';
import { UserPlus, Phone, Bike, X, Send } from 'lucide-react';

export interface DriverData {
  id: string;
  nome: string;
  telefone: string;
  placa_veiculo?: string;
  status: 'disponivel' | 'em_rota' | 'pausa' | string;
  total_entregas?: number;
  frete_acumulado?: number;
  latitude?: number;
  longitude?: number;
  last_seen?: string;
}


interface CadastroMotoboyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDriverRegistered: (newDriver: DriverData) => void;
}

export const CadastroMotoboyModal: React.FC<CadastroMotoboyModalProps> = ({
  isOpen,
  onClose,
  onDriverRegistered,
}) => {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [placaVeiculo, setPlacaVeiculo] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nome.trim() || !telefone.trim()) {
      setErrorMsg('Nome e Telefone são obrigatórios!');
      return;
    }

    setLoading(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
      const res = await fetch(`${backendUrl}/api/entregadores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          telefone: telefone.trim(),
          placa_veiculo: placaVeiculo.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        onDriverRegistered(data.entregador);
        setNome('');
        setTelefone('');
        setPlacaVeiculo('');
        onClose();
      } else {
        setErrorMsg(data.error || 'Erro ao cadastrar motoboy.');
      }
    } catch {
      // Fallback local
      const newDriver: DriverData = {
        id: `local-${Date.now()}`,
        nome: nome.trim(),
        telefone: telefone.replace(/\D/g, ''),
        placa_veiculo: placaVeiculo.trim() || 'MOP-9999',
        status: 'disponivel',
        total_entregas: 0,
        frete_acumulado: 0.0,
      };
      onDriverRegistered(newDriver);
      setNome('');
      setTelefone('');
      setPlacaVeiculo('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm">
            <UserPlus className="w-5 h-5 text-amber-400" />
            <span>Cadastrar Novo Motoboy da Loja</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Nome Completo */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Nome do Motoqueiro / Entregador *</label>
            <input
              type="text"
              required
              placeholder="Ex: Anderson Silva (Moto 02)"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-medium focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Telefone (WhatsApp / Login) */}
          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Telefone / WhatsApp (Será usado para Login no App) *</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: (83) 99988-7766"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono font-medium focus:border-amber-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              O motoboy usará este número de telefone para entrar no aplicativo.
            </p>
          </div>

          {/* Placa do Veículo / Moto */}
          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
              <Bike className="w-3.5 h-3.5 text-sky-400" />
              <span>Placa da Moto / Veículo (Opcional):</span>
            </label>
            <input
              type="text"
              placeholder="Ex: MOP-1234"
              value={placaVeiculo}
              onChange={(e) => setPlacaVeiculo(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex justify-between items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg flex items-center gap-2 transition-all hover:scale-102 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Cadastrando...' : 'Cadastrar Motoqueiro'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
