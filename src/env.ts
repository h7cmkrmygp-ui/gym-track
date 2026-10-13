import Constants, { ExecutionEnvironment } from 'expo-constants';

/** Expo Go lacks background location and widgets; only the AltStore build has them. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
