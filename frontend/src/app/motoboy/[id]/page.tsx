'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Navigation, MapPin, CheckCircle2, ShieldCheck, Phone, AlertCircle, RefreshCw, KeyRound, ExternalLink, ArrowLeft, Truck } from 'lucide-react';
import { Pedido } from '@/lib/supabase';

export default function MotoboyPortalPage() {
  const params = useParams();
  const driverId = (params?.id as string) || 'd1';

  const [pedidosEmRota, setPedidosEmRota] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  
  // Modal PIN
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinDigitado, setPinDigitado] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  // Status GPS
  const [gpsActive, setGpsActive] = useState(false);
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsMsg, setGpsMsg] = useState('Aguardando permissão de GPS...');
  const [proximidadeAlert, setProximidadeAlert] = useState<string | null>(null);

  // Salva no localStorage para persistência de sessão
  useEffect(() => {
    localStorage.setItem('agilizone_motoboy_active_id', driverId);
  }, [driverId]);

  const getBackendUrl = () => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host !== 'localhost' && host !== '127.0.0.1') {
        return `${window.location.protocol}//${host}:5000`;
      }
    }
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  };

  const backendUrl = getBackendUrl();

  const playNotificationSound = (type: 'proximity' | 'success') => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'proximity') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(783.99, ctx.currentTime);
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch {}

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([150, 80, 150]);
    }
  };

  const fetchPedidosEmRota = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/pedidos`);
      if (res.ok) {
        const data: Pedido[] = await res.json();
        // Filtra pedidos alocados ou em rota para este entregador
        const emRota = data.filter(
          (p) => ['em_rota', 'despachado', 'alocado', 'preparo', 'pronto'].includes(p.status)
        );
        setPedidosEmRota(emRota);

        // Se houver salvamento local de pedido selecionado
        const savedPedidoId = localStorage.getItem(`agilizone_active_pedido_${driverId}`);
        if (savedPedidoId) {
          const match = emRota.find((p) => p.id === savedPedidoId || p.id_externo === savedPedidoId);
          if (match) setSelectedPedido(match);
          else if (emRota.length > 0) setSelectedPedido(emRota[0]);
        } else if (emRota.length > 0) {
          setSelectedPedido(emRota[0]);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos em rota:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPedidosEmRota();
    const interval = setInterval(fetchPedidosEmRota, 10000);
    return () => clearInterval(interval);
  }, [driverId]);

  // Rastreamento de GPS contínuo (Persistente durante uso do navegador)
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsMsg('GPS não suportado neste navegador.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLastCoords({ lat, lng });
        setGpsActive(true);
        setGpsMsg(`GPS Ativo (${lat.toFixed(4)}, ${lng.toFixed(4)})`);

        // Envia coordenadas para o backend
        try {
          const res = await fetch(`${backendUrl}/api/motoboy/localizacao`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entregador_id: driverId,
              pedido_id: selectedPedido?.id,
              latitude: lat,
              longitude: lng,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.alertas_proximidade && data.alertas_proximidade.length > 0) {
              const alerta = data.alertas_proximidade[0];
              setProximidadeAlert(`🚨 Alerta enviado ao cliente (${alerta.distancia_metros}m)!`);
              playNotificationSound('proximity');
            }
          }
        } catch {}
      },
      (err) => {
        setGpsActive(false);
        setGpsMsg('GPS inativo ou permissão negada.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [driverId, selectedPedido]);

  // Função para simular movimento de GPS (útil para testes desktop)
  const handleSimularGPSProximo = async () => {
    if (!selectedPedido || !selectedPedido.latitude || !selectedPedido.longitude) return;
    
    // Simula coordenadas a ~300 metros do cliente
    const latSimulada = selectedPedido.latitude - 0.002;
    const lngSimulada = selectedPedido.longitude - 0.002;
    
    setLastCoords({ lat: latSimulada, lng: lngSimulada });
    setGpsActive(true);
    setGpsMsg(`GPS Simulado próximo (${latSimulada.toFixed(4)}, ${lngSimulada.toFixed(4)})`);

    try {
      const res = await fetch(`${backendUrl}/api/motoboy/localizacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entregador_id: driverId,
          pedido_id: selectedPedido.id,
          latitude: latSimulada,
          longitude: lngSimulada,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setProximidadeAlert('🚨 Alerta de Proximidade (< 500m) ativado e notificação enviada!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenPinModal = (p: Pedido) => {
    setSelectedPedido(p);
    setPinDigitado('');
    setPinError('');
    setIsPinModalOpen(true);
  };

  const handleConfirmarPin = async () => {
    if (!selectedPedido) return;
    if (pinDigitado.length < 4) {
      setPinError('O código deve conter 4 dígitos.');
      return;
    }

    setIsSubmittingPin(true);
    setPinError('');

    try {
      const res = await fetch(`${backendUrl}/api/pedidos/${selectedPedido.id}/confirmar-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo_pin: pinDigitado }),
      });

      const data = await res.json();

      if (res.ok && data.status === 'success') {
        playNotificationSound('success');
        setIsPinModalOpen(false);
        setPinDigitado('');
        fetchPedidosEmRota();
        alert('🎉 Entrega confirmada com sucesso! Frete R$ 8.50 adicionado.');
      } else {
        setPinError(data.error || 'Código incorreto. Solicite o PIN de 4 dígitos ao cliente.');
      }
    } catch (err) {
      setPinError('Erro ao comunicar com servidor. Tente novamente.');
    } finally {
      setIsSubmittingPin(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans max-w-md mx-auto shadow-2xl border-x border-slate-800">
      {/* Top Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-20 flex items-center justify-between shadow">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-white">Painel do Entregador</h1>
            <p className="text-xs text-slate-400">Agilizone • Rota Persistente</p>
          </div>
        </div>
        <button
          onClick={fetchPedidosEmRota}
          className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
          title="Atualizar Pedidos"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* GPS Status Banner */}
      <div className={`px-4 py-2.5 text-xs font-medium flex items-center justify-between border-b ${gpsActive ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/50' : 'bg-amber-950/80 text-amber-300 border-amber-800/50'}`}>
        <div className="flex items-center space-x-2">
          <span className={`w-2.5 h-2.5 rounded-full ${gpsActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
          <span>{gpsMsg}</span>
        </div>
        <button
          onClick={handleSimularGPSProximo}
          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded border border-amber-500/40 text-[11px] font-semibold transition"
        >
          📍 Simular Proximidade
        </button>
      </div>

      {proximidadeAlert && (
        <div className="m-3 p-3 bg-indigo-950/90 border border-indigo-500/40 text-indigo-200 text-xs rounded-xl flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
          <span>{proximidadeAlert}</span>
        </div>
      )}

      {/* Content Body */}
      <main className="flex-1 p-4 space-y-4">
        {loading && pedidosEmRota.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-400" />
            <p>Carregando entregas da rota...</p>
          </div>
        ) : pedidosEmRota.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700/60 p-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Nenhuma entrega em aberto!</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Você não possui entregas ativas em rota no momento. Aguarde nova alocação da loja.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <span>Entregas Ativas ({pedidosEmRota.length})</span>
              <span>Filipéia • João Pessoa</span>
            </div>

            {pedidosEmRota.map((p) => {
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.endereco_entrega)}`;
              const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(p.endereco_entrega)}&navigate=yes`;
              const waClientUrl = p.telefone_cliente
                ? `https://wa.me/55${p.telefone_cliente.replace(/\D/g, '')}`
                : null;

              return (
                <div
                  key={p.id}
                  className="bg-slate-800 border border-slate-700/80 rounded-2xl p-4 space-y-3.5 shadow-lg relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        #{p.id_externo}
                      </span>
                      <h2 className="text-base font-bold text-white mt-1.5">{p.nome_cliente}</h2>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-400">Total</span>
                      <p className="text-lg font-black text-emerald-400">
                        R$ {Number(p.valor_total).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-700/40">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{p.endereco_entrega}</span>
                  </div>

                  {/* Detalhes de itens */}
                  {p.itens && p.itens.length > 0 && (
                    <div className="text-xs text-slate-400 space-y-1 bg-slate-900/40 p-2.5 rounded-lg">
                      <p className="font-semibold text-slate-300">Itens do Pedido:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {p.itens.map((it, idx) => (
                          <li key={idx}>
                            {it.quantidade}x {it.nome}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Ações de Navegação */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={wazeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-sky-600/20 hover:bg-sky-600/30 text-sky-400 font-semibold rounded-xl border border-sky-500/30 text-xs flex items-center justify-center space-x-1.5 transition"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Abrir no Waze</span>
                    </a>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-semibold rounded-xl border border-emerald-500/30 text-xs flex items-center justify-center space-x-1.5 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Google Maps</span>
                    </a>
                  </div>

                  {waClientUrl && (
                    <a
                      href={waClientUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-slate-700 hover:bg-slate-650 text-slate-200 text-xs font-semibold rounded-xl border border-slate-600 flex items-center justify-center space-x-2 transition"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Falar com Cliente no WhatsApp</span>
                    </a>
                  )}

                  {/* Botão Principal: Confirmar Entrega por PIN */}
                  <button
                    onClick={() => handleOpenPinModal(p)}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition"
                  >
                    <KeyRound className="w-5 h-5" />
                    <span>CONFIRMAR CÓDIGO (PIN)</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Validação de Código PIN */}
      {isPinModalOpen && selectedPedido && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-3xl p-6 space-y-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30 flex items-center justify-center mx-auto mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Código de Confirmação</h3>
              <p className="text-xs text-slate-400">
                Peça ao cliente os 4 dígitos informados no pedido <strong className="text-amber-400">#{selectedPedido.id_externo}</strong>.
              </p>
            </div>

            {/* Visualização dos Dígitos */}
            <div className="flex justify-center space-x-3 my-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-black transition-all ${
                    pinDigitado[idx]
                      ? 'border-amber-400 bg-amber-500/10 text-amber-300 scale-105 shadow-md shadow-amber-500/10'
                      : 'border-slate-700 bg-slate-900/60 text-slate-500'
                  }`}
                >
                  {pinDigitado[idx] || '•'}
                </div>
              ))}
            </div>

            {pinError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800/60 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            {/* Teclado Numérico Virtual Grande */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    if (pinDigitado.length < 4) setPinDigitado((prev) => prev + num);
                  }}
                  className="py-3.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white font-bold text-lg rounded-xl transition"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setPinDigitado('')}
                className="py-3.5 bg-slate-800 hover:bg-slate-750 text-slate-400 font-semibold text-xs rounded-xl transition border border-slate-700"
              >
                Limpar
              </button>
              <button
                onClick={() => {
                  if (pinDigitado.length < 4) setPinDigitado((prev) => prev + '0');
                }}
                className="py-3.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg rounded-xl transition"
              >
                0
              </button>
              <button
                onClick={() => setPinDigitado((prev) => prev.slice(0, -1))}
                className="py-3.5 bg-slate-800 hover:bg-slate-750 text-rose-400 font-semibold text-xs rounded-xl transition border border-slate-700"
              >
                ← Apagar
              </button>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setIsPinModalOpen(false)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarPin}
                disabled={isSubmittingPin || pinDigitado.length < 4}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl transition flex items-center justify-center space-x-1"
              >
                {isSubmittingPin ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Validar e Finalizar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
