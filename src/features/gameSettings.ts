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
  /** Applique pseudo, vocal et/ou activation des mods dans settings.json */
  patch: async (update: {
    nickName?: string;
    voiceChat?: boolean;
    mods?: boolean; // false = mode test sans mods (cleo/aml/modloader/monet off)
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
      if (update.mods !== undefined) {
        json.client.settings.cleo_scripts = update.mods;
        json.client.settings.aml_scripts = update.mods;
        json.client.settings.modloader = update.mods;
        json.client.settings.monet_scripts = update.mods;
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

  /**
   * Lit les logs de crash écrits par le moteur du jeu dans son dossier
   * (permet de diagnostiquer un plantage SANS PC ni adb). On regarde plusieurs
   * emplacements connus + le dossier logcat.
   */
  readLogs: async (): Promise<string> => {
    const base = RNFS.ExternalDirectoryPath;
    const candidates = [
      'crash_log.log',
      'SAMP/crash_log.log',
      'samp_log.txt',
      'SAMP/samp_log.txt',
      'SAMP/svlog.txt',
      'gtasa_crash.log',
    ];
    let out = '';
    for (const c of candidates) {
      try {
        const p = `${base}/${c}`;
        if (await RNFS.exists(p)) {
          const content = await RNFS.readFile(p, 'utf8');
          if (content.trim().length > 0) {
            out += `\n===== ${c} =====\n${content.slice(-4000)}\n`;
          }
        }
      } catch (e) {}
    }
    try {
      const dir = `${base}/logcat`;
      if (await RNFS.exists(dir)) {
        const files = await RNFS.readDir(dir);
        files.sort(
          (a, b) => (b.mtime?.getTime() || 0) - (a.mtime?.getTime() || 0),
        );
        if (files[0]) {
          const content = await RNFS.readFile(files[0].path, 'utf8');
          out += `\n===== logcat/${files[0].name} =====\n${content.slice(
            -4000,
          )}\n`;
        }
      }
    } catch (e) {}
    return (
      out.trim() ||
      "Aucun log de crash trouvé. Lance le jeu (qu'il plante), puis reviens ici."
    );
  },
};
