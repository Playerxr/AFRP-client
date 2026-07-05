import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { ButtonLauncher, LoaderContainer } from '../components';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { styles } from '../styles/LoaderStyle';
import { fetchInitialApp } from '../thunks/appThunks';
import { setInitial } from './../actions/appActions';

type InitiationScreenType = NativeStackScreenProps<any>;

export const ErrorScreen = React.memo(
  ({ navigation }: InitiationScreenType) => {
    const dispatch = useAppDispatch();

    const reloadHandler = useCallback(() => {
      dispatch(setInitial({ initial: false }));
      dispatch(fetchInitialApp());
      navigation.replace('Initiation');
    }, []);

    return (
      <LoaderContainer>
        <Text style={styles.title}>
          Connexion impossible{'\n'}
          <Text>aux ressources du launcher</Text>
        </Text>
        <Text style={styles.alert}>
          Vérifie ta connexion internet, ou réessaie plus tard.
        </Text>
        <View style={styles.buttons}>
          <ButtonLauncher
            btnWidth={'100%'}
            background={'#00c880'}
            onPress={reloadHandler}>
            Réessayer
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
