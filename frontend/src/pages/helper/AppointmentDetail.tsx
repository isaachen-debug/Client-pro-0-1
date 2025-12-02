import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckSquare,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  PlayCircle,
  CheckCircle,
  Camera,
} from 'lucide-react';
import { helperApi } from '../../services/api';
import type { HelperAppointment } from '../../types';

type PhotoType = 'BEFORE' | 'AFTER';

const normalizePhone = (value?: string | null) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length ? digits : null;
};

const AppointmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<HelperAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taskLoading, setTaskLoading] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState<PhotoType | null>(null);
  const [now, setNow] = useState(Date.now());
  const usdFormatter = useMemo(
    () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    [],
  );

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await helperApi.getAppointment(id);
      setAppointment(data);
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Não foi possível carregar o serviço.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const buildSmsLink = (value?: string | null) => {
    const digits = normalizePhone(value);
    return digits ? `sms:${digits}` : null;
  };

  const openMaps = () => {
    if (!appointment) return;
    const destination =
      appointment.customer.latitude && appointment.customer.longitude
        ? `${appointment.customer.latitude},${appointment.customer.longitude}`
        : appointment.customer.address;
    if (!destination) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(url, '_blank');
  };

  const handleToggleTask = async (taskId: string) => {
    if (!appointment) return;
    setTaskLoading(taskId);
    try {
      await helperApi.toggleTask(appointment.id, taskId);
      await load();
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Erro ao atualizar checklist.';
      setError(message);
    } finally {
      setTaskLoading(null);
    }
  };

  const handleStatus = async (status: 'EM_ANDAMENTO' | 'CONCLUIDO') => {
    if (!appointment) return;
    setStatusLoading(true);
    try {
      await helperApi.updateStatus(appointment.id, status);
      await load();
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Erro ao atualizar status.';
      setError(message);
    } finally {
      setStatusLoading(false);
    }
  };

  const handlePhotoUpload = async (type: PhotoType) => {
    if (!appointment) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      if (!input.files?.length) return;
      const file = input.files[0];
      setPhotoUploading(type);
      try {
        await helperApi.uploadPhoto(appointment.id, file, type);
        await load();
      } catch (err: any) {
        const message = err?.response?.data?.error || 'Erro ao enviar foto.';
        setError(message);
      } finally {
        setPhotoUploading(null);
      }
    };
    input.click();
  };

  const groupedPhotos = useMemo(() => {
    return {
      BEFORE: appointment?.photos.filter((photo) => photo.type === 'BEFORE') ?? [],
      AFTER: appointment?.photos.filter((photo) => photo.type === 'AFTER') ?? [],
    };
  }, [appointment?.photos]);

  const liveDuration =
    appointment?.status === 'EM_ANDAMENTO' && appointment?.startedAt
      ? Math.max(0, Math.floor((now - new Date(appointment.startedAt).getTime()) / 1000))
      : null;

  const finishedDuration =
    appointment?.status === 'CONCLUIDO' && appointment?.startedAt && appointment?.finishedAt
      ? Math.max(
          0,
          Math.floor((new Date(appointment.finishedAt).getTime() - new Date(appointment.startedAt).getTime()) / 1000),
        )
      : null;

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-emerald-600 font-semibold mb-4">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl">{error || 'Serviço não encontrado.'}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-emerald-600 font-semibold">
        <ArrowLeft size={16} /> Voltar para o mapa
      </button>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl">{error}</div>}

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-600 font-semibold">Serviço</p>
            <h1 className="text-3xl font-bold text-gray-900">{appointment.customer.name}</h1>
            <p className="text-sm text-gray-500">{appointment.startTime}</p>
            <p className="text-sm text-emerald-700 font-semibold mt-1">
              Pagamento helper: {usdFormatter.format(appointment.helperFee ?? 0)}
            </p>
            {liveDuration !== null && (
              <p className="text-xs text-blue-600 font-semibold mt-1">Em andamento há {formatDuration(liveDuration)}</p>
            )}
            {finishedDuration !== null && (
              <p className="text-xs text-emerald-600 font-semibold mt-1">Tempo total {formatDuration(finishedDuration)}</p>
            )}
          </div>
          <div className="flex gap-2">
            {appointment.status !== 'EM_ANDAMENTO' && (
              <button
                type="button"
                onClick={() => handleStatus('EM_ANDAMENTO')}
                disabled={statusLoading}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 text-white font-semibold px-4 py-2 disabled:opacity-60"
              >
                {statusLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle size={18} />} Começar
              </button>
            )}
            {appointment.status !== 'CONCLUIDO' && (
              <button
                type="button"
                onClick={() => handleStatus('CONCLUIDO')}
                disabled={statusLoading}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 text-white font-semibold px-4 py-2 disabled:opacity-60"
              >
                {statusLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle size={18} />} Concluir
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Endereço</p>
            <p className="text-sm text-gray-700 flex items-start gap-2">
              <MapPin size={16} className="text-emerald-500 mt-0.5" />
              {appointment.customer.address || 'Sem endereço cadastrado'}
            </p>
            <button
              type="button"
              onClick={openMaps}
              className="mt-2 inline-flex items-center gap-2 text-emerald-600 font-semibold text-sm"
            >
              Abrir no Google Maps
            </button>
          </div>
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contato rápido</p>
            <div className="flex flex-wrap gap-2">
              {buildSmsLink(appointment.customer.phone) && (
                <a
                  href={buildSmsLink(appointment.customer.phone)!}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 text-sm font-semibold text-emerald-700"
                >
                  <MessageCircle size={16} /> SMS
                </a>
              )}
              {normalizePhone(appointment.customer.phone) && (
                <a
                  href={`tel:${normalizePhone(appointment.customer.phone)}`}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 text-sm font-semibold text-emerald-700"
                >
                  <Phone size={16} /> Ligar
                </a>
              )}
              {normalizePhone(appointment.customer.phone) && (
                <a
                  href={`https://wa.me/${normalizePhone(appointment.customer.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 text-sm font-semibold text-emerald-700"
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {appointment.manager && (
        <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-emerald-600 font-semibold tracking-wide">Administradora de apoio</p>
            <p className="text-lg font-semibold text-gray-900">{appointment.manager.name ?? 'Responsável'}</p>
            <p className="text-sm text-gray-500">Fale com ela caso precise de autorização ou orientação.</p>
          </div>
          <div className="flex gap-2">
            {buildSmsLink(appointment.manager.whatsappNumber ?? appointment.manager.contactPhone) && (
              <a
                href={buildSmsLink(appointment.manager.whatsappNumber ?? appointment.manager.contactPhone)!}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-emerald-200 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <MessageCircle size={16} /> SMS
              </a>
            )}
            {normalizePhone(appointment.manager.whatsappNumber) && (
              <a
                href={`https://wa.me/${normalizePhone(appointment.manager.whatsappNumber)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-emerald-200 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
            {normalizePhone(appointment.manager.contactPhone) && (
              <a
                href={`tel:${normalizePhone(appointment.manager.contactPhone)}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-emerald-200 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <Phone size={16} /> Ligar
              </a>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckSquare size={18} className="text-emerald-500" />
            <p className="text-lg font-semibold text-gray-900">Checklist do dia</p>
          </div>
          <div className="space-y-2">
            {appointment.checklist.map((task) => (
              <button
                type="button"
                key={task.id}
                onClick={() => handleToggleTask(task.id)}
                disabled={taskLoading === task.id}
                className={`w-full flex items-center gap-3 text-left px-3 py-3 rounded-2xl border transition ${
                  task.completedAt ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'border-gray-200 text-gray-700 hover:border-emerald-200'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    task.completedAt ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300'
                  }`}
                >
                  {task.completedAt && '✓'}
                </span>
                <span className="flex-1 text-sm font-medium">
                  {task.title}
                  {task.completedAt && <span className="block text-[10px] text-emerald-600">Concluído</span>}
                </span>
                {taskLoading === task.id && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-emerald-500" />
            <p className="text-lg font-semibold text-gray-900">Fotos antes/depois</p>
          </div>
          {(['BEFORE', 'AFTER'] as PhotoType[]).map((type) => (
            <div key={type}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">{type === 'BEFORE' ? 'Antes' : 'Depois'}</p>
                <button
                  type="button"
                  onClick={() => handlePhotoUpload(type)}
                  disabled={photoUploading === type}
                  className="text-sm font-semibold text-emerald-600 flex items-center gap-2"
                >
                  {photoUploading === type ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera size={16} />} Adicionar foto
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {groupedPhotos[type].map((photo) => (
                  <img
                    key={photo.id}
                    src={photo.url}
                    alt={`${type} ${photo.id}`}
                    className="w-full h-32 object-cover rounded-2xl border border-gray-100"
                  />
                ))}
                {groupedPhotos[type].length === 0 && (
                  <div className="border border-dashed border-gray-200 rounded-2xl h-32 flex items-center justify-center text-xs text-gray-400">
                    Sem fotos
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Observações importantes</p>
        <div className="mt-3 space-y-2">
          {appointment.observations.filter(Boolean).map((note, index) => (
            <div key={`${note}-${index}`} className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm text-gray-600">
              {note}
            </div>
          ))}
          {appointment.observations.filter(Boolean).length === 0 && (
            <p className="text-sm text-gray-500">Sem observações extras para este serviço.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetail;

