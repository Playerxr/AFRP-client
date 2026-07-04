import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setAlertNeedSpace } from '../../actions/alertActions';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectAlertSpace } from '../../selectors/alertSelectors';
import { AlertLauncher } from '../AlertLauncher/AlertLauncher';

export const AlertSpace = React.memo(() => {
  const {
    status: show,
    needSpace,
    currentSpace,
  } = useAppSelector(selectAlertSpace);

  const dispatch = useDispatch();

  const onPressCancel = useCallback(async () => {
    dispatch(
      setAlertNeedSpace(false, {
        needSpace: 0,
        currentSpace: 0,
      }),
    );
  }, []);

  return (
    <AlertLauncher
      show={show}
      title="Espace insuffisant"
      useNativeDriver={true}
      closeOnTouchOutside={false}
      closeOnHardwareBackPress={false}
      message={`Pour installer les ressources du jeu, il faut ${needSpace}, disponible ${currentSpace}`}
      showCancelButton={true}
      cancelText="Fermer"
      onCancelPressed={onPressCancel}
    />
  );
});
