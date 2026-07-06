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

  // Copie interne protégée (les nettoyeurs de mémoire ne touchent pas
  // /data/data → contrairement au dossier externe files/).
  savedCrashPath: () => `${RNFS.DocumentDirectoryPath}/afrp_last_crash.txt`,

  /** Rassemble le contenu des fichiers de log du moteur (bornes : dossiers connus) */
  collectRawLogs: async (): Promise<string> => {
    const base = RNFS.ExternalDirectoryPath;
    let out = '';
    const readInto = async (rel: string) => {
      try {
        const p = `${base}/${rel}`;
        if (await RNFS.exists(p)) {
          const c = await RNFS.readFile(p, 'utf8');
          if (c.trim().length > 0) {
            out += `\n===== ${rel} =====\n${c.slice(-4000)}\n`;
          }
        }
      } catch (e) {}
    };
    for (const f of [
      'crash_log.log',
      'crashlog.txt',
      'SAMP/crash_log.log',
      'samp_log.txt',
      'SAMP/samp_log.txt',
      'SAMP/svlog.txt',
      'gtasa_crash.log',
      'crash.txt',
    ]) {
      await readInto(f);
    }
    // Fichiers .log/.txt à la racine + dossier logcat (le plus récent)
    for (const dir of ['', 'logcat', 'SAMP']) {
      try {
        const d = dir ? `${base}/${dir}` : base;
        if (!(await RNFS.exists(d))) {
          continue;
        }
        const files = (await RNFS.readDir(d))
          .filter(f => f.isFile() && /\.(log|txt)$/i.test(f.name))
          .sort((a, b) => (b.mtime?.getTime() || 0) - (a.mtime?.getTime() || 0))
          .slice(0, 3);
        for (const f of files) {
          const c = await RNFS.readFile(f.path, 'utf8');
          if (c.trim().length > 0) {
            out += `\n===== ${dir}/${f.name} =====\n${c.slice(-4000)}\n`;
          }
        }
      } catch (e) {}
    }
    return out.trim();
  },

  /** À appeler au démarrage : sauve une COPIE du log dans le stockage interne */
  captureCrash: async (): Promise<void> => {
    try {
      const raw = await GameSettings.collectRawLogs();
      if (raw.length > 0) {
        await RNFS.writeFile(GameSettings.savedCrashPath(), raw, 'utf8');
      }
    } catch (e) {}
  },

  /** Logs à afficher : fichiers actuels + copie interne protégée */
  readLogs: async (): Promise<string> => {
    let out = await GameSettings.collectRawLogs();
    try {
      const saved = GameSettings.savedCrashPath();
      if (await RNFS.exists(saved)) {
        const c = await RNFS.readFile(saved, 'utf8');
        if (c.trim().length > 0 && !out.includes(c.slice(0, 200))) {
          out += `\n===== copie sauvegardée =====\n${c.slice(-4000)}\n`;
        }
      }
    } catch (e) {}
    return (
      out.trim() ||
      "Aucun log trouvé. Lance le jeu (qu'il plante), rouvre l'app tout de suite, puis reviens ici."
    );
  },
};
