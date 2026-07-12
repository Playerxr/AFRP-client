import { setDistribution } from '../actions/distributionActions';
import { DistributionService } from '../services/distribution.service';
import { AppThunk } from '../store/store';

// App = launcher COMMUNAUTÉ : on récupère les infos (serveurs, actus, version)
// depuis distribution.json, ET la liste des fichiers du modpack (champ
// "cache") : le bouton "Télécharger le jeu" de l'accueil s'en sert pour ne
// télécharger que ce qui manque (anti-doublon) avant d'ouvrir le lien du jeu
// (le jeu lui-même se joue via un APK séparé). On n'échoue pas si le
// distribution.json est absent : les onglets communauté marchent quand même.
export const fetchDistribution = (): AppThunk => async dispatch => {
  try {
    const { cache, ...res } = await DistributionService.get();
    await dispatch(setDistribution({ ...res, cacheMode: cache ?? [] }));
  } catch (error: any) {
    console.log('distribution indisponible (mode communauté):', error?.message);
  }
};
