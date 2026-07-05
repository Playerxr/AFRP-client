import RNGpuInfo from 'react-native-gpu-info';
import { setGPU, setInitial } from '../actions/appActions';
import { AppThunk } from '../store/store';
import { fetchArticles } from './articleThunks';
import { fetchDistribution } from './distributionThunks';
import { fetchDonates } from './donateThunks';
import { appRegisterDeviceForRemoteMessages } from './notificationThunks';
import { fetchPermisions } from './permisionThunks';
import { fetchInitialSettings } from './settingsThunks';

export const fetchInitialApp = (): AppThunk => async dispatch => {
  // Lettre de variante textures : A=Adreno (DXT), M=Mali (ETC), P=PowerVR (PVR).
  // isValidCache compare gpuSystem[0] au tag du distribution.json — on stocke
  // donc une lettre canonique. ETC passe sur tous les GPU Android → repli 'M'.
  let gpuLetter = 'M';
  try {
    const glRenderer = String(
      (await RNGpuInfo.getGlRenderer()) ?? '',
    ).toLowerCase();
    if (glRenderer.includes('adreno')) {
      gpuLetter = 'A';
    } else if (glRenderer.includes('powervr')) {
      gpuLetter = 'P';
    } else if (glRenderer.includes('mali')) {
      gpuLetter = 'M';
    }
  } catch (e) {}
  dispatch(setGPU(gpuLetter));

  await dispatch(fetchPermisions());
  await dispatch(fetchInitialSettings());
  await dispatch(fetchDistribution());
  await dispatch(fetchArticles());
  await dispatch(fetchDonates());
  await dispatch(appRegisterDeviceForRemoteMessages());

  dispatch(setInitial({ initial: true }));
};
