'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Pedido, OrdemStatus } from '@/lib/supabase';
import { checkIsPeakHour } from '@/lib/DispatchEngine';
import { getBackendUrl } from '@/lib/backend';
import { DriverData } from './CadastroMotoboyModal';
import { Navigation, Bike, Car, Footprints, ListOrdered, ChevronDown, ChevronUp, Zap, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

export interface OsrmStep {
  name: string;
  distance: number;
  duration: number;
  maneuver: {
    type: string;
    modifier?: string;
  };
}

export interface LojaConfig {
  nome: string;
  endereco: string;
  latitude: number;
  longitude: number;
}

interface InteractiveMapProps {
  loja: LojaConfig;
  pedidos: Pedido[];
  drivers?: DriverData[];
  selectedPedido: Pedido | null;

  selectedStatusFilter?: string;
  batchPedidos?: Pedido[];
  includeReturnLeg?: boolean;
  onBatchMetricsChange?: (metrics: {
    totalMin: number;
    deliveryMin: number;
    returnMin: number;
    totalKm: number;
    returnKm: number;
  }) => void;
  animatingCoords?: { lat: number; lng: number } | null;
  isSimulating?: boolean;
  onSimulationEnd?: () => void;
  showEtaBadgeExternal?: boolean;
  showSingleRouteExternal?: boolean;
  showBatchRouteExternal?: boolean;
  onSelectPedido: (pedido: Pedido) => void;
  onUpdateStatus?: (pedidoId: string, newStatus: OrdemStatus) => void;
  onOpenAlocar?: (pedido: Pedido) => void;
  onOpenDetails?: (pedido: Pedido) => void;
}

// Calculadora Haversine em km
const calcHaversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper de contingência: gera trajeto em grade de quarteirões evitando corte diagonal reto
const generateGridStreetPath = (points: [number, number][]): [number, number][] => {
  if (points.length < 2) return points;
  const result: [number, number][] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const [startLat, startLng] = points[i];
    const [endLat, endLng] = points[i + 1];

    result.push([startLat, startLng]);

    const cornerLat = endLat;
    const cornerLng = startLng;

    const steps = 10;
    for (let s = 1; s <= steps; s++) {
      const lat = startLat + (cornerLat - startLat) * (s / steps);
      result.push([lat, cornerLng]);
    }
    for (let s = 1; s <= steps; s++) {
      const lng = cornerLng + (endLng - cornerLng) * (s / steps);
      result.push([endLat, lng]);
    }
  }

  return result;
};

