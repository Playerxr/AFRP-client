import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import React from 'react';
import { AppRegistry } from 'react-native';
import { Provider } from 'react-redux';
import { App } from './App';
import { name as appName } from './app.json';
import { showAfrpNotification } from './src/features/pushDisplay';
import { store } from './src/store/store';

// Push reçu app FERMÉE ou en arrière-plan (chat global, annonces, support).
// On n'affiche pas la notif de chat à son propre auteur.
messaging().setBackgroundMessageHandler(async remoteMessage => {
  const data = remoteMessage?.data;
  if (data?.canal === 'afrp_chat') {
    const moi = (await AsyncStorage.getItem('my_pseudo')) ?? '';
    if (moi.length > 0 && data?.pseudo === moi) {
      return;
    }
  }
  await showAfrpNotification(data);
});

const RNRedux = () => (
  <Provider store={store}>
    <App />
  </Provider>
);

AppRegistry.registerComponent(appName, () => RNRedux);
