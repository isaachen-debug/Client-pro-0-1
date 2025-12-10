import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { agentAudioApi } from '../services/agentAudio';
import { agentIntentApi } from '../services/agentIntent';

type Banner =
  | { type: 'confirm'; message: string; intent: string; payload: any }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string };

type AudioQuickAddProps = {
  contextHint?: string;
};

const AudioQuickAdd = ({ contextHint }: AudioQuickAddProps) => {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopMedia = () => {
    mediaRecorderRef.current?.stop();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
  };

  const handleSendAudio = useCallback(async (blob: Blob) => {
    setUploading(true);
    setBanner(null);
    try {
      const file = new File([blob], 'audio.webm', { type: blob.type || 'audio/webm' });
        const resp = await agentAudioApi.transcribe(file, contextHint);
      if (resp.intent === 'unknown' && !resp.requiresConfirmation) {
        setBanner({ type: 'error', message: 'Não entendi o pedido por áudio. Tente falar novamente.' });
        return;
      }
      if (resp.requiresConfirmation) {
        const msg =
          resp.summary ||
          'Entendi uma criação/atualização por áudio. Confirma para aplicar? (cliente, data, horário, valor são editáveis depois).';
        setBanner({ type: 'confirm', message: msg, intent: resp.intent, payload: resp.payload });
        return;
      }
      if (resp.summary) {
        setBanner({ type: 'success', message: resp.summary });
        window.dispatchEvent(
          new CustomEvent('agent-log', {
            detail: {
              messages: [
                resp.transcript ? { role: 'user', text: `[Áudio] ${resp.transcript}` } : null,
                { role: 'assistant', text: resp.summary },
              ].filter(Boolean),
            },
          }),
        );
      }
    } catch (error: any) {
      console.error('Erro áudio rápido', error);
      const msg = error?.response?.data?.error || 'Falha ao processar áudio. Confira microfone e tente novamente.';
      setBanner({ type: 'error', message: msg });
    } finally {
      setUploading(false);
    }
  }, []);

  const handleToggleRecording = async () => {
    if (recording) {
      setRecording(false);
      stopMedia();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        if (blob.size > 0) {
          await handleSendAudio(blob);
        }
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error('Microfone bloqueado', err);
      setBanner({ type: 'error', message: 'Não foi possível acessar o microfone. Verifique permissões.' });
      setRecording(false);
      stopMedia();
    }
  };

  const handleConfirm = async (intent: string, payload: any) => {
    try {
      const result = await agentIntentApi.execute(intent as any, payload);
      if (result.error) {
        setBanner({ type: 'error', message: result.error });
      } else if (result.answer) {
        setBanner({ type: 'success', message: result.answer });
      } else {
        setBanner({ type: 'success', message: 'Ação realizada com sucesso.' });
      }
    } catch (error: any) {
      const msg = error?.response?.data?.error || 'Falha ao executar ação.';
      setBanner({ type: 'error', message: msg });
    }
  };

  useEffect(() => {
    return () => {
      stopMedia();
    };
  }, []);

  return (
    <>
      {banner && (
        <div className="fixed left-4 right-4 top-16 z-40">
          <div
            className={`rounded-2xl border px-4 py-3 shadow-md flex items-start gap-3 ${
              banner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : banner.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <div className="mt-0.5">
              {banner.type === 'success' && <CheckCircle2 size={16} />}
              {banner.type === 'error' && <AlertTriangle size={16} />}
              {banner.type === 'confirm' && <AlertTriangle size={16} />}
            </div>
            <div className="flex-1 text-sm font-semibold">{banner.message}</div>
            {banner.type === 'confirm' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleConfirm(banner.intent, banner.payload)}
                  className="px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-semibold"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setBanner(null)}
                  className="px-3 py-1.5 rounded-full border border-amber-300 text-xs font-semibold text-amber-800"
                >
                  Cancelar
                </button>
              </div>
            )}
            {banner.type !== 'confirm' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBanner(null)}
                  className="text-xs font-semibold underline decoration-1"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-agent'));
                    setBanner(null);
                  }}
                  className="text-xs font-semibold underline decoration-1 text-primary-700"
                >
                  Abrir Agent
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="fixed right-4 bottom-24 z-40 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleToggleRecording}
          disabled={uploading}
          className={`relative h-14 w-14 rounded-full text-sm font-semibold transition shadow-[0_15px_35px_rgba(15,23,42,0.25)] flex items-center justify-center ${
            recording
              ? 'bg-gradient-to-r from-red-500 via-rose-500 to-orange-400 text-white border border-red-300 animate-pulse'
              : 'bg-gradient-to-r from-[#0f172a] via-[#1d1b3a] to-[#0f766e] text-white border border-white/10 hover:shadow-[0_20px_45px_rgba(34,197,94,0.35)]'
          }`}
        >
          {!recording && (
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-400/20 via-cyan-500/15 to-purple-500/15 blur-lg opacity-70 pointer-events-none" />
          )}
          {recording ? <Square size={18} /> : <Mic size={18} />}
          {uploading && <Loader2 size={16} className="absolute -bottom-2 right-1 animate-spin text-slate-200" />}
        </button>
        <div className="text-[11px] font-semibold text-slate-600 bg-white/80 backdrop-blur px-2 py-1 rounded-full border border-slate-200 shadow-sm">
          {recording ? 'Gravando...' : 'Agende por voz'}
        </div>
      </div>
    </>
  );
};

export default AudioQuickAdd;


