import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_VERSION } from '@env';
import LinearGradient from 'react-native-linear-gradient';
import * as Progress from 'react-native-progress';
import { setUserNameSetting } from '../actions/settingsActions';
import { appLogoImg } from '../assets/images';
import { NewsFeed, useUpdateCheck } from '../components/News/NewsFeed';
import { GameSettings } from '../features/gameSettings';
import { formatSizeUnits } from '../helpers';
import { usePermisionFile } from '../hooks/usePermisionFile';
import { useSpaceDownlload } from '../hooks/useSpaceDownload';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import {
  selectCompare,
  selectLoaderDownload,
} from '../selectors/loaderSelectors';
import { selectUserName } from '../selectors/settingSelectors';
import { dbRef } from '../services/afrpDb';
import { fetchServers } from '../thunks/serverThunks';
import { fetchStartDownload } from '../thunks/loaderThunks';
import { fetchUserNameSetting } from '../thunks/settingsThunks';
import GtaSetupModule from '../modules/GtaSetupModule';

const { width } = Dimensions.get('window');

// Accueil façon AFRP Launcher (hero GTA V : logo, scrim, titre, pseudo, JOUER)
export const GameScreen = React.memo(() => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  const userName = useAppSelector(selectUserName);
  // Serveur AFRP = 1er de la distribution ; on lit son statut live par son id
  // (avant, ça passait par selectedServer=-1 non défini -> toujours "hors ligne")
  const distServer = useAppSelector(state => state.distribution.servers[0]);
  const server = useAppSelector(state =>
    state.distribution.servers[0]
      ? state.server.servers.find(
          el => el.id === state.distribution.servers[0].id,
        )
      : undefined,
  );

  // État du cache : combien de fichiers restent à télécharger + progression
  const needCount = useAppSelector(state => state.loader.needDownload.length);
  const compare = useAppSelector(selectCompare);
  const download = useAppSelector(selectLoaderDownload);
  const { fetchPermision } = usePermisionFile();
  const { fetchSpace } = useSpaceDownlload();

  const [pseudo, setPseudo] = useState(userName);
  const [needPseudo, setNeedPseudo] = useState(false);
  const [annonce, setAnnonce] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const update = useUpdateCheck();

  // Préférence "Mode Live" mémorisée
  useEffect(() => {
    AsyncStorage.getItem('afrp_live_mode').then(v => setLiveMode(v === '1'));
  }, []);

  const onToggleLive = useCallback(async (value: boolean) => {
    setLiveMode(value);
    await AsyncStorage.setItem('afrp_live_mode', value ? '1' : '0');
    // applique tout de suite si le jeu est déjà installé
    await GameSettings.patch({ voiceChat: !value });
  }, []);

  const onPressUpdate = useCallback(() => {
    Alert.alert(
      'Mise à jour disponible',
      'Une nouvelle version d\'AFRP est disponible. Mets à jour pour profiter des nouveautés.',
      [
        { text: 'Plus tard', style: 'cancel' },
        {
          text: 'Mettre à jour',
          onPress: () => update.url && Linking.openURL(update.url),
        },
      ],
    );
  }, [update.url]);

  useEffect(() => {
    dispatch(fetchServers());
    const t = setInterval(() => dispatch(fetchServers()), 30000);
    return () => clearInterval(t);
  }, []);

  // % de progression du téléchargement (octets déjà pris / octets à prendre)
  const percent =
    compare.needDownloadsCacheBytes > 0
      ? Math.min(
          100,
          Math.floor(
            ((download.downloadBytes || 0) * 100) /
              compare.needDownloadsCacheBytes,
          ),
        )
      : 0;

  // Annonce du jour (app_config/annonce — publiée depuis l'Espace Staff,
  // partagée avec l'app AFRP Launcher)
  useEffect(() => {
    try {
      const r = dbRef('app_config/annonce');
      const cb = r.on('value', snap => setAnnonce(String(snap.val() ?? '')));
      return () => r.off('value', cb);
    } catch (e) {
      return undefined;
    }
  }, []);

  useEffect(() => {
    setPseudo(userName);
  }, [userName]);

  const onEndPseudo = useCallback(() => {
    const clean = pseudo.trim();
    dispatch(setUserNameSetting({ userName: clean }));
    dispatch(fetchUserNameSetting(clean));
    if (clean.length > 0) {
      setNeedPseudo(false);
    }
  }, [pseudo]);

  // Bouton principal :
  //  - fichiers manquants -> télécharge (jauge intégrée), puis lance
  //  - tout est là         -> lance le jeu directement
  const onPressAction = useCallback(async () => {
    if (pseudo.trim().length < 1) {
      setNeedPseudo(true);
      return;
    }

    if (needCount > 0) {
      if (!fetchPermision()) {
        return;
      }
      if (!fetchSpace()) {
        return;
      }
      setDlError(false);
      setDownloading(true);
      await dispatch(fetchStartDownload({ silent: true }));
      setDownloading(false);
      return; // besoin de re-cliquer JOUER une fois le cache complet
    }

    // Écrit le pseudo + l'état du vocal dans le VRAI settings.json du jeu
    // (Mode Live ON => voice_chat false => micro libre pour le live TikTok)
    await GameSettings.patch({
      nickName: pseudo.trim(),
      voiceChat: !liveMode,
    });
    await GtaSetupModule.startGame();
  }, [pseudo, needCount, liveMode]);

  const btnLabel = downloading
    ? `TÉLÉCHARGEMENT ${percent}%`
    : needCount > 0
    ? dlError
      ? '↻  RÉESSAYER LE TÉLÉCHARGEMENT'
      : '⬇  INSTALLER & JOUER'
    : '▶  JOUER';

  const statusText = needPseudo
    ? 'Entre ton pseudo pour jouer'
    : downloading
    ? `${download.fileName ?? ''}  [${formatSizeUnits(
        download.downloadBytes || 0,
      )} / ${formatSizeUnits(compare.needDownloadsCacheBytes || 0)}]`
    : dlError
    ? 'Téléchargement interrompu — réessaie'
    : needCount > 0
    ? `Modpack AFRP à installer (${formatSizeUnits(
        compare.needDownloadsCacheBytes || 0,
      )})`
    : server?.loading
    ? 'Connexion au serveur...'
    : server?.status
    ? 'Prêt à jouer sur AFRP'
    : 'Serveur indisponible pour le moment';

  // Détecte un échec : après un cycle de DL, s'il reste des fichiers -> erreur
  useEffect(() => {
    if (!downloading && needCount > 0 && (download.downloadBytes || 0) > 0) {
      setDlError(true);
    }
  }, [downloading]);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}>
        {/* ═══ HERO cinématique (logo + fondu vers le fond sombre) ═══ */}
        <View style={styles.hero}>
          <Image source={appLogoImg} style={styles.heroImg} resizeMode="cover" />
          <LinearGradient
            colors={['#0c142400', '#0c142466', '#0c1424']}
            style={styles.heroScrim}
          />

          {/* Accès Espace Staff (chip, comme la cloche du launcher) */}
          <TouchableOpacity
            style={styles.chipStaff}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Staff')}>
            <Text style={styles.chipStaffText}>⚙</Text>
          </TouchableOpacity>

          {/* Cloche de mise à jour (point rouge si nouvelle version publiée) */}
          {update.available && (
            <TouchableOpacity
              style={styles.chipBell}
              activeOpacity={0.7}
              onPress={onPressUpdate}>
              <Text style={styles.chipStaffText}>🔔</Text>
              <View style={styles.bellDot} />
            </TouchableOpacity>
          )}

          {/* Badge joueurs en ligne (façon GTA Online) */}
          <View style={styles.badgeOnline}>
            <View
              style={[
                styles.dot,
                { backgroundColor: server?.status ? '#00ff88' : '#b63939' },
              ]}
            />
            <Text style={styles.badgeText}>
              {server?.loading
                ? '...'
                : server?.status
                ? `${server?.online ?? 0} joueurs en ligne`
                : 'hors ligne'}
            </Text>
          </View>

          {/* Titre par-dessus le bas du hero */}
          <Text style={styles.title}>AFRP</Text>
        </View>

        <Text style={styles.subtitle}>AFRIQUE FRANCOPHONE ROLEPLAY</Text>
        <View style={styles.divider} />

        {/* Annonce du jour */}
        {annonce.length > 0 && (
          <View style={styles.annonce}>
            <Text style={styles.annonceText}>📢  {annonce}</Text>
          </View>
        )}

        {/* Saisie pseudo */}
        <View style={styles.cardPseudo}>
          <Text style={styles.cardLabel}>PSEUDO EN JEU</Text>
          <TextInput
            style={[styles.input, needPseudo && styles.inputError]}
            placeholder="Votre_Pseudo"
            placeholderTextColor="#5a8a7a"
            value={pseudo}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
            onChangeText={setPseudo}
            onEndEditing={onEndPseudo}
          />
        </View>

        {/* Mode Live TikTok : libère le micro pour parler sur le live */}
        <View style={styles.liveRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.liveTitle}>🔴 Mode Live TikTok</Text>
            <Text style={styles.liveHint}>
              Coupe le vocal du jeu → tu parles sur ton live sans rien désactiver
            </Text>
          </View>
          <Switch
            value={liveMode}
            onValueChange={onToggleLive}
            trackColor={{ false: '#16324a', true: '#c8324a' }}
            thumbColor={'#ffffff'}
          />
        </View>

        {/* Statut */}
        <Text style={[styles.status, needPseudo && styles.statusError]}>
          {statusText}
        </Text>

        {/* Jauge de progression (visible seulement pendant le téléchargement) */}
        {downloading && (
          <View style={styles.gaugeWrap}>
            <Progress.Bar
              progress={percent / 100}
              animated
              useNativeDriver
              borderWidth={0}
              color={'#00c880'}
              unfilledColor={'#12283c'}
              borderRadius={20}
              height={8}
              width={width - 32}
            />
          </View>
        )}

        {/* Bouton principal */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.btnAction, downloading && styles.btnActionBusy]}
          disabled={downloading}
          onPress={onPressAction}>
          <Text style={styles.btnActionText}>{btnLabel}</Text>
        </TouchableOpacity>

        <Text style={styles.serverLine}>
          {distServer?.address ?? '51.38.205.167:24328'}
          {'  •  '}SAMP {distServer?.sampVersion ?? '0.3.7'}
          {'  •  '}v{APP_VERSION}
        </Text>

        {/* Actualités du projet (Firebase, publiées par le fondateur) */}
        <View style={styles.news}>
          <NewsFeed />
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0c1424',
  },
  hero: {
    width: width,
    height: 290,
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  chipStaff: {
    position: 'absolute',
    top: 44,
    left: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#060d14cc',
    borderWidth: 1,
    borderColor: '#1e4a3a7f',
  },
  chipStaffText: {
    color: '#00c880',
    fontSize: 15,
  },
  chipBell: {
    position: 'absolute',
    top: 44,
    left: 60,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#060d14cc',
    borderWidth: 1,
    borderColor: '#1e4a3a7f',
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#ff3b3b',
  },
  badgeOnline: {
    position: 'absolute',
    top: 44,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#060d14cc',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#1e4a3a7f',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    color: '#00ff88',
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: 'sans-serif-condensed',
  },
  title: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    color: '#ffffff',
    fontSize: 58,
    fontWeight: 'bold',
    fontStyle: 'italic',
    fontFamily: 'sans-serif-condensed',
    textShadowColor: '#000000cc',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
  subtitle: {
    color: '#00c880',
    fontSize: 11,
    letterSpacing: 3,
    marginLeft: 22,
    marginTop: 2,
    fontFamily: 'sans-serif-condensed',
  },
  divider: {
    width: 46,
    height: 3,
    backgroundColor: '#00c880',
    marginLeft: 22,
    marginTop: 8,
    borderRadius: 2,
  },
  annonce: {
    backgroundColor: '#0d1a2a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#00c88055',
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  annonceText: {
    color: '#35e8a9',
    fontSize: 12,
    fontFamily: 'sans-serif-condensed',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1a2a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c8324a55',
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  liveTitle: {
    color: '#ff6b8a',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'sans-serif-condensed',
  },
  liveHint: {
    color: '#5a8a7a',
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'sans-serif-condensed',
  },
  cardPseudo: {
    backgroundColor: '#0d1a2a',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#00c88033',
    marginHorizontal: 16,
    marginTop: 18,
    padding: 12,
  },
  cardLabel: {
    color: '#00c880',
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 6,
    fontFamily: 'sans-serif-condensed',
  },
  input: {
    backgroundColor: '#111c2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00c88055',
    color: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'sans-serif-condensed',
  },
  inputError: {
    borderColor: '#b63939',
  },
  status: {
    color: '#5a8a7a',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 16,
    fontFamily: 'sans-serif-condensed',
  },
  statusError: {
    color: '#ff7a7a',
  },
  gaugeWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  btnAction: {
    height: 58,
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#00a86b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActionBusy: {
    backgroundColor: '#0a5030',
  },
  btnActionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 2,
    fontFamily: 'sans-serif-condensed',
  },
  serverLine: {
    color: '#2a4a35',
    fontSize: 9,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'sans-serif-condensed',
  },
  news: {
    marginTop: 18,
  },
});
