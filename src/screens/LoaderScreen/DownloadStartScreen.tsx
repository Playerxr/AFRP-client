import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Text, View } from 'react-native';
import { DownloadSvg } from '../../assets/svg/index';
import { ButtonLauncher, LoaderContainer } from '../../components';
import { usePermisionFile } from '../../hooks/usePermisionFile';
import { useSpaceDownlload } from '../../hooks/useSpaceDownload';
import { styles } from '../../styles/LoaderStyle';

type InitiationScreenType = NativeStackScreenProps<any>;

export const DownloadStartScreen = React.memo(
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

      return navigation.replace('DownloadScreen');
    };

    return (
      <LoaderContainer>
        <Text style={styles.titleSub}>Bienvenue 👋</Text>
        <Text style={styles.subtitle}>
          Content de te voir sur{'\n'}
          AFRP !
        </Text>
        <View style={styles.buttons}>
          <ButtonLauncher
            btnWidth={'100%'}
            background={'#00c880'}
            IconLeft={DownloadSvg}
            onPress={onPressDownload}>
            Télécharger le jeu
          </ButtonLauncher>
          <View style={{ height: 12 }} />
          <ButtonLauncher
            btnWidth={'100%'}
            background={'#16324a'}
            onPress={() => navigation.navigate('Staff')}>
            Espace Staff
          </ButtonLauncher>
        </View>
      </LoaderContainer>
    );
  },
);
