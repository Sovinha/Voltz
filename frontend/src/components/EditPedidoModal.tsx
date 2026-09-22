'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, User, Phone, ShoppingBag, DollarSign, Tag, CheckCircle2 } from 'lucide-react';
import { Pedido, OrdemStatus, ItemPedido, TipoPagamento } from '@/lib/supabase';
import { getBackendUrl } from '@/lib/backend';

interface EditPedidoModalProps {
  pedido: Pedido | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (updatedPedido: Pedido) => void;
}

export const EditPedidoModal: React.FC<EditPedidoModalProps> = ({
  pedido,
  isOpen,
  onClose,
  onSaveSuccess,
}) => {
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [enderecoEntrega, setEnderecoEntrega] = useState('');
  const [itensText, setItensText] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [tipoPagamento, setTipoPagamento] = useState<TipoPagamento>('maquininha');
  const [status, setStatus] = useState<OrdemStatus>('preparo');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (pedido) {
      setNomeCliente(pedido.nome_cliente || '');
      setTelefoneCliente(pedido.telefone_cliente || '');
      setEnderecoEntrega(pedido.endereco_entrega || '');

      if (Array.isArray(pedido.itens)) {
        setItensText(pedido.itens.map(i => `${i.quantidade || 1}x ${i.nome}`).join('\n'));
      } else if (typeof (pedido as any).itens === 'string') {
        setItensText((pedido as any).itens);
      } else {
        setItensText('');
      }

      setValorTotal(pedido.valor_total?.toString() || '0');
      setTipoPagamento(pedido.tipo_pagamento || 'maquininha');
      setStatus(pedido.status || 'preparo');
      setLatitude(pedido.latitude?.toString() || '');
      setLongitude(pedido.longitude?.toString() || '');
    }
  }, [pedido]);

  if (!isOpen || !pedido) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const latNum = parseFloat(latitude) || pedido.latitude;
    const lngNum = parseFloat(longitude) || pedido.longitude;
    const valNum = parseFloat(valorTotal.replace(',', '.')) || pedido.valor_total;

    // Converte itensText para ItemPedido[]
    const lines = itensText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsedItens: ItemPedido[] = lines.map(line => {
      const match = line.match(/^(\d+)\s*x?\s*(.+)$/i);
      if (match) {
        return {
          quantidade: parseInt(match[1], 10),
          nome: match[2].trim(),
          preco_unitario: 0,
        };
      }
      return {
        quantidade: 1,
        nome: line,
        preco_unitario: 0,
      };
    });

    const updatedData: Partial<Pedido> = {
      nome_cliente: nomeCliente,
      telefone_cliente: telefoneCliente,
      endereco_entrega: enderecoEntrega,
      itens: parsedItens.length > 0 ? parsedItens : pedido.itens,
      valor_total: valNum,
      tipo_pagamento: tipoPagamento,
      status: status,
      latitude: latNum,
      longitude: lngNum,
    };

    try {
      const backendUrl = getBackendUrl();
      await fetch(`${backendUrl}/api/pedidos/${pedido.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });

      const updatedPedidoObj: Pedido = {
        ...pedido,
        ...updatedData,
      };

      onSaveSuccess(updatedPedidoObj);
      onClose();
    } catch (err) {
      alert('Erro ao salvar alterações do pedido: ' + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/90 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-100 font-sans flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-purple-600/30 text-purple-300 border border-purple-500/50 px-2.5 py-1 rounded-xl text-xs font-mono font-extrabold">
              #{pedido.id_externo}
            </span>
            <h2 className="text-base font-extrabold text-slate-100">✏️ Editar Pedido</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          {/* Nome do Cliente */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>Nome do Cliente</span>
            </label>
            <input
              type="text"
              required
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Telefone do Cliente */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Telefone / WhatsApp</span>
            </label>
            <input
              type="text"
              value={telefoneCliente}
              onChange={(e) => setTelefoneCliente(e.target.value)}
              placeholder="Ex: 83999998888"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Endereço de Entrega */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Endereço Completo de Entrega</span>
            </label>
            <textarea
              required
              rows={2}
              value={enderecoEntrega}
              onChange={(e) => setEnderecoEntrega(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none resize-none"
            />
          </div>

          {/* Coordenadas (Latitude & Longitude) */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Latitude</label>
              <input
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Longitude</label>
              <input
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
              />
            </div>
          </div>

          {/* Itens do Pedido */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
              <span>Itens da Comanda (ex: 1x Pizza, 2x Coca-Cola)</span>
            </label>
            <textarea
              rows={3}
              value={itensText}
              onChange={(e) => setItensText(e.target.value)}
              placeholder="Ex: 1x Pizza Calabresa, 1x Coca-Cola 2L"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none resize-none font-mono"
            />
          </div>

          {/* Valor Total & Forma de Pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Valor Total (R$)</span>
              </label>
              <input
                type="text"
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono font-bold focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>Forma de Pagamento</span>
              </label>
              <select
                value={tipoPagamento}
                onChange={(e) => setTipoPagamento(e.target.value as TipoPagamento)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
              >
                <option value="maquininha">💳 Maquininha na Entrega</option>
                <option value="dinheiro">💵 Dinheiro na Entrega</option>
                <option value="online">🌐 Pago Online (iFood/Web)</option>
              </select>
            </div>
          </div>

          {/* Status do Pedido */}
          <div className="space-y-1">
            <label className="text-xs font-extrabold text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Status do Pedido</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrdemStatus)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-purple-500 focus:outline-none font-bold"
            >
              <option value="preparo">🔵 Em Preparo</option>
              <option value="pronto">🟢 Pronto p/ Rota</option>
              <option value="alocado">🟣 Alocado ao Entregador</option>
              <option value="em_rota">🟡 Em Rota / A Caminho</option>
              <option value="finalizado">⚪ Entregue / Concluído</option>
            </select>
          </div>

          {/* Rodapé com Botões */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
