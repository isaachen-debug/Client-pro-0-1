import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { startOfWeek, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Loader2,
  MapPin,
  Navigation,
  Crosshair,
  RefreshCcw,
  Plus,
  Phone,
  ExternalLink,
  X,
  Search,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';
import { appointmentsApi } from '../services/appointments';
import { customersApi } from '../services/customers';
import type { Appointment, Customer } from '../types';
import { motion } from 'framer-motion';

type RoutePoint = {
  id: string;
  type: 'user' | 'customer';
  lat: number;
  lng: number;
  label: string;
  customer?: Customer;
};

const GOOGLE_LIBS = 'geometry,places';

const getApiKey = () =>
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const statusColors: Record<string, string> = {
  CONCLUIDO: '#10b981', // green
  AGENDADO: '#2563eb', // blue
  EM_ANDAMENTO: '#8b5cf6', // purple
  CANCELADO: '#f97316', // orange
  default: '#0f172a',
};

const RoutePlanner = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'all'>('week');
  const [searchTerm, setSearchTerm] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeStops, setRouteStops] = useState<RoutePoint[]>([]);
  const [routeSummary, setRouteSummary] = useState<{ distance: string; duration: string } | null>(null);
  const [mapMode, setMapMode] = useState<'google' | 'fallback'>('google');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCustomerAppointments, setSelectedCustomerAppointments] = useState<Appointment[]>([]);
  const [fixingAddressId, setFixingAddressId] = useState<string | null>(null);
  
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMap = useRef<any>(null);
  const directionsRenderer = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const loadScriptAttempted = useRef(false);

  const weekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 0 }), []);

  const appointmentsByCustomer = useMemo(() => {
    return appointments.reduce<Record<string, Appointment[]>>((acc, ap) => {
      const key = ap.customer.id;
      acc[key] = acc[key] ? [...acc[key], ap] : [ap];
      return acc;
    }, {});
  }, [appointments]);

  const visibleCustomers = useMemo(() => {
    let base = [...customers];
    if (timeFilter === 'today') {
      const today = new Date().toDateString();
      base = base.filter((c) =>
        (appointmentsByCustomer[c.id] || []).some(
          (ap) => new Date(ap.date).toDateString() === today,
        ),
      );
    } else if (timeFilter === 'week') {
      const selected = selectedDay.toDateString();
      base = base.filter((c) =>
        (appointmentsByCustomer[c.id] || []).some(
          (ap) => new Date(ap.date).toDateString() === selected,
        ),
      );
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      base = base.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.address || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q),
      );
    }
    return base;
  }, [appointmentsByCustomer, customers, searchTerm, selectedDay, timeFilter]);

  const customerPoints: RoutePoint[] = useMemo(
    () =>
      visibleCustomers
        .filter((c) => c.latitude && c.longitude)
        .map((c) => ({
          id: c.id,
          type: 'customer',
          lat: c.latitude as number,
          lng: c.longitude as number,
          label: c.name,
          customer: c,
        })),
    [visibleCustomers],
  );

  const getNextAppointment = useCallback(
    (customerId: string) => {
      const list = appointmentsByCustomer[customerId] || [];
      const sorted = [...list].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.startTime || '00:00'}`);
        const dateB = new Date(`${b.date}T${b.startTime || '00:00'}`);
        return dateA.getTime() - dateB.getTime();
      });
      return sorted[0];
    },
    [appointmentsByCustomer],
  );

  const loadAppointments = useCallback(async () => {
    try {
      const start = format(weekStart, 'yyyy-MM-dd');
      const data = await appointmentsApi.listByWeek(start);
      setAppointments(data);
    } catch (err) {
      console.error('Erro ao carregar agendamentos', err);
    }
  }, [weekStart]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const loadCustomers = useCallback(async () => {
    try {
      setCustomersLoading(true);
      const data = await customersApi.list();
      setCustomers(data);
    } catch (err) {
      console.error('Erro ao carregar clientes', err);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setRouteStops((prev) => {
          const idx = prev.findIndex((p) => p.id === 'user');
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...loc };
            return next;
          }
          if (prev.length === 0) {
            return [{ id: 'user', type: 'user', lat: loc.lat, lng: loc.lng, label: 'Minha posição' }];
          }
          return prev;
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 0 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey) {
      setMapMode('fallback');
      return;
    }
    if (loadScriptAttempted.current) return;
    loadScriptAttempted.current = true;

    const initMap = () => {
      if (!mapRef.current || !window.google) {
        return;
      }
      try {
        googleMap.current = new window.google.maps.Map(mapRef.current, {
          center: userLocation ?? { lat: -23.55052, lng: -46.633308 },
          zoom: 12,
          disableDefaultUI: true,
          clickableIcons: false,
          styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
        });
        directionsRenderer.current = new window.google.maps.DirectionsRenderer({
          map: googleMap.current,
          suppressMarkers: true,
          polylineOptions: { strokeColor: '#0f172a', strokeWeight: 5 },
        });
      } catch (e) {
        setMapMode('fallback');
      }
    };

    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${GOOGLE_LIBS}`;
      script.async = true;
      script.onload = initMap;
      script.onerror = () => {
        setMapMode('fallback');
      };
      document.body.appendChild(script);
    } else {
      initMap();
    }
  }, [userLocation]);

  const renderMarkers = useCallback(() => {
    if (mapMode !== 'google' || !window.google || !googleMap.current) return;
    markersRef.current.forEach((m) => m.setMap?.(null));
    markersRef.current = [];
    
    // Adicionado parâmetro 'name' e lógica de label ajustada
    const createMarker = (point: RoutePoint, color: string, label?: string, name?: string) => {
      const marker = new window.google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map: googleMap.current,
        // Se tiver label (número da rota), mostra dentro. Se não, mostra o nome embaixo.
        label: label
          ? { text: label, color: 'white', fontSize: '12px', fontWeight: 'bold' }
          : name ? {
              text: name,
              color: '#000000', // Preto absoluto para contraste máximo
              fontSize: '14px', // Maior
              fontWeight: 'bold',
              className: 'map-marker-label'
            } : undefined,
        zIndex: label ? 100 : 1,
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: color,
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
          scale: label ? 1.8 : 1.4,
          anchor: new window.google.maps.Point(12, 22),
          // Ajusta a origem do label: centro se for número, MAIS ABAIXO se for nome (40px)
          labelOrigin: label ? new window.google.maps.Point(12, 9) : new window.google.maps.Point(12, 40),
        },
      });
      marker.addListener('click', () => {
        if (point.type === 'customer' && point.customer) {
          openCustomerCard(point.customer);
        }
      });
      markersRef.current.push(marker);
    };

    if (userLocation) {
      createMarker(
        { id: 'user', type: 'user', lat: userLocation.lat, lng: userLocation.lng, label: 'Eu' },
        '#0ea5e9',
        routeStops.findIndex((r) => r.id === 'user') !== -1 ? `${routeStops.findIndex((r) => r.id === 'user') + 1}` : undefined,
        'Você'
      );
    }

    customerPoints.forEach((c) => {
      const idx = routeStops.findIndex((r) => r.id === c.id);
      const isInRoute = idx >= 0;
      const nextAppt = getNextAppointment(c.id);
      const tone = nextAppt ? statusColors[nextAppt.status] || statusColors.default : statusColors.default;
      // Passa o nome do cliente apenas se NÃO estiver na rota (se estiver, o número tem prioridade visual no pin)
      createMarker(c, isInRoute ? '#0f172a' : tone, isInRoute ? `${idx + 1}` : undefined, isInRoute ? undefined : c.label);
    });

    if (googleMap.current && customerPoints.length > 0) {
       // Opcional: auto-fit bounds
    }
  }, [mapMode, customerPoints, routeStops, userLocation, getNextAppointment]);

  useEffect(() => {
    renderMarkers();
  }, [renderMarkers]);

  const haversineMiles = (a: RoutePoint, b: RoutePoint) => {
    const R = 3958.8;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lng - a.lng) * Math.PI) / 180;
    const la1 = (a.lat * Math.PI) / 180;
    const la2 = (b.lat * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
  };

  const calculateRoute = useCallback(async () => {
    if (routeStops.length < 2) {
      setRouteSummary(null);
      directionsRenderer.current?.setDirections?.({ routes: [] });
      return;
    }

    const origin = routeStops[0];
    const destination = routeStops[routeStops.length - 1];
    const waypoints = routeStops.slice(1, -1).map((stop) => ({
      location: { lat: stop.lat, lng: stop.lng },
      stopover: true,
    }));

    const useFallback = () => {
      let totalMiles = 0;
      for (let i = 0; i < routeStops.length - 1; i += 1) {
        totalMiles += haversineMiles(routeStops[i], routeStops[i + 1]);
      }
      const mph = 25;
      const totalMin = (totalMiles / mph) * 60;
      setRouteSummary({
        distance: `${totalMiles.toFixed(1)} mi`,
        duration: `~${Math.ceil(totalMin)} min`,
      });
    };

    if (mapMode === 'google' && window.google) {
      try {
        const directionsService = new window.google.maps.DirectionsService();
        const result = await directionsService.route({
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          waypoints,
          optimizeWaypoints: false,
          travelMode: window.google.maps.TravelMode.DRIVING,
        });
        directionsRenderer.current?.setDirections?.(result);
        const route = result.routes[0];
        let meters = 0;
        let seconds = 0;
        route.legs.forEach((leg: any) => {
          meters += leg.distance.value;
          seconds += leg.duration.value;
        });
        const km = meters / 1000;
        const minutes = Math.round(seconds / 60);
        setRouteSummary({
          distance: `${km.toFixed(1)} km`,
          duration: `${Math.floor(minutes / 60)}h ${minutes % 60}m`,
        });
      } catch (e) {
        console.warn('Directions falhou, usando fallback');
        useFallback();
      }
    } else {
      useFallback();
    }
  }, [routeStops, mapMode]);

  useEffect(() => {
    calculateRoute();
  }, [calculateRoute]);

  const addStop = (point: RoutePoint) => {
    setRouteStops((prev) => {
      if (prev.some((p) => p.id === point.id)) return prev;
      return [...prev, point];
    });
  };

  const removeStop = (id: string) => { 
    setRouteStops((prev) => prev.filter((p) => p.id !== id));
  };

  const resetRoute = () => {
    setRouteStops((prev) => prev.filter((p) => p.id === 'user'));
  };

  const openCustomerCard = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsSheetExpanded(true); // Abre o sheet quando seleciona
    try {
      const data = await appointmentsApi.listByCustomer(customer.id);
      setSelectedCustomerAppointments(data);
    } catch (e) {
      console.error('Erro ao carregar agendamentos do cliente', e);
      setSelectedCustomerAppointments([]);
    }
  };

  const closeCustomerCard = () => {
    setSelectedCustomer(null);
    setSelectedCustomerAppointments([]);
    setIsSheetExpanded(false); // Recolhe, mas mantem o sheet "base" visível
  };

  const fixAddress = (customer: Customer) => {
    if (!customer.address) return;
    if (!window.google || !window.google.maps) {
      console.warn('Google Maps indisponível para geocodificação');
      return;
    }
    setFixingAddressId(customer.id);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: customer.address }, async (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        const nextLat = location.lat();
        const nextLng = location.lng();
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === customer.id ? { ...c, latitude: nextLat, longitude: nextLng } : c,
          ),
        );
        try {
          await customersApi.update(customer.id, {
            name: customer.name,
            address: customer.address,
            phone: customer.phone,
            email: customer.email,
            serviceType: customer.serviceType,
            status: customer.status,
            latitude: nextLat,
            longitude: nextLng,
          });
        } catch (e) {
          console.error('Erro ao salvar geocoding', e);
        }
      }
      setFixingAddressId(null);
    });
  };

  // --- RENDER ---
  return (
    <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-50">
      {/* 1. MAPA FULL SCREEN (Fundo) */}
      <div className="absolute inset-0 z-0">
        {mapMode === 'google' ? (
          <div ref={mapRef} className="w-full h-full" />
        ) : (
          <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center text-slate-400">
            <MapPin size={48} className="mb-2 opacity-20" />
            <p className="text-sm">Mapa indisponível</p>
          </div>
        )}
      </div>

      {/* 2. TOP BAR FLUTUANTE */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-3 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          {/* Chips de Filtro */}
          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-white/20 p-1">
            {(['today', 'week', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTimeFilter(t);
                  if (t === 'today') setSelectedDay(new Date());
                }}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  timeFilter === t
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t === 'today' ? 'Hoje' : t === 'week' ? 'Semana' : 'Todos'}
              </button>
            ))}
          </div>

          {/* Botão ADD Rota (Roxo) */}
          <button
            onClick={() => setSelectedDay(new Date())}
            className="w-12 h-12 rounded-full bg-[#6366f1] text-white shadow-xl shadow-indigo-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Barra de Busca */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-1 flex items-center pointer-events-auto">
          <div className="w-10 h-10 flex items-center justify-center text-slate-400">
            <Search size={20} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar cliente, rua ou bairro..."
            className="flex-1 bg-transparent h-10 text-sm outline-none text-slate-800 placeholder:text-slate-400"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="w-10 h-10 flex items-center justify-center text-slate-400">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 3. CONTROLES DO MAPA (Direita) */}
      <div className="absolute right-4 bottom-32 z-20 flex flex-col gap-3 pointer-events-auto">
        <button
          onClick={() => {
            if (userLocation && googleMap.current) {
              googleMap.current.panTo(userLocation);
              googleMap.current.setZoom(15);
            }
          }}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform"
        >
          <Crosshair size={22} />
        </button>
        <button
          onClick={() => {
             if (googleMap.current) googleMap.current.setZoom(12);
          }}
          className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform"
        >
          <Navigation size={22} />
        </button>
      </div>

      {/* 4. BOTTOM SHEET (Painel Deslizante) */}
      <motion.div
        initial={{ y: '85%' }}
        animate={{ y: isSheetExpanded || selectedCustomer ? '0%' : '85%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute bottom-0 left-0 right-0 z-30 bg-white rounded-t-[32px] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)] h-[80%] flex flex-col pointer-events-auto"
      >
        {/* Puxador */}
        <div 
          className="w-full h-8 flex items-center justify-center cursor-grab active:cursor-grabbing"
          onClick={() => setIsSheetExpanded(!isSheetExpanded)}
        >
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        {/* Conteúdo do Sheet */}
        <div className="flex-1 overflow-hidden px-5 pb-6 flex flex-col">
          
          {selectedCustomer ? (
            // --- DETALHE DO CLIENTE (Modo Imagem 3) ---
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{selectedCustomer.name}</h2>
                  <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                    <MapPin size={16} className="text-[#6366f1]" />
                    <span className="text-sm line-clamp-1">{selectedCustomer.address || 'Sem endereço'}</span>
                  </div>
                </div>
                <button 
                  onClick={closeCustomerCard}
                  className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status / Próximas Visitas */}
              <div className="mb-6">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">PRÓXIMAS VISITAS</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {(selectedCustomerAppointments.length > 0 ? selectedCustomerAppointments.slice(0, 3) : []).map(ap => (
                    <div key={ap.id} className="min-w-[100px] bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col items-center text-center">
                      <span className="text-xs font-semibold text-slate-900 mb-1">{format(new Date(ap.date), 'dd MMM', { locale: ptBR })}</span>
                      <span className="text-[10px] text-slate-500">{ap.startTime}</span>
                    </div>
                  ))}
                  {selectedCustomerAppointments.length === 0 && (
                    <p className="text-sm text-slate-400 italic">Nenhuma visita agendada.</p>
                  )}
                </div>
              </div>

              {/* Ações Principais */}
              <div className="space-y-3 mt-auto">
                {selectedCustomer.latitude && selectedCustomer.longitude ? (
                   <button
                    onClick={() => {
                        addStop({
                            id: selectedCustomer.id,
                            type: 'customer',
                            lat: selectedCustomer.latitude!,
                            lng: selectedCustomer.longitude!,
                            label: selectedCustomer.name,
                            customer: selectedCustomer
                        });
                        setIsSheetExpanded(false); // Minimiza pra ver a rota
                        setSelectedCustomer(null);
                    }}
                    className="w-full h-14 bg-[#6366f1] hover:bg-[#4f46e5] text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 active:scale-95 transition-all"
                   >
                     <Plus size={20} />
                     Adicionar à Rota Atual
                   </button>
                ) : (
                   <button
                    onClick={() => fixAddress(selectedCustomer)}
                    className="w-full h-14 bg-amber-100 text-amber-700 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
                   >
                     {fixingAddressId === selectedCustomer.id ? <Loader2 className="animate-spin" /> : <AlertTriangle size={20} />}
                     Corrigir Localização
                   </button>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <a 
                      href={`tel:${selectedCustomer.phone}`}
                      className="h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-700 font-semibold hover:bg-slate-50"
                    >
                        <Phone size={18} /> Ligar
                    </a>
                    <a 
                      href={`https://maps.google.com/?q=${encodeURIComponent(selectedCustomer.address || '')}`}
                      target="_blank" 
                      rel="noreferrer"
                      className="h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-700 font-semibold hover:bg-slate-50"
                    >
                        <ExternalLink size={18} /> Navegar
                    </a>
                </div>
              </div>
            </div>
          ) : (
            // --- LISTA GERAL / ROTA ATUAL (Modo Imagem 2) ---
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">Visão da Base</h2>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                  {visibleCustomers.length} clientes no mapa
                </span>
              </div>

              {/* Resumo da Rota Ativa (se houver) */}
              {routeStops.length > 0 && (
                <div className="mb-6 bg-[#f8fafc] border border-slate-200 rounded-2xl p-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">ROTA ATIVA</span>
                        <div className="flex gap-2">
                            <button onClick={() => setIsSheetExpanded(false)} className="text-slate-400 hover:text-indigo-600"><ChevronDown size={14}/></button>
                            <button onClick={resetRoute} className="text-slate-400 hover:text-red-500"><RefreshCcw size={14}/></button>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-900">{routeSummary?.duration || '--'}</span>
                        <span className="text-sm text-slate-500 font-medium">{routeSummary?.distance}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                        <span className="bg-white border px-2 py-1 rounded-lg">{routeStops.length} Paradas</span>
                        <span>•</span>
                        <span>Otimizado por distância</span>
                    </div>
                    
                    {/* Lista de Stops (Reordenável) */}
                    <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto">
                        {routeStops.map((stop, idx) => (
                            <div key={stop.id} className="flex items-center justify-between text-sm bg-white p-2 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center">{idx + 1}</span>
                                    <span className="truncate max-w-[150px]">{stop.label}</span>
                                </div>
                                <button onClick={() => removeStop(stop.id)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {/* Lista de Clientes */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {customersLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-500" /></div>
                ) : (
                    visibleCustomers.map(customer => {
                        const initials = getInitials(customer.name);
                        const isInRoute = routeStops.some(r => r.id === customer.id);
                        return (
                            <button
                                key={customer.id}
                                onClick={() => openCustomerCard(customer)}
                                className="w-full bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center gap-4 transition-colors text-left group"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isInRoute ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                    {isInRoute ? routeStops.findIndex(r => r.id === customer.id) + 1 : initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 truncate">{customer.name}</h3>
                                    <p className="text-xs text-slate-500 truncate">{customer.address || 'Sem endereço'}</p>
                                </div>
                                <div className="text-xs font-medium text-slate-400 group-hover:text-indigo-600">
                                    {customer.frequency || 'Mensal'}
                                </div>
                            </button>
                        )
                    })
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default RoutePlanner;