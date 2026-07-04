import { StackActions } from '@react-navigation/native';
import { setDistribution } from '../actions/distributionActions';
import { StaffConfig } from '../features/staffConfig';
import { navigationRef } from '../routers/RootNavigation';
import { DistributionService } from '../services/distribution.service';
import { AppThunk } from '../store/store';
import { compareFileRecursion } from './loaderThunks';

export const fetchDistribution = (): AppThunk => async (dispatch, state) => {
  try {
    const { cache: caches, ...res } = await DistributionService.get();
    await dispatch(setDistribution(res));
    // Espace Staff : "entrer sans télécharger le modpack" => on saute la
    // comparaison/téléchargement du cache (gestion rapide).
    const skipStaff = await StaffConfig.getSkipDownload();
    if (!state().settings.skip && !skipStaff) {
      await dispatch(compareFileRecursion({ caches }));
    }
  } catch (error: any) {
    console.log(error);
    return navigationRef.current?.dispatch(StackActions.replace('Error'));
  }
};
