// Approximate coordinates for each Timor-Leste municipality's capital —
// used to place Sales by Region markers on the admin dashboard map.
// Neither the Municipality table nor the static timor-leste data files
// store lat/lng (see backend-services/src/modules/addresses/timor-leste),
// so this is the one place that supplies them. Keyed on the exact name
// LocationsService.seedTimorLesteLocations() writes into Municipality.name.
export const MUNICIPALITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  Aileu: { latitude: -8.7333, longitude: 125.5667 },
  Ainaro: { latitude: -8.9833, longitude: 125.5167 },
  Baucau: { latitude: -8.4544, longitude: 126.4329 },
  Bobonaro: { latitude: -8.9878, longitude: 125.2144 },
  Covalima: { latitude: -9.305, longitude: 125.2833 },
  Dili: { latitude: -8.5569, longitude: 125.5603 },
  Ermera: { latitude: -8.7, longitude: 125.3833 },
  Lautém: { latitude: -8.5167, longitude: 127.05 },
  Liquiçá: { latitude: -8.4989, longitude: 125.3115 },
  Manatuto: { latitude: -8.5167, longitude: 126.0167 },
  Manufahi: { latitude: -9.0, longitude: 125.6833 },
  Viqueque: { latitude: -8.4689, longitude: 127.0537 },
  Oecusse: { latitude: -9.3206, longitude: 124.3567 },
};
