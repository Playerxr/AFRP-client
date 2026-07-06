import notifee, { AndroidImportance } from '@notifee/react-native';

/**
 * Affiche une notification push AFRP (données envoyées par la Cloud Function :
 * {titre, texte, canal, pseudo?}). Utilisé en premier plan (App.tsx) ET en
 * arrière-plan (index.js). Le chat utilise un id fixe : chaque message
 * REMPLACE la notification précédente au lieu d'en empiler des dizaines.
 */
export async function showAfrpNotification(
  data: { [key: string]: string | object } | undefined,
) {
  if (!data) {
    return;
  }
  const canal = String(data.canal ?? 'afrp_annonces');
  const titre = String(data.titre ?? 'AFRP');
  const texte = String(data.texte ?? '');
  if (!texte) {
    return;
  }

  // Son selon le canal (res/raw du launcher AFRP)
  const sound = canal === 'afrp_support' ? 'notif_staff' : 'notif_annonce';
  // Canal VERSIONNÉ (_v2) : un canal Android est immuable une fois créé, donc
  // pour appliquer le son on utilise un nouvel id.
  const channelId = `${canal}_v2`;

  try {
    await notifee.createChannel({
      id: channelId,
      name:
        canal === 'afrp_chat'
          ? 'Chat AFRP'
          : canal === 'afrp_support'
          ? 'Support AFRP'
          : 'Annonces AFRP',
      importance:
        canal === 'afrp_chat'
          ? AndroidImportance.DEFAULT
          : AndroidImportance.HIGH,
      sound,
    });

    await notifee.displayNotification({
      id: canal === 'afrp_chat' ? 'afrp-chat' : undefined,
      title: titre,
      body: texte,
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        sound,
        pressAction: { id: 'default' },
      },
    });
  } catch (e) {}
}
