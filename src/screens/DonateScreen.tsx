import { LINK_DISCORD } from '@env';
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppSelector } from '../hooks/useAppSelector';
import { selectUserName } from '../selectors/settingSelectors';
import { dbRef } from '../services/afrpDb';

// Boutique AFRP — mêmes offres et mêmes prix que l'app AFRP Launcher.
// [nom, emoji, prix mensuel, prix à vie, cash bonus, description]
const VIP_DATA: [string, string, string, string, string, string][] = [
  [
    'VIP BRONZE',
    '🥉',
    '5 000 XOF',
    '10 000 XOF',
    '+ 1 000 000 $',
    'Salaires +10% • Accès /vchat • +1 slot véhicule',
  ],
  [
    'VIP ARGENT',
    '🥈',
    '8 000 XOF',
    '20 000 XOF',
    '+ 1 750 000 $',
    'Salaires +20% • Paycheck +500$ • +2 slots • Skin exclusif',
  ],
  [
    'VIP OR',
    '🥇',
    '15 000 XOF',
    '35 000 XOF',
    '+ 12 000 000 $',
    'Salaires +25% • Slot réservé • /neon • N° rare • +3 slots',
  ],
  [
    'VIP DIAMANT',
    '💎',
    '20 000 XOF',
    '50 000 XOF',
    '+ 25 000 000 $',
    'Salaires +35% • Véhicule VIP • Namechange 1x/mois • +5 slots',
  ],
];

// [nom, emoji, prix, cash crédité, bonus]
const CASH_DATA: [string, string, string, string, string][] = [
  ['Pack Civil', '👮', '5 000 XOF', '3 250 000 $', ''],
  ['Pack Gangster', '🔫', '5 000 XOF', '11 000 000 $', '+375 000 $ offerts'],
  ['Pack Business', '💼', '10 000 XOF', '15 000 000 $', '+3 750 000 $ offerts'],
  [
    'Pack Millionnaire',
    '🤑',
    '18 000 XOF',
    '25 000 000 $',
    '+12 750 000 $ offerts',
  ],
  ['Pack Parrain', '👑', '35 000 XOF', '75 000 000 $', 'Bonus XXL offert'],
];

export const DonateScreen = React.memo(() => {
  const [tab, setTab] = useState<'vip' | 'cash'>('vip');
  const userName = useAppSelector(selectUserName);

  const openDiscord = () => {
    Linking.openURL(LINK_DISCORD).catch(() => {});
  };

  // Envoie une demande d'achat (pseudo + pack choisi) que le staff voit dans
  // Espace Staff, pour éviter les erreurs de pseudo tapées à la main sur
  // Discord. Le paiement reste manuel (Discord/mobile money).
  const onBuyCash = (pack: string, prix: string) => {
    const pseudo = userName.trim();
    if (pseudo.length < 3) {
      Alert.alert(
        'Pseudo requis',
        "Configure ton pseudo dans l'onglet Réglages avant d'acheter, pour qu'on sache à qui attribuer le cash.",
      );
      return;
    }
    try {
      dbRef('purchase_requests').push({
        pseudo,
        pack,
        prix,
        ts: Date.now(),
      });
    } catch (e) {}
    openDiscord();
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Boutique AFRP</Text>
      <Text style={styles.subtitle}>
        Paiement via Discord — Wave • Orange Money • MTN • Moov
      </Text>

      {/* Onglets VIP / Cash */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'vip' && styles.tabActive]}
          onPress={() => setTab('vip')}>
          <Text style={[styles.tabText, tab === 'vip' && styles.tabTextActive]}>
            ⭐ VIP
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'cash' && styles.tabActive]}
          onPress={() => setTab('cash')}>
          <Text style={[styles.tabText, tab === 'cash' && styles.tabTextActive]}>
            💵 Cash
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110, paddingTop: 8 }}>
        {tab === 'vip'
          ? VIP_DATA.map((d, i) => (
              <View
                key={d[0]}
                style={[styles.card, i === 2 && styles.cardPopular]}>
                {i === 2 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>⭐ POPULAIRE</Text>
                  </View>
                )}
                <View style={styles.cardHeader}>
                  <Text style={styles.emoji}>{d[1]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{d[0]}</Text>
                    <Text style={styles.cardBonus}>{d[4]} en jeu</Text>
                  </View>
                </View>
                <Text style={styles.cardDesc}>{d[5]}</Text>
                <View style={styles.priceRow}>
                  <View style={styles.pricePill}>
                    <Text style={styles.priceLabel}>MENSUEL</Text>
                    <Text style={styles.priceVal}>{d[2]}</Text>
                  </View>
                  <View style={styles.pricePill}>
                    <Text style={styles.priceLabel}>À VIE</Text>
                    <Text style={styles.priceVal}>{d[3]}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.buyBtn} onPress={openDiscord}>
                  <Text style={styles.buyBtnText}>
                    Payer {d[2]} — Ouvrir Discord
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          : CASH_DATA.map(d => (
              <View key={d[0]} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.emoji}>{d[1]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{d[0]}</Text>
                    <Text style={styles.cardBonus}>{d[3]} en jeu</Text>
                  </View>
                </View>
                {d[4].length > 0 && (
                  <Text style={styles.cardDesc}>🎁 {d[4]}</Text>
                )}
                <View style={styles.priceRow}>
                  <View style={[styles.pricePill, { flex: 1 }]}>
                    <Text style={styles.priceLabel}>PRIX</Text>
                    <Text style={styles.priceVal}>{d[2]}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.buyBtn}
                  onPress={() => onBuyCash(d[0], d[2])}>
                  <Text style={styles.buyBtnText}>
                    Acheter {d[2]} — Ouvrir Discord
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0c1424',
    paddingTop: 48,
    paddingHorizontal: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    paddingHorizontal: 2,
  },
  subtitle: {
    color: '#5a8a7a',
    fontSize: 10,
    fontFamily: 'monospace',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  tabs: {
    flexDirection: 'row',
    height: 44,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0d1a2a',
    marginHorizontal: 3,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#0a5030',
  },
  tabText: {
    color: '#5a8a7a',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#0d1a2a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e4a3a7f',
    padding: 14,
    marginTop: 10,
    marginHorizontal: 2,
  },
  cardPopular: {
    borderColor: '#00c880',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: '#00c880',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 26,
    marginRight: 12,
  },
  cardName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  cardBonus: {
    color: '#35e8a9',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  cardDesc: {
    color: '#a9c4d6',
    fontSize: 11,
    marginTop: 8,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  pricePill: {
    flex: 1,
    backgroundColor: '#111c2e',
    borderRadius: 10,
    paddingVertical: 8,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  priceLabel: {
    color: '#5a8a7a',
    fontSize: 8,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  priceVal: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  buyBtn: {
    backgroundColor: '#0a5030',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
});
