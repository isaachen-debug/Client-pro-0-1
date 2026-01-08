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
import { usePreferences } from '../contexts/PreferencesContext';

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
  const [routeSummary, setRouteSummary] = useState<{ distance: string; duration: string } | null>(null);
  const [mapMode, setMapMode] = useState<'google' | 'fallback'>('google');
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
          styles: isDark ? darkMapStyles : [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
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
      const marker = new window.google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map: googleMap.current,
        // Se tiver label (número da rota), mostra dentro. Se não, mostra o nome embaixo.
        label: label
          ? { text: label, color: 'white', fontSize: '12px', fontWeight: 'bold' }
          : name ? {
              text: name,
              color: isDark ? '#ffffff' : '#000000', // Adapt label color
              fontSize: '14px', // Maior
              fontWeight: 'bold',
              className: 'map-marker-label'
            } : undefined,
        zIndex: label ? 100 : 1,
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: color,
          fillOpacity: 1,
          strokeColor: isDark ? '#1e293b' : 'white',
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
      createMarker(c, isInRoute ? (isDark ? '#f8fafc' : '#0f172a') : tone, isInRoute ? `${idx + 1}` : undefined, isInRoute ? undefined : c.label);
    });

    if (googleMap.current && customerPoints.length > 0) {
       // Opcional: auto-fit bounds
    }
  }, [mapMode, customerPoints, routeStops, userLocation, getNextAppointment, isDark]);

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

      {/* 2. TOP BAR FLUTUANTE */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-3 pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          {/* Chips de Filtro */}
          <div className={`flex items-center gap-1 rounded-full shadow-lg border p-1 backdrop-blur-md ${isDark ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-white/20'}`}>
            {(['today', 'week', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTimeFilter(t);
                  if (t === 'today') setSelectedDay(new Date());
                }}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  timeFilter === t
                    ? isDark ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-900 text-white shadow-sm'
                    : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t === 'today' ? 'Hoje' : t === 'week' ? 'Semana' : 'Todos'}
              </button>
            ))}
          </div>

          {/* Botão ADD Rota (Roxo) */}
          <button
            onClick={() => setShowRouteBuilder(true)}
            className="w-12 h-12 rounded-full bg-[#6366f1] text-white shadow-xl shadow-indigo-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>

        {/* Barra de Busca */}
        <div className={`backdrop-blur-md rounded-2xl shadow-lg border p-1 flex items-center pointer-events-auto ${isDark ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-white/20'}`}>
          <div className={`w-10 h-10 flex items-center justify-center ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
            <Search size={20} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar cliente, rua ou bairro..."
            className={`flex-1 bg-transparent h-10 text-sm outline-none placeholder:text-slate-400 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className={`w-10 h-10 flex items-center justify-center ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
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
                    <a 
                      href={`https://maps.google.com/?q=${encodeURIComponent(selectedCustomer.address || '')}`}
                      target="_blank" 
                      rel="noreferrer"
                      className={`h-12 border rounded-xl flex items-center justify-center gap-2 font-semibold transition-colors ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
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
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Visão da Base</h2>
                <span className={`text-xs font-medium px-2 py-1 rounded-lg ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  {visibleCustomers.length} clientes no mapa
                </span>
              </div>

              {/* Resumo da Rota Ativa (se houver) */}
              {routeStops.length > 0 && (
                <div className={`mb-6 border rounded-2xl p-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-[#f8fafc] border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">ROTA ATIVA</span>
                        <div className="flex gap-2">
                            <button onClick={() => setIsSheetExpanded(false)} className={`hover:text-indigo-600 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}><ChevronDown size={14}/></button>
                            <button onClick={resetRoute} className={`hover:text-red-500 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}><RefreshCcw size={14}/></button>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{routeSummary?.duration || '--'}</span>
                        <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{routeSummary?.distance}</span>
                    </div>
                    <div className={`flex items-center gap-2 mt-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span className={`border px-2 py-1 rounded-lg ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}>{routeStops.length} Paradas</span>
                        <span>•</span>
                        <span>Otimizado por distância</span>
                    </div>
                    
                    {/* Lista de Stops (Reordenável) */}
                    <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto">
                        {routeStops.map((stop, idx) => (
                            <div key={stop.id} className={`flex items-center justify-between text-sm p-2 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-100'}`}>
                                <div className="flex items-center gap-2">
                                    <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-900 text-white'}`}>{idx + 1}</span>
                                    <span className="truncate max-w-[150px]">{stop.label}</span>
                                </div>
                                <button onClick={() => removeStop(stop.id)} className={`hover:text-red-500 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}><X size={14}/></button>
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
    </div>
  );
};

export default RoutePlanner;
