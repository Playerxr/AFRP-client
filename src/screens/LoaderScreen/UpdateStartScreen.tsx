import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Text, View } from 'react-native';
import { DownloadSvg } from '../../assets/svg/index';
import { ButtonLauncher, LoaderContainer } from '../../components';
import { usePermisionFile } from '../../hooks/usePermisionFile';
import { useSpaceDownlload } from '../../hooks/useSpaceDownload';
import { styles } from '../../styles/LoaderStyle';

type InitiationScreenType = NativeStackScreenProps<any>;

export const UpdateStartScreen = React.memo(
  ({ navigation }: InitiationScreenType) => {
    const { fetchPermision } = usePermisionFile();
    const { fetchSpace } = useSpaceDownlload();

    const onPressDownload = () => {
      if (!fetchPermision()) {
        return;
      }

      if (!fetchSpace()) {
        return;
      }

      return navigation.replace('UpdateScreen');
    };

    return (
      <LoaderContainer>
        <Text style={styles.title}>Mise à jour disponible !</Text>
        <Text style={styles.alert}>
          Appuie sur
          <Text style={styles.accent}> mettre à jour</Text> pour confirmer
          {'\n'} le téléchargement des fichiers.
        </Text>
        <View style={styles.buttons}>
          <ButtonLauncher
            btnWidth={'100%'}
            background={'#00c880'}
            IconLeft={DownloadSvg}
            onPress={onPressDownload}>
            Mettre à jour
          </ButtonLauncher>
        </View>
      </LoaderContainer>
    );
  },
);
