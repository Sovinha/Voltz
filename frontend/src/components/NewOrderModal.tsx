import React, { useState } from 'react';
import { X, Plus, ShoppingBag, Globe, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured, OrdemOrigem, Pedido } from '@/lib/supabase';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [origem, setOrigem] = useState<OrdemOrigem>('web');
  const [nomeCliente, setNomeCliente] = useState('');
  const [endereco, setEndereco] = useState('');
  const [itemNome, setItemNome] = useState('');
  const [itemQtd, setItemQtd] = useState(1);
  const [itemPreco, setItemPreco] = useState(25.0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rawText, setRawText] = useState('');
  const [telefone, setTelefone] = useState('');
  const [codigoPIN, setCodigoPIN] = useState('');
  const [idExterno, setIdExterno] = useState('');
  const [valorTotalCustom, setValorTotalCustom] = useState<number | null>(null);

  if (!isOpen) return null;

  // Preenche instantaneamente o pedido #117 de Luciana Souza
  const handlePrefillLucianaOrder = () => {
    setOrigem('ifood');
    setIdExterno('117 (iFood #0778)');
    setNomeCliente('LUCIANA SOUZA');
    setTelefone('0800 700 3020');
    setEndereco('R. Silvino Lopes, 380, Apt 1002 - Tambaú, João Pessoa (58039-190) - Próx. Colégio Motiva Ambiental');
    setItemNome('Parmegiana de Carne Individual (Arroz e Purê)');
    setItemQtd(1);
    setItemPreco(55.90);
    setValorTotalCustom(57.02);
    setCodigoPIN('2775');
    setErrorMsg('');
  };

  // Parser automático para quando o usuário colar o texto bruto do iFood/WhatsApp
  const handleParseRawText = (text: string) => {
    setRawText(text);
    if (!text.trim()) return;

    // Nome do cliente
    const matchCliente = text.match(/Cliente\s*\n\s*([^\n]+)/i);
    if (matchCliente && matchCliente[1]) setNomeCliente(matchCliente[1].trim());

    // Endereço
    const matchEnd = text.match(/Endereço de entrega\s*\n\s*([\s\S]*?)(?=Entrega prevista|Itens do pedido|Subtotal|$)/i);
    if (matchEnd && matchEnd[1]) {
      const cleanEnd = matchEnd[1].replace(/\n+/g, ' ').trim();
      setEndereco(cleanEnd);
    }

    // Telefone / ID
    const matchTel = text.match(/Telefone do cliente:\s*([^\n]+)/i);
    if (matchTel && matchTel[1]) setTelefone(matchTel[1].trim());

    // Código PIN
    const matchPin = text.match(/Código de coleta parceira:\s*(\d+)/i);
    if (matchPin && matchPin[1]) setCodigoPIN(matchPin[1].trim());

    // Pedido Nº
    const matchNum = text.match(/Pedido Nº\s*(\d+)/i) || text.match(/Nº\s*(\d+)/i);
    if (matchNum && matchNum[1]) setIdExterno(`#${matchNum[1]}`);

    // Total
    const matchTotal = text.match(/Total\s*\n\s*R\$\s*([\d,.]+)/i);
    if (matchTotal && matchTotal[1]) {
      const parsedVal = parseFloat(matchTotal[1].replace('.', '').replace(',', '.'));
      if (!isNaN(parsedVal)) setValorTotalCustom(parsedVal);
    }

    // Item
    const matchItem = text.match(/1\s*\n\s*([^\n]+)/i);
    if (matchItem && matchItem[1]) setItemNome(matchItem[1].trim());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCliente || !endereco || !itemNome) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    // Coordenadas padrão em Tambaú / João Pessoa
    const latJP = -7.1150 + (Math.random() - 0.5) * 0.01;
    const lngJP = -34.8250 + (Math.random() - 0.5) * 0.01;

    const finalTotal = valorTotalCustom !== null ? valorTotalCustom : Number(itemQtd) * Number(itemPreco);

    const newOrderPayload = {
      id: `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      origem,
      id_externo: idExterno || `#${origem.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      nome_cliente: nomeCliente,
      telefone_cliente: telefone,
      endereco_entrega: endereco,
      latitude: latJP,
      longitude: lngJP,
      itens: [
        {
          nome: itemNome,
          quantidade: Number(itemQtd),
          preco_unitario: Number(itemPreco),
        },
      ],
      valor_total: finalTotal,
      codigo_confirmacao: codigoPIN || '2775',
      status: 'pendente' as const,
      created_at: new Date().toISOString(),
      tipo_pagamento: 'online' as const,
      pagamento_na_entrega: false,
    };

    try {
      let createdSuccess = false;

      // 1. Tenta enviar para o backend Flask
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
        const res = await fetch(`${backendUrl}/api/webhook/web`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrderPayload),
        });

        if (res.ok) {
          createdSuccess = true;
        }
      } catch (backendErr) {
        console.warn('[AVISO] Servidor Flask local nao respondeu. Usando fallback seguro.');
      }

      // 2. Se Supabase configurado e Flask falhou, tenta Supabase
      if (!createdSuccess && isSupabaseConfigured) {
        try {
          const { error } = await supabase.from('pedidos').insert([newOrderPayload]);
          if (!error) createdSuccess = true;
        } catch (supabaseErr) {
          console.warn('[AVISO] Supabase indisponível no momento.');
        }
      }

      // 3. Fallback local no navegador se tudo estiver offline
      if (!createdSuccess) {
        try {
          const localOrdersStr = localStorage.getItem('local_simulated_pedidos');
          const localOrders = localOrdersStr ? JSON.parse(localOrdersStr) : [];
          localStorage.setItem('local_simulated_pedidos', JSON.stringify([newOrderPayload, ...localOrders]));
          createdSuccess = true;
        } catch {}
      }

      onCreated();
      onClose();

      // Limpar formulário
      setNomeCliente('');
      setEndereco('');
      setItemNome('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao criar pedido simulado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="font-semibold text-slate-100 text-lg flex items-center gap-2">
            <Plus className="w-5 h-5 text-sky-400" />
            Simular Novo Pedido
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Atalho Rápido para o Pedido #117 da Luciana Souza */}
          <div className="bg-red-950/40 border border-red-500/60 rounded-xl p-3 space-y-2 shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-200 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-red-400" />
                Atalho Rápido: Pedido iFood #117
              </span>
              <span className="text-[10px] bg-red-600 text-white font-black px-1.5 py-0.2 rounded">
                iFood PIX
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Luciana Souza &bull; R. Silvino Lopes, 380, Apt 1002 (Tambaú) &bull; R$ 57,02
            </p>
            <button
              type="button"
              onClick={handlePrefillLucianaOrder}
              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-lg transition shadow flex items-center justify-center gap-1.5"
            >
              <span>⚡ Carregar Dados do Pedido #117 (Luciana Souza)</span>
            </button>
          </div>

          {/* Área de Parse por Texto Bruto Colado */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-sky-400 flex items-center justify-between">
              <span>📋 Colar Texto Bruto do Pedido (Parse Automático)</span>
              <span className="text-[10px] text-slate-500 font-normal">Cole do iFood/WhatsApp</span>
            </label>
            <textarea
              rows={3}
              value={rawText}
              onChange={(e) => handleParseRawText(e.target.value)}
              placeholder="Cole o texto completo do pedido iFood aqui para preencher automaticamente..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Seleção de Origem */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Origem do Pedido</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOrigem('web')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-medium text-xs transition-all ${
                  origem === 'web'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Globe className="w-4 h-4" />
                Cardápio Web
              </button>

              <button
                type="button"
                onClick={() => setOrigem('ifood')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border font-medium text-xs transition-all ${
                  origem === 'ifood'
                    ? 'bg-red-500/15 border-red-500 text-red-400 font-bold'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                iFood
              </button>
            </div>
          </div>

          {/* ID Externo / Nº Pedido & PIN */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Nº do Pedido / Código</label>
              <input
                type="text"
                value={idExterno}
                onChange={(e) => setIdExterno(e.target.value)}
                placeholder="Ex: 117 / #0778"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Código PIN (Coleta)</label>
              <input
                type="text"
                value={codigoPIN}
                onChange={(e) => setCodigoPIN(e.target.value)}
                placeholder="Ex: 2775"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Nome do Cliente e Telefone */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Nome do Cliente</label>
              <input
                type="text"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Ex: LUCIANA SOUZA"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Telefone do Cliente</label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="Ex: 0800 700 3020"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Endereço Completo de Entrega</label>
            <textarea
              rows={2}
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Ex: R. Silvino Lopes, 380, Apt 1002 - Tambaú, João Pessoa..."
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Itens & Valor Total */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">Item do Pedido</label>
              <input
                type="text"
                value={itemNome}
                onChange={(e) => setItemNome(e.target.value)}
                placeholder="Ex: Parmegiana de Carne Individual"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Total (R$)</label>
              <input
                type="number"
                step="0.01"
                value={valorTotalCustom !== null ? valorTotalCustom : itemPreco}
                onChange={(e) => setValorTotalCustom(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 font-mono font-black text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Rodapé do Modal */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold transition-all shadow-lg disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading ? 'Criando Pedido...' : '⚡ Confirmar e Inserir Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
