import auth from '@react-native-firebase/auth';
import { firebase } from '@react-native-firebase/database';

/**
 * Pont vers le Firebase d'AFRP (projet afrp-f0ef7) — LE MÊME que l'app
 * AFRP Launcher (Java). Chat global, support, staff, config à distance :
 * les deux apps lisent/écrivent les mêmes nœuds, donc tout est partagé.
 * URL explicite car la base est en europe-west1 (voir Db.java du launcher).
 */
export const DB_URL =
  'https://afrp-f0ef7-default-rtdb.europe-west1.firebasedatabase.app';

export const dbRef = (path: string) =>
  firebase.app().database(DB_URL).ref(path);

/** clé RTDB sûre (interdits : . # $ [ ] /) */
export const safeKey = (s: string) => s.replace(/[.#$[\]/]/g, '_');

export type StaffRank = 'fondateur' | 'admin' | 'moderateur' | null;

/**
 * Session staff (email/mot de passe créés par le fondateur dans la console
 * Firebase, rang lu dans staff_allowlist — voir SUPPORT_SETUP.md du launcher).
 */
export const StaffSession = {
  rank: null as StaffRank,
  uid: null as string | null,
  email: null as string | null,

  async login(email: string, password: string): Promise<StaffRank> {
    const cred = await auth().signInWithEmailAndPassword(
      email.trim(),
      password,
    );
    const uid = cred.user.uid;
    const snap = await dbRef(`staff_allowlist/${uid}`).once('value');
    const v = snap.val();
    const rank: StaffRank =
      v === 'fondateur'
        ? 'fondateur'
        : v === 'moderateur'
        ? 'moderateur'
        : v === 'admin' || v === true || v === 'true'
        ? 'admin'
        : null;

    if (!rank) {
      await auth().signOut();
      throw new Error('Compte non approuvé par le fondateur.');
    }

    StaffSession.rank = rank;
    StaffSession.uid = uid;
    StaffSession.email = email.trim();
    return rank;
  },

  async logout() {
    try {
      await auth().signOut();
    } catch (e) {}
    StaffSession.rank = null;
    StaffSession.uid = null;
    StaffSession.email = null;
  },
};
