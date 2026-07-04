import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setAlertUserName } from '../../actions/alertActions';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectAlertUserName } from '../../selectors/alertSelectors';
import { AlertLauncher } from '../AlertLauncher/AlertLauncher';

export const AlertUserName = React.memo(() => {
  const show = useAppSelector(selectAlertUserName);
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const onPressCancel = useCallback(async () => {
    dispatch(setAlertUserName(false));
    return navigation.jumpTo('Réglages');
  }, []);

  const onConfirmPressed = useCallback(() => {
    dispatch(setAlertUserName(false));
  }, []);

  return (
    <AlertLauncher
      show={show}
      title="Info"
      useNativeDriver={true}
      closeOnTouchOutside={false}
      closeOnHardwareBackPress={false}
      message="Tu dois définir ton Prénom_Nom dans les réglages"
      showConfirmButton={true}
      confirmText="Réglages"
      showCancelButton={true}
      cancelText="Fermer"
      onCancelPressed={onConfirmPressed}
      onConfirmPressed={onPressCancel}
    />
  );
});
