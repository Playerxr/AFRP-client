import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setAlertUpdating } from '../../actions/alertActions';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectAlertUpdate } from '../../selectors/alertSelectors';
import { AlertLauncher } from '../AlertLauncher/AlertLauncher';

export const AlertUpdate = React.memo(() => {
  const show = useAppSelector(selectAlertUpdate);

  const dispatch = useDispatch();

  const onPressCancel = useCallback(async () => {
    dispatch(setAlertUpdating(false));
  }, []);

  const onConfirmPressed = useCallback(() => {
    dispatch(setAlertUpdating(false));
  }, []);

  return (
    <AlertLauncher
      show={show}
      title="Attention"
      useNativeDriver={true}
      closeOnTouchOutside={false}
      closeOnHardwareBackPress={false}
      message="Une nouvelle version de l'app est disponible. Pour une meilleure expérience sur AFRP, on te conseille de mettre à jour."
      showConfirmButton={true}
      confirmText="Mettre à jour"
      showCancelButton={true}
      cancelText="Plus tard"
      onCancelPressed={onConfirmPressed}
      onConfirmPressed={onPressCancel}
    />
  );
});
