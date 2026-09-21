'use client';

import React from 'react';
import { X, Truck, UserCheck, ShieldCheck, MapPin, Zap } from 'lucide-react';
import { Pedido } from '@/lib/supabase';
import { getBackendUrl } from '@/lib/backend';

interface AlocarMotoboyModalProps {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmAlocar: (pedidoId: string, entregadorNome: string) => void;
}

export const AlocarMotoboyModal: React.FC<AlocarMotoboyModalProps> = ({
  pedido,
  isOpen,
  onClose,
  onConfirmAlocar,
}) => {
  const [couriers, setCouriers] = React.useState<Array<{ id: string; nome: string; status: string; telefone: string }>>([
    { id: 'mot_1', nome: 'ANDERSON (Moto 01)', status: 'disponivel', telefone: '83999112233' },
    { id: 'mot_2', nome: 'ROBERTO (Moto 04)', status: 'em_rota', telefone: '83999223344' },
    { id: 'mot_3', nome: 'CARLOS (Moto 07)', status: 'disponivel', telefone: '83999334455' },
  ]);

  React.useEffect(() => {
    if (isOpen) {
      const fetchCouriers = async () => {
        try {
          const backendUrl = getBackendUrl();
          const res = await fetch(`${backendUrl}/api/entregadores`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              setCouriers(data);
            }
          }
        } catch {}
      };
      fetchCouriers();
    }
  }, [isOpen]);

  if (!isOpen || !pedido) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 font-sans">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Alocar Entregador</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Pedido {pedido.id_externo} &bull; {pedido.nome_cliente}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Opção Destaque de Emergência: Entregador iFood Parceiro */}
          <button
            onClick={() => {
              onConfirmAlocar(pedido.id, 'iFood Parceiro (Sob Demanda)');
              onClose();
            }}
            className="w-full p-3 rounded-xl bg-red-950/40 border border-red-500/60 hover:bg-red-900/50 text-left transition-all flex items-center justify-between shadow-lg group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
                ⚡
              </div>
              <div>
                <strong className="block text-red-200 text-xs font-bold flex items-center gap-1.5">
                  iFood Entregador Parceiro
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500 text-white font-black uppercase">
                    Emergência SLA
                  </span>
                </strong>
                <span className="text-[11px] text-red-300/80 font-mono">
                  Sob demanda &bull; Chegada em ~4 min à loja
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-red-400 font-mono block">R$ 8,90</span>
              <span className="text-[9px] text-red-300/60">Chamar Agora</span>
            </div>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-2 text-[10px] text-slate-500 uppercase font-bold">Motoboys da Casa ({couriers.length})</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {couriers.map((mot) => (
              <button
                key={mot.id}
                onClick={() => {
                  onConfirmAlocar(pedido.id, mot.nome);
                  onClose();
                }}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/60 hover:bg-purple-950/20 text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-600/20 border border-purple-500/40 text-purple-300 flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform">
                    🛵
                  </div>
                  <div>
                    <strong className="block text-slate-100 text-xs font-bold">{mot.nome}</strong>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      Tel: {mot.telefone}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold block mb-1">
                    {mot.status === 'disponivel' ? 'Na Fila' : 'Em Rota'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
