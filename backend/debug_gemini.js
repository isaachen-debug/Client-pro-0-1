
const fs = require('fs');
const https = require('https');

const GEMINI_API_KEY = "AIzaSyAUaZmrmbyklSF6gd6jBne2NLMBuVju1MM"; // From .env
const ARTIFACT_DIR = "/Users/isaachenrik/.gemini/antigravity/brain/c68235f5-f45e-4bb8-8026-25325d0c41f6";
const IMAGE_TIMESTAMP_ID = "1768353649431"; // From user upload filename
const IMAGE_PATH = `${ARTIFACT_DIR}/uploaded_image_${IMAGE_TIMESTAMP_ID}.png`;

console.log(`[Debug] Reading image from: ${IMAGE_PATH}`);

try {
    const imageBuffer = fs.readFileSync(IMAGE_PATH);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = "image/png"; // We know it's a PNG from the filename

    console.log(`[Debug] Image read successfully. Size: ${base64Image.length} chars`);

    const payload = JSON.stringify({
        contents: [{
            parts: [
                { text: "Analise esta imagem. Identifique uma oportunidade de limpeza extra (ex: forno sujo, janelas, estofados). Retorne APENAS um JSON válido (sem markdown) no seguinte formato: { \"serviceName\": \"Nome do Serviço\", \"price\": 120.00, \"message\": \"Texto de venda curto e muito persuasivo usando gatilhos mentais.\" }" },
                { inline_data: { mime_type: mimeType, data: base64Image } }
            ]
        }]
    });

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    console.log('[Debug] Sending request to Gemini API (gemini-2.5-flash)...');

    const req = https.request(options, (res) => {
        let data = '';

        console.log(`[Debug] Response Status Code: ${res.statusCode}`);

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log('[Debug] Response Body:');
            console.log(data);
        });
    });

    req.on('error', (error) => {
        console.error('[Debug] Request Error:', error);
    });

    req.write(payload);
    req.end();

} catch (err) {
    console.error("[Debug] File Read Error:", err);
}
