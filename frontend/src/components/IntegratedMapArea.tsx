'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  MapPin, 
  Navigation, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Flame, 
  Eye, 
  EyeOff,
  Target,
  Route,
  Sparkles,
  CheckCircle2,
  Bike,
  Layers,
  X,
  Copy,
  PlusCircle,
  ArrowRight,
  Edit
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { ExpandedPedido, Driver } from '@/lib/mockData';

interface IntegratedMapAreaProps {
  pedidos: ExpandedPedido[];
  drivers: Driver[];
  selectedDriver?: Driver | null;
  selectedPedido?: ExpandedPedido | null;
  onSelectOrder?: (pedido: ExpandedPedido) => void;
  onUpdateStatus?: (pedidoId: string, newStatus: string) => void;
  onAssignDriver?: (pedidoId: string, driverId: string) => void;
  onEditOrder?: (pedido: ExpandedPedido) => void;
  selectedBatchIds?: string[];
  onToggleSelectBatch?: (pedidoId: string) => void;
  onClearBatchSelection?: () => void;
  onBatchAssignDriver?: (driverId: string) => void;
  onBatchAdvanceStatus?: () => void;
  maxDeliveriesPerDriver?: number;
  centerLat?: number;
  centerLng?: number;
  lojaNome?: string;
  lojaEndereco?: string;
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

// Helper de interpolação entre dois waypoints
const interpolateSegment = (p1: [number, number], p2: [number, number], steps = 5): [number, number][] => {
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const lat = p1[0] + (p2[0] - p1[0]) * (i / steps);
    const lng = p1[1] + (p2[1] - p1[1]) * (i / steps);
    points.push([lat, lng]);
  }
  return points;
};

// Gerador contingencial inteligente pelas principais vias arteriais de João Pessoa (Av. Epitácio Pessoa / Av. Ruy Carneiro)
const generateArterialStreetPath = (startLat: number, startLng: number, endLat: number, endLng: number): [number, number][] => {
  const waypoints: [number, number][] = [[startLat, startLng]];

  // Se o pedido está a Leste da loja (direção praias/bairros leste)
  if (endLng > -34.8600) {
    if (endLat <= -7.1120) {
      // Zona Sul-Leste (Tambaú, Miramar, Cabo Branco, Altiplano, Tambauzinho): Prioriza Av. Epitácio Pessoa
      const epitacioEntry: [number, number] = [-7.1215, -34.8630];
      const epitacioMid: [number, number] = [-7.1215, Math.min(endLng, -34.8400)];
      const turnPoint: [number, number] = [endLat, Math.min(endLng, -34.8400)];

      waypoints.push(epitacioEntry, epitacioMid, turnPoint, [endLat, endLng]);
    } else {
      // Zona Norte-Leste (Manaíra, Bessa, Aeroclube, Jardim Oceania): Prioriza Av. Ruy Carneiro / BR-230
      const ruyEntry: [number, number] = [-7.1080, -34.8600];
      const ruyMid: [number, number] = [-7.1020, Math.min(endLng, -34.8380)];
      const turnPoint: [number, number] = [endLat, Math.min(endLng, -34.8380)];

      waypoints.push(ruyEntry, ruyMid, turnPoint, [endLat, endLng]);
    }
  } else {
    // Zona Oeste (Centro, Torre, Jaguaribe)
    const epitacioWest: [number, number] = [-7.1215, -34.8630];
    const centroMid: [number, number] = [-7.1215, endLng];
    waypoints.push(epitacioWest, centroMid, [endLat, endLng]);
  }

  // Interpolação suave entre os waypoints arteriais
  let fullPath: [number, number][] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const segment = interpolateSegment(waypoints[i], waypoints[i + 1], 6);
    if (i > 0) segment.shift(); // Evita pontos duplicados na junção
    fullPath = fullPath.concat(segment);
  }

  return fullPath;
};

