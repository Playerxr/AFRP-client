import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const [otherTyping, setOtherTyping] = useState(false);
  const lastTyping = useRef(0);

  const other = role === 'staff' ? 'player' : 'staff';

  // Écoute "l'autre partie est en train d'écrire"
  useEffect(() => {
    if (!convoId) {
      return undefined;
    }
    try {
      const r = dbRef(`support_chats/${convoId}/typing/${other}`);
      const cb = r.on('value', snap => {
        const ts = snap.val();
        setOtherTyping(typeof ts === 'number' && ts > Date.now() - 6000);
      });
      const t = setInterval(() => {
        r.once('value', snap => {
          const ts = snap.val();
          setOtherTyping(typeof ts === 'number' && ts > Date.now() - 6000);
        });
      }, 3000);
      return () => {
        r.off('value', cb);
        clearInterval(t);
      };
    } catch (e) {
      return undefined;
    }
  }, [convoId, other]);

  const onChangeText = useCallback(
    (value: string) => {
      setText(value);
      const now = Date.now();
      if (now - lastTyping.current > 1500) {
        lastTyping.current = now;
        try {
          const r = dbRef(`support_chats/${convoId}/typing/${role}`);
          r.set(now);
          r.onDisconnect().remove();
        } catch (e) {}
      }
    },
    [convoId, role],
  );

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
      dbRef(`support_chats/${convoId}/typing/${role}`).remove();
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
      {otherTyping && (
        <Text style={styles.typing}>
          {role === 'staff' ? 'Le joueur écrit...' : 'Le staff écrit...'}
        </Text>
      )}
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
          onChangeText={onChangeText}
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
  typing: {
    color: '#00c880',
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 4,
    marginLeft: 4,
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
