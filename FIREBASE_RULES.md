# Règles Firebase AFRP (Realtime Database → Règles)

Colle EXACTEMENT ceci dans **console.firebase.google.com → afrp-f0ef7 →
Realtime Database → Règles → Publier**.

Nouveautés vs launcher : ajout du nœud **`news`** (actualités) et le **fondateur
identifié par son UID** peut écrire annonce/config même si `staff_allowlist`
n'est pas parfait.

```json
{
  "rules": {
    "global_chat": {
      "messages": { ".read": true, ".write": true },
      "typing": { ".read": true, ".write": true }
    },
    "support_chats": {
      ".read": "root.child('staff_allowlist').child(auth.uid).exists() || auth.uid === 'bDlUYHpS4lXY35uKdXbTecxTowj2'",
      "$convoId": { ".read": true, ".write": true }
    },
    "news": {
      ".read": true,
      ".write": "root.child('staff_allowlist').child(auth.uid).exists() || auth.uid === 'bDlUYHpS4lXY35uKdXbTecxTowj2'"
    },
    "app_config": {
      ".read": true,
      ".write": "root.child('staff_allowlist').child(auth.uid).val() === 'fondateur' || auth.uid === 'bDlUYHpS4lXY35uKdXbTecxTowj2'"
    },
    "annonces": {
      ".read": true,
      ".write": "root.child('staff_allowlist').child(auth.uid).exists() || auth.uid === 'bDlUYHpS4lXY35uKdXbTecxTowj2'"
    },
    "pending_vip_grants": {
      ".read": true,
      ".write": "root.child('staff_allowlist').child(auth.uid).exists() || auth.uid === 'bDlUYHpS4lXY35uKdXbTecxTowj2'",
      "$grantId": { ".validate": "newData.isString() && newData.val().length <= 60" }
    },
    "staff_online": {
      ".read": true,
      "$uid": { ".write": "auth != null && auth.uid === $uid" }
    },
    "staff_allowlist": {
      "$uid": { ".read": "auth != null && auth.uid === $uid" },
      ".write": false
    }
  }
}
```

## Après avoir publié les règles
1. Dans **Realtime Database → Données**, vérifie que sous `staff_allowlist` il
   y a bien : `bDlUYHpS4lXY35uKdXbTecxTowj2 : "fondateur"` (la valeur, en
   toutes lettres, pas `true`).
2. Connecte-toi à l'Espace Staff avec **le compte du fondateur** (celui dont
   l'UID = `bDlUYHpS4lXY35uKdXbTecxTowj2`). L'app affiche ton UID en haut :
   il doit correspondre (✅). Sinon tu utilises un autre compte.
