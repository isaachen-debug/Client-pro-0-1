import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from '@/api/base44Client';
import { format, addDays, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ChatBot({ onEventCreated }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: `👋 **Assistente de Agendamento**

📝 **Como usar:**
Escreva naturalmente o que precisa agendar. Eu vou entender e criar o evento automaticamente!

✨ **Exemplos:**
• "consulta médica amanhã às 14h"
• "reunião segunda-feira 10h no escritório"
• "almoço com cliente sexta 12:30"
• "dentista dia 25 às 15h"

🕐 **Datas aceitas:**
hoje, amanhã, dias da semana, datas específicas

💬 **Digite seu evento abaixo:**`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const parseNaturalDate = (text) => {
    const today = new Date();
    const lowerText = text.toLowerCase();

    if (lowerText.includes('hoje')) return format(today, 'yyyy-MM-dd');
    if (lowerText.includes('amanhã')) return format(addDays(today, 1), 'yyyy-MM-dd');
    if (lowerText.includes('depois de amanhã')) return format(addDays(today, 2), 'yyyy-MM-dd');
    
    // Dias da semana
    const weekDays = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    for (let i = 1; i <= 7; i++) {
      const futureDate = addDays(today, i);
      const dayName = format(futureDate, 'EEEE', { locale: ptBR }).toLowerCase();
      if (lowerText.includes(weekDays[futureDate.getDay()])) {
        return format(futureDate, 'yyyy-MM-dd');
      }
    }

    return format(today, 'yyyy-MM-dd');
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Usa LLM para extrair informações do evento
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Você é um assistente que extrai informações de eventos de texto natural em português brasileiro.
        
Texto do usuário: "${input}"

Extraia as seguintes informações e retorne em JSON:
- title: título/descrição do evento
- date: data no formato YYYY-MM-DD (se não especificada, use hoje)
- start_time: hora de início no formato HH:mm (se não especificada, use 09:00)
- end_time: hora de término no formato HH:mm (opcional)
- location: local do evento (se mencionado)
- description: descrição adicional (se houver)

Dicas de interpretação:
- "hoje" = data de hoje
- "amanhã" = data de amanhã  
- "segunda", "terça", etc = próximo dia da semana
- Horários podem estar como "14h", "às 15", "10:30", etc

Data atual: ${format(new Date(), 'yyyy-MM-dd')}`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            date: { type: "string" },
            start_time: { type: "string" },
            end_time: { type: "string" },
            location: { type: "string" },
            description: { type: "string" }
          }
        }
      });

      // Criar o evento
      const eventData = {
        title: result.title || input,
        date: result.date || format(new Date(), 'yyyy-MM-dd'),
        start_time: result.start_time || '09:00',
        end_time: result.end_time || '',
        location: result.location || '',
        description: result.description || '',
        color: 'blue'
      };

      await base44.entities.Event.create(eventData);

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        event: eventData,
        text: `✅ Evento criado com sucesso!\n\n📅 ${eventData.title}\n🗓️ ${format(new Date(eventData.date), "d 'de' MMMM", { locale: ptBR })}\n⏰ ${eventData.start_time}${eventData.end_time ? ` - ${eventData.end_time}` : ''}`
      };

      // Limpa mensagens antigas e mantém apenas as 2 últimas
      setMessages([
        {
          id: 1,
          type: 'bot',
          text: `👋 **Assistente de Agendamento**

📝 **Como usar:**
Escreva naturalmente o que precisa agendar. Eu vou entender e criar o evento automaticamente!

✨ **Exemplos:**
• "consulta médica amanhã às 14h"
• "reunião segunda-feira 10h no escritório"
• "almoço com cliente sexta 12:30"
• "dentista dia 25 às 15h"

🕐 **Datas aceitas:**
hoje, amanhã, dias da semana, datas específicas

💬 **Digite seu evento abaixo:**`
        },
        botMessage
      ]);
      onEventCreated?.();

    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        text: '❌ Desculpe, não consegui criar o evento. Pode tentar novamente com mais detalhes? Por exemplo: "reunião amanhã às 14h no escritório"'
      };
      // Limpa mensagens antigas em caso de erro também
      setMessages([
        {
          id: 1,
          type: 'bot',
          text: `👋 **Assistente de Agendamento**

📝 **Como usar:**
Escreva naturalmente o que precisa agendar. Eu vou entender e criar o evento automaticamente!

✨ **Exemplos:**
• "consulta médica amanhã às 14h"
• "reunião segunda-feira 10h no escritório"
• "almoço com cliente sexta 12:30"
• "dentista dia 25 às 15h"

🕐 **Datas aceitas:**
hoje, amanhã, dias da semana, datas específicas

💬 **Digite seu evento abaixo:**`
        },
        errorMessage
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                {message.event ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-600 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Evento Criado!</span>
                    </div>
                    <div className="text-sm whitespace-pre-line">{message.text}</div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span className="text-sm text-gray-600">Criando evento...</span>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <Input
            placeholder="Ex: consulta amanhã às 14h..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
            className="flex-1 h-12 rounded-xl"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="h-12 w-12 rounded-xl bg-slate-900 hover:bg-slate-800"
            size="icon"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          💡 Dica: escreva naturalmente, como faria no WhatsApp!
        </p>
      </div>
    </div>
  );
}