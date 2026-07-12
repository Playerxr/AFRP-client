import { LINK_DISCORD } from '@env';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { setUserNameSetting } from '../actions/settingsActions';
import { appLogoImg } from '../assets/images';
import { NewsFeed, useUpdateCheck } from '../components/News/NewsFeed';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { usePermisionFile } from '../hooks/usePermisionFile';
import { selectLoaderDownload } from '../selectors/loaderSelectors';
import { selectUserName } from '../selectors/settingSelectors';
import { dbRef } from '../services/afrpDb';
import { startGameDownload } from '../thunks/loaderThunks';
import { fetchServers } from '../thunks/serverThunks';
import { fetchUserNameSetting } from '../thunks/settingsThunks';

const { width } = Dimensions.get('window');

// Accueil communauté AFRP (hero façon launcher). Le JEU se joue via un APK
// séparé (moteur dédié) : le bouton ci-dessous vérifie/télécharge d'abord le
// modpack (anti-doublon, ne prend que ce qui manque) puis ouvre le lien de
// téléchargement du jeu, configurable à distance (app_config/game_url) sinon
// le Discord.
export const GameScreen = React.memo(() => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();

  const userName = useAppSelector(selectUserName);
  const distServer = useAppSelector(state => state.distribution.servers[0]);
  const server = useAppSelector(state =>
    state.distribution.servers[0]
      ? state.server.servers.find(
          el => el.id === state.distribution.servers[0].id,
        )
      : undefined,
  );

  const [pseudo, setPseudo] = useState(userName);
  const [annonce, setAnnonce] = useState('');
  const [gameUrl, setGameUrl] = useState('');
  const [preparing, setPreparing] = useState(false);
  const update = useUpdateCheck();
  const { fetchPermision } = usePermisionFile();
  const downloading = useAppSelector(state => state.loader.downloading);
  const downloadProgress = useAppSelector(selectLoaderDownload);

  useEffect(() => {
    setPseudo(userName);
  }, [userName]);

  // Statut serveur (rafraîchi toutes les 30 s)
  useEffect(() => {
    dispatch(fetchServers());
    const t = setInterval(() => dispatch(fetchServers()), 30000);
    return () => clearInterval(t);
  }, []);

  // Annonce + lien de téléchargement du jeu (config à distance)
  useEffect(() => {
    const rA = dbRef('app_config/annonce');
    const cbA = rA.on('value', s => setAnnonce(String(s.val() ?? '')));
    const rG = dbRef('app_config/game_url');
    const cbG = rG.on('value', s => setGameUrl(String(s.val() ?? '')));
    return () => {
      rA.off('value', cbA);
      rG.off('value', cbG);
    };
  }, []);

  const onEndPseudo = useCallback(() => {
    const clean = pseudo.trim();
    dispatch(setUserNameSetting({ userName: clean }));
    dispatch(fetchUserNameSetting(clean));
  }, [pseudo]);

  const onDownloadGame = useCallback(async () => {
    if (preparing || downloading) {
      return;
    }
    if (!fetchPermision()) {
      return;
    }

    setPreparing(true);
    try {
      // Vérifie d'abord les fichiers du modpack déjà présents sur le
      // téléphone (anti-doublon) et ne télécharge que ce qui manque, avant
      // d'ouvrir le lien du jeu (sinon Discord si non configuré).
      const result = await dispatch(startGameDownload());
      if (result === 'ready') {
        Linking.openURL(
          gameUrl && gameUrl.length > 5 ? gameUrl : LINK_DISCORD,
        ).catch(() => {});
      } else if (result === 'no_space') {
        // AlertSpace (redux) n'est monté que sur Staff/Réglages, pas sur
        // l'accueil : on prévient quand même l'utilisateur ici.
        Alert.alert(
          'Espace insuffisant',
          "Pas assez d'espace libre pour télécharger le modpack. Libère de la place et réessaie.",
        );
      } else if (result === 'download_failed') {
        Alert.alert(
          'Téléchargement',
          "Le modpack n'a pas pu être téléchargé entièrement (connexion ?). Réessaie.",
        );
      }
    } finally {
      setPreparing(false);
    }
  }, [gameUrl, preparing, downloading, fetchPermision]);

  const downloadLabel = downloading
    ? `⬇  TÉLÉCHARGEMENT DU MODPACK… ${
        downloadProgress.needBytes
          ? Math.floor(
              ((downloadProgress.currentBytes || 0) * 100) /
                downloadProgress.needBytes,
            )
          : 0
      }%`
    : preparing
    ? '⬇  VÉRIFICATION DES FICHIERS…'
    : '⬇  TÉLÉCHARGER LE JEU';

  const onPressUpdate = useCallback(() => {
    update.url && Linking.openURL(update.url).catch(() => {});
  }, [update.url]);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}>
        {/* ═══ HERO ═══ */}
        <View style={styles.hero}>
          <Image source={appLogoImg} style={styles.heroImg} resizeMode="cover" />
          <LinearGradient
            colors={['#0c142400', '#0c142466', '#0c1424']}
            style={styles.heroScrim}
          />

          {/* Accès Espace Staff */}
          <TouchableOpacity
            style={styles.chipStaff}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Staff')}>
            <Text style={styles.chipStaffText}>⚙</Text>
          </TouchableOpacity>

          {/* Cloche de mise à jour */}
          {update.available && (
            <TouchableOpacity
              style={styles.bell}
              activeOpacity={0.7}
              onPress={onPressUpdate}>
              <Text style={styles.bellText}>🔔</Text>
              <View style={styles.bellDot} />
            </TouchableOpacity>
          )}

          {/* Badge joueurs en ligne */}
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

        {/* Pseudo (identité chat/support) */}
        <View style={styles.cardPseudo}>
          <Text style={styles.cardLabel}>TON PSEUDO</Text>
          <TextInput
            style={styles.input}
            placeholder="Prénom_Nom"
            placeholderTextColor="#5a8a7a"
            value={pseudo}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
            onChangeText={setPseudo}
            onEndEditing={onEndPseudo}
          />
        </View>

        {/* Bouton principal : télécharger le jeu */}
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={preparing || downloading}
          style={[
            styles.btnAction,
            (preparing || downloading) && styles.btnActionDisabled,
          ]}
          onPress={onDownloadGame}>
          <Text style={styles.btnActionText}>{downloadLabel}</Text>
        </TouchableOpacity>

        <Text style={styles.serverLine}>
          Serveur : {distServer?.address ?? '51.38.205.167:24328'}
          {'  •  '}SAMP {distServer?.sampVersion ?? '0.3.7'}
        </Text>

        {/* Actualités */}
        <View style={styles.news}>
          <NewsFeed />
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c1424' },
  hero: { width: width, height: 290 },
  heroImg: { width: '100%', height: '100%' },
  heroScrim: { ...StyleSheet.absoluteFillObject },
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
  chipStaffText: { color: '#00c880', fontSize: 15 },
  bell: {
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
  bellText: { fontSize: 15 },
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
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
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
  cardPseudo: {
    backgroundColor: '#0d1a2a',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#00c88033',
    marginHorizontal: 16,
    marginTop: 14,
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
  btnAction: {
    height: 58,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    backgroundColor: '#00a86b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActionDisabled: {
    opacity: 0.6,
  },
  btnActionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1,
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
  news: { marginTop: 18 },
});