// Helper de formatação e tradução das instruções curva-a-curva (Turn-by-Turn Steps)
const formatOsrmStep = (step: OsrmStep): string => {
  const street = step.name ? `em ${step.name}` : '';
  const dist = step.distance >= 1000
    ? `${(step.distance / 1000).toFixed(1)} km`
    : `${Math.round(step.distance)} m`;

  const type = step.maneuver?.type;
  const mod = step.maneuver?.modifier;

  if (type === 'depart') return `Inicie o trajeto ${street} por ${dist}`;
  if (type === 'arrive') return `Chegou ao ponto de entrega`;
  if (type === 'turn') {
    if (mod === 'right' || mod === 'sharp right') return `Vire à direita ${street} (${dist})`;
    if (mod === 'left' || mod === 'sharp left') return `Vire à esquerda ${street} (${dist})`;
    if (mod === 'slight right') return `Mantenha-se à direita ${street} (${dist})`;
    if (mod === 'slight left') return `Mantenha-se à esquerda ${street} (${dist})`;
    return `Vire ${street} (${dist})`;
  }
  if (type === 'roundabout' || type === 'rotary') return `Na rotatória, pegue a saída ${street} (${dist})`;
  if (type === 'new name' || type === 'continue') return `Continue ${street} por ${dist}`;
  if (type === 'fork') return `Mantenha-se ${mod === 'right' ? 'à direita' : 'à esquerda'} na bifurcação (${dist})`;

  return `Siga ${street} por ${dist}`;
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  loja,
  pedidos,
  drivers = [],
  selectedPedido,

  selectedStatusFilter = 'todos',
  batchPedidos = [],
  includeReturnLeg = true,
  onBatchMetricsChange,
  animatingCoords = null,
  isSimulating = false,
  onSimulationEnd,
  showEtaBadgeExternal = false,
  showSingleRouteExternal = false,
  showBatchRouteExternal = false,
  onSelectPedido,
  onUpdateStatus,
  onOpenAlocar,
  onOpenDetails,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Trajeto em ruas reais via OSRM API para Pedido Único
  const [singleOsrmPoints, setSingleOsrmPoints] = useState<[number, number][]>([]);
  const [osrmEtaInfo, setOsrmEtaInfo] = useState<{ min: number; km: number } | null>(null);

  // Trajeto em ruas reais via OSRM API para Lote Multi-Pedido
  const [batchOsrmPoints, setBatchOsrmPoints] = useState<[number, number][]>([]);

  // OSRM v5 Features
  const [osrmProfile, setOsrmProfile] = useState<'driving' | 'bike' | 'foot'>('driving');
  const [osrmSteps, setOsrmSteps] = useState<OsrmStep[]>([]);
  const [showStepsDrawer, setShowStepsDrawer] = useState<boolean>(false);
  const [osrmServerUsed, setOsrmServerUsed] = useState<string>('OSRM Server');

  const [showEtaBadge, setShowEtaBadge] = useState<boolean>(false);
  const [currentBikeCoords, setCurrentBikeCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Sincronizar exibição sob demanda
  useEffect(() => {
    if (showEtaBadgeExternal !== undefined) {
      setShowEtaBadge(showEtaBadgeExternal);
    }
  }, [showEtaBadgeExternal]);

  // 1. Busca de rota em RUAS REAIS (OSRM /route/v1/) para Pedido Único
  useEffect(() => {
    if (!selectedPedido) return;

    const peakInfo = checkIsPeakHour();

    const targetLat = selectedPedido.latitude || loja.latitude + 0.015;
    const targetLng = selectedPedido.longitude || loja.longitude + 0.015;

    const originLat = selectedStatusFilter === 'em_rota' ? loja.latitude - 0.008 : loja.latitude;
    const originLng = selectedStatusFilter === 'em_rota' ? loja.longitude - 0.012 : loja.longitude;

    const fetchSingleRoute = async () => {
      const waypoints = `${originLng},${originLat};${targetLng},${targetLat}`;
      const backendUrl = getBackendUrl();
      const urls = [
        `${backendUrl}/api/route?waypoints=${waypoints}&profile=${osrmProfile}&steps=true`,
        `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&steps=true`,
        `https://routing.openstreetmap.de/routed-car/route/v1/driving/${waypoints}?overview=full&geometries=geojson&steps=true`,
      ];

      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              const coords: [number, number][] = route.geometry.coordinates.map(
                (c: [number, number]) => [c[1], c[0]] as [number, number]
              );
              const km = parseFloat((route.distance / 1000).toFixed(1));
              const baseMin = Math.round(route.duration / 60) || 1;
              const min = Math.round(baseMin * peakInfo.factor);

              setSingleOsrmPoints(coords);
              setOsrmEtaInfo({ min, km });

              // Extrai instrucoes curva-a-curva (steps) do OSRM
              if (route.legs && route.legs.length > 0) {
                const legSteps: OsrmStep[] = [];
                route.legs.forEach((leg: any) => {
                  if (leg.steps) {
                    leg.steps.forEach((s: any) => {
                      if (s.maneuver && s.maneuver.type !== 'depart' && s.maneuver.type !== 'arrive') {
                        legSteps.push({
                          name: s.name || '',
                          distance: s.distance || 0,
                          duration: s.duration || 0,
                          maneuver: s.maneuver
                        });
                      }
                    });
                  }
                });
                setOsrmSteps(legSteps);
              }

              if (data._meta?.server_used) {
                setOsrmServerUsed(data._meta.server_used);
              } else if (url.includes('project-osrm.org')) {
                setOsrmServerUsed('Project-OSRM v5 (Demo)');
              }

              return;
            }
          }
        } catch (err) {
          // Tentar próximo serviço
        }
      }

      // Fallback em grade de quarteirões (Manhattan grid)
      const directKm = calcHaversineKm(originLat, originLng, targetLat, targetLng);
      const baseMin = Math.round((directKm / 20) * 60 + 2);
      const gridCoords = generateGridStreetPath([[originLat, originLng], [targetLat, targetLng]]);
      setSingleOsrmPoints(gridCoords);
      setOsrmEtaInfo({ min: Math.round(baseMin * peakInfo.factor), km: parseFloat(directKm.toFixed(1)) });
      setOsrmSteps([]);
    };

    fetchSingleRoute();
  }, [selectedPedido, selectedStatusFilter, loja, osrmProfile]);

  // 2. Busca de rota em RUAS REAIS com OSRM Trip API (TSP Solver Multi-Stop) para Lote Multi-Pedido
  useEffect(() => {
    if (batchPedidos.length === 0) {
      setBatchOsrmPoints([]);
      if (onBatchMetricsChange) {
        onBatchMetricsChange({ totalMin: 0, deliveryMin: 0, returnMin: 0, totalKm: 0, returnKm: 0 });
      }
      return;
    }

    const peakInfo = checkIsPeakHour();

    const fetchBatchRoute = async () => {
      const waypointsArr = [
        `${loja.longitude},${loja.latitude}`,
        ...batchPedidos.map((bp) => {
          const lat = bp.latitude || loja.latitude + 0.015;
          const lng = bp.longitude || loja.longitude + 0.015;
          return `${lng},${lat}`;
        }),
      ];

      if (includeReturnLeg) {
        waypointsArr.push(`${loja.longitude},${loja.latitude}`);
      }

      const waypoints = waypointsArr.join(';');

      const backendUrl = getBackendUrl();
      const urls = [
        `${backendUrl}/api/trip?waypoints=${waypoints}&source=first&roundtrip=${includeReturnLeg ? 'true' : 'false'}&profile=${osrmProfile}`,
        `${backendUrl}/api/route?waypoints=${waypoints}&profile=${osrmProfile}`,
        `https://router.project-osrm.org/trip/v1/driving/${waypoints}?overview=full&geometries=geojson&steps=true`,
        `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`,
      ];

      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const activeResult = (data.trips && data.trips[0]) || (data.routes && data.routes[0]);
            if (activeResult) {
              const coords: [number, number][] = activeResult.geometry.coordinates.map(
                (c: [number, number]) => [c[1], c[0]] as [number, number]
              );
              const totalKm = parseFloat((activeResult.distance / 1000).toFixed(1));
              const baseMin = Math.round(activeResult.duration / 60) || 1;
              const totalMin = Math.round(baseMin * peakInfo.factor);

              const returnRatio = includeReturnLeg ? 0.3 : 0;
              const returnKm = parseFloat((totalKm * returnRatio).toFixed(1));
              const returnMin = Math.round(totalMin * returnRatio);
              const deliveryMin = Math.max(1, totalMin - returnMin);

              setBatchOsrmPoints(coords);
              if (onBatchMetricsChange) {
                onBatchMetricsChange({ totalMin, deliveryMin, returnMin, totalKm, returnKm });
              }
              return;
            }
          }
        } catch (err) {
          // Tentar próximo serviço
        }
      }

      const rawPoints: [number, number][] = [[loja.latitude, loja.longitude]];
      batchPedidos.forEach((bp) => {
        rawPoints.push([bp.latitude || loja.latitude + 0.015, bp.longitude || loja.longitude + 0.015]);
      });
      if (includeReturnLeg) {
        rawPoints.push([loja.latitude, loja.longitude]);
      }
      const gridCoords = generateGridStreetPath(rawPoints);
      setBatchOsrmPoints(gridCoords);

      let approxKm = 0;
      for (let i = 0; i < rawPoints.length - 1; i++) {
        approxKm += calcHaversineKm(rawPoints[i][0], rawPoints[i][1], rawPoints[i + 1][0], rawPoints[i + 1][1]);
      }
      const totalKm = parseFloat((approxKm * 1.3).toFixed(1));
      const totalMin = Math.round(((totalKm / 20) * 60 + 4) * peakInfo.factor);
      const returnMin = Math.round(totalMin * (includeReturnLeg ? 0.3 : 0));
      const deliveryMin = Math.max(1, totalMin - returnMin);

      if (onBatchMetricsChange) {
        onBatchMetricsChange({ totalMin, deliveryMin, returnMin, totalKm, returnKm: parseFloat((totalKm * 0.3).toFixed(1)) });
      }
    };

    fetchBatchRoute();
  }, [batchPedidos, loja, includeReturnLeg, osrmProfile]);

  // 3. Animação de Deslocamento do Motoboy Percorrendo as Ruas Reais
  useEffect(() => {
    const activeRoute = showBatchRouteExternal && batchOsrmPoints.length > 0 ? batchOsrmPoints : singleOsrmPoints;

    if (!isSimulating || activeRoute.length === 0) {
      setCurrentBikeCoords(null);
      return;
    }

    let currentIndex = 0;
    const stepInterval = Math.max(30, Math.floor(5000 / activeRoute.length));

    const interval = setInterval(() => {
      if (currentIndex < activeRoute.length) {
        const [lat, lng] = activeRoute[currentIndex];
        setCurrentBikeCoords({ lat, lng });
        currentIndex++;
      } else {
        clearInterval(interval);
        setCurrentBikeCoords(null);
        if (onSimulationEnd) onSimulationEnd();
      }
    }, stepInterval);

    return () => clearInterval(interval);
  }, [isSimulating, singleOsrmPoints, batchOsrmPoints, showBatchRouteExternal, onSimulationEnd]);

  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [mapStyle, setMapStyle] = useState<'dark' | 'osm' | 'streets' | 'satellite'>('osm');

  const MAP_STYLES = {
    osm: {
      name: '🗺️ OpenStreetMap',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    },
    dark: {
      name: '🌙 Dark (Esri)',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    },
    streets: {
      name: '🏙️ Ruas Reais (Esri)',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    },
    satellite: {
      name: '🛰️ Satélite HD',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    },
  };


  useEffect(() => {
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(MAP_STYLES[mapStyle].url);
    }
  }, [mapStyle]);

  // Inicialização do Mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [loja.latitude, loja.longitude],
        zoom: 14,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const tileLayer = L.tileLayer(MAP_STYLES.osm.url, {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);


      tileLayerRef.current = tileLayer;

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);


  // Renderização das Camadas no Mapa
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Geofencing (180m)
    const storeGeofence = L.circle([loja.latitude, loja.longitude], {
      color: '#a855f7',
      fillColor: '#a855f7',
      fillOpacity: 0.15,
      radius: 180,
      weight: 1.5,
      dashArray: '4, 4',
    });
    layerGroup.addLayer(storeGeofence);

    // 2. Ícone da Matriz (Filipéia Trattoria - PG)
    const storeIcon = L.divIcon({
      className: 'custom-store-marker',
      html: `
        <div class="flex flex-col items-center select-none cursor-pointer">
          <div class="px-2 py-0.5 rounded bg-slate-900/95 text-[10px] font-bold text-slate-100 border border-slate-700 shadow-xl whitespace-nowrap mb-1">
            FILIPÉIA TRATTORIA - PG
          </div>
          <div class="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center border-2 border-white shadow-2xl">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [140, 50],
      iconAnchor: [70, 48],
    });

    const storeMarker = L.marker([loja.latitude, loja.longitude], { icon: storeIcon })
      .bindPopup(`
        <div style="color: #0f172a; font-family: sans-serif; padding: 4px;">
          <strong style="font-size: 13px; color: #0284c7;">🏪 ${loja.nome}</strong><br/>
          <span style="font-size: 11px; color: #475569;">${loja.endereco}</span>
        </div>
      `);
    layerGroup.addLayer(storeMarker);

    // 3. Marcadores de Pedidos (Exclui concluídos/finalizados na visão 'todos')
    const filteredPedidos = pedidos.filter((p) => {
      if (selectedStatusFilter === 'todos') return p.status !== 'finalizado';
      return p.status === selectedStatusFilter;
    });

    // Mapeamento de coordenadas confiáveis para evitar queda no mar
    const safeCoordsMap: Record<string, { lat: number; lng: number }> = {
      '0121': { lat: -7.0988, lng: -34.8385 }, // Manaíra
      '0123': { lat: -7.1145, lng: -34.8285 }, // Tambaú
      '0122': { lat: -7.1350, lng: -34.8235 }, // Cabo Branco (em terra)
    };

    filteredPedidos.forEach((p, idx) => {
      const rawDigits = p.id_externo.replace(/[^0-9]/g, '');
      const cleanCode = rawDigits.slice(-4) || `${121 + idx}`;
      const shortCode = cleanCode.padStart(4, '0');

      let lat = p.latitude;
      let lng = p.longitude;

      // Se coordenada ausente ou no oceano (longitude > -34.822 em JP)
      if (!lat || !lng || lng > -34.822 || lat < -7.20 || lat > -7.00) {
        if (safeCoordsMap[shortCode]) {
          lat = safeCoordsMap[shortCode].lat;
          lng = safeCoordsMap[shortCode].lng;
        } else if (safeCoordsMap[cleanCode]) {
          lat = safeCoordsMap[cleanCode].lat;
          lng = safeCoordsMap[cleanCode].lng;
        } else {
          const fallbacks = [
            { lat: -7.0988, lng: -34.8385 },
            { lat: -7.1145, lng: -34.8285 },
            { lat: -7.1350, lng: -34.8235 },
          ];
          const fb = fallbacks[idx % fallbacks.length];
          lat = fb.lat;
          lng = fb.lng;
        }
      }

      const isSelected = selectedPedido?.id === p.id;
      const batchIdx = batchPedidos.findIndex((bp) => bp.id === p.id);
      const isBatchItem = batchIdx >= 0;

      const stopLabel = isBatchItem
        ? `<span class="bg-slate-950 text-amber-300 text-[10px] px-1 rounded font-black mr-1 border border-amber-500/40">#${batchIdx + 1}</span>`
        : '';

      const orderIcon = L.divIcon({
        className: 'custom-order-pill-marker',
        html: `
          <div class="flex flex-col items-center cursor-pointer transition-transform ${
            isSelected ? 'scale-125 z-50' : 'hover:scale-110'
          }">
            <div class="px-2 py-0.5 rounded bg-sky-600 text-white text-xs font-mono font-bold shadow-xl border border-white/20 flex items-center justify-center whitespace-nowrap">
              ${stopLabel}${shortCode}
            </div>
            <div class="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-sky-600 -mt-0.5"></div>
          </div>
        `,
        iconSize: [isBatchItem ? 68 : 55, 30],
        iconAnchor: [isBatchItem ? 34 : 27, 28],
      });

      const marker = L.marker([lat, lng], { icon: orderIcon }).on('click', () => {
        onSelectPedido(p);
      });

      const popupHtml = `
        <div class="p-1.5 min-w-[200px] font-sans text-xs bg-slate-950 text-slate-100 rounded-2xl border border-slate-700/80 shadow-2xl space-y-1">
          <div class="px-2 py-1 border-b border-slate-800 flex justify-between items-center">
            <strong class="font-mono text-sky-400 text-sm font-bold">#${shortCode}</strong>
            <span class="text-[10px] uppercase font-bold text-slate-400">${p.status}</span>
          </div>

          ${
            p.status === 'pronto'
              ? `<button class="btn-revert-preparo w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-amber-400 font-bold transition-colors flex items-center gap-2" data-id="${p.id}">
                   <span>↩️</span> Voltar para "Em Preparo"
                 </button>`
              : `<button class="btn-mark-pronto w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-emerald-400 font-bold transition-colors flex items-center gap-2" data-id="${p.id}">
                   <span>✅</span> Marcar como pronto
                 </button>`
          }

          <button class="btn-ver-detalhes w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-200 font-medium transition-colors flex items-center gap-2" data-id="${p.id}">
            <span>👁️</span> Ver detalhes
          </button>

          <button class="btn-alocar-entregador w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-purple-400 font-bold transition-colors flex items-center gap-2" data-id="${p.id}">
            <span>🛵</span> Alocar entregador
          </button>

          <button class="btn-editar-pedido w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 font-medium transition-colors flex items-center gap-2" data-id="${p.id}">
            <span>✏️</span> Editar pedido
          </button>

          <button class="btn-copy-link w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-sky-400 font-medium transition-colors flex items-center gap-2" data-id="${p.id}">
            <span>🔗</span> Link de Rastreamento
          </button>
        </div>
      `;

      const popup = L.popup({
        closeButton: false,
        className: 'custom-context-popup',
      }).setContent(popupHtml);

      marker.bindPopup(popup);

      marker.on('popupopen', (e) => {
        const container = e.popup.getElement();
        if (!container) return;

        const btnPronto = container.querySelector('.btn-mark-pronto');
        if (btnPronto) {
          btnPronto.addEventListener('click', () => {
            if (onUpdateStatus) onUpdateStatus(p.id, 'pronto');
            map.closePopup();
          });
        }

        const btnRevert = container.querySelector('.btn-revert-preparo');
        if (btnRevert) {
          btnRevert.addEventListener('click', () => {
            if (onUpdateStatus) onUpdateStatus(p.id, 'preparo');
            map.closePopup();
          });
        }

        const btnDetalhes = container.querySelector('.btn-ver-detalhes');
        if (btnDetalhes) {
          btnDetalhes.addEventListener('click', () => {
            if (onOpenDetails) onOpenDetails(p);
            map.closePopup();
          });
        }

        const btnAlocar = container.querySelector('.btn-alocar-entregador');
        if (btnAlocar) {
          btnAlocar.addEventListener('click', () => {
            if (onOpenAlocar) onOpenAlocar(p);
            map.closePopup();
          });
        }

        const btnLink = container.querySelector('.btn-copy-link');
        if (btnLink) {
          btnLink.addEventListener('click', () => {
            const trackingUrl = `${window.location.origin}/tracking?id=${p.id_externo}`;
            navigator.clipboard.writeText(trackingUrl);
            alert(`✅ Link de rastreamento copiado!\n\n${trackingUrl}`);
            map.closePopup();
          });
        }
      });

      layerGroup.addLayer(marker);
    });

    // 5. Desenhar Rota de Lote Multi-Pedido em RUAS REAIS (OSRM Multi-Stop)
    if (showBatchRouteExternal && batchOsrmPoints.length > 0) {
      const borderPolyline = L.polyline(batchOsrmPoints, { color: '#020617', weight: 10, opacity: 0.9 });
      layerGroup.addLayer(borderPolyline);

      const mainPolyline = L.polyline(batchOsrmPoints, { color: '#f59e0b', weight: 6, opacity: 0.95 });
      layerGroup.addLayer(mainPolyline);
    } 
    // 6. Desenhar Rota Única em RUAS REAIS (OSRM Single)
    else if (showSingleRouteExternal && selectedPedido && singleOsrmPoints.length > 0) {
      const borderPolyline = L.polyline(singleOsrmPoints, {
        color: '#090d16',
        weight: 10,
        opacity: 0.95,
      });
      layerGroup.addLayer(borderPolyline);

      const mainPolyline = L.polyline(singleOsrmPoints, {
        color: '#2563eb',
        weight: 6,
        opacity: 0.95,
      });

      mainPolyline.on('click', () => {
        setShowEtaBadge((prev) => !prev);
      });

      layerGroup.addLayer(mainPolyline);

      // Balão Flutuante de ETA
      if (showEtaBadge && osrmEtaInfo) {
        const midIdx = Math.floor(singleOsrmPoints.length / 2);
        const midCoords = singleOsrmPoints[midIdx] || singleOsrmPoints[0];

        const etaTooltipIcon = L.divIcon({
          className: 'route-eta-badge',
          html: `
            <div class="relative bg-white text-slate-900 border-2 border-slate-800 rounded-xl px-3 py-1.5 shadow-2xl flex flex-col items-center justify-center font-sans font-bold whitespace-nowrap cursor-pointer animate-in fade-in zoom-in duration-200">
              <div class="flex items-center gap-1.5 text-xs font-black text-slate-900">
                <span class="text-sm">🛵</span> <span>${osrmEtaInfo.min} min</span>
              </div>
              <span class="text-[10px] text-slate-600 font-mono font-semibold">${osrmEtaInfo.km} km</span>
              <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-800"></div>
            </div>
          `,
          iconSize: [120, 48],
          iconAnchor: [60, 52],
        });

        const etaMarker = L.marker(midCoords, { icon: etaTooltipIcon }).on('click', () => {
          setShowEtaBadge(false);
        });
        layerGroup.addLayer(etaMarker);
      }
    }

    // 7. Renderização dos Motoboys com GPS Ao Vivo Transmitido via Celular PWA (Somente se ONLINE)
    if (drivers && drivers.length > 0) {
      drivers.forEach((d) => {
        const isOnline = d.status !== 'offline' && d.status !== 'pausa';
        if (isOnline && d.latitude && d.longitude) {
          const driverIcon = L.divIcon({
            className: 'custom-driver-marker',
            html: `
              <div class="flex flex-col items-center select-none cursor-pointer">
                <div class="px-2.5 py-0.5 rounded-full bg-slate-900/95 text-amber-300 font-black text-[10px] border border-amber-500/50 shadow-2xl whitespace-nowrap mb-1">
                  🛵 ${d.nome.split(' ')[0]} 🟢
                </div>
                <div class="w-10 h-10 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center border-2 border-white shadow-2xl animate-bounce">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-1.1 0-2 .9-2 2v3H0v2h4c0 2.21 1.79 4 4 4s4-1.79 4-4h4c0 2.21 1.79 4 4 4s4-1.79 4-4h4v-5l-5-5zM8 18c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm10 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                  </svg>
                </div>
              </div>
            `,
            iconSize: [60, 60],
            iconAnchor: [30, 55],
          });

          const driverMarker = L.marker([d.latitude, d.longitude], { icon: driverIcon })
            .bindPopup(`<strong style="color: #0f172a;">Entregador: ${d.nome} (${d.status})</strong>`);
          layerGroup.addLayer(driverMarker);
        }
      });
    }

    // 8. Animação de Deslocamento de Rota Ativa
    const activeBikeCoords = currentBikeCoords || animatingCoords;
    if (activeBikeCoords) {
      const bikeIcon = L.divIcon({
        className: 'custom-bike-marker',
        html: `
          <div class="flex items-center justify-center w-10 h-10 bg-amber-500 text-slate-950 rounded-full border-2 border-white shadow-2xl z-[999]">
            <svg class="w-6 h-6 animate-bounce" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-1.1 0-2 .9-2 2v3H0v2h4c0 2.21 1.79 4 4 4s4-1.79 4-4h4c0 2.21 1.79 4 4 4s4-1.79 4-4h4v-5l-5-5zM8 18c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm10 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const bikeMarker = L.marker([activeBikeCoords.lat, activeBikeCoords.lng], { icon: bikeIcon });
      layerGroup.addLayer(bikeMarker);
    }
  }, [loja, pedidos, drivers, selectedPedido, selectedStatusFilter, batchPedidos, animatingCoords, currentBikeCoords, singleOsrmPoints, batchOsrmPoints, osrmEtaInfo, showEtaBadge, showSingleRouteExternal, showBatchRouteExternal, onSelectPedido, onUpdateStatus, onOpenAlocar, onOpenDetails]);


  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[600px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl z-0">
      {/* Barra de Ferramentas OSRM & Seletor de Modelo de Mapa */}
      <div className="absolute top-3 left-4 right-4 z-[500] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        
        {/* Esquerda: Seletor Estilo do Mapa */}
        <div className="flex items-center gap-1 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 shadow-2xl pointer-events-auto">
          {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map((styleKey) => (
            <button
              key={styleKey}
              onClick={() => setMapStyle(styleKey)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                mapStyle === styleKey
                  ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {MAP_STYLES[styleKey].name}
            </button>
          ))}
        </div>

        {/* Direita: Controles OSRM v5 (Perfis & Navegação Passo a Passo) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Seletor de Perfil OSRM */}
          <div className="flex items-center gap-1 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/60 shadow-2xl">
            <button
              onClick={() => setOsrmProfile('driving')}
              title="Perfil Veículo / Moto"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                osrmProfile === 'driving'
                  ? 'bg-emerald-500 text-slate-950 shadow-md scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Moto/Carro</span>
            </button>
            <button
              onClick={() => setOsrmProfile('bike')}
              title="Perfil Bicicleta"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                osrmProfile === 'bike'
                  ? 'bg-emerald-500 text-slate-950 shadow-md scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bike</span>
            </button>
          </div>

          {/* Botão de Instruções Curva-a-Curva (Steps) */}
          {osrmSteps.length > 0 && (
            <button
              onClick={() => setShowStepsDrawer(!showStepsDrawer)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xl border border-indigo-400/30 transition-all animate-pulse"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Passos ({osrmSteps.length})</span>
              {showStepsDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Indicador de Servidor OSRM */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-emerald-400 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>OSRM v5</span>
          </div>
        </div>
      </div>

      {/* Card Flutuante de Instruções de Rota Curva-a-Curva (Turn-by-Turn Steps) */}
      {showStepsDrawer && osrmSteps.length > 0 && (
        <div className="absolute top-16 right-4 z-[600] w-80 max-h-[70vh] overflow-y-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
              <Navigation className="w-4 h-4 text-amber-400" />
              <span>Navegação Curva-a-Curva OSRM</span>
            </div>
            <button
              onClick={() => setShowStepsDrawer(false)}
              className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded-md hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2.5">
            {osrmSteps.map((step, idx) => {
              const formattedText = formatOsrmStep(step);
              return (
                <div key={idx} className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-200 hover:border-slate-700 transition-colors">
                  <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/20">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-tight text-slate-100">{formattedText}</p>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {step.distance >= 1000 ? `${(step.distance / 1000).toFixed(1)} km` : `${Math.round(step.distance)} m`} • {Math.ceil(step.duration / 60)} min
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div ref={mapContainerRef} className="w-full h-full bg-slate-950" />
    </div>
  );
};


