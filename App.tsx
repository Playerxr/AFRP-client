import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { showAfrpNotification } from './src/features/pushDisplay';
import { NavigationRouter } from './src/routers/navigation-router';

export const App = () => {
  useEffect(() => {
    const backAction = () => {
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, []);

  // Push reçu app OUVERTE (le chat n'est pas notifié à son propre auteur)
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      const data = remoteMessage?.data;
      if (data?.canal === 'afrp_chat') {
        const moi = (await AsyncStorage.getItem('my_pseudo')) ?? '';
        if (moi.length > 0 && data?.pseudo === moi) {
          return;
        }
      }
      await showAfrpNotification(data);
    });

    return unsubscribe;
  }, []);

  return <NavigationRouter />;
};
