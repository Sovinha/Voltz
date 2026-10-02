'use client';

import React, { useState } from 'react';
import { X, Plus, ShoppingBag, MapPin, User, Phone, DollarSign, Sparkles } from 'lucide-react';
import { ExpandedPedido } from '@/lib/mockData';

interface NewOrderModalRedesignedProps {
  isOpen: boolean;
  onClose: () => void;
  onAddOrder: (newOrder: ExpandedPedido) => void;
}

export const NewOrderModalRedesigned: React.FC<NewOrderModalRedesignedProps> = ({
  isOpen,
  onClose,
  onAddOrder
}) => {
  const [cliente, setCliente] = useState('');
  const [telefone, setTelefone] = useState('');
  const [bairro, setBairro] = useState('Manaíra');
  const [endereco, setEndereco] = useState('');
  const [tipoComida, setTipoComida] = useState<'pizza' | 'burger' | 'sushi' | 'massa' | 'bebidas' | 'texmex' | 'salada'>('pizza');
  const [itensResumo, setItensResumo] = useState('');
  const [valorTotal, setValorTotal] = useState('75.00');
  const [origem, setOrigem] = useState<'ifood' | 'web'>('web');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente || !endereco) {
      alert('Por favor, preencha o nome do cliente e o endereço.');
      return;
    }

    const foodIcons: Record<string, string> = {
      pizza: '🍕',
      burger: '🍔',
      sushi: '🍣',
      massa: '🍝',
      bebidas: '🥤',
      texmex: '🌮',
      salada: '🥗'
    };

    const newIdNum = Math.floor(1000 + Math.random() * 9000);
    const createdOrder: ExpandedPedido = {
      id: `#VOL-${newIdNum}`,
      id_externo: `${origem.toUpperCase()} #${newIdNum}`,
      cliente: cliente || 'Novo Cliente',
      telefone: telefone || '(83) 99999-8888',
      endereco: endereco || 'Rua Esperança, 100',
      bairro: bairro,
      tipoComida: tipoComida,
      foodIcon: foodIcons[tipoComida] || '🍕',
      itensResumo: itensResumo || '1x Combo Especial Voltz',
      valorTotal: parseFloat(valorTotal) || 65.00,
      taxaEntrega: 8.50,
      distanciaKm: 3.2,
      origem: origem,
      status: 'entrada_automatica',
      horaPedido: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      tempoEsperaMin: 0,
      isCritico: false,
      latitude: -7.110 + (Math.random() * 0.03 - 0.015),
      longitude: -34.825 + (Math.random() * 0.03 - 0.015)
    };

    onAddOrder(createdOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">CADASTRAR NOVO PEDIDO</h2>
              <p className="text-xs text-slate-400">Entrada manual ou simulação de canal iFood/Web</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Origem do Pedido</label>
              <select
                value={origem}
                onChange={(e) => setOrigem(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="web">🌐 Cardápio Web</option>
                <option value="ifood">🔴 iFood Direct</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Tipo de Comida</label>
              <select
                value={tipoComida}
                onChange={(e) => setTipoComida(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="pizza">🍕 Pizza</option>
                <option value="burger">🍔 Hambúrguer</option>
                <option value="sushi">🍣 Sushi</option>
                <option value="massa">🍝 Massa</option>
                <option value="texmex">🌮 Tex-Mex</option>
                <option value="bebidas">🥤 Bebidas</option>
                <option value="salada">🥗 Salada</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Nome do Cliente</label>
            <input
              type="text"
              placeholder="Ex: Matheus Alencar"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Telefone / WhatsApp</label>
              <input
                type="text"
                placeholder="(83) 99999-8888"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Bairro (João Pessoa)</label>
              <select
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
              >
                <option value="Manaíra">Manaíra</option>
                <option value="Tambaú">Tambaú</option>
                <option value="Bessa">Bessa</option>
                <option value="Cabo Branco">Cabo Branco</option>
                <option value="Altiplano">Altiplano</option>
                <option value="Jardim Oceania">Jardim Oceania</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Endereço Completo</label>
            <input
              type="text"
              placeholder="Ex: Av. Edson Ramalho, 450 - Ap 201"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Resumo dos Itens</label>
            <input
              type="text"
              placeholder="Ex: 1x Pizza Grande Calabresa + 1x Guaraná 2L"
              value={itensResumo}
              onChange={(e) => setItensResumo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-300 block mb-1">Valor Total (R$)</label>
            <input
              type="number"
              step="0.50"
              placeholder="75.00"
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black shadow-lg">
              Inserir na Entrada Automática
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
