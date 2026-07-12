import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackActions } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import { setAlertNeedSpace } from '../actions/alertActions';
import {
  CacheType,
  setCacheReject,
  setCompare,
  setDownloading,
  setDownloadLoader,
  setSuccessDownload,
} from '../actions/loaderActions';
import {
  DownloadProgressType,
  FileDownload,
  FileName,
  FileValidate,
} from '../features/fileManager';
import { formatSizeUnits } from '../helpers';
import { navigationRef } from '../routers/RootNavigation';
import { AppThunk } from '../store/store';
import {
  createPushNotificationLoader,
  onUploadTaskEventLoader,
} from './notificationThunks';

export const compareFileRecursion =
  ({ caches }: { caches: CacheType[] }): AppThunk =>
  async (dispatch, state) => {
    const filesContinue = state().distribution.filesContinue;
    const gpuSystem = state().app.gpu;
    const modeType = state().settings.modeType;
    const { freeSpace } = await RNFS.getFSInfo();

    let [
      needDownload,
      successCount,
      rejectCount,
      distributionCacheBytes,
      downloadsCacheBytes,
      needDownloadsCacheBytes,
    ] = [[] as CacheType[], 0, 0, 0, 0, 0];

    for await (const cache of caches) {
      const { path, bytes, name, gpu: gpuCache } = cache;
      const bytesValid = bytes.length > 1 ? bytes[modeType] : bytes[0];

      const isValidCache = await FileValidate.isValidCache({
        gpuCache,
        gpuSystem,
        path,
        name,
        bytes: bytesValid,
        filesContinue,
      });

      if (isValidCache === 'success') {
        downloadsCacheBytes += bytesValid;
        successCount++;
        distributionCacheBytes += bytesValid;
      } else if (isValidCache === 'download') {
        needDownload.push(cache);
        needDownloadsCacheBytes += bytesValid;
        rejectCount++;
        distributionCacheBytes += bytesValid;
      }
    }

    const isSuccessDownload = await AsyncStorage.getItem('isSuccessDownload');

    dispatch(
      setCompare({
        compare: {
          successCount,
          rejectCount,
          distributionCacheBytes,
          downloadsCacheBytes,
          needDownloadsCacheBytes,
        },
        needDownload,
        freeSpace,
        isSuccessDownload: isSuccessDownload === 'true' ? true : false,
      }),
    );
  };

export const fetchStartDownload =
  (opts?: { silent?: boolean }): AppThunk =>
  async (dispatch, state) => {
  // déjà en cours (ex : relancé depuis l'accueil rouvert) → on ne double pas
  if (state().loader.downloading) {
    return;
  }

  const { cdnCache } = state().distribution;
  const { rejectCount } = state().loader.compare;
  const { needDownload } = state().loader;
  const modeType = state().settings.modeType;

  let numberOfDownloads = 0;
  let downloadBytes = 0;

  dispatch(setDownloading({ downloading: true }));
  dispatch(createPushNotificationLoader());

  dispatch(
    onUploadTaskEventLoader({
      status: 'download',
      sizeFile: 0,
      currentFile: rejectCount,
      size: 0,
      current: rejectCount,
      file: '',
    }),
  );

  for await (const cache of needDownload) {
    const { id, path: toFile, name: toName, bytes } = cache;
    const bytesValid = bytes.length > 1 ? bytes[modeType] : bytes[0];
    const urlValid =
      bytes.length > 1 && modeType > 0 ? cdnCache + '_snow' : cdnCache;

    try {
      dispatch(
        setDownloadLoader({
          download: {
            fileName: toName,
            currentBytes: 0,
            needBytes: bytesValid,
            numberOfDownloads,
            downloadBytes,
          },
        }),
      );

      // URL encodée par segment (espaces, parenthèses, accents dans les noms de
      // fichiers) + pas de double slash pour les fichiers à la racine du cache.
      const encName = encodeURIComponent(toName);
      const encDir = toFile
        ? toFile.split('/').map(encodeURIComponent).join('/') + '/'
        : '';
      const res = await FileDownload.download({
        fromUrl: `${urlValid}/${encDir}${encName}`,
        toFile,
        toName,
        progress: ({ bytesWritten }: DownloadProgressType) => {
          dispatch(
            setDownloadLoader({
              download: {
                currentBytes: bytesWritten,
                downloadBytes: downloadBytes + bytesWritten,
              },
            }),
          );
        },
      });

      if (res.statusCode === 200) {
        numberOfDownloads++;
        downloadBytes += bytesValid;

        dispatch(
          onUploadTaskEventLoader({
            status: 'download',
            sizeFile: numberOfDownloads,
            currentFile: rejectCount,
            size: numberOfDownloads,
            current: rejectCount,
            file: toName,
          }),
        );

        dispatch(
          setDownloadLoader({
            download: {
              numberOfDownloads: numberOfDownloads,
              downloadBytes: downloadBytes,
            },
          }),
        );
        dispatch(setCacheReject(id));
      }
    } catch (error) {
      dispatch(setDownloading({ downloading: false }));
      dispatch(onUploadTaskEventLoader({ status: 'complete' }));
      // silent = téléchargement lancé depuis l'accueil : on reste sur place,
      // l'accueil détecte l'échec (needDownload non vidé) et propose "Réessayer"
      if (opts?.silent) {
        return;
      }
      return navigationRef.current?.dispatch(StackActions.replace('Error'));
    }
  }

  dispatch(setDownloading({ downloading: false }));
  dispatch(onUploadTaskEventLoader({ status: 'complete' }));
  dispatch(fetchIsDownloadSuccess());
  if (opts?.silent) {
    return;
  }
  return navigationRef.current?.dispatch(StackActions.replace('Main'));
  };

