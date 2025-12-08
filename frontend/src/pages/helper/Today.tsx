import { useEffect, useMemo, useState } from 'react';
import { Loader2, MapPin, PlayCircle, CheckCircle, PhoneCall, Navigation2, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { helperApi } from '../../services/api';
import type { HelperAppointment, HelperDayResponse } from '../../types';

const statusBadgeClasses: Record<string, string> = {
  AGENDADO: 'bg-amber-50 text-amber-600 border border-amber-100',
  PENDENTE: 'bg-amber-50 text-amber-600 border border-amber-100',
  EM_ANDAMENTO: 'bg-blue-50 text-blue-600 border border-blue-100',
  CONCLUIDO: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
};

const normalizePhone = (value?: string | null) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length ? digits : null;
};

const buildSmsLink = (value?: string | null) => {
  const digits = normalizePhone(value);
  return digits ? `sms:${digits}` : null;
};

type DayKey = 'today' | 'tomorrow';

const Today = () => {
  const [dayData, setDayData] = useState<
    Record<DayKey, { loading: boolean; data: HelperDayResponse | null; error: string }>
  >({
    today: { loading: true, data: null, error: '' },
    tomorrow: { loading: true, data: null, error: '' },
  });
  const [selectedDay, setSelectedDay] = useState<DayKey>('today');
  const [selectedAppointments, setSelectedAppointments] = useState<Record<DayKey, string | null>>({
    today: null,
    tomorrow: null,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;

  const { isLoaded: mapsLoaded } = useJsApiLoader({
    id: 'helper-map',
    googleMapsApiKey: googleKey || 'DUMMY_KEY',
  });

  const [geocodedPins, setGeocodedPins] = useState<Record<string, google.maps.LatLngLiteral>>({});
  const [now, setNow] = useState(Date.now());

  const fetchDay = async (day: DayKey) => {
    setDayData((prev) => ({
      ...prev,
      [day]: { ...(prev[day] ?? { data: null }), loading: true, error: '' },
    }));
    try {
      const date = new Date();
      if (day === 'tomorrow') {
        date.setDate(date.getDate() + 1);
      }
      const response = await helperApi.getDay(date.toISOString());
      setDayData((prev) => ({
        ...prev,
        [day]: { loading: false, data: response, error: '' },
      }));
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível carregar sua rota.';
      setDayData((prev) => ({
        ...prev,
        [day]: { loading: false, data: null, error: message },
      }));
    }
  };

  useEffect(() => {
    fetchDay('today');
    fetchDay('tomorrow');
  }, []);

  const handleRefresh = () => {
    fetchDay('today');
    fetchDay('tomorrow');
  };

  const currentState = dayData[selectedDay];
  const currentData = currentState.data;

  useEffect(() => {
    (['today', 'tomorrow'] as DayKey[]).forEach((day) => {
      const dayInfo = dayData[day];
      if (dayInfo.data && !selectedAppointments[day]) {
        setSelectedAppointments((prev) => ({
          ...prev,
          [day]: dayInfo.data?.appointments[0]?.id ?? null,
        }));
      }
    });
  }, [dayData, selectedAppointments]);

  const selectedAppointment = useMemo(() => {
    if (!currentData?.appointments?.length) return null;
    const currentId = selectedAppointments[selectedDay];
    return (
      currentData.appointments.find((appointment) => appointment.id === currentId) ??
      currentData.appointments[0]
    );
  }, [currentData?.appointments, selectedAppointments, selectedDay]);

  const selectedDirectionsLink = useMemo(
    () => (selectedAppointment ? buildDirectionsLink(selectedAppointment) : null),
    [selectedAppointment],
  );

  const selectedWazeLink = useMemo(
    () => (selectedAppointment ? buildWazeLink(selectedAppointment) : null),
    [selectedAppointment],
  );

  const coordinatePins = useMemo(() => {
    const map: Record<string, google.maps.LatLngLiteral> = {};
    currentData?.appointments.forEach((appointment) => {
      if (appointment.customer.latitude && appointment.customer.longitude) {
        map[appointment.id] = {
          lat: appointment.customer.latitude,
          lng: appointment.customer.longitude,
        };
      }
    });
    return map;
  }, [currentData?.appointments]);

  const pins = useMemo(
    () => ({
      ...geocodedPins,
      ...coordinatePins,
    }),
    [geocodedPins, coordinatePins],
  );

  useEffect(() => {
    if (!mapsLoaded || !currentData?.appointments?.length || !googleKey) return;
    const geocoder = new window.google.maps.Geocoder();

    currentData.appointments
      .filter((appointment) => !coordinatePins[appointment.id] && !geocodedPins[appointment.id] && appointment.customer.address)
      .forEach((appointment) => {
        geocoder.geocode({ address: appointment.customer.address! }, (results, status) => {
          if (status === 'OK' && results?.[0]?.geometry?.location) {
            setGeocodedPins((prev) => ({
              ...prev,
              [appointment.id]: {
                lat: results[0].geometry.location.lat(),
                lng: results[0].geometry.location.lng(),
              },
            }));
          }
        });
      });
  }, [mapsLoaded, currentData?.appointments, googleKey, coordinatePins, geocodedPins]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (appointment: HelperAppointment, next: 'EM_ANDAMENTO' | 'CONCLUIDO') => {
    setActionLoading(appointment.id);
    try {
      await helperApi.updateStatus(appointment.id, next);
      fetchDay('today');
      fetchDay('tomorrow');
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Erro ao atualizar status.';
      setDayData((prev) => ({
        ...prev,
        [selectedDay]: { ...(prev[selectedDay] ?? { data: null }), error: message, loading: false },
      }));
    } finally {
      setActionLoading(null);
    }
  };

  const usdFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    [],
  );

  const summaryCards = useMemo(
    () => [
      { label: 'Serviços', value: currentData?.summary.total ?? 0 },
      { label: 'Pendentes', value: currentData?.summary.pending ?? 0 },
      { label: 'Em andamento', value: currentData?.summary.inProgress ?? 0 },
      { label: 'Concluídos', value: currentData?.summary.completed ?? 0 },
      {
        label: 'Pagamento',
        value: usdFormatter.format(currentData?.summary.payoutTotal ?? 0),
      },
    ],
    [currentData?.summary, usdFormatter],
  );

  const mapCenter = useMemo(() => {
    if (selectedAppointment) {
      const selectedPin = pins[selectedAppointment.id];
      if (selectedPin) return selectedPin;
    }
    return (
      Object.values(pins)[0] ?? {
        lat: -23.55,
        lng: -46.63,
      }
    );
  }, [pins, selectedAppointment]);

  const hasPins = Object.keys(pins).length > 0;

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const buildDirectionsLink = (appointment: HelperAppointment) => {
    const destination = appointment.customer.latitude && appointment.customer.longitude
      ? `${appointment.customer.latitude},${appointment.customer.longitude}`
      : appointment.customer.address;
    if (!destination) return null;
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  };

  const buildWazeLink = (appointment: HelperAppointment) => {
    const destination = appointment.customer.latitude && appointment.customer.longitude
      ? `${appointment.customer.latitude},${appointment.customer.longitude}`
      : appointment.customer.address;
    if (!destination) return null;
    if (appointment.customer.latitude && appointment.customer.longitude) {
      return `https://waze.com/ul?ll=${appointment.customer.latitude},${appointment.customer.longitude}&navigate=yes`;
    }
    return `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`;
  };

  const computeLiveDuration = (appointment: HelperAppointment) => {
    if (appointment.status !== 'EM_ANDAMENTO' || !appointment.startedAt) return null;
    const diff = Math.floor((now - new Date(appointment.startedAt).getTime()) / 1000);
    return diff > 0 ? diff : 0;
  };

  const computeFinishedDuration = (appointment: HelperAppointment) => {
    if (appointment.status !== 'CONCLUIDO' || !appointment.startedAt || !appointment.finishedAt) return null;
    const diff = Math.floor((new Date(appointment.finishedAt).getTime() - new Date(appointment.startedAt).getTime()) / 1000);
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <section className="rounded-[32px] border border-emerald-100/70 bg-white shadow-[0_30px_90px_rgba(16,185,129,0.18)] p-6 space-y-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-500 font-semibold">Partner dashboard</p>
            <h1 className="text-3xl font-semibold text-gray-900">
              {selectedDay === 'today' ? 'Sua rota de hoje' : 'Planeje o dia de amanhã'}
            </h1>
            <p className="text-sm text-gray-500">
              {currentData?.date
                ? new Date(currentData.date).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })
                : 'Sincronize para carregar os próximos serviços.'}
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-3">
            <div className="inline-flex bg-gray-100 rounded-full p-1 shadow-inner w-fit">
              {(['today', 'tomorrow'] as DayKey[]).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    selectedDay === day ? 'bg-emerald-600 text-white shadow' : 'text-gray-600'
                  }`}
                >
                  {day === 'today' ? 'Hoje' : 'Amanhã'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition"
            >
              Atualizar rota
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {summaryCards.map((card, index) => (
            <div
              key={`${card.label}-${index}`}
              className="rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 shadow-sm"
            >
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      {currentState.loading ? (
        <div className="rounded-3xl border border-emerald-50 bg-white py-16 flex items-center justify-center shadow-sm">
          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
        </div>
      ) : currentState.error ? (
        <div className="rounded-3xl bg-red-50 border border-red-100 text-red-600 px-6 py-4">{currentState.error}</div>
      ) : (
        <>
          {currentData?.manager && (
            <section className="rounded-[32px] bg-gradient-to-br from-[#032210] via-[#0a3b1b] to-[#0d6a34] text-white p-6 space-y-4 shadow-[0_30px_90px_rgba(3,34,16,0.6)] border border-white/10">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/70 font-semibold">Administradora de plantão</p>
                  <p className="text-2xl font-semibold">{currentData.manager.name ?? 'Responsável'}</p>
                  <p className="text-sm text-white/80">Fale com o time caso precise de ajuda durante a rota.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {buildSmsLink(currentData.manager.contactPhone ?? currentData.manager.whatsappNumber) && (
                    <a
                      href={buildSmsLink(currentData.manager.contactPhone ?? currentData.manager.whatsappNumber)!}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
                    >
                      <MessageCircle size={16} /> SMS
                    </a>
                  )}
                  {normalizePhone(currentData.manager.whatsappNumber) && (
                    <a
                      href={`https://wa.me/${normalizePhone(currentData.manager.whatsappNumber)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
                    >
                      WhatsApp
                    </a>
                  )}
                  {normalizePhone(currentData.manager.contactPhone) && (
                    <a
                      href={`tel:${normalizePhone(currentData.manager.contactPhone)}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
                    >
                      Ligar
                    </a>
                  )}
                </div>
              </div>
            </section>
          )}

          <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
            <section className="rounded-[28px] border border-emerald-100 bg-white shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-600 font-semibold">Mapa do dia</p>
                  <p className="text-sm text-gray-500">Visualize a rota completa</p>
                </div>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                  {currentData?.appointments.length ?? 0} locais
                </span>
              </div>
              {mapsLoaded && googleKey && hasPins ? (
                <div className="h-64 rounded-2xl overflow-hidden border border-emerald-100">
                  <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={mapCenter} zoom={12}>
                    {currentData?.appointments.map((appointment) => {
                      const position = pins[appointment.id];
                      if (!position) return null;
                      return (
                        <Marker
                          key={appointment.id}
                          position={position}
                          label={`${appointment.customer.name?.[0] ?? ''}`}
                          onClick={() =>
                            setSelectedAppointments((prev) => ({
                              ...prev,
                              [selectedDay]: appointment.id,
                            }))
                          }
                        />
                      );
                    })}
                  </GoogleMap>
                </div>
              ) : (
                <div className="h-64 rounded-2xl border border-dashed border-emerald-100 bg-emerald-50/40 flex items-center justify-center text-sm text-emerald-600">
                  Sincronize os endereços para liberar o mapa.
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-gray-100 bg-white shadow-sm p-5 space-y-4">
              {selectedAppointment ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase text-emerald-600">Serviço selecionado</p>
                      <p className="text-lg font-bold text-gray-900">{selectedAppointment.customer.name}</p>
                      <p className="text-sm text-gray-500">
                        {selectedAppointment.customer.address || 'Endereço não informado'}
                      </p>
                    </div>
                    <div className="flex gap-2 text-xs font-semibold flex-wrap">
                      <button
                        type="button"
                        onClick={() => navigate(`/helper/appointments/${selectedAppointment.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-900 text-white"
                      >
                        <Navigation2 size={14} /> Ver detalhes
                      </button>
                      {selectedDirectionsLink && (
                        <button
                          type="button"
                          onClick={() => window.open(selectedDirectionsLink, '_blank')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700"
                        >
                          <MapPin size={14} /> Maps
                        </button>
                      )}
                      {selectedWazeLink && (
                        <button
                          type="button"
                          onClick={() => window.open(selectedWazeLink, '_blank')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700"
                        >
                          <Navigation2 size={14} /> Waze
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Horário</p>
                      <p className="font-semibold text-gray-900">{selectedAppointment.startTime}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Status</p>
                      <p className="font-semibold text-gray-900">
                        {selectedAppointment.status === 'AGENDADO'
                          ? 'Pendente'
                          : selectedAppointment.status.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Pagamento</p>
                      <p className="font-semibold text-emerald-600">
                        {usdFormatter.format(selectedAppointment.helperFee ?? 0)}
                      </p>
                    </div>
                  </div>
                  {(selectedAppointment.customer.latitude || selectedAppointment.customer.address) && (
                    <div className="relative h-48 rounded-2xl overflow-hidden border border-gray-100">
                      {(selectedDirectionsLink || selectedWazeLink) && (
                        <div className="absolute right-3 top-3 z-10 flex gap-2">
                          {selectedDirectionsLink && (
                            <button
                              type="button"
                              onClick={() => window.open(selectedDirectionsLink, '_blank')}
                              className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-white"
                            >
                              <Navigation2 size={14} /> Maps
                            </button>
                          )}
                          {selectedWazeLink && (
                            <button
                              type="button"
                              onClick={() => window.open(selectedWazeLink, '_blank')}
                              className="inline-flex items-center gap-1 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm hover:bg-white"
                            >
                              <Navigation2 size={14} /> Waze
                            </button>
                          )}
                        </div>
                      )}
                      <iframe
                        title="Prévia do endereço"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        src={`https://www.google.com/maps?q=${
                          selectedAppointment.customer.latitude && selectedAppointment.customer.longitude
                            ? `${selectedAppointment.customer.latitude},${selectedAppointment.customer.longitude}`
                            : encodeURIComponent(selectedAppointment.customer.address ?? '')
                        }&z=16&output=embed`}
                        allowFullScreen
                        loading="lazy"
                      />
                      {selectedDirectionsLink && (
                        <button
                          type="button"
                          onClick={() => window.open(selectedDirectionsLink, '_blank')}
                          className="absolute inset-0 z-0"
                          aria-label="Abrir endereço no Maps"
                        >
                          <span className="sr-only">Abrir no Maps</span>
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-500">Selecione um serviço na lista para ver os detalhes.</div>
              )}
            </section>
          </div>

          <section className="rounded-[32px] border border-gray-100 bg-white shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">Serviços do dia</h3>
              <span className="text-xs text-gray-400">
                {currentData?.appointments.length ? `${currentData.appointments.length} paradas` : 'Sem serviços'}
              </span>
            </div>
            {currentData?.appointments.length ? (
              <div className="space-y-3">
                {currentData.appointments.map((appointment, index) => {
                  const liveDuration = computeLiveDuration(appointment);
                  const finishedDuration = computeFinishedDuration(appointment);
                  const directionsLink = buildDirectionsLink(appointment);
                  const wazeLink = buildWazeLink(appointment);
                  return (
                    <div
                      key={appointment.id}
                      className={`rounded-[28px] border bg-white px-4 py-4 shadow-sm transition cursor-pointer ${
                        selectedAppointment?.id === appointment.id ? 'border-emerald-300 shadow-[0_10px_30px_rgba(16,185,129,0.12)]' : 'border-gray-100'
                      }`}
                      onClick={() =>
                        setSelectedAppointments((prev) => ({
                          ...prev,
                          [selectedDay]: appointment.id,
                        }))
                      }
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-baseline gap-2">
                              <p className="text-3xl font-bold text-gray-900">{appointment.startTime}</p>
                              <span className="text-xs text-gray-400 font-semibold">#{index + 1}</span>
                            </div>
                            <span
                              className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                statusBadgeClasses[appointment.status] || 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {appointment.status === 'AGENDADO' ? 'Pendente' : appointment.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-lg font-semibold text-gray-900">{appointment.customer.name}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-2">
                            <MapPin size={14} className="text-emerald-500" />
                            {appointment.customer.address || 'Endereço não informado'}
                          </p>
                          <p className="text-sm text-emerald-700 font-semibold mt-1">
                            Pagamento helper: {usdFormatter.format(appointment.helperFee ?? 0)}
                          </p>
                          {liveDuration !== null && (
                            <p className="text-xs text-blue-600 font-semibold mt-1">
                              Em andamento há {formatDuration(liveDuration)}
                            </p>
                          )}
                          {finishedDuration !== null && (
                            <p className="text-xs text-emerald-600 font-semibold mt-1">
                              Tempo total {formatDuration(finishedDuration)}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                            <button
                              type="button"
                              onClick={() => navigate(`/helper/appointments/${appointment.id}`)}
                              className="text-emerald-600 font-semibold hover:underline"
                            >
                              Ver detalhes
                            </button>
                            {directionsLink && (
                              <button
                                type="button"
                                onClick={() => window.open(directionsLink, '_blank')}
                                className="inline-flex items-center gap-1 text-emerald-600 font-semibold hover:underline"
                              >
                                <Navigation2 size={14} /> Traçar rota
                              </button>
                            )}
                            {wazeLink && (
                              <button
                                type="button"
                                onClick={() => window.open(wazeLink, '_blank')}
                                className="inline-flex items-center gap-1 text-emerald-600 font-semibold hover:underline"
                              >
                                <Navigation2 size={14} /> Waze
                              </button>
                            )}
                            {normalizePhone(appointment.customer.phone) && (
                              <a
                                href={`https://wa.me/${normalizePhone(appointment.customer.phone)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-600 font-semibold hover:underline"
                              >
                                <PhoneCall size={14} /> WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 w-full sm:w-48">
                          {appointment.status !== 'EM_ANDAMENTO' && appointment.status !== 'CONCLUIDO' && (
                            <button
                              type="button"
                              disabled={actionLoading === appointment.id}
                              onClick={() => handleStatusChange(appointment, 'EM_ANDAMENTO')}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 text-white font-semibold py-3 hover:bg-blue-700 transition disabled:opacity-60"
                            >
                              {actionLoading === appointment.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <PlayCircle size={18} />
                              )}
                              Iniciar
                            </button>
                          )}
                          {appointment.status !== 'CONCLUIDO' && (
                            <button
                              type="button"
                              disabled={actionLoading === appointment.id}
                              onClick={() => handleStatusChange(appointment, 'CONCLUIDO')}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-white font-semibold py-3 hover:bg-emerald-700 transition disabled:opacity-60"
                            >
                              {actionLoading === appointment.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle size={18} />
                              )}
                              Concluir
                            </button>
                          )}
                          {appointment.status === 'CONCLUIDO' && (
                            <div className="text-center text-sm font-semibold text-emerald-600">Serviço finalizado</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhum atendimento para este dia.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default Today;

