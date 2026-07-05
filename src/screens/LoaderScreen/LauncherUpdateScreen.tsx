import React from 'react';
import { Text, View } from 'react-native';
import { InstallSvg } from '../../assets/svg/index';
import { ButtonLauncher, LoaderContainer } from '../../components';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { styles } from '../../styles/LoaderStyle';
import { installLauncher } from '../../thunks/launcherTunks';

export const LauncherUpdateScreen = React.memo(() => {
  const dispatch = useAppDispatch();

  const installHandler = React.useCallback(() => {
    dispatch(installLauncher());
  }, []);

  return (
    <LoaderContainer>
      <Text style={[styles.title, styles.titleUppercase]}>
        Mise à jour du launcher
      </Text>
      <Text style={styles.alert}>
        Appuie sur
        <Text style={styles.accent}> mettre à jour</Text> pour confirmer
        {'\n'} la mise à jour du launcher.
      </Text>
      <View style={styles.buttons}>
        <ButtonLauncher
          background={'#00c880'}
          btnWidth={'100%'}
          IconLeft={InstallSvg}
          onPress={installHandler}>
          Mettre à jour
        </ButtonLauncher>
      </View>
    </LoaderContainer>
  );
});
