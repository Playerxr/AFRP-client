import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { dbRef } from '../../services/afrpDb';

type NewsItem = { id: string; title: string; text: string; ts: number };

// Fil d'actualités AFRP — nœud RTDB "news", publié par le fondateur depuis
// l'Espace Staff, partagé avec l'app AFRP Launcher.
export const NewsFeed = React.memo(() => {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    try {
      const r = dbRef('news').limitToLast(8);
      const cb = r.on('value', snap => {
        const list: NewsItem[] = [];
        snap.forEach(child => {
          const v = child.val() || {};
          list.push({
            id: child.key ?? `${Math.random()}`,
            title: v.title ?? '',
            text: v.text ?? '',
            ts: v.timestamp ?? 0,
          });
          return undefined;
        });
        list.sort((a, b) => b.ts - a.ts);
        setNews(list);
      });
      return () => r.off('value', cb);
    } catch (e) {
      return undefined;
    }
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>Actualités</Text>
      {news.length === 0 && (
        <Text style={styles.empty}>Pas encore d'actualité.</Text>
      )}
      {news.map(n => (
        <View key={n.id} style={styles.card}>
          <Text style={styles.cardTitle}>{n.title || '(sans titre)'}</Text>
          {n.text.length > 0 && <Text style={styles.cardText}>{n.text}</Text>}
          {n.ts > 0 && (
            <Text style={styles.cardDate}>
              {new Date(n.ts).toLocaleDateString('fr-FR')}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
});

// Détection de mise à jour : compare app_config/latest_version_code au
// versionCode de l'APK installé. Renvoie l'URL de l'APK à télécharger.
export function useUpdateCheck() {
  const [state, setState] = useState<{ available: boolean; url: string }>({
    available: false,
    url: '',
  });

  useEffect(() => {
    let current = 0;
    try {
      current = parseInt(DeviceInfo.getBuildNumber(), 10) || 0;
    } catch (e) {}
    try {
      const r = dbRef('app_config');
      const cb = r.on('value', snap => {
        const v = snap.val() || {};
        const latest = Number(v.latest_version_code || 0);
        setState({
          available: latest > current,
          url: String(v.apk_url || ''),
        });
      });
      return () => r.off('value', cb);
    } catch (e) {
      return undefined;
    }
  }, []);

  return state;
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
  },
  header: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'sans-serif-condensed',
    marginBottom: 10,
  },
  empty: {
    color: '#5a8a7a',
    fontSize: 12,
    fontFamily: 'sans-serif-condensed',
  },
  card: {
    backgroundColor: '#0d1a2a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e4a3a7f',
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    color: '#35e8a9',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'sans-serif-condensed',
  },
  cardText: {
    color: '#d4ddff',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  cardDate: {
    color: '#5a8a7a',
    fontSize: 10,
    marginTop: 6,
  },
});
