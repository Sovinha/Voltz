'use client';

import React, { useState } from 'react';
import { Zap, X, ShoppingBag, Globe, Sparkles, CheckCircle2, MapPin, Send } from 'lucide-react';
import { supabase, isSupabaseConfigured, Pedido, OrdemOrigem } from '@/lib/supabase';
import { getBackendUrl } from '@/lib/backend';

interface WebhookSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderInjected: (newOrder: Pedido) => void;
}

const JOAO_PESSOA_ADDRESSES = [
  {
    bairro: 'Manaíra',
    endereco: 'Av. Governador Flávio Ribeiro Coutinho, 800 - Manaíra, João Pessoa - PB',
    latitude: -7.0990,
    longitude: -34.8380,
  },
  {
    bairro: 'Tambaú',
    endereco: 'Av. Olavo Bilac, 310 - Tambaú, João Pessoa - PB',
    latitude: -7.1160,
    longitude: -34.8250,
  },
  {
    bairro: 'Bessa',
    endereco: 'Av. Argemiro de Figueiredo, 2100 - Bessa, João Pessoa - PB',
    latitude: -7.0690,
    longitude: -34.8300,
  },
  {
    bairro: 'Cabo Branco',
    endereco: 'Av. Cabo Branco, 1800 - Cabo Branco, João Pessoa - PB',
    latitude: -7.1290,
    longitude: -34.8210,
  },
  {
    bairro: 'Miramar',
    endereco: 'Rua das Trincheiras, 450 - Miramar, João Pessoa - PB',
    latitude: -7.1190,
    longitude: -34.8480,
  },
];

export const WebhookSimulatorModal: React.FC<WebhookSimulatorModalProps> = ({
  isOpen,
  onClose,
  onOrderInjected,
}) => {
  const [origem, setOrigem] = useState<'web' | 'ifood'>('web');
  const [nomeCliente, setNomeCliente] = useState('Juliana Paes');
  const [selectedAddrIdx, setSelectedAddrIdx] = useState(0);
  const [prato, setPrato] = useState('Polpettone Recheado + Vinho Valpolicella');
  const [valorTotal, setValorTotal] = useState('118.00');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Emite sinal sonoro de campainha de pedido via Web Audio API (zero arquivos externos)
  const playOrderBellChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {}
  };

  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const addrInfo = JOAO_PESSOA_ADDRESSES[selectedAddrIdx];
    const randId = Math.floor(1000 + Math.random() * 9000);
    const idExterno = origem === 'ifood' ? `IFOOD-${randId}` : `WEB-${randId}`;

    const payload = {
      id_externo: idExterno,
      origem: origem,
      nome_cliente: nomeCliente,
      endereco_entrega: addrInfo.endereco,
      latitude: addrInfo.latitude,
      longitude: addrInfo.longitude,
      itens: [{ nome: prato, quantidade: 1, preco_unitario: parseFloat(valorTotal) }],
      valor_total: parseFloat(valorTotal),
    };

    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/webhook/web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let createdOrder: Pedido;

      if (res.ok) {
        const data = await res.json();
        createdOrder = data.pedido;
      } else {
        createdOrder = {
          id: `sim-${Date.now()}`,
          origem: origem,
          id_externo: idExterno,
          nome_cliente: nomeCliente,
          endereco_entrega: addrInfo.endereco,
          latitude: addrInfo.latitude,
          longitude: addrInfo.longitude,
          itens: [{ nome: prato, quantidade: 1, preco_unitario: parseFloat(valorTotal) }],
          valor_total: parseFloat(valorTotal),
          status: 'pendente',
          created_at: new Date().toISOString(),
        };

        const localStr = localStorage.getItem('local_simulated_pedidos');
        const local = localStr ? JSON.parse(localStr) : [];
        localStorage.setItem('local_simulated_pedidos', JSON.stringify([createdOrder, ...local]));
      }

      playOrderBellChime();
      onOrderInjected(createdOrder);
      onClose();
    } catch {
      const createdOrder: Pedido = {
        id: `sim-${Date.now()}`,
        origem: origem,
        id_externo: idExterno,
        nome_cliente: nomeCliente,
        endereco_entrega: addrInfo.endereco,
        latitude: addrInfo.latitude,
        longitude: addrInfo.longitude,
        itens: [{ nome: prato, quantidade: 1, preco_unitario: parseFloat(valorTotal) }],
        valor_total: parseFloat(valorTotal),
        status: 'pendente',
        created_at: new Date().toISOString(),
      };

      const localStr = localStorage.getItem('local_simulated_pedidos');
      const local = localStr ? JSON.parse(localStr) : [];
      localStorage.setItem('local_simulated_pedidos', JSON.stringify([createdOrder, ...local]));

      playOrderBellChime();
      onOrderInjected(createdOrder);
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
            <Zap className="w-5 h-5 animate-bounce" />
            <span>Simulador de Webhook de Pedidos</span>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSimulateWebhook} className="p-5 space-y-4 text-xs">
          {/* Origem do Pedido */}
          <div>
            <label className="block text-slate-400 font-medium mb-1.5">Canal de Venda / Origem:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrigem('web')}
                className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                  origem === 'web'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Cardápio Web</span>
              </button>

              <button
                type="button"
                onClick={() => setOrigem('ifood')}
                className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                  origem === 'ifood'
                    ? 'bg-red-500/20 text-red-300 border-red-500 shadow'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-red-400" />
                <span>iFood</span>
              </button>
            </div>
          </div>

          {/* Nome do Cliente */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Nome do Cliente:</label>
            <input
              type="text"
              required
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-medium focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Endereço de Entrega (Bairros de JP) */}
          <div>
            <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Endereço de Entrega em João Pessoa:</span>
            </label>
            <select
              value={selectedAddrIdx}
              onChange={(e) => setSelectedAddrIdx(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
            >
              {JOAO_PESSOA_ADDRESSES.map((addr, idx) => (
                <option key={idx} value={idx}>
                  {addr.bairro} - {addr.endereco.split('-')[0]}
                </option>
              ))}
            </select>
          </div>

          {/* Item & Valor */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-slate-400 font-medium mb-1">Item do Pedido:</label>
              <input
                type="text"
                required
                value={prato}
                onChange={(e) => setPrato(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Valor (R$):</label>
              <input
                type="number"
                step="0.5"
                required
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-mono font-bold focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Botão Injetar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs shadow-xl transition-all flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{loading ? 'Injetando Webhook...' : '⚡ Injetar Pedido no Mapa (Com Som)'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
