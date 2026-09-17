'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Truck, MapPin, CheckCircle2, Clock, ShieldCheck, KeyRound, PhoneCall, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react';
import { Pedido } from '@/lib/supabase';

export default function RastreioClientePage() {
  const params = useParams();
  const idPedido = (params?.id as string) || '';

  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  const fetchPedido = async () => {
    if (!idPedido) return;
    try {
      const res = await fetch(`${backendUrl}/api/pedidos/${idPedido}`);
      if (res.ok) {
        const data: Pedido = await res.json();
        setPedido(data);
        setError('');
      } else {
        setError('Pedido não encontrado ou expirado.');
      }
    } catch (err) {
      setError('Erro ao carregar status do rastreamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedido();
    // Polling a cada 5 segundos para atualização em tempo real do mapa/GPS
    const interval = setInterval(fetchPedido, 5000);
    return () => clearInterval(interval);
  }, [idPedido]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-10 h-10 text-amber-400 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-400">Carregando rastreamento do pedido...</p>
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-3xl border border-rose-500/30 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Ops! Rastreamento Indisponível</h2>
        <p className="text-xs text-slate-400 mb-6">{error || 'Não encontramos este pedido no sistema.'}</p>
        <button
          onClick={fetchPedido}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  const isEmRota = ['em_rota', 'despachado', 'alocado'].includes(pedido.status);
  const isFinalizado = pedido.status === 'despachado' || (pedido.status as string) === 'finalizado';
  const isProximo = Boolean(pedido.notificacao_proximidade_enviada);

  // Status visual
  let statusBadge = {
    title: 'Pedido em Preparação',
    desc: 'Sua refeição está sendo preparada com carinho na cozinha.',
    color: 'from-amber-500 to-amber-600',
    icon: Clock,
  };

  if (isFinalizado) {
    statusBadge = {
      title: 'Pedido Entregue!',
      desc: 'Obrigado por comprar conosco. Tenha um excelente apetite!',
      color: 'from-emerald-500 to-emerald-600',
      icon: CheckCircle2,
    };
  } else if (isProximo) {
    statusBadge = {
      title: 'Entregador Chegando na sua Rua!',
      desc: 'O motoboy está a menos de 500m de você. Esteja a postos!',
      color: 'from-rose-500 to-amber-500 animate-pulse',
      icon: Truck,
    };
  } else if (isEmRota) {
    statusBadge = {
      title: 'Saiu para Entrega!',
      desc: 'O motoboy já está a caminho do seu endereço.',
      color: 'from-sky-500 to-blue-600',
      icon: Truck,
    };
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans max-w-md mx-auto shadow-2xl border-x border-slate-800">
      {/* Top Bar */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 p-4 sticky top-0 z-20 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 flex items-center justify-center font-black">
            AG
          </div>
          <div>
            <h1 className="font-extrabold text-base text-white leading-none">Agilizone Delivery</h1>
            <p className="text-[11px] text-slate-400 mt-1">Pedido #{pedido.id_externo}</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
          {pedido.origem.toUpperCase()}
        </span>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 space-y-4">
        {/* Status Card Principal */}
        <div className={`p-5 rounded-3xl bg-gradient-to-br ${statusBadge.color} text-slate-950 shadow-xl space-y-2`}>
          <div className="flex items-center space-x-2">
            <statusBadge.icon className="w-6 h-6 shrink-0" />
            <h2 className="text-lg font-black tracking-tight">{statusBadge.title}</h2>
          </div>
          <p className="text-xs font-medium text-slate-900/90 leading-relaxed">{statusBadge.desc}</p>
        </div>

        {/* Alerta de Proximidade em Destaque */}
        {isProximo && !isFinalizado && (
          <div className="p-4 bg-rose-950/90 border-2 border-rose-500 text-rose-100 rounded-2xl space-y-2 animate-bounce shadow-lg">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-6 h-6 text-rose-400" />
              <h3 className="font-bold text-sm">Entregador a menos de 500m!</h3>
            </div>
            <p className="text-xs text-rose-200">
              Por favor, vá para a portaria/portão com seu código PIN em mãos.
            </p>
          </div>
        )}

        {/* Card do Código PIN de Confirmação */}
        {pedido.codigo_confirmacao && !isFinalizado && (
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-4 text-center space-y-2 shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-center space-x-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <KeyRound className="w-4 h-4" />
              <span>Seu Código de Confirmação</span>
            </div>
            <div className="text-3xl font-black text-amber-300 tracking-widest bg-slate-950 py-2 px-4 rounded-xl border border-amber-500/30 inline-block shadow-inner">
              {pedido.codigo_confirmacao}
            </div>
            <p className="text-[11px] text-slate-400">
              Informe este código de 4 dígitos ao motoboy no momento do recebimento.
            </p>
          </div>
        )}

        {/* Informações do Motoboy */}
        {pedido.entregador_nome && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-slate-800 rounded-2xl border border-slate-700 flex items-center justify-center text-amber-400">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Entregador Responsável</span>
                <h3 className="font-bold text-sm text-white">{pedido.entregador_nome}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Simulação do Mapa de Rastreio ao Vivo */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
          <div className="p-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-rose-400" />
              <span>Mapa de Rastreio ao Vivo</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-medium">● Atualizado a cada 5s</span>
          </div>

          <div className="h-56 bg-slate-950 relative flex items-center justify-center p-4 text-center overflow-hidden">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-30" />
            
            <div className="relative z-10 space-y-3">
              <div className="w-14 h-14 bg-amber-500/20 text-amber-400 border-2 border-amber-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 animate-pulse">
                <Truck className="w-7 h-7" />
              </div>
              <div>
                <p className="font-bold text-sm text-white">
                  {isFinalizado ? 'Entrega Concluída' : 'Rastreando Posição GPS'}
                </p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  {pedido.endereco_entrega}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Resumo do Pedido */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resumo do Pedido</h3>
          
          {pedido.itens && pedido.itens.length > 0 && (
            <div className="space-y-1.5 border-b border-slate-800 pb-3">
              {pedido.itens.map((it, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="text-slate-300">
                    {it.quantidade}x {it.nome}
                  </span>
                  <span className="font-semibold text-slate-200">
                    R$ {(it.quantidade * it.preco_unitario).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-300">Valor Total</span>
            <span className="text-base font-black text-emerald-400">
              R$ {Number(pedido.valor_total).toFixed(2)}
            </span>
          </div>
        </div>
      </main>

      <footer className="p-4 text-center border-t border-slate-900 text-[11px] text-slate-500">
        Agilizone Delivery System • Rastreio Protegido por PIN
      </footer>
    </div>
  );
}
