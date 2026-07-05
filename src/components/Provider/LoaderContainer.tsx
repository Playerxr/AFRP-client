import { LINK_FORUM_HELP } from '@env';
import React from 'react';
import { Image, Linking, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Snow from 'react-native-snowflakes';
import { appLogoImg } from '../../assets/images';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectModeType } from '../../selectors/settingSelectors';
import { styles } from '../../styles/LoaderStyle';

type LoaderContainerType = {
  children: React.ReactNode;
};

export const LoaderContainer = React.memo((props: LoaderContainerType) => {
  const isSnow = useAppSelector(selectModeType);

  const supportHandler = React.useCallback(async () => {
    await Linking.openURL(LINK_FORUM_HELP);
  }, []);

  return (
    <View style={styles.container}>
      {/* Dégradé AFRP : plus fluide que la photo floutée (blur coûteux) */}
      <LinearGradient
        style={styles.imageBackground}
        colors={['#0d1a2a', '#0c1424']}>
        <View style={styles.wrapper}>
          <View style={styles.logoWrapper}>
            <Image style={styles.logo} source={appLogoImg} />
          </View>
          <View style={styles.body}>
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                width: '100%',
              }}>
              {props.children}
            </View>
          </View>
          <View style={styles.footer}>
            <Text style={styles.description}>
              <Text style={styles.accent}>Attention !</Text> NE RÉDUIS PAS ET NE
              FERME PAS{'\n'}
              L'APPLICATION AVANT SON LANCEMENT COMPLET{'\n'}
              En cas de problème, on te conseille de{'\n'} contacter le{' '}
              <Text onPress={supportHandler} style={styles.link}>
                Support technique
              </Text>
            </Text>
          </View>
        </View>
      </LinearGradient>
      {isSnow === 1 && (
        // 40 flocons au lieu de 100 : l'animation JS pompait les frames
        <Snow fullScreen snowflakesCount={40} fallSpeed="medium" />
      )}
    </View>
  );
});