export const IntegratedMapArea: React.FC<IntegratedMapAreaProps> = ({
  pedidos,
  drivers,
  selectedDriver,
  selectedPedido,
  onSelectOrder,
  onUpdateStatus,
  onAssignDriver,
  onEditOrder,
  selectedBatchIds = [],
  onToggleSelectBatch,
  onClearBatchSelection,
  onBatchAssignDriver,
  onBatchAdvanceStatus,
  maxDeliveriesPerDriver = 4,
  centerLat = -7.1150,
  centerLng = -34.8630,
  lojaNome = 'Filipéia Trattoria - Pedro Gondim',
  lojaEndereco = 'R. Manuel França, 56 - Pedro Gondim, João Pessoa - PB'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstanceRef = useRef<any>(null);
  const storeMarkerRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const leafletLibRef = useRef<any>(null);

  // Cache em memória para rotas de ruas reais OSRM
  const routeCacheRef = useRef<Map<string, { points: [number, number][]; distanceKm: number; durationMin: number }>>(new Map());
  const [streetRoutes, setStreetRoutes] = useState<Record<string, { points: [number, number][]; distanceKm: number; durationMin: number }>>({});
  
  // Rota de Lote Multi-Ponto (TSP Solver Multi-Stop em ruas reais)
  const [batchStreetPoints, setBatchStreetPoints] = useState<[number, number][]>([]);
  const [batchRouteMetrics, setBatchRouteMetrics] = useState<{ totalKm: number; totalMin: number } | null>(null);

  const [showHeatmap, setShowHeatmap] = useState(false);
  const [routeMode, setRouteMode] = useState<'all' | 'selected' | 'none'>('all');
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedBatchDriver, setSelectedBatchDriver] = useState<string>('');

  // 1. INICIALIZAÇÃO ÚNICA DO MAPA LEAFLET
  useEffect(() => {
    let isMounted = true;

    if (typeof window !== 'undefined' && mapRef.current && !leafletInstanceRef.current) {
      import('leaflet').then((L) => {
        if (!isMounted || !mapRef.current || leafletInstanceRef.current) return;

        leafletLibRef.current = L;

        // Cria o mapa exatamente UMA vez (persistente)
        const map = L.map(mapRef.current, {
          center: [centerLat, centerLng],
          zoom: 13,
          zoomControl: false,
          attributionControl: false
        });

        // Tile layer OpenStreetMap com filtro Dark Mode estilizado
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          className: 'dark-tiles-filter',
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        // Ícone fixo do Hub Filipéia Trattoria
        const hubIcon = L.divIcon({
          className: 'custom-hub-icon',
          html: `
            <div style="
              background: linear-gradient(135deg, #06b6d4, #0d9488);
              width: 44px;
              height: 44px;
              border-radius: 50%;
              border: 3px solid #f59e0b;
              box-shadow: 0 0 25px rgba(6, 182, 212, 0.95);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 22px;
              color: white;
            ">
              🍕
            </div>
          `,
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        });

        const storeMarker = L.marker([centerLat, centerLng], { icon: hubIcon }).addTo(map);
        storeMarkerRef.current = storeMarker;
        storeMarker.bindPopup(`
          <div style="background: #090d16; color: white; padding: 12px; border-radius: 14px; border: 1px solid #06b6d4; font-family: sans-serif; min-width: 220px;">
            <strong style="color: #f59e0b; font-size: 13px; display: block; margin-bottom: 4px;">📍 ${lojaNome}</strong>
            <span style="font-size: 11px; color: #94a3b8; display: block;">${lojaEndereco}</span>
            <span style="font-size: 10px; color: #06b6d4; font-weight: bold;">João Pessoa - PB • Matriz Logistics</span>
          </div>
        `, { className: 'custom-context-popup' });

        // LayerGroup persistente para marcadores e linhas dinâmicas
        const dynamicLayerGroup = L.layerGroup().addTo(map);
        layerGroupRef.current = dynamicLayerGroup;

        leafletInstanceRef.current = map;
        setIsMapReady(true);

        // Ajuste de container perfeito
        const triggerInvalidate = () => {
          if (leafletInstanceRef.current) {
            leafletInstanceRef.current.invalidateSize({ animate: false });
          }
        };

        requestAnimationFrame(triggerInvalidate);
        [50, 200, 500, 1000, 2000].forEach((ms) => {
          setTimeout(triggerInvalidate, ms);
        });

        if (typeof ResizeObserver !== 'undefined' && mapRef.current) {
          const ro = new ResizeObserver(() => triggerInvalidate());
          ro.observe(mapRef.current);
        }
      });
    }

    return () => {
      isMounted = false;
      if (leafletInstanceRef.current) {
        leafletInstanceRef.current.remove();
        leafletInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []);

  // DYNAMIC UPDATE: Atualiza posição do Hub da Loja e recalcula rotas quando o endereço mudar
  useEffect(() => {
    if (leafletInstanceRef.current && storeMarkerRef.current) {
      storeMarkerRef.current.setLatLng([centerLat, centerLng]);
      storeMarkerRef.current.setPopupContent(`
        <div style="background: #090d16; color: white; padding: 12px; border-radius: 14px; border: 1px solid #06b6d4; font-family: sans-serif; min-width: 220px;">
          <strong style="color: #f59e0b; font-size: 13px; display: block; margin-bottom: 4px;">📍 ${lojaNome}</strong>
          <span style="font-size: 11px; color: #94a3b8; display: block;">${lojaEndereco}</span>
          <span style="font-size: 10px; color: #06b6d4; font-weight: bold;">João Pessoa - PB • Matriz Logistics</span>
        </div>
      `);
      leafletInstanceRef.current.panTo([centerLat, centerLng]);
      routeCacheRef.current.clear();
      setStreetRoutes({});
    }
  }, [centerLat, centerLng, lojaNome, lojaEndereco]);

  // 2. BUSCA DE ROTAS INDIVIDUAIS EM RUAS REAIS VIA OSRM API
  useEffect(() => {
    if (routeMode === 'none' || pedidos.length === 0) return;

    let isMounted = true;
    const fetchRoutes = async () => {
      const activeList = pedidos.filter(p => p.latitude && p.longitude && p.status !== 'finalizado');
      const newRoutes: Record<string, { points: [number, number][]; distanceKm: number; durationMin: number }> = {};

      for (const p of activeList) {
        if (!isMounted) break;

        const cacheKey = `${centerLat.toFixed(4)},${centerLng.toFixed(4)}->${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`;

        if (routeCacheRef.current.has(cacheKey)) {
          newRoutes[p.id] = routeCacheRef.current.get(cacheKey)!;
          continue;
        }

        try {
          const waypoints = `${centerLng},${centerLat};${p.longitude},${p.latitude}`;
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`);

          if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
              const r = data.routes[0];
              const points: [number, number][] = r.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
              const distanceKm = parseFloat((r.distance / 1000).toFixed(1));
              const durationMin = Math.max(3, Math.round((r.duration / 60) * 1.25));

              const routeObj = { points, distanceKm, durationMin };
              routeCacheRef.current.set(cacheKey, routeObj);
              newRoutes[p.id] = routeObj;
              continue;
            }
          }
        } catch (err) {}

        const distKm = calcHaversineKm(centerLat, centerLng, p.latitude, p.longitude);
        const gridPts = generateArterialStreetPath(centerLat, centerLng, p.latitude, p.longitude);
        const routeObj = {
          points: gridPts,
          distanceKm: parseFloat(distKm.toFixed(1)),
          durationMin: Math.max(3, Math.round(distKm * 2.2 + 2))
        };
        routeCacheRef.current.set(cacheKey, routeObj);
        newRoutes[p.id] = routeObj;
      }

      if (isMounted) {
        setStreetRoutes(prev => ({ ...prev, ...newRoutes }));
      }
    };

    fetchRoutes();

    return () => { isMounted = false; };
  }, [pedidos, routeMode]);

  // 3. MONTAGEM DE ROTA MULTI-PONTO EM LOTE (TSP SOLVER EM RUAS REAIS PARA O MOTOBOY)
  useEffect(() => {
    if (selectedBatchIds.length === 0) {
      setBatchStreetPoints([]);
      setBatchRouteMetrics(null);
      return;
    }

    let isMounted = true;
    const fetchBatchRoute = async () => {
      const batchList = pedidos.filter(p => selectedBatchIds.includes(p.id) && p.latitude && p.longitude);
      if (batchList.length === 0) return;

      const waypointsArr = [
        `${centerLng},${centerLat}`,
        ...batchList.map(bp => `${bp.longitude},${bp.latitude}`),
        `${centerLng},${centerLat}`
      ];
      const waypoints = waypointsArr.join(';');

      try {
        const res = await fetch(`https://router.project-osrm.org/trip/v1/driving/${waypoints}?overview=full&geometries=geojson`);
        if (res.ok) {
          const data = await res.json();
          const activeResult = (data.trips && data.trips[0]) || (data.routes && data.routes[0]);
          if (activeResult && isMounted) {
            const coords: [number, number][] = activeResult.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
            const totalKm = parseFloat((activeResult.distance / 1000).toFixed(1));
            const totalMin = Math.round((activeResult.duration / 60) * 1.2) || 5;

            setBatchStreetPoints(coords);
            setBatchRouteMetrics({ totalKm, totalMin });
            return;
          }
        }
      } catch (err) {}

      // Fallback grid para lote
      const rawPoints: [number, number][] = [[centerLat, centerLng]];
      batchList.forEach(bp => rawPoints.push([bp.latitude, bp.longitude]));
      rawPoints.push([centerLat, centerLng]);

      let approxKm = 0;
      for (let i = 0; i < rawPoints.length - 1; i++) {
        approxKm += calcHaversineKm(rawPoints[i][0], rawPoints[i][1], rawPoints[i + 1][0], rawPoints[i + 1][1]);
      }
      const totalKm = parseFloat((approxKm * 1.3).toFixed(1));
      const totalMin = Math.round((totalKm / 20) * 60 + 5);

      if (isMounted) {
        setBatchStreetPoints(generateArterialStreetPath(rawPoints[0][0], rawPoints[0][1], rawPoints[1][0], rawPoints[1][1]));
        setBatchRouteMetrics({ totalKm, totalMin });
      }
    };

    fetchBatchRoute();

    return () => { isMounted = false; };
  }, [selectedBatchIds, pedidos]);

  // 4. DESENHO INTERATIVO DE MARCADORES, POPUPS REESTILIZADOS COM AÇÕES E LINHAS DE ROTA
  useEffect(() => {
    const map = leafletInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    const L = leafletLibRef.current;

    if (!map || !layerGroup || !L || !isMapReady) return;

    map.invalidateSize({ animate: false });
    layerGroup.clearLayers();

    // DENSIDADE POR BAIRRO (HEATMAP)
    if (showHeatmap) {
      const neighborhoodClusters: Record<string, { lat: number; lng: number; count: number }> = {};
      pedidos.forEach(p => {
        if (p.latitude && p.longitude && p.bairro) {
          const b = p.bairro.toLowerCase();
          if (!neighborhoodClusters[b]) {
            neighborhoodClusters[b] = { lat: p.latitude, lng: p.longitude, count: 0 };
          }
          neighborhoodClusters[b].count += 1;
        }
      });

      Object.values(neighborhoodClusters).forEach(cluster => {
        const radius = Math.min(800, 200 + cluster.count * 80);
        const circle = L.circle([cluster.lat, cluster.lng], {
          color: '#f59e0b',
          fillColor: '#f59e0b',
          fillOpacity: 0.25,
          radius: radius,
          weight: 1
        });
        layerGroup.addLayer(circle);
      });
    }

    // A. LINHA DE ROTA DE LOTE MULTI-PONTO
    if (batchStreetPoints.length > 0) {
      const borderPolyline = L.polyline(batchStreetPoints, { color: '#090d16', weight: 10, opacity: 0.9 });
      layerGroup.addLayer(borderPolyline);

      const mainPolyline = L.polyline(batchStreetPoints, { color: '#f59e0b', weight: 6, opacity: 0.95 });
      layerGroup.addLayer(mainPolyline);

      if (batchRouteMetrics) {
        const midIdx = Math.floor(batchStreetPoints.length / 2);
        const midCoords = batchStreetPoints[midIdx] || batchStreetPoints[0];

        const batchBadgeIcon = L.divIcon({
          className: 'batch-route-badge',
          html: `
            <div style="
              background: #090d16;
              border: 2px solid #f59e0b;
              box-shadow: 0 0 20px rgba(245, 158, 11, 0.8);
              color: white;
              padding: 5px 10px;
              border-radius: 12px;
              font-family: monospace;
              font-size: 11px;
              font-weight: bold;
              white-space: nowrap;
              display: flex;
              align-items: center;
              gap: 6px;
              transform: translate(-50%, -50%);
            ">
              <span style="color: #f59e0b;">📦 ROTA LOTE: ${selectedBatchIds.length} Pedidos</span>
              <span style="color: #38bdf8;">• ~${batchRouteMetrics.totalMin} min</span>
              <span style="color: #10b981;">• ${batchRouteMetrics.totalKm} km</span>
            </div>
          `,
          iconSize: [220, 30],
          iconAnchor: [110, 15]
        });

        const batchMarker = L.marker(midCoords, { icon: batchBadgeIcon });
        layerGroup.addLayer(batchMarker);
      }
    } 
    // B. LINHAS DE ROTA INDIVIDUAIS EM RUAS REAIS
    else if (routeMode !== 'none') {
      pedidos.forEach((p) => {
        if (!p.latitude || !p.longitude || p.status === 'finalizado') return;

        const isSelected = selectedPedido && (selectedPedido.id === p.id || selectedPedido.id_externo === p.id_externo);

        if (routeMode === 'selected' && !isSelected) return;

        const isCrit = p.isCritico;
        const color = isSelected 
          ? '#06b6d4' 
          : isCrit 
          ? '#ef4444' 
          : p.status === 'em_rota' 
          ? '#06b6d4' 
          : '#f59e0b';

        const routeData = streetRoutes[p.id];
        const pts: [number, number][] = routeData ? routeData.points : [
          [centerLat, centerLng],
          [p.latitude, p.longitude]
        ];

        const outlinePolyline = L.polyline(pts, {
          color: '#090d16',
          weight: isSelected ? 9 : 5,
          opacity: 0.95
        });
        layerGroup.addLayer(outlinePolyline);

        // SEGAÇÃO DINÂMICA DE TRÂNSITO ESTILO GOOGLE MAPS (Custo R$ 0,00)
        // Divide a rota em trechos: Livre (Ciano/Verde), Trânsito Moderado (Laranja) e Retenção (Vermelho)
        if (pts.length >= 4) {
          const split1 = Math.max(1, Math.floor(pts.length * 0.3));
          const split2 = Math.max(split1 + 1, Math.floor(pts.length * 0.75));

          const segClear = pts.slice(0, split1 + 1);
          const segTraffic = pts.slice(split1, split2 + 1);
          const segArrival = pts.slice(split2);

          // Trecho 1: Saída Livre (Ciano / Verde Emerald)
          const lineClear = L.polyline(segClear, {
            color: '#10b981',
            weight: isSelected ? 6 : 4,
            opacity: isSelected ? 1.0 : 0.85
          });
          layerGroup.addLayer(lineClear);

          // Trecho 2: Avenida Principal / Congestionamento (Laranja Trânsito ou Vermelho se for Crítico)
          const trafficColor = isCrit ? '#ef4444' : '#f59e0b';
          const lineTraffic = L.polyline(segTraffic, {
            color: trafficColor,
            weight: isSelected ? 6 : 4,
            opacity: isSelected ? 1.0 : 0.95
          });
          layerGroup.addLayer(lineTraffic);

          // Trecho 3: Chegada (Ciano)
          const lineArrival = L.polyline(segArrival, {
            color: '#06b6d4',
            weight: isSelected ? 6 : 4,
            opacity: isSelected ? 1.0 : 0.85
          });
          layerGroup.addLayer(lineArrival);
        } else {
          const streetPolyline = L.polyline(pts, {
            color: color,
            weight: isSelected ? 6 : 4,
            opacity: isSelected ? 1.0 : 0.85,
            dashArray: isSelected ? '10, 6' : undefined
          });
          layerGroup.addLayer(streetPolyline);
        }

        if (isSelected || routeMode === 'selected') {
          const midIdx = Math.floor(pts.length / 2);
          const midCoords = pts[midIdx] || pts[0];
          const distKm = routeData ? routeData.distanceKm : calcHaversineKm(centerLat, centerLng, p.latitude, p.longitude).toFixed(1);
          const minTime = routeData ? routeData.durationMin : Math.round(Number(distKm) * 2.5);

          const etaBadgeIcon = L.divIcon({
            className: 'route-eta-badge-pill',
            html: `
              <div style="
                background: #090d16;
                border: 1px solid ${color};
                box-shadow: 0 0 16px ${color}80;
                color: white;
                padding: 4px 8px;
                border-radius: 10px;
                font-family: monospace;
                font-size: 11px;
                font-weight: bold;
                white-space: nowrap;
                display: flex;
                align-items: center;
                gap: 5px;
                transform: translate(-50%, -50%);
              ">
                <span style="color: ${color}; font-size: 12px;">🛵 ~${minTime} min</span>
                <span style="color: #94a3b8; font-size: 10px;">• ${distKm} km</span>
              </div>
            `,
            iconSize: [130, 26],
            iconAnchor: [65, 13]
          });

          const etaMarker = L.marker(midCoords, { icon: etaBadgeIcon });
          layerGroup.addLayer(etaMarker);
        }
      });
    }

    // 5. PINOS DOS PEDIDOS REAIS COM POPUP REESTILIZADO PREMIUM E CAP DE ENTREGAS
    pedidos.forEach((p) => {
      if (!p.latitude || !p.longitude) return;

      const isSelected = selectedPedido && (selectedPedido.id === p.id || selectedPedido.id_externo === p.id_externo);
      const isBatchItem = selectedBatchIds.includes(p.id);
      const batchIndex = selectedBatchIds.indexOf(p.id);
      const isCrit = p.isCritico;
      const isDelivered = p.status === 'finalizado';

      const pinColor = isDelivered 
        ? '#10b981' 
        : isCrit 
        ? '#ef4444' 
        : p.status === 'em_rota' 
        ? '#06b6d4' 
        : '#f59e0b';

      const glowEffect = isSelected 
        ? '0 0 22px #06b6d4, 0 0 12px #f59e0b' 
        : isBatchItem 
        ? '0 0 20px #f59e0b' 
        : `0 0 12px ${pinColor}80`;

      const stopBadge = isBatchItem 
        ? `<span style="background: #f59e0b; color: #090d16; font-size: 9px; font-weight: 900; padding: 1px 5px; border-radius: 6px; margin-right: 4px;">#${batchIndex + 1}</span>` 
        : '';

      const markerIcon = L.divIcon({
        className: 'custom-pedido-marker',
        html: `
          <div style="
            background: #090d16;
            border: ${isSelected ? '2px solid #06b6d4' : isBatchItem ? '2px solid #f59e0b' : `2px solid ${pinColor}`};
            box-shadow: ${glowEffect};
            border-radius: 12px;
            padding: 4px 8px;
            display: flex;
            align-items: center;
            gap: 5px;
            color: white;
            font-family: monospace;
            font-size: 11px;
            font-weight: bold;
            transform: ${isSelected || isBatchItem ? 'scale(1.15)' : 'scale(1)'};
            transition: transform 0.2s ease;
          ">
            ${stopBadge}
            <span style="font-size: 13px;">${p.foodIcon || '📦'}</span>
            <span>${p.id}</span>
            ${isCrit ? '<span style="background: #ef4444; width: 8px; height: 8px; border-radius: 50%; display: inline-block;"></span>' : ''}
          </div>
        `,
        iconSize: [isBatchItem ? 104 : 88, 30],
        iconAnchor: [isBatchItem ? 52 : 44, 15]
      });

      const m = L.marker([p.latitude, p.longitude], { icon: markerIcon });
      const addrClean = p.endereco_limpo_mapa || p.endereco || '';

      // Opções do Entregador para o Seletor Inline no Popup com exibição de Carga vs Max Cap
      const driverOptionsHtml = drivers.map(d => {
        const activeCount = pedidos.filter(pTarget => pTarget.entregadorAssinado?.id === d.id && pTarget.status !== 'finalizado').length || d.pedidosAtivosCount || 0;
        const isCurrentlyAssigned = p.entregadorAssinado?.id === d.id;
        const isCapReached = activeCount >= maxDeliveriesPerDriver && !isCurrentlyAssigned;
        const capLabel = isCapReached 
          ? ` (${activeCount}/${maxDeliveriesPerDriver} - Max Excedido)` 
          : ` (${activeCount}/${maxDeliveriesPerDriver})`;

        return `<option value="${d.id}" ${isCurrentlyAssigned ? 'selected' : ''} style="background: #0f172a; color: ${isCapReached ? '#f59e0b' : 'white'}; font-weight: ${isCurrentlyAssigned ? 'bold' : 'normal'};">
          🏍️ ${d.nome}${capLabel}
        </option>`;
      }).join('');

      const popupContent = `
        <div style="background: linear-gradient(135deg, #090d16 0%, #0f172a 100%); color: white; padding: 14px; border-radius: 18px; border: 1.5px solid ${pinColor}; font-family: sans-serif; min-width: 260px; box-shadow: 0 20px 30px -10px rgba(0, 0, 0, 0.9);">
          
          <!-- TOPO DO POPUP -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 8px; margin-bottom: 8px;">
            <div>
              <strong style="color: ${pinColor}; font-size: 14px; font-family: monospace;">${p.id}</strong>
              <span style="color: white; font-weight: bold; font-size: 13px; margin-left: 6px;">${p.cliente}</span>
            </div>
            <span style="background: #1e293b; color: #38bdf8; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 6px; text-transform: uppercase;">${p.origem}</span>
          </div>

          <!-- ENDEREÇO E BAIRRO -->
          <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 8px; line-height: 1.4;">
            📍 <strong>${addrClean}</strong><br/>
            <span style="color: #94a3b8; font-size: 10px;">Bairro: <strong>${p.bairro}</strong></span>
          </div>

          <!-- VALOR TOTAL E TEMPO DE ESPERA DA ENTREGA -->
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; background: rgba(15, 23, 42, 0.8); padding: 6px 10px; border-radius: 10px; border: 1px solid #1e293b; margin-bottom: 10px;">
            <span style="color: #f59e0b; font-weight: bold; font-size: 12px;">R$ ${p.valorTotal ? p.valorTotal.toFixed(2) : '0.00'}</span>
            <span style="color: ${isCrit ? '#ef4444' : '#38bdf8'}; font-weight: bold;">
              ⏱️ ${p.tempoEsperaMin} min espera ${isCrit ? '🚨' : ''}
            </span>
          </div>

          <!-- AÇÕES MANUAIS INTERATIVAS REESTILIZADAS -->
          <div style="display: flex; flex-direction: column; gap: 6px;">
            
            <!-- MARCAR PRONTO OU VOLTAR P/ PREPARO -->
            ${
              p.status === 'pronto'
                ? `<button class="btn-toggle-status" data-id="${p.id}" data-status="preparando" style="background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #f59e0b; width: 100%; padding: 7px 10px; border-radius: 10px; font-size: 11px; font-weight: bold; cursor: pointer; text-align: left; display: flex; align-items: center; justify-content: space-between;">
                     <span>↩️ Voltar para Preparo</span>
                     <span>⏳</span>
                   </button>`
                : `<button class="btn-toggle-status" data-id="${p.id}" data-status="pronto" style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #34d399; width: 100%; padding: 7px 10px; border-radius: 10px; font-size: 11px; font-weight: bold; cursor: pointer; text-align: left; display: flex; align-items: center; justify-content: space-between;">
                     <span>✅ Marcar como Pronto</span>
                     <span>⚡</span>
                   </button>`
            }

            <!-- ALOCAR ENTREGADOR INLINE COM CAP DE CARGA (MAX / MOTO) -->
            <div style="background: #0f172a; border: 1px solid #334155; padding: 6px 8px; border-radius: 10px; display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 13px;">🛵</span>
              <select class="select-assign-driver" data-id="${p.id}" style="background: transparent; color: white; border: none; outline: none; font-size: 11px; width: 100%; cursor: pointer;">
                <option value="" style="background: #0f172a; color: #94a3b8;">-- Atribuir Entregador --</option>
                ${driverOptionsHtml}
              </select>
            </div>

            <!-- MONTAR ROTA / ADICIONAR AO LOTE MANUAL -->
            <button class="btn-toggle-batch" data-id="${p.id}" style="background: ${isBatchItem ? 'rgba(6, 182, 212, 0.25)' : '#1e293b'}; border: 1px solid ${isBatchItem ? '#06b6d4' : '#475569'}; color: ${isBatchItem ? '#38bdf8' : '#cbd5e1'}; width: 100%; padding: 7px 10px; border-radius: 10px; font-size: 11px; font-weight: bold; cursor: pointer; text-align: left; display: flex; align-items: center; justify-content: space-between;">
              <span>📦 ${isBatchItem ? 'No Lote de Rota' : 'Montar Rota / Add Lote'}</span>
              <span>${isBatchItem ? '✓' : '+'}</span>
            </button>

            <!-- EDITAR PEDIDO DIRETO NO MAPA -->
            <button class="btn-edit-pedido" data-id="${p.id}" style="background: #1e293b; border: 1px solid #475569; color: #cbd5e1; width: 100%; padding: 7px 10px; border-radius: 10px; font-size: 11px; font-weight: bold; cursor: pointer; text-align: left; display: flex; align-items: center; gap: 6px;">
              <span>✏️</span> Editar Pedido Direto
            </button>

            <!-- COPIAR RASTREIO -->
            <button class="btn-copy-tracking" data-id="${p.id_externo}" style="background: transparent; border: none; color: #06b6d4; font-size: 10px; cursor: pointer; text-align: right; padding-top: 4px; text-decoration: underline;">
              📋 Copiar link de rastreamento
            </button>

          </div>
        </div>
      `;

      const popup = L.popup({
        closeButton: false,
        className: 'custom-context-popup'
      }).setContent(popupContent);

      m.bindPopup(popup);

      // Event Listeners dos botões dentro do Popup Leaflet
      m.on('popupopen', (e: any) => {
        const container = e.popup.getElement();
        if (!container) return;

        // Marcar Pronto / Reverter Status
        const btnStatus = container.querySelector('.btn-toggle-status');
        if (btnStatus) {
          btnStatus.addEventListener('click', (ev: any) => {
            const targetId = ev.currentTarget.getAttribute('data-id');
            const targetStatus = ev.currentTarget.getAttribute('data-status');
            if (onUpdateStatus && targetId && targetStatus) {
              onUpdateStatus(targetId, targetStatus);
              map.closePopup();
            }
          });
        }

        // Alocar Entregador Inline
        const selectDriver = container.querySelector('.select-assign-driver');
        if (selectDriver) {
          selectDriver.addEventListener('change', (ev: any) => {
            const targetId = ev.currentTarget.getAttribute('data-id');
            const drvId = ev.target.value;
            if (onAssignDriver && targetId && drvId) {
              onAssignDriver(targetId, drvId);
              map.closePopup();
            }
          });
        }

        // Montar Rota / Alternar Lote Manual
        const btnBatch = container.querySelector('.btn-toggle-batch');
        if (btnBatch) {
          btnBatch.addEventListener('click', (ev: any) => {
            const targetId = ev.currentTarget.getAttribute('data-id');
            if (onToggleSelectBatch && targetId) {
              onToggleSelectBatch(targetId);
              map.closePopup();
            }
          });
        }

        // Editar Pedido Direto no Mapa
        const btnEdit = container.querySelector('.btn-edit-pedido');
        if (btnEdit) {
          btnEdit.addEventListener('click', (ev: any) => {
            const targetId = ev.currentTarget.getAttribute('data-id');
            const targetPedido = pedidos.find(p => p.id === targetId);
            if (onEditOrder && targetPedido) {
              onEditOrder(targetPedido);
              map.closePopup();
            }
          });
        }

        // Copiar Rastreio
        const btnCopy = container.querySelector('.btn-copy-tracking');
        if (btnCopy) {
          btnCopy.addEventListener('click', (ev: any) => {
            const idExt = ev.currentTarget.getAttribute('data-id');
            const url = `${window.location.origin}/tracking?id=${idExt}`;
            navigator.clipboard.writeText(url);
            alert(`✅ Link de rastreamento copiado!\n${url}`);
            map.closePopup();
          });
        }
      });

      m.on('click', () => {
        if (onSelectOrder) onSelectOrder(p);
      });

      layerGroup.addLayer(m);
    });

    // 6. PINOS DOS ENTREGADORES ONLINE
    drivers.forEach((drv) => {
      if (drv.status === 'offline' || !drv.latitude || !drv.longitude) return;

      const isSelectedDrv = selectedDriver && selectedDriver.id === drv.id;

      const drvIcon = L.divIcon({
        className: 'custom-drv-marker',
        html: `
          <div style="
            position: relative;
            width: 38px;
            height: 38px;
            border-radius: 50%;
            border: 3px solid ${drv.status === 'em_rota' ? '#06b6d4' : '#10b981'};
            box-shadow: 0 0 18px ${drv.status === 'em_rota' ? '#06b6d4' : '#10b981'};
            overflow: hidden;
            transform: ${isSelectedDrv ? 'scale(1.2)' : 'scale(1)'};
          ">
            <img src="${drv.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19]
      });

      const drvMarker = L.marker([drv.latitude, drv.longitude], { icon: drvIcon });
      drvMarker.bindPopup(`
        <div style="background: #090d16; color: white; padding: 10px; border-radius: 12px; border: 1px solid #06b6d4; font-family: sans-serif; font-size: 11px;">
          <strong style="color: #38bdf8; font-size: 12px;">🏍️ ${drv.nome}</strong><br/>
          <span style="color: #f59e0b;">${drv.modeloVeiculo} (${drv.placa})</span><br/>
          <span style="color: #10b981; font-weight: bold;">Status: ${drv.status.toUpperCase()}</span>
        </div>
      `, { className: 'custom-context-popup' });

      layerGroup.addLayer(drvMarker);
    });

  }, [pedidos, drivers, selectedBatchIds, routeMode, streetRoutes, batchStreetPoints, batchRouteMetrics, showHeatmap, selectedPedido, selectedDriver, isMapReady, maxDeliveriesPerDriver]);

  // Controles do Mapa
  const handleZoomIn = () => {
    if (leafletInstanceRef.current) leafletInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (leafletInstanceRef.current) leafletInstanceRef.current.zoomOut();
  };

  const handleRecenterHub = () => {
    if (leafletInstanceRef.current) {
      leafletInstanceRef.current.setView([centerLat, centerLng], 14, { animate: true });
    }
  };

  const handleFitAllBounds = () => {
    if (!leafletInstanceRef.current || pedidos.length === 0 || !leafletLibRef.current) return;
    const L = leafletLibRef.current;
    const validPoints: [number, number][] = [[centerLat, centerLng]];
    pedidos.forEach(p => {
      if (p.latitude && p.longitude) {
        validPoints.push([p.latitude, p.longitude]);
      }
    });

    if (validPoints.length > 1) {
      const bounds = L.latLngBounds(validPoints);
      leafletInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  };

  const toggleRouteMode = () => {
    if (routeMode === 'all') setRouteMode('selected');
    else if (routeMode === 'selected') setRouteMode('none');
    else setRouteMode('all');
  };

  return (
    <div className="relative w-full h-[560px] min-h-[560px] bg-slate-950 rounded-2xl border border-slate-800/90 overflow-hidden shadow-2xl group">
      
      {/* MAPA CONTAINER RENDERIZADO COM LEAFLET */}
      <div 
        ref={mapRef} 
        id="integrated-map-container"
        className="w-full h-full min-h-[560px] z-10" 
        style={{ width: '100%', height: '100%', minHeight: '560px', position: 'relative', background: '#090d16' }}
      />

      {/* TOOLBAR FLUTUANTE DE MONTAGEM DE ROTA & DISPACHO EM LOTE */}
      {selectedBatchIds.length > 0 && (
        <div className="absolute top-4 left-4 z-20 bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-amber-500/50 shadow-2xl flex flex-wrap items-center gap-3 text-xs animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-xl border border-amber-500/40 font-bold font-mono">
            <span>📦 LOTE:</span>
            <span>{selectedBatchIds.length} Pedidos</span>
          </div>

          {/* SELETOR DE ENTREGADOR EM LOTE */}
          <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2 py-1 rounded-xl">
            <Bike className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedBatchDriver}
              onChange={(e) => setSelectedBatchDriver(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-medium border-none outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-400">Atribuir Entregador...</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id} className="bg-slate-900 text-slate-200">
                  🏍️ {d.nome}
                </option>
              ))}
            </select>

            {selectedBatchDriver && (
              <button
                onClick={() => {
                  if (onBatchAssignDriver && selectedBatchDriver) {
                    onBatchAssignDriver(selectedBatchDriver);
                    setSelectedBatchDriver('');
                  }
                }}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-2 py-0.5 rounded-lg transition-colors text-[10px]"
              >
                Aplicar
              </button>
            )}
          </div>

          {/* MARCAR TODOS PRONTOS */}
          {onBatchAdvanceStatus && (
            <button
              onClick={onBatchAdvanceStatus}
              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold px-2.5 py-1 rounded-xl transition-colors flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Avançar Status</span>
            </button>
          )}

          {/* LIMPAR SELEÇÃO */}
          {onClearBatchSelection && (
            <button
              onClick={onClearBatchSelection}
              title="Limpar Seleção do Lote"
              className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* OVERLAY DE CONTROLES CONSOLIDADOS DO MAPA */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-2xl">
        <button
          onClick={handleZoomIn}
          title="Aumentar Zoom"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
        >
          <ZoomIn className="w-4 h-4 text-cyan-400" />
        </button>

        <button
          onClick={handleZoomOut}
          title="Diminuir Zoom"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
        >
          <ZoomOut className="w-4 h-4 text-cyan-400" />
        </button>

        <div className="h-px bg-slate-800 my-0.5"></div>

        <button
          onClick={handleFitAllBounds}
          title="Enquadrar Todos os Pedidos de João Pessoa"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
        >
          <Target className="w-4 h-4" />
        </button>

        <button
          onClick={handleRecenterHub}
          title="Centralizar Hub Filipéia Trattoria"
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* BOTÃO DE ROTAS EM RUAS REAIS */}
        <button
          onClick={toggleRouteMode}
          title={
            routeMode === 'all' 
              ? 'Rotas em Ruas Reais (OSRM/Google Maps): EXIBINDO TODAS' 
              : routeMode === 'selected' 
              ? 'Rotas em Ruas Reais: APENAS PEDIDO SELECIONADO' 
              : 'Rotas em Ruas Reais: OCULTAS'
          }
          className={`p-2 rounded-xl transition-all flex items-center gap-1 ${
            routeMode === 'all'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/40'
              : routeMode === 'selected'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
              : 'bg-slate-800 text-slate-500 border border-slate-700'
          }`}
        >
          <Route className="w-4 h-4" />
        </button>

        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          title="Alternar Mapa de Densidade de Bairros"
          className={`p-2 rounded-xl transition-colors ${showHeatmap ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}`}
        >
          <Flame className="w-4 h-4" />
        </button>
      </div>

      {/* LEGENDA FLUTUANTE DO MAPA LOGÍSTICO COM ROTAS REAIS E AÇÕES */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800 shadow-2xl flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 border border-amber-400 shadow-sm flex items-center justify-center text-[8px]">🍕</span>
          <span className="text-slate-200 font-bold text-[11px]">Hub Filipéia</span>
        </div>

        <div className="flex items-center gap-1.5 cursor-pointer" onClick={toggleRouteMode}>
          <span className={`w-3 h-0.5 ${routeMode === 'all' ? 'bg-cyan-400 shadow-sm shadow-cyan-400' : 'bg-slate-500'}`}></span>
          <span className="text-slate-300 font-bold text-[11px] flex items-center gap-1">
            🛣️ Rotas em Ruas
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-cyan-500/30 uppercase font-mono">
              {routeMode === 'all' ? 'Todas' : routeMode === 'selected' ? 'Foco' : 'Off'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
          <span className="text-slate-300 font-bold text-[11px]">Em Rota</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span className="text-slate-300 font-bold text-[11px]">Crítico &gt; 15min</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300 font-bold text-[11px]">Entregue</span>
        </div>
      </div>

    </div>
  );
};
