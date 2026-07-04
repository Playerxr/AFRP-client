import AsyncStorage from '@react-native-async-storage/async-storage';
import { URL_DISTRIBUTION } from '@env';

/**
 * Config "Espace Staff" persistée dans AsyncStorage (indépendante du cache de 4 Go,
 * donc modifiable AVANT tout téléchargement). Permet au fondateur de :
 *  - changer l'URL d'hébergement (distribution.json) sans recompiler l'APK
 *  - entrer dans l'app sans télécharger le modpack (gestion rapide)
 */
const KEY_URL = 'staff_distribution_url';
const KEY_SKIP = 'staff_skip_download';

export const StaffConfig = {
  /** URL effective du distribution.json : override staff sinon valeur du .env */
  getDistributionUrl: async (): Promise<string> => {
    try {
      const v = await AsyncStorage.getItem(KEY_URL);
      return v && v.trim().length > 0 ? v.trim() : URL_DISTRIBUTION;
    } catch {
      return URL_DISTRIBUTION;
    }
  },

  setDistributionUrl: async (url: string): Promise<void> => {
    const clean = (url || '').trim();
    if (clean.length > 0) {
      await AsyncStorage.setItem(KEY_URL, clean);
    } else {
      await AsyncStorage.removeItem(KEY_URL);
    }
  },

  /** true => on saute la comparaison + téléchargement du cache au démarrage */
  getSkipDownload: async (): Promise<boolean> => {
    try {
      return (await AsyncStorage.getItem(KEY_SKIP)) === '1';
    } catch {
      return false;
    }
  },

  setSkipDownload: async (skip: boolean): Promise<void> => {
    await AsyncStorage.setItem(KEY_SKIP, skip ? '1' : '0');
  },

  /** Valeur d'usine (celle du .env), pour l'affichage "réinitialiser" */
  getDefaultUrl: (): string => URL_DISTRIBUTION,
};
