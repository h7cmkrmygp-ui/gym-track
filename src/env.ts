import Constants, { ExecutionEnvironment } from 'expo-constants';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform } from 'react-native';

/** Expo Go lacks background location and widgets; only the AltStore build has them. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * iOS 26 and later, where bars and controls are Liquid Glass. Older systems (and tests,
 * without the native module) get the solid look instead.
 */
export const liquidGlass = (() => {
  try {
    return Platform.OS === 'ios' && isLiquidGlassAvailable();
  } catch {
    return false;
  }
})();
