import RNFS from 'react-native-fs';

/**
 * Gestion du VRAI fichier de config lu par le moteur SA-MP : SAMP/settings.json
 * (dans le dossier du jeu). C'est LUI qui porte le pseudo (nick_name) et le
 * vocal en jeu (voice_chat) — pas le settings.ini.
 *
 * "Mode Live TikTok" = voice_chat:false → le jeu ne capte plus le micro, donc
 * le streamer peut parler sur son live sans devoir désactiver le vocal en jeu.
 */
const settingsPath = () => `${RNFS.ExternalDirectoryPath}/SAMP/settings.json`;

export const GameSettings = {
  /** Applique pseudo et/ou vocal dans settings.json (si le jeu est installé) */
  patch: async (update: {
    nickName?: string;
    voiceChat?: boolean;
  }): Promise<boolean> => {
    try {
      const path = settingsPath();
      if (!(await RNFS.exists(path))) {
        return false;
      }
      const raw = await RNFS.readFile(path, 'utf8');
      const json = JSON.parse(raw);
      json.client = json.client || {};
      json.client.settings = json.client.settings || {};

      if (update.nickName !== undefined && update.nickName.trim().length > 0) {
        json.client.settings.nick_name = update.nickName.trim();
      }
      if (update.voiceChat !== undefined) {
        json.client.settings.voice_chat = update.voiceChat;
      }

      await RNFS.writeFile(path, JSON.stringify(json, null, 4), 'utf8');
      return true;
    } catch (e) {
      return false;
    }
  },

  /** true si le vocal en jeu est actif (défaut true si illisible) */
  getVoiceChat: async (): Promise<boolean> => {
    try {
      const raw = await RNFS.readFile(settingsPath(), 'utf8');
      return JSON.parse(raw)?.client?.settings?.voice_chat !== false;
    } catch (e) {
      return true;
    }
  },
};
