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
  ChevronDown,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { usePreferences } from '../contexts/PreferencesContext';
import { appointmentsApi } from '../services/appointments';
import { customersApi } from '../services/customers';
import type { Appointment, Customer } from '../types';
import { motion } from 'framer-motion';
import { NavigationChoiceModal } from '../components/ui/NavigationChoiceModal';

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
  const { theme } = usePreferences();
  const isDark = theme === 'dark';
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'all'>('week');
  const [searchTerm, setSearchTerm] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeStops, setRouteStops] = useState<RoutePoint[]>([]);
  const [routeSummary, setRouteSummary] = useState<{ distance: string; duration: string; cost?: string } | null>(null);
  const [showLabels, setShowLabels] = useState(false);
  const [navigationModal, setNavigationModal] = useState<{ isOpen: boolean; address: string | null }>({
    isOpen: false,
    address: null,
  });
  const [mapMode, setMapMode] = useState<'google' | 'fallback'>('google');

  // Configurações simples de custo (poderiam vir do backend)
  const FUEL_PRICE = 3.50; // $ por galão
  const MPG = 20; // Milhas por galão
  const COST_PER_MILE = FUEL_PRICE / MPG;

  const handleNavigate = (address: string | null) => {
    if (address) {
      setNavigationModal({ isOpen: true, address });
    }
  };
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCustomerAppointments, setSelectedCustomerAppointments] = useState<Appointment[]>([]);
  const [fixingAddressId, setFixingAddressId] = useState<string | null>(null);
  
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [showRouteBuilder, setShowRouteBuilder] = useState(false);
  const [builderSelectedIds, setBuilderSelectedIds] = useState<Set<string>>(new Set());

  const toggleBuilderSelection = (id: string) => {
    const next = new Set(builderSelectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setBuilderSelectedIds(next);
  };

  const handleAddSelectionToRoute = () => {
    const selectedCustomers = customers.filter(c => builderSelectedIds.has(c.id));
    const newStops = selectedCustomers.map(c => ({
      id: c.id,
      type: 'customer' as const,
      lat: c.latitude!,
      lng: c.longitude!,
      label: c.name,
      customer: c,
    })).filter(s => s.lat && s.lng);
    
    setRouteStops(prev => {
        // Filter out duplicates
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNew = newStops.filter(s => !existingIds.has(s.id));
        return [...prev, ...uniqueNew];
    });
    setShowRouteBuilder(false);
    setBuilderSelectedIds(new Set());
    setIsSheetExpanded(false); // Minimizamos para ver o mapa
  };

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
    
    // Filtro de tempo
    if (timeFilter === 'today') {
      // Comparar strings YYYY-MM-DD para evitar problemas de timezone
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      base = base.filter((c) =>
        (appointmentsByCustomer[c.id] || []).some(
          (ap) => ap.date === todayStr,
        ),
      );
    } else if (timeFilter === 'week') {
      // Como 'appointments' já contém apenas os dados da semana atual (via loadAppointments),
      // basta verificar se o cliente tem algum agendamento nessa lista.
      base = base.filter((c) => (appointmentsByCustomer[c.id] || []).length > 0);
    }
    // Se for 'all', mostra todos (sem filtro de agendamento)

    // Filtro de busca
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
  }, [appointmentsByCustomer, customers, searchTerm, timeFilter]);

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
        // Dark mode styles for Google Maps
        const darkMapStyles = [
          { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
          {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }],
          },
          {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }],
          },
          {
            featureType: 'poi.park',
            elementType: 'geometry',
            stylers: [{ color: '#263c3f' }],
          },
          {
            featureType: 'poi.park',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#6b9a76' }],
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#38414e' }],
          },
          {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#212a37' }],
          },
          {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#9ca5b3' }],
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry',
            stylers: [{ color: '#746855' }],
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#1f2835' }],
          },
          {
            featureType: 'road.highway',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#f3d19c' }],
          },
          {
            featureType: 'transit',
            elementType: 'geometry',
            stylers: [{ color: '#2f3948' }],
          },
          {
            featureType: 'transit.station',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#d59563' }],
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#17263c' }],
          },
          {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#515c6d' }],
          },
          {
            featureType: 'water',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#17263c' }],
          },
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] } // Keep POI labels off as requested
        ];

        googleMap.current = new window.google.maps.Map(mapRef.current, {
          center: userLocation ?? { lat: 42.5251, lng: -71.7598 }, // Leominster, MA default
          zoom: 12,
          disableDefaultUI: true,
          clickableIcons: false,
          styles: isDark ? darkMapStyles : [], // Retornando ao estilo padrão claro
        });
        directionsRenderer.current = new window.google.maps.DirectionsRenderer({
          map: googleMap.current,
          suppressMarkers: true,
          polylineOptions: { strokeColor: isDark ? '#6366f1' : '#0f172a', strokeWeight: 5 },
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
  }, [userLocation, isDark]); // Re-init map if theme changes

  const renderMarkers = useCallback(() => {
    if (mapMode !== 'google' || !window.google || !googleMap.current) return;
    markersRef.current.forEach((m) => m.setMap?.(null));
    markersRef.current = [];
    
    // Adicionado parâmetro 'name' e lógica de label ajustada
    const createMarker = (point: RoutePoint, color: string, label?: string, name?: string) => {
      // Se já existir marker para este ID, remove o anterior para evitar duplicatas (ex: quando user move)
      const existingIdx = markersRef.current.findIndex(m => m.get('id') === point.id);
      if (existingIdx !== -1) {
          markersRef.current[existingIdx].setMap(null);
          markersRef.current.splice(existingIdx, 1);
      }

      const marker = new window.google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map: googleMap.current,
        title: name || label, // Native tooltip
        label: label
          ? { text: label, color: 'white', fontSize: '10px', fontWeight: 'bold' }
          : (showLabels && name) ? {
              text: name,
              color: isDark ? '#e2e8f0' : '#1e293b',
              fontSize: '11px',
              fontWeight: 'bold',
              className: 'map-marker-label'
            } : undefined,
        zIndex: label ? 100 : 1,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: isDark ? '#1e293b' : 'white',
          strokeWeight: 2,
          scale: label ? 10 : 7, // Larger if it's a stop number
          labelOrigin: label ? new window.google.maps.Point(0, 0) : new window.google.maps.Point(0, 2.5), // Adjust label position
        },
      });
      // Salva ID no marker para controle
      marker.set('id', point.id);

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
      createMarker(c, isInRoute ? (isDark ? '#f8fafc' : '#0f172a') : tone, isInRoute ? `${idx + 1}` : undefined, isInRoute ? undefined : c.label);
    });

    if (googleMap.current && customerPoints.length > 0) {
       // Opcional: auto-fit bounds
    }
  }, [mapMode, customerPoints, routeStops, userLocation, getNextAppointment, isDark, showLabels]);

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
      const estimatedCost = totalMiles * COST_PER_MILE;
      setRouteSummary({
        distance: `${totalMiles.toFixed(1)} mi`,
        duration: `~${Math.ceil(totalMin)} min`,
        cost: `$${estimatedCost.toFixed(2)}`,
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
        const miles = km * 0.621371;
        const estimatedCost = miles * COST_PER_MILE;
        const minutes = Math.round(seconds / 60);
        setRouteSummary({
          distance: `${miles.toFixed(1)} mi`,
          duration: `${Math.floor(minutes / 60)}h ${minutes % 60}m`,
          cost: `$${estimatedCost.toFixed(2)}`,
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
    <div className={`relative h-[calc(100vh-64px)] w-full overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* 1. MAPA FULL SCREEN (Fundo) */}
      <div className="absolute inset-0 z-0">
        {mapMode === 'google' ? (
          <div ref={mapRef} className="w-full h-full" />
        ) : (
          <div className={`w-full h-full flex flex-col items-center justify-center ${isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
            <MapPin size={48} className="mb-2 opacity-20" />
            <p className="text-sm">Mapa indisponível</p>
          </div>
        )}
      </div>

      {/* 2. TOP BAR FLUTUANTE - CENTRALIZADO */}
      <div className="absolute top-6 left-0 right-0 z-20 flex flex-col items-center gap-3 pointer-events-none px-4">
        
        {/* Row 1: Filtros (Pill Central) + Botão Add (Direita) */}
        <div className="w-full max-w-sm flex items-center justify-between pointer-events-auto relative">
           {/* Spacer to balance center */}
           <div className="w-10" />

           {/* Pill Central */}
           <div className={`flex items-center gap-1 rounded-full shadow-lg border p-1 backdrop-blur-xl ${isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white/90 border-white/40'}`}>
            {(['all', 'today', 'week'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTimeFilter(t);
                  if (t === 'today') setSelectedDay(new Date());
                }}
                className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all ${
                  timeFilter === t
                    ? isDark ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t === 'all' ? 'Rede' : t === 'today' ? 'Hoje' : 'Semana'}
              </button>
            ))}
          </div>

          {/* Botão Add */}
          <button
            onClick={() => setShowRouteBuilder(true)}
            className="w-10 h-10 rounded-full bg-[#6366f1] text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Row 2: Barra de Busca (Floating) */}
        <div className={`w-full max-w-sm backdrop-blur-xl rounded-full shadow-xl border px-1 py-1 flex items-center pointer-events-auto transition-all ${isDark ? 'bg-slate-900/80 border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500/50' : 'bg-white/90 border-white/40 focus-within:ring-2 focus-within:ring-indigo-100'}`}>
          <div className={`w-10 h-10 flex items-center justify-center ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
            <Search size={18} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar nó na rede..."
            className={`flex-1 bg-transparent h-10 text-sm font-medium outline-none placeholder:text-slate-400 ${isDark ? 'text-slate-100' : 'text-slate-700'}`}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 ${isDark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-400'}`}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 3. CONTROLES DO MAPA (Direita) */}
      <div className="absolute right-4 bottom-32 z-20 flex flex-col gap-3 pointer-events-auto">
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
          title={showLabels ? "Ocultar nomes" : "Mostrar nomes"}
        >
          {showLabels ? <EyeOff size={22} /> : <Eye size={22} />}
        </button>
        <button
          onClick={() => {
            if (userLocation && googleMap.current) {
              googleMap.current.panTo(userLocation);
              googleMap.current.setZoom(15);
            }
          }}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
        >
          <Crosshair size={22} />
        </button>
        <button
          onClick={() => {
             if (googleMap.current) googleMap.current.setZoom(12);
          }}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
        >
          <Navigation size={22} />
        </button>
      </div>

      {/* 4. BOTTOM SHEET (Painel Deslizante) */}
      <motion.div
        initial={{ y: '85%' }}
        animate={{ y: isSheetExpanded || selectedCustomer ? '0%' : '85%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`absolute bottom-0 left-0 right-0 z-30 rounded-t-[32px] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.2)] h-[80%] flex flex-col pointer-events-auto ${isDark ? 'bg-slate-900 border-t border-slate-800' : 'bg-white'}`}
      >
        {/* Puxador */}
        <div 
          className="w-full h-8 flex items-center justify-center cursor-grab active:cursor-grabbing"
          onClick={() => setIsSheetExpanded(!isSheetExpanded)}
        >
          <div className={`w-12 h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
        </div>

        {/* Conteúdo do Sheet */}
        <div className="flex-1 overflow-hidden px-5 pb-6 flex flex-col">
          
          {selectedCustomer ? (
            // --- DETALHE DO CLIENTE (Modo Imagem 3) ---
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedCustomer.name}</h2>
                  <div className={`flex items-center gap-1.5 mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <MapPin size={16} className="text-[#6366f1]" />
                    <span className="text-sm line-clamp-1">{selectedCustomer.address || 'Sem endereço'}</span>
                  </div>
                </div>
                <button 
                  onClick={closeCustomerCard}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status / Próximas Visitas */}
              <div className="mb-6">
                <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>PRÓXIMAS VISITAS</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {(selectedCustomerAppointments.length > 0 ? selectedCustomerAppointments.slice(0, 3) : []).map(ap => (
                    <div key={ap.id} className={`min-w-[100px] border rounded-xl p-3 flex flex-col items-center text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <span className={`text-xs font-semibold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{format(new Date(ap.date), 'dd MMM', { locale: ptBR })}</span>
                      <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ap.startTime}</span>
                    </div>
                  ))}
                  {selectedCustomerAppointments.length === 0 && (
                    <p className={`text-sm italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Nenhuma visita agendada.</p>
                  )}
                </div>
              </div>

              {/* Lógica para Rota do Dia (Sugestão Inteligente) */}
              {(() => {
                 const nextAppt = getNextAppointment(selectedCustomer.id);
                 if (!nextAppt) return null;

                 // Buscar todos os agendamentos desse mesmo dia
                 const dayApps = appointments
                    .filter(a => a.date === nextAppt.date)
                    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
                 
                 // Se tiver mais de 1 cliente no dia (ou seja, vale a pena criar rota)
                 if (dayApps.length > 0) {
                    return (
                        <div className={`mb-6 p-4 rounded-2xl border ${isDark ? 'bg-indigo-900/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-100'}`}>
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={16} className="text-indigo-500" />
                                <h3 className={`text-sm font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                                    Agenda de {format(new Date(nextAppt.date), "EEEE, d 'de' MMM", { locale: ptBR })}
                                </h3>
                            </div>
                            
                            <div className="space-y-2 mb-4">
                                {dayApps.map((ap, idx) => {
                                    const cust = customers.find(c => c.id === ap.customerId);
                                    if (!cust) return null;
                                    const isCurrent = cust.id === selectedCustomer.id;
                                    return (
                                        <div key={ap.id} className={`flex items-center gap-3 text-sm ${isCurrent ? (isDark ? 'text-white font-bold' : 'text-slate-900 font-bold') : (isDark ? 'text-slate-400' : 'text-slate-600')}`}>
                                            <span className="font-mono text-xs opacity-70">{ap.startTime}</span>
                                            <div className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-indigo-500' : 'bg-slate-400'}`} />
                                            <span className="truncate">{cust.name}</span>
                                        </div>
                                    )
                                })}
                            </div>

                            <button
                                onClick={() => {
                                    // 1. Mantém a rota atual (sem duplicar 'user' ou paradas já existentes)
                                    // Se a rota atual estiver vazia ou só tiver 'user', podemos reiniciá-la para garantir a ordem
                                    // Mas se o usuário já tinha uma rota, vamos tentar anexar.
                                    
                                    // Lógica simplificada e robusta: 
                                    // 1. Pega a rota atual
                                    let newRoute = [...routeStops];

                                    // 2. Garante que 'Minha Localização' seja o ponto de partida (se disponível e ainda não estiver na rota)
                                    // Isso responde à sua dúvida: sim, ele pega sua localização em tempo real e coloca como início!
                                    if (userLocation && !newRoute.some(p => p.id === 'user')) {
                                        newRoute.unshift({
                                            id: 'user',
                                            type: 'user',
                                            lat: userLocation.lat,
                                            lng: userLocation.lng,
                                            label: 'Minha Localização'
                                        });
                                    }

                                    // 3. Adiciona os clientes do dia (que ainda não estão na rota)
                                    dayApps.forEach(ap => {
                                        const c = customers.find(cust => cust.id === ap.customerId);
                                        if (c && c.latitude && c.longitude) {
                                            // Verifica se JÁ está na rota pelo ID
                                            if (!newRoute.some(r => r.id === c.id)) {
                                                newRoute.push({
                                                    id: c.id,
                                                    type: 'customer',
                                                    lat: c.latitude,
                                                    lng: c.longitude,
                                                    label: c.name,
                                                    customer: c
                                                });
                                            }
                                        }
                                    });

                                    setRouteStops(newRoute);
                                    setIsSheetExpanded(false); // Fecha o sheet pra ver o mapa
                                    setSelectedCustomer(null);
                                }}
                                className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <Navigation size={16} />
                                Adicionar Dia à Rota ({dayApps.length} locais)
                            </button>
                        </div>
                    );
                 }
                 return null;
              })()}

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
                      className={`h-12 border rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                        <Phone size={18} /> Ligar
                    </a>
                    <button 
                      onClick={() => handleNavigate(selectedCustomer.address || '')}
                      className={`h-12 border rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                    >
                        <ExternalLink size={18} /> Navegar
                    </button>
                </div>
              </div>
            </div>
          ) : (
            // --- LISTA GERAL / ROTA ATUAL (Modo Imagem 2) ---
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Visão da Base</h2>
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  {visibleCustomers.length} clientes no mapa
                </span>
              </div>

              {/* Resumo da Rota Ativa (Estilo App de Navegação) */}
              {routeStops.length > 0 && (
                <div className={`mb-6 border rounded-3xl p-5 shadow-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                           <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Prévia da Rota</h3>
                           <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{routeStops.length} Paradas • Otimizado</p>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={resetRoute} className={`p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors`} title="Limpar rota"><RefreshCcw size={16}/></button>
                           <button onClick={() => setIsSheetExpanded(false)} className={`p-2 rounded-full hover:bg-slate-100 ${isDark ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400'}`}><ChevronDown size={18}/></button>
                        </div>
                    </div>

                    {/* Timeline Visual da Rota */}
                    <div className="relative pl-4 space-y-6 mb-6">
                        {/* Linha Vertical Conectora */}
                        <div className={`absolute left-[23px] top-4 bottom-4 w-0.5 border-l-2 border-dashed ${isDark ? 'border-slate-600' : 'border-slate-300'}`} />

                        {routeStops.map((stop, idx) => (
                            <div key={stop.id} className="relative flex items-center gap-4 z-10 group">
                                {/* Indicador (Bolinha/Pin) */}
                                <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center text-[9px] font-bold z-20 ${
                                    idx === 0 
                                      ? 'bg-emerald-500 border-emerald-500 text-white' // Origem (Verde)
                                      : idx === routeStops.length - 1 
                                        ? 'bg-red-500 border-red-500 text-white' // Destino (Vermelho)
                                        : isDark ? 'bg-slate-800 border-slate-500 text-slate-300' : 'bg-white border-slate-400 text-slate-600'
                                }`}>
                                    {idx === 0 ? <div className="w-1.5 h-1.5 bg-white rounded-full"/> : idx + 1}
                                </div>
                                
                                {/* Card do Ponto */}
                                <div className={`flex-1 p-3 rounded-xl border flex justify-between items-center shadow-sm transition-all ${
                                    isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'
                                }`}>
                                    <div className="min-w-0">
                                        <p className={`text-sm font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                            {stop.id === 'user' ? 'Minha Localização' : stop.label}
                                        </p>
                                        <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                            {stop.id === 'user' ? 'Ponto de Partida' : stop.customer?.address || 'Sem endereço'}
                                        </p>
                                    </div>
                                    <button onClick={() => removeStop(stop.id)} className={`ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500`}><X size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer com Resumo e Ações */}
                    <div className={`pt-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                        <div className="flex justify-between items-end mb-4">
                             <div>
                                <p className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Evitar pedágios</p>
                                <div className={`w-10 h-6 rounded-full relative transition-colors ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                                </div>
                             </div>
                             <div className="text-right">
                                <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{routeSummary?.duration || '--'} <span className="text-sm font-medium text-slate-400">min</span></p>
                                <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{routeSummary?.distance} • {routeSummary?.cost} est. gas</p>
                             </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button className={`h-12 rounded-xl font-bold text-sm transition-colors border ${isDark ? 'border-slate-600 hover:bg-slate-700 text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                                Recalcular
                            </button>
                            <button className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                                Iniciar Navegação
                            </button>
                        </div>
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
                                className={`w-full border rounded-2xl p-3 flex items-center gap-4 transition-colors text-left group ${isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white hover:bg-slate-50 border-slate-100'}`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isInRoute ? 'bg-indigo-600 text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                    {isInRoute ? routeStops.findIndex(r => r.id === customer.id) + 1 : initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{customer.name}</h3>
                                    <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{customer.address || 'Sem endereço'}</p>
                                </div>
                                <div className={`text-xs font-medium group-hover:text-indigo-600 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
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
      {/* 5. ROUTE BUILDER MODAL */}
      {showRouteBuilder && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="fixed inset-0" onClick={() => setShowRouteBuilder(false)} />
          <div className={`relative w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] animate-sheet-up sm:animate-scale-in overflow-hidden ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
            <div className={`p-6 border-b flex items-center justify-between sticky top-0 z-10 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
              <div>
                <h3 className="text-xl font-bold">Planejar Rota</h3>
                <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Selecione os clientes para visitar.</p>
              </div>
              <button 
                onClick={() => setShowRouteBuilder(false)}
                className={`p-2 rounded-full transition ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
               <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-colors ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <Search size={18} className={isDark ? 'text-slate-500' : 'text-slate-400'} />
                  <input
                    type="text"
                    placeholder="Filtrar lista..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent flex-1 outline-none text-sm font-medium placeholder:text-slate-500"
                  />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {visibleCustomers.length === 0 ? (
                    <div className="py-10 text-center text-slate-500">
                        <p>Nenhum cliente encontrado.</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {visibleCustomers.map(customer => {
                            const isSelected = builderSelectedIds.has(customer.id);
                            return (
                                <button
                                    key={customer.id}
                                    onClick={() => toggleBuilderSelection(customer.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                        isSelected 
                                            ? isDark ? 'bg-indigo-900/30 border-indigo-500/50' : 'bg-indigo-50 border-indigo-200'
                                            : isDark ? 'bg-slate-800/50 border-transparent hover:bg-slate-800' : 'bg-white border-transparent hover:bg-slate-50'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                        isSelected
                                            ? 'bg-indigo-600 border-indigo-600'
                                            : isDark ? 'border-slate-600' : 'border-slate-300'
                                    }`}>
                                        {isSelected && <Plus size={14} className="text-white rotate-45" />}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <p className={`text-sm font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{customer.name}</p>
                                        <p className={`text-xs truncate ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{customer.address || 'Sem endereço'}</p>
                                    </div>
                                    {customer.frequency && (
                                        <span className={`text-[10px] px-2 py-1 rounded-full border ${isDark ? 'border-slate-700 bg-slate-800 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-500'}`}>
                                            {customer.frequency}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className={`p-4 border-t ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
                <button
                    onClick={handleAddSelectionToRoute}
                    disabled={builderSelectedIds.size === 0}
                    className="w-full py-3.5 rounded-2xl bg-[#6366f1] text-white font-bold shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:shadow-none hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <MapPin size={18} />
                    Adicionar {builderSelectedIds.size} à Rota
                </button>
            </div>
          </div>
        </div>
      )}
      <NavigationChoiceModal
        isOpen={navigationModal.isOpen}
        onClose={() => setNavigationModal({ isOpen: false, address: null })}
        address={navigationModal.address}
      />
    </div>
  );
};

export default RoutePlanner;
