# Agendamento por áudio (sem armazenar arquivos)

## Objetivo
Permitir que o usuário grave um áudio curto para criar/atualizar um agendamento, sem persistir o arquivo, apenas processando e descartando após a transcrição.

## Fluxo proposto
1. **Frontend (mobile/web)**
   - Botão “Gravar áudio para agendar”.
   - Gravação limitada (ex.: 30–60s), formato leve (webm/m4a), com tamanho máx. (ex.: 1–2 MB).
   - Envio via `multipart/form-data` para o backend, com token de usuário.
2. **Backend (endpoint /api/agent/audio)**
   - Usa `multer` com storage em memória (`limits` de tamanho).
   - Não salva em disco; após processar, descarta o buffer.
   - Chama OpenAI Whisper (`audio.transcriptions.create`) para transcrever PT/EN.
   - Normaliza o texto resultante.
3. **Parser de intent (reuso do agentIntent)**
   - Executa extração de intent `create_appointment` ou correlatas usando o texto transcrito.
   - Campos: `customerName`, `date (YYYY-MM-DD)`, `startTime/endTime`, `price`, `notes/address`.
   - Se faltar info crítica, retorna `requiresConfirmation=true` com o que foi entendido.
4. **Confirmação**
   - Frontend mostra resumo: cliente, data, hora, endereço/valor; permite editar ou confirmar.
   - Ao confirmar, chama endpoint de criação padrão de agendamento.
5. **Segurança e limites**
   - Tamanho/tempo do áudio limitado; rejeitar fora do limite.
   - Apenas formatos permitidos (webm/m4a).
   - Transcrição feita em memória; nenhuma persistência do áudio.
   - Logs não devem incluir o buffer; apenas metadados (tamanho, duração estimada).

## Endpoints (sugestão)
- `POST /api/agent/audio` (auth): recebe `file` (áudio), retorna `{ transcript, intent, payload, requiresConfirmation }`.
- Reaproveita `/api/agent/intent/execute` para confirmar/criar, após edição do usuário.

## Padrões de UX
- Mostrar progresso da transcrição.
- Caso a transcrição falhe, oferecer mensagem de texto como fallback.
- Avisar o usuário que o áudio não é armazenado.


