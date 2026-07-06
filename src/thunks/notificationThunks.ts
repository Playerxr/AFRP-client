import { PACKAGE_NAME, PROJECT_NAME } from '@env';
import notifee, { AndroidImportance } from '@notifee/react-native';
import messaging from '@react-native-firebase/messaging';
import { AppThunk } from '../store/store';

export const appRegisterDeviceForRemoteMessages = (): AppThunk => async () => {
  await notifee.requestPermission();
  await messaging().registerDeviceForRemoteMessages();

  // Push AFRP : annonces (tous) + chaque message du chat global (tous).
  // La Cloud Function du launcher publie sur ces topics.
  try {
    await messaging().subscribeToTopic('annonces');
    await messaging().subscribeToTopic('global_chat');
  } catch (e) {}

  return await notifee.createChannel({
    id: PACKAGE_NAME + '-default',
    name: PROJECT_NAME + ' Chanel',
    importance: AndroidImportance.HIGH,
  });
};

export const createPushNotificationLoader = (): AppThunk => async dispatch => {
  dispatch(onUploadTaskEventLoader({ status: 'cancel' }));

  return await notifee.createChannel({
    id: PACKAGE_NAME + '-notification',
    name: PROJECT_NAME + ' Chanel',
  });
};

export const onUploadTaskEventLoader =
  (event): AppThunk =>
  async () => {
    if (event.status === 'download') {
      // asForegroundService => Android garde le processus vivant même app
      // fermée/en arrière-plan → le téléchargement continue.
      await notifee.displayNotification({
        id: PACKAGE_NAME + '-notification',
        body: `${event.file} [${event.sizeFile} sur ${event.currentFile}]`,
        title: 'Téléchargement des fichiers du jeu...',
        android: {
          channelId: PACKAGE_NAME + '-notification',
          asForegroundService: true,
          ongoing: true,
          onlyAlertOnce: true,
          showTimestamp: true,
          colorized: true,
          progress: {
            max: event.current,
            current: event.size,
          },
        },
      });
    }

    if (event.status === 'complete') {
      // Fin : on arrête le service de premier plan puis on affiche une notif
      // normale (dismissible) "terminé".
      try {
        await notifee.stopForegroundService();
      } catch (e) {}
      await notifee.displayNotification({
        id: PACKAGE_NAME + '-done',
        title: 'AFRP',
        body: 'Téléchargement terminé — prêt à jouer !',
        android: {
          channelId: PACKAGE_NAME + '-notification',
          pressAction: { id: 'default' },
          smallIcon: 'ic_launcher',
        },
      });
    }

    if (event.status === 'cancel') {
      try {
        await notifee.stopForegroundService();
      } catch (e) {}
      await notifee.cancelNotification(PACKAGE_NAME + '-notification');
    }
  };
