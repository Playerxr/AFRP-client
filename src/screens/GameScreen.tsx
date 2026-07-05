import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
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
import { Cards } from '../components/Card/Cards';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { selectSelectedServer } from '../selectors/appSelectors';
import { selectServer } from '../selectors/serverSelectors';
import { selectUserName } from '../selectors/settingSelectors';
import { fetchServers } from '../thunks/serverThunks';
import { fetchUserNameSetting } from '../thunks/settingsThunks';
import GtaSetupModule from '../modules/GtaSetupModule';

const { width } = Dimensions.get('window');

// Accueil façon AFRP Launcher (hero GTA V : logo, scrim, titre, pseudo, JOUER)
export const GameScreen = React.memo(() => {
  const dispatch = useAppDispatch();

  const userName = useAppSelector(selectUserName);
  const selectedServer = useAppSelector(selectSelectedServer);
  const server = useAppSelector(state => selectServer(state, selectedServer));
  const distServer = useAppSelector(
    state =>
      state.distribution.servers.find(el => el.id === selectedServer) ??
      state.distribution.servers[0],
  );

  const [pseudo, setPseudo] = useState(userName);
  const [needPseudo, setNeedPseudo] = useState(false);

  useEffect(() => {
    dispatch(fetchServers());
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

  const onPressPlay = useCallback(async () => {
    if (pseudo.trim().length < 1) {
      setNeedPseudo(true);
      return;
    }
    await GtaSetupModule.startGame();
  }, [pseudo]);

  const statusText = needPseudo
    ? 'Entre ton pseudo pour jouer'
    : server?.loading
    ? 'Connexion au serveur...'
    : server?.status
    ? 'Prêt à jouer sur AFRP'
    : 'Serveur indisponible pour le moment';

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

        {/* Statut */}
        <Text style={[styles.status, needPseudo && styles.statusError]}>
          {statusText}
        </Text>

        {/* Bouton principal */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.btnAction}
          onPress={onPressPlay}>
          <Text style={styles.btnActionText}>▶  JOUER</Text>
        </TouchableOpacity>

        <Text style={styles.serverLine}>
          {distServer?.address ?? '51.38.205.167:24328'}
          {'  •  '}SAMP {distServer?.sampVersion ?? '0.3.7'}
        </Text>

        {/* Actualités du projet */}
        <View style={styles.news}>
          <Cards />
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
  btnAction: {
    height: 58,
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#00a86b',
    alignItems: 'center',
    justifyContent: 'center',
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
