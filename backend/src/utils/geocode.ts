import axios from 'axios';

interface GeocodeResult {
  latitude: number;
  longitude: number;
}

const buildGoogleMapsKey = () =>
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.VITE_GOOGLE_MAPS_KEY ||
  process.env.GOOGLE_GEOCODING_KEY;

export const geocodeAddress = async (address?: string | null): Promise<GeocodeResult | null> => {
  const key = buildGoogleMapsKey();
  if (!address || !key) {
    return null;
  }

  try {
    const { data } = await axios.get<{
      status: string;
      results?: Array<{ geometry: { location: { lat: number; lng: number } } }>;
    }>('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address,
        key,
      },
    });

    if (data.status !== 'OK' || !data.results?.length) {
      return null;
    }

    const {
      geometry: {
        location: { lat, lng },
      },
    } = data.results[0];

    return { latitude: lat, longitude: lng };
  } catch (error) {
    console.error('[geocodeAddress] Erro ao geocodificar endereço:', error);
    return null;
  }
};

