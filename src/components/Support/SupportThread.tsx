import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { dbRef } from '../../services/afrpDb';

type SupportMsg = {
  id: string;
  sender: string; // 'player' | 'staff'
  pseudo: string;
  text: string;
  ts: number;
};

type SupportThreadProps = {
  convoId: string;
  role: 'player' | 'staff';
  pseudo: string; // pseudo du joueur (côté player) — le staff écrit "Staff AFRP"
};

// Fil support AFRP — même nœud que le launcher : support_chats/{convoId}/messages
export const SupportThread = React.memo((props: SupportThreadProps) => {
  const { convoId, role, pseudo } = props;

  const [msgs, setMsgs] = useState<SupportMsg[]>([]);
  const [text, setText] = useState('');
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (!convoId) {
      return undefined;
    }
    try {
      const r = dbRef(`support_chats/${convoId}/messages`).limitToLast(100);
      const cb = r.on('value', snap => {
        const list: SupportMsg[] = [];
        snap.forEach(child => {
          const v = child.val() || {};
          list.push({
            id: child.key ?? `${Math.random()}`,
            sender: v.sender ?? 'player',
            pseudo: v.pseudo ?? '?',
            text: v.text ?? '',
            ts: v.timestamp ?? 0,
          });
          return undefined;
        });
        list.sort((a, b) => b.ts - a.ts);
        setMsgs(list);
      });
      return () => r.off('value', cb);
    } catch (e) {
      setHint('Support indisponible (connexion Firebase)');
      return undefined;
    }
  }, [convoId]);

  const onSend = useCallback(() => {
    const value = text.trim();
    if (value.length < 1 || value.length > 1000) {
      return;
    }
    if (role === 'player' && pseudo.trim().length < 3) {
      setHint("Configure ton pseudo dans l'onglet Accueil d'abord");
      return;
    }
    try {
      dbRef(`support_chats/${convoId}/messages`).push({
        sender: role,
        pseudo: role === 'staff' ? 'Staff AFRP' : pseudo.trim(),
        text: value,
        timestamp: Date.now(),
      });
      setText('');
      setHint('');
    } catch (e) {
      setHint('Message non envoyé (connexion ?)');
    }
  }, [text, convoId, role, pseudo]);

  const renderItem = useCallback(
    ({ item }: { item: SupportMsg }) => {
      const staff = item.sender === 'staff';
      const mine = (role === 'staff') === staff;
      return (
        <View style={[styles.msg, mine && styles.msgMe]}>
          <Text style={[styles.msgPseudo, staff && styles.msgPseudoStaff]}>
            {staff ? '🛡 Staff AFRP' : item.pseudo}
          </Text>
          <Text style={styles.msgText}>{item.text}</Text>
        </View>
      );
    },
    [role],
  );

  return (
    <View style={styles.root}>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 8 }}
        data={msgs}
        inverted
        keyExtractor={item => item.id}
        renderItem={renderItem}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
      />
      {hint.length > 0 && <Text style={styles.hint}>{hint}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={
            role === 'staff' ? 'Réponse du staff...' : 'Explique ton problème...'
          }
          placeholderTextColor="#5a8a7a"
          value={text}
          maxLength={1000}
          onChangeText={setText}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={onSend}>
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  msg: {
    backgroundColor: '#0d1a2a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e4a3a7f',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 3,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  msgMe: {
    alignSelf: 'flex-end',
    backgroundColor: '#0a3d2a',
    borderColor: '#00c88055',
  },
  msgPseudo: {
    color: '#35e8a9',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
    fontFamily: 'sans-serif-condensed',
  },
  msgPseudoStaff: {
    color: '#00ff88',
  },
  msgText: {
    color: '#ffffff',
    fontSize: 14,
  },
  hint: {
    color: '#ff7a7a',
    fontSize: 11,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#111c2e',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#00c88055',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00a86b',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 18,
  },
});
