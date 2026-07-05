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

  try {
    await notifee.createChannel({
      id: canal,
      name:
        canal === 'afrp_chat'
          ? 'Chat AFRP'
          : canal === 'afrp_support'
          ? 'Support AFRP'
          : 'Annonces AFRP',
      // le chat ne fait pas de heads-up à chaque message (moins intrusif)
      importance:
        canal === 'afrp_chat'
          ? AndroidImportance.DEFAULT
          : AndroidImportance.HIGH,
    });

    await notifee.displayNotification({
      id: canal === 'afrp_chat' ? 'afrp-chat' : undefined,
      title: titre,
      body: texte,
      android: {
        channelId: canal,
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
    });
  } catch (e) {}
}
