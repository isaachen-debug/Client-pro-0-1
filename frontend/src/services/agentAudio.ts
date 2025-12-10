import { api } from './http';

export const agentAudioApi = {
  async transcribe(file: File, contextHint?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (contextHint) formData.append('contextHint', contextHint);
    const { data } = await api.post<{
      transcript: string;
      intent: string;
      requiresConfirmation?: boolean;
      summary?: string;
      payload?: any;
      reason?: string;
    }>('/agent/audio', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data;
  },
};


