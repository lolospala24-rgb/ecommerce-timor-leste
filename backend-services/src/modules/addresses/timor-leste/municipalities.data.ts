// placeholder for src/modules/addresses/timor-leste/municipalities.data.ts
// Timor-Leste Municipalities Data (13 municipalities)
export const MUNICIPALITIES_DATA = [
  { id: 1, name: 'Aileu', nameTetum: 'Aileu', capital: 'Aileu', area: 737, population: 48554 },
  { id: 2, name: 'Ainaro', nameTetum: 'Ainaru', capital: 'Ainaro', area: 804, population: 63429 },
  { id: 3, name: 'Baucau', nameTetum: 'Baukau', capital: 'Baucau', area: 1506, population: 124330 },
  { id: 4, name: 'Bobonaro', nameTetum: 'Bobonaru', capital: 'Maliana', area: 1380, population: 98394 },
  { id: 5, name: 'Covalima', nameTetum: 'Kovalima', capital: 'Suai', area: 1203, population: 65973 },
  { id: 6, name: 'Dili', nameTetum: 'Díli', capital: 'Dili', area: 367, population: 277279 },
  { id: 7, name: 'Ermera', nameTetum: 'Ermera', capital: 'Gleno', area: 768, population: 127283 },
  { id: 8, name: 'Lautém', nameTetum: 'Lautein', capital: 'Lospalos', area: 1813, population: 66014 },
  { id: 9, name: 'Liquiçá', nameTetum: 'Likisá', capital: 'Liquiçá', area: 550, population: 73786 },
  { id: 10, name: 'Manatuto', nameTetum: 'Manatutu', capital: 'Manatuto', area: 1782, population: 47242 },
  { id: 11, name: 'Manufahi', nameTetum: 'Manufahi', capital: 'Same', area: 1323, population: 53868 },
  { id: 12, name: 'Viqueque', nameTetum: 'Vikeke', capital: 'Viqueque', area: 1877, population: 77739 },
  { id: 13, name: 'Oecusse', nameTetum: 'Oé-Cusse', capital: 'Pante Macassar', area: 814, population: 73000 }
];

// Postos Administrativos by Municipality
export const POSTOS_DATA: Record<string, string[]> = {
  'Aileu': ['Aileu', 'Laulara', 'Lequidoe', 'Remexio'],
  'Ainaro': ['Ainaro', 'Hato-Udo', 'Hatu-Builico', 'Maubisse'],
  'Baucau': ['Baguia', 'Baucau', 'Laga', 'Quelicai', 'Vemasse', 'Venilale'],
  'Bobonaro': ['Atabae', 'Balibo', 'Bobonaro', 'Cailaco', 'Lolotoe', 'Maliana'],
  'Covalima': ['Fatululic', 'Fatumean', 'Fohorem', 'Maucatar', 'Suai', 'Tilomar', 'Zumalai'],
  'Dili': ['Atauro', 'Cristo Rei', 'Dom Aleixo', 'Metinaro', 'Nain Feto', 'Vera Cruz'],
  'Ermera': ['Atsabe', 'Ermera', 'Hatolia', 'Letefoho', 'Railaco'],
  'Lautém': ['Iliomar', 'Lautém', 'Lospalos', 'Luro', 'Tutuala'],
  'Liquiçá': ['Bazartete', 'Liquiçá', 'Maubara'],
  'Manatuto': ['Barique', 'Laclubar', 'Lacluta', 'Manatuto', 'Soibada'],
  'Manufahi': ['Alas', 'Fatuberlio', 'Same', 'Turiscai'],
  'Viqueque': ['Lacluta', 'Ossu', 'Uato-Lari', 'Uatucarbau', 'Viqueque'],
  'Oecusse': ['Nitibe', 'Oesilo', 'Pante Macassar', 'Passabe']
};

// Sucos by Municipality and Posto
export const SUCOS_DATA: Record<string, Record<string, string[]>> = {
  'Dili': {
    'Cristo Rei': ['Bidau Lecidere', 'Bidau Santana', 'Camea', 'Culu Hun', 'Hera', 'Meti Aut'],
    'Dom Aleixo': ['Bairro Pite', 'Bebonuk', 'Comoro', 'Fatuhada', 'Kampung Alor', 'Madohi'],
    'Nain Feto': ['Acadiru Hun', 'Bemori', 'Bidau Lecidere', 'Gricenfor', 'Lahane Oriental', 'Santa Cruz'],
    'Vera Cruz': ['Caicoli', 'Colmera', 'Mascarenhas', 'Mota Ulun', 'Motael', 'Vila Verde']
  },
  'Baucau': {
    'Baucau': ['Bahamori', 'Bucoli', 'Builale', 'Buibau', 'Buruma', 'Caibada', 'Gariuai', 'Samalari', 'Seiçal', 'Tirilolo', 'Uailili', 'Uakuae']
  },
  'Bobonaro': {
    'Maliana': ['Holsa', 'Lahomea', 'Odomau', 'Rai Fatu', 'Saburai', 'Tapo/Memo']
  },
  // Add more sucos data as needed - this is a sample
};

// Helper function to get all municipalities
export const getAllMunicipalities = () => {
  return MUNICIPALITIES_DATA.map(m => ({
    id: m.id,
    name: m.name,
    nameTetum: m.nameTetum,
    capital: m.capital
  }));
};

// Helper function to get municipality by name
export const getMunicipalityByName = (name: string) => {
  return MUNICIPALITIES_DATA.find(
    m => m.name === name || m.nameTetum === name
  );
};

// Helper function to validate if municipality exists
export const isValidMunicipality = (name: string): boolean => {
  return MUNICIPALITIES_DATA.some(
    m => m.name === name || m.nameTetum === name
  );
};

// Helper function to validate if posto exists for municipality
export const isValidPosto = (municipality: string, posto: string): boolean => {
  const postos = POSTOS_DATA[municipality];
  return postos ? postos.includes(posto) : false;
};

// Helper function to validate if suco exists for municipality and posto
export const isValidSuco = (municipality: string, posto: string, suco: string): boolean => {
  const sucos = SUCOS_DATA[municipality]?.[posto];
  return sucos ? sucos.includes(suco) : false;
};