export const nameFileRecursion = (): AppThunk => async (dispatch, state) => {
  const cacheMode = state().distribution.cacheMode;
  const gpuSystem = state().app.gpu;
  const modeType = state().settings.modeType;
  let needDownload = [0, 0];

  for await (const cache of cacheMode) {
    const { path, name, gpu: gpuCache } = cache;

    const isValid = await FileValidate.isValidGpu({ gpuCache, gpuSystem });
    if (isValid) {
      try {
        const res = await FileName.reversFiles(path, name, modeType);
        needDownload[modeType] += res[modeType];
      } catch (e) {}
    }
  }

  return needDownload[0] > 0;
};

/**
 * Bouton "Télécharger le jeu" de l'accueil : scanne d'abord les fichiers du
 * modpack déjà présents sur le téléphone (compareFileRecursion → anti-doublon,
 * ne retélécharge que ce qui manque/est invalide), puis ne télécharge que le
 * manquant. Renvoie 'ready' dès que le modpack est complet (rien à faire ou
 * téléchargement terminé) pour que l'appelant ouvre ensuite le lien du jeu.
 * 'no_space' déclenche déjà sa propre alerte (AlertSpace) ; 'download_failed'
 * n'a pas d'UI dédiée, à l'appelant de prévenir l'utilisateur.
 */
export const startGameDownload =
  (): AppThunk<Promise<'ready' | 'no_space' | 'download_failed'>> =>
  async (dispatch, state) => {
    const { cacheMode } = state().distribution;

    await dispatch(compareFileRecursion({ caches: cacheMode }));

    const { needDownload, freeSpace, compare } = state().loader;

    if (needDownload.length === 0) {
      return 'ready';
    }

    const needSpace = compare.distributionCacheBytes - compare.downloadsCacheBytes;
    if (freeSpace < needSpace) {
      dispatch(
        setAlertNeedSpace(true, {
          needSpace: +formatSizeUnits(needSpace),
          currentSpace: +formatSizeUnits(freeSpace),
        }),
      );
      return 'no_space';
    }

    await dispatch(fetchStartDownload({ silent: true }));

    // fetchStartDownload s'arrête silencieusement sur une erreur réseau sans
    // relancer : si des fichiers restent dans needDownload, tout n'a pas pu
    // être téléchargé, on n'ouvre pas le lien du jeu sur un modpack incomplet.
    return state().loader.needDownload.length === 0 ? 'ready' : 'download_failed';
  };

export const fetchIsDownloadSuccess = (): AppThunk => async dispatch => {
  try {
    await AsyncStorage.setItem('isSuccessDownload', 'true');
    dispatch(setSuccessDownload({ isSuccessDownload: true }));
  } catch (error) {
    dispatch(setSuccessDownload({ isSuccessDownload: false }));
  }
};
