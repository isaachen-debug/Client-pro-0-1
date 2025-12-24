import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/autocomplete', async (req, res) => {
  const query = String(req.query.query ?? '').trim();
  if (query.length < 3) {
    return res.json([]);
  }

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '6');
  url.searchParams.set('q', query);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'ClientPro/1.0 (address autocomplete)',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.7',
      },
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Falha ao buscar endereços.' });
    }

    const data = (await response.json()) as Array<{
      display_name?: string;
      lat?: string;
      lon?: string;
    }>;

    const results = data
      .filter((item) => item.display_name)
      .map((item) => ({
        label: item.display_name,
        value: item.display_name,
        lat: item.lat,
        lon: item.lon,
      }));

    return res.json(results);
  } catch (error) {
    console.error('Erro no autocomplete de endereço:', error);
    return res.status(500).json({ error: 'Erro ao buscar endereços.' });
  }
});

export default router;
