import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { Dimensions, Text, View } from 'react-native';
import * as Progress from 'react-native-progress';
import { verticalScale } from 'react-native-size-matters';
import { LoaderContainer } from '../components';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { selectInitial } from '../selectors/appSelectors';
import { styles } from '../styles/LoaderStyle';
import { fetchInitialApp } from '../thunks/appThunks';
const width = Dimensions.get('window').width;

type InitiationScreenType = NativeStackScreenProps<any>;

export const InitiationScreen = React.memo(
  ({ navigation }: InitiationScreenType) => {
    const dispatch = useAppDispatch();
    const isInitial = useAppSelector(selectInitial);

    useEffect(() => {
      dispatch(fetchInitialApp());
    }, []);

    // On va TOUJOURS directement à l'accueil (Main), même si des fichiers
    // manquent : le téléchargement se fait depuis l'accueil (comme le launcher),
    // pas via un écran bloquant. (rejectCount/isSuccessDownload/autoUpdateLauncher
    // ne servent plus à rediriger ici.)
    useFocusEffect(
      React.useCallback(() => {
        if (isInitial) {
          return navigation.replace('Main');
        }

        return () => {};
      }, [isInitial]),
    );

    return (
      <LoaderContainer>
        <View style={styles.progress}>
          <Text style={styles.starting}>CHARGEMENT DE L'APPLICATION...</Text>
          <View style={styles.progressPercent}>
            {!isInitial && (
              <Progress.Bar
                style={{ marginTop: 20 }}
                animated={true}
                useNativeDriver={true}
                indeterminate={true}
                borderWidth={0}
                color={'#00c880'}
                unfilledColor={'#12283c'}
                borderRadius={20}
                height={10}
                width={width - verticalScale(40)}
              />
            )}
          </View>
        </View>
      </LoaderContainer>
    );
  },
);
