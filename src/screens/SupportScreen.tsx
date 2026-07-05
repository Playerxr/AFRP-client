import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { SupportThread } from '../components/Support/SupportThread';
import { useAppSelector } from '../hooks/useAppSelector';
import { selectUserName } from '../selectors/settingSelectors';

// Support joueur — même modèle que le launcher : une conversation par appareil
// (support_chats/{ANDROID_ID}), le staff répond depuis l'un ou l'autre app.
export const SupportScreen = React.memo(() => {
  const userName = useAppSelector(selectUserName);
  const [convoId, setConvoId] = useState('');

  useEffect(() => {
    DeviceInfo.getAndroidId()
      .then(id => setConvoId(id || 'inconnu'))
      .catch(() => setConvoId('inconnu'));
  }, []);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Support AFRP</Text>
      <Text style={styles.subtitle}>
        Explique ton problème, un membre du staff te répondra ici.
      </Text>
      {convoId.length > 0 && (
        <SupportThread convoId={convoId} role="player" pseudo={userName} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0c1424',
    paddingTop: 48,
    paddingHorizontal: 12,
    paddingBottom: 96,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'sans-serif-condensed',
  },
  subtitle: {
    color: '#5a8a7a',
    fontSize: 11,
    marginBottom: 8,
    fontFamily: 'sans-serif-condensed',
  },
});
