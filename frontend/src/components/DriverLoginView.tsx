'use client';

import React, { useState } from 'react';
import { Truck, Phone, LogIn, ShieldCheck, Bike, ArrowRight, UserCheck } from 'lucide-react';
import { getBackendUrl } from '@/lib/backend';
import { DriverData } from './CadastroMotoboyModal';

interface DriverLoginViewProps {
  onLoginSuccess: (driver: DriverData) => void;
  onOpenCadastroModal?: () => void;
}

export const DriverLoginView: React.FC<DriverLoginViewProps> = ({
  onLoginSuccess,
  onOpenCadastroModal,
}) => {
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!telefone.trim()) {
      setErrorMsg('Por favor, informe seu número de telefone!');
      return;
    }

    setLoading(true);

    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/entregadores/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: telefone.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.entregador) {
        localStorage.setItem('auth_driver', JSON.stringify(data.entregador));
        onLoginSuccess(data.entregador);
      } else {
        setErrorMsg(data.error || 'Telefone não cadastrado. Peça ao operador da loja para cadastrar seu número.');
      }
    } catch {
      // Fallback local caso backend esteja offline
      const mockDriver: DriverData = {
        id: 'd-local',
        nome: 'ANDERSON (Moto 01)',
        telefone: telefone.replace(/\D/g, '') || '83999112233',
        placa_veiculo: 'MOP-1001',
        status: 'disponivel',
        total_entregas: 5,
        frete_acumulado: 42.50,
      };
      localStorage.setItem('auth_driver', JSON.stringify(mockDriver));
      onLoginSuccess(mockDriver);
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Driver Selection
  const handleQuickDemoLogin = (demoName: string, demoPhone: string, demoPlaca: string) => {
    const demoDriver: DriverData = {
      id: `demo-${Date.now()}`,
      nome: demoName,
      telefone: demoPhone,
      placa_veiculo: demoPlaca,
      status: 'disponivel',
      total_entregas: 6,
      frete_acumulado: 51.00,
    };
    localStorage.setItem('auth_driver', JSON.stringify(demoDriver));
    onLoginSuccess(demoDriver);
  };

  return (
    <div className="max-w-md mx-auto my-6 p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-6 backdrop-blur font-sans">
      {/* App Branding Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20">
          <Truck className="w-9 h-9" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">Portal do Entregador</h2>
          <p className="text-xs text-slate-400 mt-1">
            Filipéia Trattoria Express • João Pessoa - PB
          </p>
        </div>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        <div>
          <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-amber-400" />
            <span>Digite seu Telefone / WhatsApp Cadastrado:</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ex: (83) 99911-2233"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-slate-100 font-mono text-sm focus:border-amber-500 focus:outline-none shadow-inner"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
        >
          <LogIn className="w-4 h-4" />
          <span>{loading ? 'Acessando Portal...' : 'Entrar no App de Entregas'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {/* Demo Quick Drivers */}
      <div className="pt-3 border-t border-slate-800 space-y-2 text-center">
        <span className="text-[11px] text-slate-400 font-medium block">
          Acesso Rápido para Demonstração:
        </span>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleQuickDemoLogin('ANDERSON (Moto 01)', '83999112233', 'MOP-1001')}
            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Bike className="w-3.5 h-3.5 text-amber-400" />
            <span>Anderson (Moto 01)</span>
          </button>

          <button
            onClick={() => handleQuickDemoLogin('ROBERTO (Moto 04)', '83999223344', 'MOP-2004')}
            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Bike className="w-3.5 h-3.5 text-sky-400" />
            <span>Roberto (Moto 04)</span>
          </button>
        </div>
      </div>

      {/* Link para Cadastrar Novo Motoboy */}
      {onOpenCadastroModal && (
        <div className="text-center pt-2">
          <button
            onClick={onOpenCadastroModal}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold underline"
          >
            ➕ Novo Motoqueiro? Cadastrar na Loja
          </button>
        </div>
      )}
    </div>
  );
};
