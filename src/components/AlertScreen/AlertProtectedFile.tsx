import React, { useCallback } from 'react';
import { setAlertProtectionFile } from '../../actions/alertActions';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectAlertFile } from '../../selectors/alertSelectors';
import { AlertLauncher } from '../AlertLauncher/AlertLauncher';

export const AlertProtectedFile = React.memo(() => {
  const show = useAppSelector(selectAlertFile);
  const dispatch = useAppDispatch();

  const onPressCancel = useCallback(async () => {
    try {
      // RNAndroidSettingsTool.ACTION_APPLICATION_DETAILS_SETTINGS(null);
    } catch (error) {}

    dispatch(setAlertProtectionFile(false));
  }, []);

  const onConfirmPressed = useCallback(() => {
    dispatch(setAlertProtectionFile(false));
  }, []);

  return (
    <AlertLauncher
      show={show}
      title="Info"
      useNativeDriver={true}
      closeOnTouchOutside={false}
      closeOnHardwareBackPress={false}
      message="Pas d'autorisation de lecture / écriture des fichiers"
      showConfirmButton={true}
      confirmText="Réglages"
      showCancelButton={true}
      cancelText="Fermer"
      onCancelPressed={onConfirmPressed}
      onConfirmPressed={onPressCancel}
    />
  );
});
