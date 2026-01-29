
// ============================================================================
// GROWTH TOOLS SERVICE
// ============================================================================
// Centralizes connections to AI (Gemini) and Geolocation APIs.
// ============================================================================

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * 1. VENDEDOR SILENCIOSO (Silent Seller)
 * API: Google Gemini 1.5 Flash (Vision)
 */
export const analyzeOpportunity = async (base64Image: string) => {
    try {
        if (!GEMINI_API_KEY) throw new Error("Chave do Gemini não configurada");

        // Extract ID and Mime Type dynamically
        // Format: "data:image/png;base64,....."
        const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';
        // Remove prefix if present
        const base64Data = base64Image.split(',')[1] || base64Image;

        const payload = {
            contents: [{
                parts: [
                    { text: "Analise esta imagem para identificar qual serviço de limpeza é necessário (ex: Sofá, Forno, Banheiro, Pós-obra). Gere uma proposta curta e direta convidando o cliente a contratar a limpeza desse item específico. Evite apontar defeitos ou sujeira diretamente. Foco na solução e no resultado 'brilhando'. Retorne APENAS um JSON válido: { \"serviceName\": \"Nome do Serviço Identificado\", \"price\": 120.00, \"message\": \"Frase curta tipo: 'Que tal deixar seu [item identificado] novinho em folha? Contrate nossa [Nome do Serviço] hoje por apenas [preço] e relaxe!'\" }" },
                    { inline_data: { mime_type: mimeType, data: base64Data } }
                ]
            }]
        };

        console.log(`[Growth] Analyzing image (${mimeType})...`);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('[Growth] Gemini API Error:', errText);
            throw new Error(`Falha na API Gemini: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResult) throw new Error("Resposta vazia da IA");

        // Clean markdown code blocks if present to parse JSON
        const jsonString = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedResult = JSON.parse(jsonString);

        return {
            serviceName: parsedResult.serviceName || "Serviço Extra",
            price: parsedResult.price || 50.00,
            message: parsedResult.message || "Encontrei uma oportunidade de limpeza extra.",
            confidence: 0.95
        };

    } catch (error) {
        console.error("[Growth] API Failed, using fallback. Reason:", error);

        // GENERIC ERROR FALLBACK (Requested by User)
        return {
            serviceName: "Não Identificado",
            price: 0,
            message: "Não consegui identificar oportunidades claras nesta imagem. Tente aproximar a câmera de uma área específica (ex: sofá, tapete, janela).",
            confidence: 0,
            isError: true
        };
    }
};

/**
 * 2. ESTÚDIO ANTES & DEPOIS (Social Media)
 * API: Google Gemini 1.5 Flash (Multimodal)
 */
export const generateSocialPost = async (beforeImage: string, afterImage: string) => {
    try {
        if (!GEMINI_API_KEY) throw new Error("Chave do Gemini não configurada");

        const beforeMime = beforeImage.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';
        const afterMime = afterImage.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/jpeg';

        const beforeData = beforeImage.split(',')[1] || beforeImage;
        const afterData = afterImage.split(',')[1] || afterImage;

        const payload = {
            contents: [{
                parts: [
                    { text: "Atue como um especialista em Marketing para Lavanderias e Limpeza. Analise essas duas imagens (Antes e Depois). Crie uma legenda curta, emocionante e engajadora para o Instagram. Use emojis. Retorne APENAS um JSON válido (sem markdown) neste formato: { \"caption\": \"Texto da legenda aqui\", \"hashtags\": [\"#tag1\", \"#tag2\"] }" },
                    { inline_data: { mime_type: beforeMime, data: beforeData } },
                    { inline_data: { mime_type: afterMime, data: afterData } }
                ]
            }]
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Falha na API Gemini');

        const data = await response.json();
        const textResult = data.candidates[0].content.parts[0].text;

        const jsonString = textResult.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedResult = JSON.parse(jsonString);

        return {
            caption: parsedResult.caption,
            hashtags: parsedResult.hashtags || []
        };

    } catch (error) {
        console.warn("API Error. Using Mock.", error);
        // MOCK FALLBACK
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    caption: "✨ Transformação satisfatória de hoje! Nada supera a paz de ver cada cantinho brilhando novamente. ✨\n\nArrasta pro lado pra ver como estava antes! 👉\n\nSe sua casa também precisa desse resgate, me chama no direct! 💙",
                    hashtags: ["#faxina", "#antesedepois", "#limpezaprofissional", "#organização", "#dicadelimpeza", "#homecare"]
                });
            }, 3000);
        });
    }
};

/**
 * 3. OFERTA RELÂMPAGO (Radar)
 * APIs: Geolocation API (Browser) + Google Maps Distance Matrix
 */
export const findNearbyOpportunities = async (latitude: number, longitude: number) => {
    // Para funcionar 100% precisa de Backend com banco de dados real.
    // Vamos manter o Mock sofisticado aqui por enquanto para validação visual.
    console.log(`[Growth] Searching radar at ${latitude}, ${longitude}`);

    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { id: 1, name: 'Ana Silva', distance: '400m', time: 'Última vez há 15 dias' },
                { id: 2, name: 'Condomínio Jardins', distance: '800m', time: 'Cliente recorrente' },
                { id: 3, name: 'Marcos Oliveira', distance: '1.2km', time: 'Lead interessado' },
            ]);
        }, 3000);
    });
};
