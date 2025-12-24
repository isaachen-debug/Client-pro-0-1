export type AgentChatMessage = { role: 'user' | 'assistant'; text: string };

const STORAGE_KEY = 'clientepro:agent-chat';

export const loadAgentChatMessages = (): AgentChatMessage[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as AgentChatMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((msg) => msg && typeof msg.text === 'string' && (msg.role === 'user' || msg.role === 'assistant'));
  } catch {
    return [];
  }
};

export const saveAgentChatMessages = (messages: AgentChatMessage[]) => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // ignore storage errors
  }
};

export const emitAgentChatSync = (messages: AgentChatMessage[], source: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('agent-chat-sync', { detail: { messages, source } }));
};
