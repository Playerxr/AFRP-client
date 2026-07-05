import React from 'react';
import { View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PADDING_HORIZONTAL, verticalScale } from '../../helpers/demensions';
import { styles } from '../../styles/MainStyle';
import { AlertProtectedFile } from '../AlertScreen/AlertProtectedFile';
import { AlertSound } from '../AlertScreen/AlertSound';
import { AlertSpace } from '../AlertScreen/AlertSpace';
import { AlertUpdate } from '../AlertScreen/AlertUpdate';
import { AlertUserName } from '../AlertScreen/AlertUserName';

type MainContainerType = {
  children: React.ReactNode;
  image?: boolean;
  paddingHorizontal?: number;
};

export const MainContainer = React.memo((props: MainContainerType) => {
  const {
    children,
    image = true,
    paddingHorizontal = PADDING_HORIZONTAL,
  } = props;

  return (
    <View style={[styles.container]}>
      {image && (
        // Dégradé AFRP plein écran : remplace la photo floutée (blurRadius 20
        // = décodage + surdessin coûteux sur les téléphones modestes)
        <LinearGradient
          style={[{ flex: 1 }]}
          end={{ x: 0.0, y: 1.0 }}
          colors={['#0d1a2a', '#0c1424']}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.wrapper}>
              <View
                style={[
                  styles.body,
                  { paddingHorizontal: verticalScale(paddingHorizontal) },
                ]}>
                <View style={styles.content}>{props.children}</View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      )}
      {!image && (
        <LinearGradient
          style={[{ flex: 1 }]}
          end={{ x: 0.0, y: 1.0 }}
          colors={['#0d1a2a', '#0c1424']}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.wrapper}>
              <View style={styles.body}>
                <View style={styles.content}>{children}</View>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      )}
      <AlertProtectedFile />
      <AlertSound />
      <AlertUserName />
      <AlertUpdate />
      <AlertSpace />
    </View>
  );
});
