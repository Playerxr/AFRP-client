import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppSelector } from '../hooks/useAppSelector';
import { selectUserName } from '../selectors/settingSelectors';
import { dbRef, safeKey, StaffSession } from '../services/afrpDb';

type ChatMsg = {
  id: string;
  pseudo: string;
  text: string;
  ts: number;
  type: string;
};

// Ligne mémoïsée : seul un nouveau message re-rend sa ligne, pas toute la liste
const MessageRow = React.memo(
  ({ item, me }: { item: ChatMsg; me: string }) => {
    const isMe = item.pseudo === me && me.length > 0;
    const isAdmin = item.type === 'admin';
    return (
      <View style={[styles.msg, isMe && styles.msgMe]}>
        <Text
          style={[
            styles.msgPseudo,
            isAdmin && styles.msgPseudoAdmin,
            isMe && styles.msgPseudoMe,
          ]}>
          {isAdmin ? `🛡 ${item.pseudo}` : item.pseudo}
        </Text>
        <Text style={styles.msgText}>{item.text}</Text>
      </View>
    );
  },
  (prev, next) => prev.item.id === next.item.id && prev.me === next.me,
);

// Chat global AFRP — même nœud RTDB que l'app AFRP Launcher (global_chat).
export const ChatScreen = React.memo(() => {
  const userName = useAppSelector(selectUserName);

  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState<string[]>([]);
  const [hint, setHint] = useState('');
  const lastTypingWrite = useRef(0);

  // Messages (100 derniers : assez pour l'historique, 2x plus léger à parser)
  useEffect(() => {
    try {
      const r = dbRef('global_chat/messages').limitToLast(100);
      const cb = r.on('value', snap => {
        const list: ChatMsg[] = [];
        snap.forEach(child => {
          const v = child.val() || {};
          list.push({
            id: child.key ?? `${Math.random()}`,
            pseudo: v.pseudo ?? '?',
            text: v.text ?? '',
            ts: v.timestamp ?? 0,
            type: v.type ?? 'player',
          });
          return undefined;
        });
        list.sort((a, b) => b.ts - a.ts); // inversé (FlatList inverted)
        setMsgs(list);
      });
      return () => r.off('value', cb);
    } catch (e) {
      setHint('Chat indisponible (connexion Firebase)');
      return undefined;
    }
  }, []);

  // Indicateur "écrit..." (global_chat/typing/{pseudo} = timestamp)
  useEffect(() => {
    try {
      const r = dbRef('global_chat/typing');
      const cb = r.on('value', snap => {
        const names: string[] = [];
        const limit = Date.now() - 6000;
        snap.forEach(child => {
          const ts = child.val();
          if (
            typeof ts === 'number' &&
            ts > limit &&
            child.key !== safeKey(userName)
          ) {
            names.push(child.key ?? '');
          }
          return undefined;
        });
        setTyping(names);
      });
      return () => r.off('value', cb);
    } catch (e) {
      return undefined;
    }
  }, [userName]);

  const onChangeText = useCallback(
    (value: string) => {
      setText(value);
      const me = userName.trim();
      if (me.length < 3) {
        return;
      }
      const nowTs = Date.now();
      if (nowTs - lastTypingWrite.current > 1500) {
        lastTypingWrite.current = nowTs;
        try {
          const r = dbRef(`global_chat/typing/${safeKey(me)}`);
          r.setValue(nowTs);
          r.onDisconnect().remove();
        } catch (e) {}
      }
    },
    [userName],
  );

  const onSend = useCallback(() => {
    const me = userName.trim();
    const value = text.trim();
    if (me.length < 3) {
      setHint("Configure ton pseudo dans l'onglet Accueil d'abord");
      return;
    }
    if (value.length < 1 || value.length > 500) {
      return;
    }
    try {
      dbRef('global_chat/messages').push({
        pseudo: me,
        text: value,
        timestamp: Date.now(),
        type: StaffSession.rank ? 'admin' : 'player',
        adminLevel: 0,
        vipLevel: 0,
      });
      dbRef(`global_chat/typing/${safeKey(me)}`).remove();
      setText('');
      setHint('');
    } catch (e) {
      setHint("Message non envoyé (connexion ?)");
    }
  }, [text, userName]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMsg }) => (
      <MessageRow item={item} me={userName.trim()} />
    ),
    [userName],
  );

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Chat AFRP</Text>
      <Text style={styles.subtitle}>
        Discussion globale — commune avec l'app AFRP Launcher
      </Text>

      <FlatList
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 8, paddingTop: 8 }}
        data={msgs}
        inverted
        keyExtractor={item => item.id}
        renderItem={renderItem}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
      />

      {typing.length > 0 && (
        <Text style={styles.typing}>
          {typing.slice(0, 2).join(', ')} écrit...
        </Text>
      )}
      {hint.length > 0 && <Text style={styles.hint}>{hint}</Text>}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ton message..."
          placeholderTextColor="#5a8a7a"
          value={text}
          maxLength={500}
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
  list: {
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
  msgPseudoAdmin: {
    color: '#00ff88',
  },
  msgPseudoMe: {
    color: '#00c880',
  },
  msgText: {
    color: '#ffffff',
    fontSize: 14,
  },
  typing: {
    color: '#00c880',
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 4,
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
