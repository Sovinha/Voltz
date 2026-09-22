'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  CheckCircle2, 
  ShieldCheck, 
  KeyRound, 
  Sparkles, 
  Store, 
  AlertCircle,
  Smartphone,
  Copy,
  Check
} from 'lucide-react';
import { Pedido } from '@/lib/supabase';
import { getBackendUrl } from '@/lib/backend';

interface IFoodConfirmationModalProps {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const IFoodConfirmationModal: React.FC<IFoodConfirmationModalProps> = ({
  pedido,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pinCode, setPinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPinCode('');
      setErrorMsg('');
      setCopiedId(false);
    }
  }, [isOpen, pedido]);

  if (!isOpen || !pedido) return null;

  const isIFood = pedido.origem === 'ifood' || pedido.id_externo.toUpperCase().includes('IFOOD');
  const cleanId = pedido.id_externo.replace('#', '').trim();
  
  // Link direto para o Gestor de Pedidos iFood com o ID pre-preenchido
  const ifoodOrderUrl = `https://gestordepedidos.ifood.com.br/pedidos/${encodeURIComponent(cleanId)}`;
  const ifoodSearchUrl = `https://gestordepedidos.ifood.com.br/pedidos?search=${encodeURIComponent(cleanId)}`;

  const handleCopyId = () => {
    navigator.clipboard.writeText(cleanId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleConfirmPIN = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (pinCode.trim().length !== 4) {
      setErrorMsg('Por favor, digite o código de confirmação iFood com 4 dígitos!');
      return;
    }

    setIsSubmitting(true);

    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/pedidos/${pedido.id}/confirmar-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinCode.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(data.error || data.message || 'Código de confirmação incorreto. Verifique com o cliente!');
      }
    } catch (err) {
      // Fallback de contingência local
      try {
        const backendUrl = getBackendUrl();
        await fetch(`${backendUrl}/api/pedidos/${pedido.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'finalizado', codigo_confirmacao: pinCode.trim() })
        });
        onSuccess();
        onClose();
      } catch (e) {
        setErrorMsg('Falha ao comunicar com o servidor. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden font-sans flex flex-col max-h-[92vh]">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 text-white font-black flex items-center justify-center shadow-lg shadow-rose-900/30">
              {isIFood ? '🛵' : '✅'}
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base leading-tight flex items-center gap-2">
                Concluir Entrega
                {isIFood && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold border border-red-500/30 uppercase">
                    iFood
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">Confirmação de entrega com autopreenchimento de ID</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          
          {/* CARD DE ID AUTOPREENCHIDO */}
          <div className="bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-inner">
            <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
              <span>ID do Pedido (Auto-preenchido):</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Pronto para Confirmação
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-900 border border-slate-700/80 rounded-xl p-3">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Código do Pedido</span>
                <strong className="text-xl font-black text-amber-400 font-mono tracking-wider">
                  #{cleanId}
                </strong>
              </div>

              <button
                type="button"
                onClick={handleCopyId}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition active:scale-95"
              >
                {copiedId ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-400" />
                    <span>Copiar ID</span>
                  </>
                )}
              </button>
            </div>

            {/* Informações do Cliente */}
            <div className="text-xs text-slate-300 pt-1 border-t border-slate-800/80 flex justify-between items-center">
              <div>
                <span className="text-slate-500">Cliente: </span>
                <strong className="text-white font-bold">{pedido.nome_cliente}</strong>
              </div>
              <div>
                <span className="text-slate-500">Valor: </span>
                <strong className="text-emerald-400 font-mono">R$ {pedido.valor_total.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* REDIRECIONAMENTO RÁPIDO PARA O GESTOR IFOOD */}
          {isIFood && (
            <div className="bg-red-950/30 border border-red-500/30 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-red-400" />
                  <span>Portal iFood Gestor do Parceiro</span>
                </span>
                <span className="text-[10px] text-red-400/80 font-mono font-semibold">Direto</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Clique no botão abaixo para abrir a tela de confirmação no Gestor iFood com o ID <strong className="text-white font-mono">#{cleanId}</strong> pré-filtrado.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <a
                  href={ifoodOrderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition hover:scale-[1.02]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir Pedido no iFood</span>
                </a>

                <a
                  href={ifoodSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition"
                >
                  <Store className="w-4 h-4 text-amber-400" />
                  <span>Buscar #{cleanId} no iFood</span>
                </a>
              </div>
            </div>
          )}

          {/* FORMULÁRIO DE DIGITAÇÃO DO CÓDIGO PIN (4 DÍGITOS) */}
          <form onSubmit={handleConfirmPIN} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs text-slate-200 font-extrabold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Digite o Código de Confirmação (4 Dígitos):</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">PIN iFood/Cliente</span>
              </label>

              <input
                type="text"
                maxLength={4}
                required
                autoFocus
                placeholder="Ex: 4821"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                className="w-full py-3.5 px-4 bg-slate-950 border-2 border-slate-700 text-center font-mono text-2xl font-black text-amber-400 tracking-[0.4em] rounded-2xl focus:border-amber-500 focus:outline-none shadow-inner transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-600 placeholder:text-sm"
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-200 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || pinCode.length !== 4}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:hover:scale-100 hover:scale-[1.02]"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isSubmitting ? 'Validando PIN...' : '✅ Confirmar & Finalizar Entrega'}</span>
            </button>
          </form>

        </div>

        {/* Rodapé Didático */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Autenticação direta Voltz • Crédito do frete realizado instantaneamente ao entregador</span>
        </div>

      </div>
    </div>
  );
};
