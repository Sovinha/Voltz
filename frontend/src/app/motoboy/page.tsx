'use client';

import React, { useState, useEffect } from 'react';
import { Truck, MapPin, CheckCircle2, Navigation, ExternalLink, Clock, ShieldCheck, Phone, AlertCircle, RefreshCw, KeyRound, Wifi, WifiOff, LogOut, Check, ChevronRight, DollarSign } from 'lucide-react';
import { Pedido } from '@/lib/supabase';

interface DriverSession {
  id: string;
  nome: string;
  telefone: string;
  placa_veiculo?: string;
  status?: string;
}

export default function MotoboyAppPage() {
  const [driver, setDriver] = useState<DriverSession | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Status & GPS State
  const [isOnline, setIsOnline] = useState(true);
  const [gpsActive, setGpsActive] = useState(false);
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsMsg, setGpsMsg] = useState('Inicializando GPS...');
  
  // Orders State
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

  // PIN Modal State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinDigitado, setPinDigitado] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  // 1. Carrega motorista da sessão
  useEffect(() => {
    const saved = localStorage.getItem('motoboy_session');
    if (saved) {
      try {
        setDriver(JSON.parse(saved));
      } catch {}
    } else {
      // Default para demonstração fácil
      const defaultDriver = { id: 'd1', nome: 'ANDERSON (Moto 01)', telefone: '83999112233', placa_veiculo: 'MOP-1001' };
      setDriver(defaultDriver);
      localStorage.setItem('motoboy_session', JSON.stringify(defaultDriver));
    }
  }, []);

  const sendCurrentLocation = async (lat: number, lng: number) => {
    if (!driver) return;
    setLastCoords({ lat, lng });
    setGpsActive(true);
    setGpsMsg(`GPS Transmitido (${lat.toFixed(4)}, ${lng.toFixed(4)})`);

    try {
      await fetch(`${backendUrl}/api/motoboy/localizacao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entregador_id: driver.id,
          entregador_nome: driver.nome,
          latitude: lat,
          longitude: lng,
          pedido_id: selectedPedido?.id
        }),
      });
    } catch (err) {
      console.warn('Falha no envio de GPS:', err);
    }
  };

  // 2. Transmissão Contínua de GPS
  useEffect(() => {
    if (!driver || !isOnline) {
      setGpsActive(false);
      setGpsMsg('Status: Offline / Pausa');
      return;
    }

    if (!navigator.geolocation) {
      setGpsMsg('GPS não suportado neste navegador');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        sendCurrentLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setGpsActive(false);
        setGpsMsg(`Permissão GPS: ${err.message}. Clique para enviar.`);
        // Tenta enviar localização padrão inicial perto da loja (-7.1155, -34.8601) para aparecer no mapa imediatamente!
        sendCurrentLocation(-7.1155, -34.8601);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [driver, isOnline, selectedPedido, backendUrl]);

  // 3. Busca de Pedidos Atribuídos ao Motoboy
  const fetchPedidos = async () => {
    if (!driver) return;
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/pedidos`);
      if (res.ok) {
        const data: Pedido[] = await res.json();
        // Filtra pedidos alocados para este entregador ou em preparo/pronto
        const meusPedidos = data.filter(
          (p) =>
            ['em_rota', 'despachado', 'alocado', 'pronto'].includes(p.status) &&
            (!p.entregador_nome || p.entregador_nome.toLowerCase().includes(driver.nome.split(' ')[0].toLowerCase()))
        );
        setPedidos(meusPedidos);
        if (meusPedidos.length > 0 && !selectedPedido) {
          setSelectedPedido(meusPedidos[0]);
        }
      }
    } catch (e) {
      console.error('Erro ao carregar pedidos:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(fetchPedidos, 6000);
    return () => clearInterval(interval);
  }, [driver]);

  // 4. Ações de Pedido
  const handleStartRoute = async (pedido: Pedido) => {
    try {
      await fetch(`${backendUrl}/api/pedidos/${pedido.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'em_rota',
          entregador_nome: driver?.nome
        })
      });
      fetchPedidos();
    } catch (e) {
      alert('Erro ao iniciar rota: ' + e);
    }
  };

  const handleConfirmPin = async () => {
    if (!selectedPedido) return;
    if (pinDigitado.length !== 4) {
      setPinError('Digite o PIN de 4 dígitos informado pelo cliente!');
      return;
    }

    setIsSubmittingPin(true);
    setPinError('');

    try {
      const res = await fetch(`${backendUrl}/api/pedidos/${selectedPedido.id}/confirmar-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinDigitado }),
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        alert('✅ PIN Confirmado com Sucesso! Entrega Validada.');
        setIsPinModalOpen(false);
        setPinDigitado('');
        setSelectedPedido(null);
        fetchPedidos();
      } else {
        setPinError(data.message || 'PIN Incorreto! Confirme com o cliente.');
      }
    } catch (err) {
      setPinError('Erro ao comunicar com o servidor.');
    }
    setIsSubmittingPin(false);
  };

  const handleFinalizarEntrega = async (pedido: Pedido) => {
    if (!confirm(`Finalizar entrega do pedido #${pedido.id_externo}?`)) return;
    try {
      await fetch(`${backendUrl}/api/pedidos/${pedido.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'finalizado' })
      });
      setSelectedPedido(null);
      fetchPedidos();
    } catch (e) {
      alert('Erro ao finalizar entrega: ' + e);
    }
  };

  const toggleOnline = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    if (driver) {
      try {
        await fetch(`${backendUrl}/api/motoboy/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entregador_id: driver.id,
            status: nextState ? 'disponivel' : 'pausa'
          })
        });
      } catch {}
    }
  };

  // Se não houver driver selecionado
  if (!driver) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-black">Portal do Entregador PWA</h1>
            <p className="text-xs text-slate-400 mt-1">Identifique-se para iniciar os serviços</p>
          </div>
          <button
            onClick={() => {
              const d = { id: 'd1', nome: 'ANDERSON (Moto 01)', telefone: '83999112233', placa_veiculo: 'MOP-1001' };
              setDriver(d);
              localStorage.setItem('motoboy_session', JSON.stringify(d));
            }}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm shadow-md transition"
          >
            Entrar como Anderson (Moto 01)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-10">
      
      {/* HEADER PRINCIPAL PWA DO MOTOBOY */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 p-4 shadow-xl">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-md">
              🛵
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                {driver.nome}
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                <span className={`w-2 h-2 rounded-full ${gpsActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                <span className={gpsActive ? 'text-emerald-400 font-bold' : 'text-slate-400'}>{gpsMsg}</span>
              </div>
            </div>
          </div>

          {/* BOTÃO TOGGLE ONLINE/PAUSA */}
          <button
            onClick={toggleOnline}
            className={`px-3.5 py-1.5 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shadow-md ${
              isOnline
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
            <span>{isOnline ? 'ONLINE' : 'PAUSA'}</span>
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL (MOBILE FIRST) */}
      <main className="max-w-md mx-auto p-4 space-y-4">

        {/* BOTÃO DE TRANSMISSÃO INSTANTÂNEA DE GPS */}
        <button
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => sendCurrentLocation(pos.coords.latitude, pos.coords.longitude),
                () => sendCurrentLocation(-7.1155, -34.8601)
              );
            } else {
              sendCurrentLocation(-7.1155, -34.8601);
            }
          }}
          className="w-full py-2.5 px-4 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-md active:scale-98"
        >
          <Navigation className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>📡 Transmitir Posição GPS para o Mapa da Central</span>
        </button>

        {/* CARD DE GANHOS DO DIA */}

        <div className="bg-gradient-to-r from-slate-900 to-slate-900/90 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Ganhos Acumulados Hoje</span>
            <div className="text-xl font-black text-emerald-400 flex items-center gap-1">
              <span>R$ {(pedidos.filter(p => p.status === 'finalizado').length * 8.5).toFixed(2)}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Entregas Realizadas</span>
            <div className="text-lg font-black text-amber-400">
              {pedidos.filter(p => p.status === 'finalizado').length} Pedido(s)
            </div>
          </div>
        </div>

        {/* FEED DE PEDIDOS EM ROTA */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Sua Fila de Entregas ({pedidos.length})</span>
            </h2>

            <button
              onClick={fetchPedidos}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {pedidos.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-800/60 rounded-full flex items-center justify-center mx-auto text-slate-500">
                ☕
              </div>
              <h3 className="font-bold text-sm text-slate-300">Nenhum pedido na sua fila</h3>
              <p className="text-xs text-slate-500">Mantenha o status ONLINE. A Central de Expedição enviará suas rotas automaticamente.</p>
            </div>
          ) : (
            pedidos.map((pedido) => {
              const isSelected = selectedPedido?.id === pedido.id;
              const isEmRota = pedido.status === 'em_rota';

              return (
                <div
                  key={pedido.id}
                  className={`bg-slate-900 border rounded-2xl p-4 transition-all shadow-xl space-y-3 ${
                    isSelected ? 'border-amber-500/80 ring-1 ring-amber-500/30' : 'border-slate-800'
                  }`}
                >
                  {/* CABEÇALHO DO PEDIDO */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-lg shadow-sm">
                        #{pedido.id_externo}
                      </span>
                      <span className="text-xs font-bold text-slate-200">
                        {pedido.nome_cliente}
                      </span>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                      isEmRota ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-sky-500/20 text-sky-400'
                    }`}>
                      {isEmRota ? 'EM ROTA' : 'PRONTO P/ ROTA'}
                    </span>
                  </div>

                  {/* ENDEREÇO DO CLIENTE */}
                  <div className="space-y-1">
                    <div className="flex items-start gap-2 text-xs text-slate-300">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span className="font-medium leading-snug">{pedido.endereco_entrega}</span>
                    </div>

                    {pedido.telefone_cliente && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 pl-6">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{pedido.telefone_cliente}</span>
                      </div>
                    )}
                  </div>

                  {/* BOTOES DE AÇÃO E NAVEGAÇÃO GPS */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Waze */}
                    <a
                      href={`https://waze.com/ul?q=${encodeURIComponent(pedido.endereco_entrega)}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Navigation className="w-4 h-4 text-sky-400" />
                      <span>Abrir Waze</span>
                    </a>

                    {/* Google Maps */}
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pedido.endereco_entrega)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <ExternalLink className="w-4 h-4 text-emerald-400" />
                      <span>Google Maps</span>
                    </a>
                  </div>

                  {/* BOTÃO PRINCIPAL DE STATUS */}
                  {!isEmRota ? (
                    <button
                      onClick={() => handleStartRoute(pedido)}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg flex items-center justify-center gap-2 transition"
                    >
                      <Truck className="w-4 h-4" />
                      <span>🚀 Iniciar Rota de Entrega</span>
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setSelectedPedido(pedido);
                          setIsPinModalOpen(true);
                        }}
                        className="py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl text-xs shadow-md flex items-center justify-center gap-1.5 transition"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>🔑 Digitar PIN</span>
                      </button>

                      <button
                        onClick={() => handleFinalizarEntrega(pedido)}
                        className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs shadow-md flex items-center justify-center gap-1.5 transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>✅ Concluir</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* MODAL DE VALIDAÇÃO DE PIN DE SEGURANÇA */}
      {isPinModalOpen && selectedPedido && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 bg-purple-500/20 text-purple-400 border border-purple-500/40 rounded-2xl flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-extrabold text-slate-100 text-base">PIN de Confirmação</h3>
              <p className="text-xs text-slate-400 mt-1">
                Solicite os 4 dígitos ao cliente no momento da entrega do pedido #{selectedPedido.id_externo}
              </p>
            </div>

            <input
              type="text"
              maxLength={4}
              placeholder="0 0 0 0"
              value={pinDigitado}
              onChange={(e) => setPinDigitado(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-2xl font-mono font-black tracking-widest bg-slate-950 border border-purple-500/40 focus:border-purple-400 text-purple-300 rounded-xl py-3 outline-none"
            />

            {pinError && (
              <p className="text-xs font-bold text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-500/30">
                {pinError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  setIsPinModalOpen(false);
                  setPinDigitado('');
                }}
                className="py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmPin}
                disabled={isSubmittingPin}
                className="py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold rounded-xl text-xs shadow-md"
              >
                {isSubmittingPin ? 'Validando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
