import { setDistribution } from '../actions/distributionActions';
import { DistributionService } from '../services/distribution.service';
import { AppThunk } from '../store/store';

// App = launcher COMMUNAUTÉ : on récupère juste les infos (serveurs, actus,
// version) depuis distribution.json. Plus de comparaison/téléchargement du
// cache de jeu (le jeu se joue via un APK séparé). On n'échoue pas si le
// distribution.json est absent : les onglets communauté marchent quand même.
export const fetchDistribution = (): AppThunk => async dispatch => {
  try {
    const { cache: _caches, ...res } = await DistributionService.get();
    await dispatch(setDistribution(res));
  } catch (error: any) {
    console.log('distribution indisponible (mode communauté):', error?.message);
  }
};
