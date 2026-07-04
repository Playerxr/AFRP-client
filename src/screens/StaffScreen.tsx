import { STAFF_PASSWORD } from '@env';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { setInitial } from '../actions/appActions';
import { ButtonLauncher, MainContainer } from '../components';
import { StaffConfig } from '../features/staffConfig';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchInitialApp } from '../thunks/appThunks';

type StaffScreenType = NativeStackScreenProps<any>;

export const StaffScreen = React.memo(({ navigation }: StaffScreenType) => {
  const dispatch = useAppDispatch();

  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');

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

  const onUnlock = () => {
    if (password === STAFF_PASSWORD) {
      setUnlocked(true);
    } else {
      Alert.alert('Espace Staff', 'Mot de passe incorrect.');
    }
  };

  const onSaveUrl = async () => {
    await StaffConfig.setDistributionUrl(url);
    Alert.alert('Espace Staff', 'Lien d\'hébergement enregistré.');
  };

  const onResetUrl = async () => {
    await StaffConfig.setDistributionUrl('');
    const def = StaffConfig.getDefaultUrl();
    setUrl(def);
    Alert.alert('Espace Staff', 'Lien réinitialisé (valeur du .env).');
  };

  const onToggleSkip = async (value: boolean) => {
    setSkip(value);
    await StaffConfig.setSkipDownload(value);
  };

  // Relance le chargement complet (avec la nouvelle URL / le nouveau flag skip)
  const onReload = () => {
    dispatch(setInitial({ initial: false }));
    dispatch(fetchInitialApp());
    navigation.replace('Initiation');
  };

  // Entre directement dans l'app sans rien télécharger (gestion rapide)
  const onEnterNow = () => {
    navigation.replace('Main');
  };

  if (!unlocked) {
    return (
      <MainContainer image={false}>
        <View style={styles.gate}>
          <Text style={styles.title}>Espace Staff</Text>
          <Text style={styles.subtitle}>Réservé au fondateur</Text>
          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            placeholderTextColor="rgba(255,255,255,0.5)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <ButtonLauncher btnWidth={'100%'} background={'#5476db'} onPress={onUnlock}>
            Déverrouiller
          </ButtonLauncher>
          <View style={{ height: 12 }} />
          <ButtonLauncher
            btnWidth={'100%'}
            background={'#3a3f52'}
            onPress={() => navigation.goBack()}>
            Retour
          </ButtonLauncher>
        </View>
      </MainContainer>
    );
  }

  return (
    <MainContainer image={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Espace Staff</Text>

        {/* Lien d'hébergement */}
        <Text style={styles.label}>Lien d'hébergement (distribution.json)</Text>
        <TextInput
          style={styles.input}
          placeholder="https://votre-bucket.r2.dev/mobile/distribution.json"
          placeholderTextColor="rgba(255,255,255,0.5)"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={url}
          onChangeText={setUrl}
        />
        <Text style={styles.hint}>Défaut (.env) : {defaultUrl}</Text>
        <View style={styles.row}>
          <ButtonLauncher btnWidth={'48%'} background={'#5476db'} onPress={onSaveUrl}>
            Enregistrer
          </ButtonLauncher>
          <ButtonLauncher btnWidth={'48%'} background={'#3a3f52'} onPress={onResetUrl}>
            Réinitialiser
          </ButtonLauncher>
        </View>

        {/* Skip download */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>
            Entrer sans télécharger le modpack
          </Text>
          <Switch
            value={skip}
            onValueChange={onToggleSkip}
            trackColor={{ false: '#3a3f52', true: '#5476db' }}
            thumbColor={'#ffffff'}
          />
        </View>
        <Text style={styles.hint}>
          Gestion rapide : saute les ~4 Go de cache au prochain chargement.
        </Text>

        {/* Actions */}
        <View style={{ height: 18 }} />
        <ButtonLauncher btnWidth={'100%'} background={'#4caf78'} onPress={onEnterNow}>
          Entrer dans l'app maintenant
        </ButtonLauncher>
        <View style={{ height: 12 }} />
        <ButtonLauncher btnWidth={'100%'} background={'#5476db'} onPress={onReload}>
          Relancer le chargement
        </ButtonLauncher>
        <View style={{ height: 12 }} />
        <ButtonLauncher
          btnWidth={'100%'}
          background={'#3a3f52'}
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
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 20,
  },
  label: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 18,
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
    marginTop: 24,
  },
  switchLabel: {
    color: '#ffffff',
    fontSize: 15,
    flex: 1,
    paddingRight: 12,
  },
});
