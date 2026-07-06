import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { setInitial } from '../actions/appActions';
import { ButtonLauncher, MainContainer } from '../components';
import { SupportThread } from '../components/Support/SupportThread';
import { GameSettings } from '../features/gameSettings';
import { StaffConfig } from '../features/staffConfig';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { dbRef, StaffRank, StaffSession } from '../services/afrpDb';
import { fetchInitialApp } from '../thunks/appThunks';

type StaffScreenType = NativeStackScreenProps<any>;

// Durées VIP en minutes de jeu (mêmes valeurs que le launcher/serveur LVRP)
const VIP_MENSUEL_MIN = 40000;
const VIP_AVIE_MIN = 2000000000;

const RANK_LABEL: Record<string, string> = {
  fondateur: '👑 Fondateur',
  admin: '🛡 Admin',
  moderateur: '🔰 Modérateur',
};

type ConvoPreview = { id: string; pseudo: string; last: string; ts: number };

/**
 * Espace Staff — mêmes comptes et mêmes données que l'app AFRP Launcher :
 * connexion email/mot de passe (comptes créés par le fondateur dans la
 * console Firebase), rang lu dans staff_allowlist. En service, annonce,
 * VIP (pending_vip_grants), support et outils fondateur.
 */
export const StaffScreen = React.memo(({ navigation }: StaffScreenType) => {
  const dispatch = useAppDispatch();

  // Connexion
  const [rank, setRank] = useState<StaffRank>(StaffSession.rank);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  // En service
  const [enService, setEnService] = useState(false);

  // Annonce (fondateur)
  const [annonce, setAnnonce] = useState('');

  // Actualité + mise à jour (fondateur)
  const [newsTitle, setNewsTitle] = useState('');
  const [newsText, setNewsText] = useState('');
  const [updCode, setUpdCode] = useState('');
  const [updUrl, setUpdUrl] = useState('');

  // VIP
  const [vipPseudo, setVipPseudo] = useState('');
  const [vipRank, setVipRank] = useState(1);
  const [vipCash, setVipCash] = useState('0');
  const [vipAVie, setVipAVie] = useState(false);

  // Support (boîte staff)
  const [convos, setConvos] = useState<ConvoPreview[]>([]);
  const [openConvo, setOpenConvo] = useState<string>('');

  // Logs de crash du jeu
  const [logs, setLogs] = useState<string | null>(null);

  const onViewLogs = useCallback(async () => {
    setLogs('Lecture...');
    setLogs(await GameSettings.readLogs());
  }, []);

  const onShareLogs = useCallback(() => {
    if (logs) {
      Share.share({ message: `Logs jeu AFRP:\n${logs}` }).catch(() => {});
    }
  }, [logs]);

  // Outils fondateur (config launcher locale)
  const [url, setUrl] = useState('');
  const [skip, setSkip] = useState(false);
  const [defaultUrl, setDefaultUrl] = useState('');

  useEffect(() => {
    (async () => {
      setUrl(await StaffConfig.getDistributionUrl());
      setSkip(await StaffConfig.getSkipDownload());
      setDefaultUrl(StaffConfig.getDefaultUrl());
    })();
  }, []);

  // Annonce actuelle (app_config/annonce)
  useEffect(() => {
    if (!rank) {
      return undefined;
    }
    try {
      const r = dbRef('app_config/annonce');
      const cb = r.on('value', snap => setAnnonce(String(snap.val() ?? '')));
      return () => r.off('value', cb);
    } catch (e) {
      return undefined;
    }
  }, [rank]);

  // Boîte support (liste des conversations) — lisible par le staff seulement
  useEffect(() => {
    if (!rank) {
      return undefined;
    }
    try {
      const r = dbRef('support_chats').limitToLast(30);
      const cb = r.on('value', snap => {
        const list: ConvoPreview[] = [];
        snap.forEach(child => {
          const msgs = child.child('messages').val() || {};
          const arr = Object.values(msgs) as any[];
          arr.sort((a, b) => (b?.timestamp ?? 0) - (a?.timestamp ?? 0));
          const lastMsg = arr[0] || {};
          const player =
            arr.find(m => m?.sender === 'player') || ({} as any);
          list.push({
            id: child.key ?? '',
            pseudo: player.pseudo ?? 'Joueur',
            last: String(lastMsg.text ?? '').slice(0, 60),
            ts: lastMsg.timestamp ?? 0,
          });
          return undefined;
        });
        list.sort((a, b) => b.ts - a.ts);
        setConvos(list);
      });
      return () => r.off('value', cb);
    } catch (e) {
      return undefined;
    }
  }, [rank]);

  const onLogin = useCallback(async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const r = await StaffSession.login(email, password);
      setRank(r);
    } catch (e: any) {
      Alert.alert(
        'Espace Staff',
        e?.message?.includes('approuvé')
          ? e.message
          : 'Connexion refusée. Vérifie email/mot de passe (comptes créés par le fondateur).',
      );
    }
    setBusy(false);
  }, [email, password, busy]);

  const onLogout = useCallback(async () => {
    if (StaffSession.uid) {
      try {
        dbRef(`staff_online/${StaffSession.uid}`).remove();
      } catch (e) {}
    }
    await StaffSession.logout();
    setRank(null);
    setEnService(false);
    setOpenConvo('');
  }, []);

  // Supprime un ticket support (avec confirmation)
  const onDeleteConvo = useCallback(
    (id: string, pseudo: string) => {
      Alert.alert(
        'Supprimer le ticket',
        `Supprimer définitivement la conversation de ${pseudo} ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => {
              try {
                dbRef(`support_chats/${id}`).remove();
                if (openConvo === id) {
                  setOpenConvo('');
                }
              } catch (e) {
                Alert.alert('Support', 'Suppression impossible (connexion ?).');
              }
            },
          },
        ],
      );
    },
    [openConvo],
  );

  const onToggleService = useCallback(
    async (value: boolean) => {
      setEnService(value);
      if (!StaffSession.uid) {
        return;
      }
      try {
        const r = dbRef(`staff_online/${StaffSession.uid}`);
        if (value) {
          r.setValue({
            pseudo: StaffSession.email ?? 'Staff',
            rang: rank,
            depuis: Date.now(),
          });
          r.onDisconnect().remove();
        } else {
          r.remove();
        }
      } catch (e) {}
    },
    [rank],
  );

  const onSaveAnnonce = useCallback(() => {
    try {
      dbRef('app_config/annonce').setValue(annonce.trim());
      // annonces/derniere déclenche la notif push (Cloud Function pushAnnonce)
      if (annonce.trim().length > 0) {
        dbRef('annonces/derniere').setValue({
          text: annonce.trim(),
          timestamp: Date.now(),
        });
      }
      Alert.alert('Espace Staff', 'Annonce publiée + notifiée à tous.');
    } catch (e) {
      Alert.alert('Espace Staff', "Échec (fondateur uniquement pour l'annonce).");
    }
  }, [annonce]);

  const onPublishNews = useCallback(() => {
    const t = newsTitle.trim();
    if (t.length < 2) {
      Alert.alert('Actualité', 'Donne un titre à ton actualité.');
      return;
    }
    try {
      dbRef('news').push({
        title: t,
        text: newsText.trim(),
        timestamp: Date.now(),
      });
      setNewsTitle('');
      setNewsText('');
      Alert.alert('Actualité', 'Publiée sur l\'accueil de tous les joueurs.');
    } catch (e) {
      Alert.alert('Actualité', 'Échec (connexion ?).');
    }
  }, [newsTitle, newsText]);

  const onPublishUpdate = useCallback(() => {
    const code = parseInt(updCode, 10);
    if (!code || code < 1) {
      Alert.alert('Mise à jour', 'Entre le numéro de version (ex : 3).');
      return;
    }
    try {
      dbRef('app_config/latest_version_code').setValue(code);
      dbRef('app_config/apk_url').setValue(updUrl.trim());
      Alert.alert(
        'Mise à jour',
        'Cloche activée chez les joueurs avec une version plus ancienne.',
      );
    } catch (e) {
      Alert.alert('Mise à jour', 'Échec (fondateur uniquement).');
    }
  }, [updCode, updUrl]);

  const onGrantVip = useCallback(() => {
    const p = vipPseudo.trim();
    if (p.length < 3) {
      Alert.alert('VIP', "Entre le pseudo exact du joueur (Prénom_Nom).");
      return;
    }
    const cash = parseInt(vipCash, 10) || 0;
    const minutes = vipAVie ? VIP_AVIE_MIN : VIP_MENSUEL_MIN;
    // Format lu par le serveur LVRP : "Pseudo|Rang|Cash|VipMinutes"
    const valeur = `${p}|${vipRank}|${cash}|${minutes}`;
    try {
      dbRef('pending_vip_grants').push(valeur);
      Alert.alert(
        'VIP',
        `✅ VIP ${vipRank} en cours d'attribution à ${p} (appliqué à la prochaine synchro serveur, ~30 s).`,
      );
      setVipPseudo('');
      setVipCash('0');
    } catch (e) {
      Alert.alert('VIP', 'Échec de l\'écriture (connexion ?).');
    }
  }, [vipPseudo, vipRank, vipCash, vipAVie]);

  const onSaveUrl = async () => {
    await StaffConfig.setDistributionUrl(url);
    Alert.alert('Espace Staff', "Lien d'hébergement enregistré.");
  };

  const onResetUrl = async () => {
    await StaffConfig.setDistributionUrl('');
    setUrl(StaffConfig.getDefaultUrl());
    Alert.alert('Espace Staff', 'Lien réinitialisé (valeur du .env).');
  };

  const onToggleSkip = async (value: boolean) => {
    setSkip(value);
    await StaffConfig.setSkipDownload(value);
  };

  const onReload = () => {
    dispatch(setInitial({ initial: false }));
    dispatch(fetchInitialApp());
    navigation.replace('Initiation');
  };

  const onEnterNow = () => {
    navigation.replace('Main');
  };

  // ── Écran de connexion ──────────────────────────────────────────────
  if (!rank) {
    return (
      <MainContainer image={false}>
        <View style={styles.gate}>
          <Text style={styles.title}>Espace Staff</Text>
          <Text style={styles.subtitle}>
            Comptes créés par le fondateur (console Firebase) — mêmes accès
            que l'app AFRP Launcher.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Email staff"
            placeholderTextColor="rgba(255,255,255,0.5)"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="rgba(255,255,255,0.5)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <ButtonLauncher
            btnWidth={'100%'}
            background={'#00a86b'}
            onPress={onLogin}>
            {busy ? 'Connexion...' : 'Connexion staff'}
          </ButtonLauncher>
          <View style={{ height: 12 }} />
          <ButtonLauncher
            btnWidth={'100%'}
            background={'#16324a'}
            onPress={() => navigation.goBack()}>
            Retour
          </ButtonLauncher>
        </View>
      </MainContainer>
    );
  }

  // ── Logs de crash du jeu ───────────────────────────────────────────
  if (logs !== null) {
    return (
      <MainContainer image={false}>
        <View style={{ flex: 1, paddingTop: 8 }}>
          <View style={styles.threadHeader}>
            <TouchableOpacity onPress={() => setLogs(null)}>
              <Text style={styles.back}>‹ Retour</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onShareLogs}>
              <Text style={[styles.deleteBtn, { color: '#00c880' }]}>
                📤 Partager
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, marginTop: 8 }}>
            <Text style={styles.logText}>{logs}</Text>
          </ScrollView>
        </View>
      </MainContainer>
    );
  }

  // ── Fil support ouvert (staff) ─────────────────────────────────────
  if (openConvo) {
    return (
      <MainContainer image={false}>
        <View style={{ flex: 1, paddingTop: 8 }}>
          <View style={styles.threadHeader}>
            <TouchableOpacity onPress={() => setOpenConvo('')}>
              <Text style={styles.back}>‹ Retour aux conversations</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onDeleteConvo(openConvo, 'ce joueur')}>
              <Text style={styles.deleteBtn}>🗑 Supprimer</Text>
            </TouchableOpacity>
          </View>
          <SupportThread convoId={openConvo} role="staff" pseudo="Staff AFRP" />
        </View>
      </MainContainer>
    );
  }

  // ── Espace staff connecté ──────────────────────────────────────────
  return (
    <MainContainer image={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Espace Staff</Text>
          <Text style={styles.rank}>{RANK_LABEL[rank] ?? rank}</Text>
        </View>

        {/* En service */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>En service (visible du staff)</Text>
          <Switch
            value={enService}
            onValueChange={onToggleService}
            trackColor={{ false: '#16324a', true: '#00c880' }}
            thumbColor={'#ffffff'}
          />
        </View>

        {/* Annonce — fondateur */}
        {rank === 'fondateur' && (
          <>
            <Text style={styles.label}>Annonce (accueil de tous les joueurs)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex : Event ce soir 20h !"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={annonce}
              onChangeText={setAnnonce}
            />
            <ButtonLauncher
              btnWidth={'100%'}
              background={'#00a86b'}
              onPress={onSaveAnnonce}>
              Publier l'annonce
            </ButtonLauncher>

            {/* Actualité */}
            <Text style={styles.label}>📰 Publier une actualité</Text>
            <TextInput
              style={styles.input}
              placeholder="Titre de l'actu"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={newsTitle}
              onChangeText={setNewsTitle}
            />
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Contenu (facultatif)"
              placeholderTextColor="rgba(255,255,255,0.5)"
              multiline
              value={newsText}
              onChangeText={setNewsText}
            />
            <ButtonLauncher
              btnWidth={'100%'}
              background={'#00a86b'}
              onPress={onPublishNews}>
              Publier l'actualité
            </ButtonLauncher>

            {/* Mise à jour de l'app */}
            <Text style={styles.label}>🔔 Publier une mise à jour</Text>
            <Text style={styles.hint}>
              Numéro de version du nouvel APK (incrémente à chaque release) + lien
              de téléchargement. La cloche s'allume chez les joueurs plus anciens.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Numéro de version (ex : 3)"
              placeholderTextColor="rgba(255,255,255,0.5)"
              keyboardType="numeric"
              value={updCode}
              onChangeText={setUpdCode}
            />
            <TextInput
              style={styles.input}
              placeholder="Lien de l'APK (https://...)"
              placeholderTextColor="rgba(255,255,255,0.5)"
              autoCapitalize="none"
              keyboardType="url"
              value={updUrl}
              onChangeText={setUpdUrl}
            />
            <ButtonLauncher
              btnWidth={'100%'}
              background={'#00a86b'}
              onPress={onPublishUpdate}>
              Activer la cloche de MAJ
            </ButtonLauncher>
          </>
        )}

        {/* VIP */}
        <Text style={styles.label}>🎁 Donner VIP / Cash (serveur LVRP)</Text>
        <TextInput
          style={styles.input}
          placeholder="Pseudo exact (Prénom_Nom)"
          placeholderTextColor="rgba(255,255,255,0.5)"
          autoCapitalize="none"
          value={vipPseudo}
          onChangeText={setVipPseudo}
        />
        <View style={styles.rankRow}>
          {[1, 2, 3, 4].map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.rankChip, vipRank === r && styles.rankChipActive]}
              onPress={() => setVipRank(r)}>
              <Text
                style={[
                  styles.rankChipText,
                  vipRank === r && styles.rankChipTextActive,
                ]}>
                VIP {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="Cash bonus (0 = aucun)"
          placeholderTextColor="rgba(255,255,255,0.5)"
          keyboardType="numeric"
          value={vipCash}
          onChangeText={setVipCash}
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>VIP à vie (sinon mensuel)</Text>
          <Switch
            value={vipAVie}
            onValueChange={setVipAVie}
            trackColor={{ false: '#16324a', true: '#00c880' }}
            thumbColor={'#ffffff'}
          />
        </View>
        <ButtonLauncher btnWidth={'100%'} background={'#00a86b'} onPress={onGrantVip}>
          Attribuer le VIP
        </ButtonLauncher>

        {/* Support — boîte staff */}
        <Text style={styles.label}>📨 Conversations support ({convos.length})</Text>
        {convos.length === 0 && (
          <Text style={styles.hint}>Aucune conversation pour l'instant.</Text>
        )}
        {convos.map(c => (
          <View key={c.id} style={styles.convoRow}>
            <TouchableOpacity
              style={styles.convo}
              onPress={() => setOpenConvo(c.id)}>
              <Text style={styles.convoPseudo}>{c.pseudo}</Text>
              <Text style={styles.convoLast} numberOfLines={1}>
                {c.last || '(vide)'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.convoDelete}
              onPress={() => onDeleteConvo(c.id, c.pseudo)}>
              <Text style={styles.convoDeleteText}>🗑</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Outils fondateur */}
        {rank === 'fondateur' && (
          <>
            <Text style={styles.label}>⚙ Outils fondateur (ce téléphone)</Text>
            <Text style={styles.hint}>Lien d'hébergement (distribution.json)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://...r2.dev/mobile/distribution.json"
              placeholderTextColor="rgba(255,255,255,0.5)"
              autoCapitalize="none"
              keyboardType="url"
              value={url}
              onChangeText={setUrl}
            />
            <Text style={styles.hint}>Défaut (.env) : {defaultUrl}</Text>
            <View style={styles.row}>
              <ButtonLauncher btnWidth={'48%'} background={'#00a86b'} onPress={onSaveUrl}>
                Enregistrer
              </ButtonLauncher>
              <ButtonLauncher btnWidth={'48%'} background={'#16324a'} onPress={onResetUrl}>
                Réinitialiser
              </ButtonLauncher>
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>
                Entrer sans télécharger le modpack
              </Text>
              <Switch
                value={skip}
                onValueChange={onToggleSkip}
                trackColor={{ false: '#16324a', true: '#00c880' }}
                thumbColor={'#ffffff'}
              />
            </View>
            <View style={{ height: 10 }} />
            <ButtonLauncher btnWidth={'100%'} background={'#00c880'} onPress={onEnterNow}>
              Entrer dans l'app maintenant
            </ButtonLauncher>
            <View style={{ height: 10 }} />
            <ButtonLauncher btnWidth={'100%'} background={'#16324a'} onPress={onReload}>
              Relancer le chargement
            </ButtonLauncher>
          </>
        )}

        {/* Diagnostic : lit les logs de crash du jeu (écran noir au lancement) */}
        <Text style={styles.label}>🐞 Diagnostic jeu</Text>
        <ButtonLauncher btnWidth={'100%'} background={'#16324a'} onPress={onViewLogs}>
          Voir les logs du jeu (après un crash)
        </ButtonLauncher>

        <View style={{ height: 16 }} />
        <ButtonLauncher btnWidth={'100%'} background={'#5a2a2a'} onPress={onLogout}>
          Déconnexion staff
        </ButtonLauncher>
        <View style={{ height: 10 }} />
        <ButtonLauncher
          btnWidth={'100%'}
          background={'#16324a'}
          onPress={() => navigation.goBack()}>
          Retour
        </ButtonLauncher>
        <View style={{ height: 24 }} />
      </ScrollView>
    </MainContainer>
  );
});

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 6,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  rank: {
    color: '#00c880',
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginBottom: 20,
  },
  back: {
    color: '#00c880',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 24,
  },
  label: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 22,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    color: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    fontSize: 14,
  },
  hint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  switchLabel: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
    paddingRight: 12,
  },
  rankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rankChip: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#16324a',
    alignItems: 'center',
  },
  rankChipActive: {
    backgroundColor: '#00a86b',
  },
  rankChipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  rankChipTextActive: {
    color: '#ffffff',
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 4,
  },
  deleteBtn: {
    color: '#ff6b6b',
    fontSize: 13,
    marginTop: 24,
    fontWeight: '600',
  },
  convoRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 8,
  },
  convo: {
    flex: 1,
    backgroundColor: '#0d1a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e4a3a7f',
    padding: 12,
  },
  convoDelete: {
    width: 48,
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: '#3a1c26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convoDeleteText: {
    fontSize: 18,
  },
  logText: {
    color: '#a9c4d6',
    fontSize: 10,
    fontFamily: 'monospace',
    paddingBottom: 40,
  },
  convoPseudo: {
    color: '#35e8a9',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  convoLast: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
});
