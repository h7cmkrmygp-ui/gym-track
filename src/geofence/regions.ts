import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';

import { listGyms } from '@/db/gyms';

import { GEOFENCE_TASK, regionId } from './task';

/** Expo Go cannot run background location on iOS; only the AltStore build can. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export type GeofenceStatus = 'expo-go' | 'needs-permission' | 'no-gyms' | 'active';

export async function getGeofenceStatus(): Promise<GeofenceStatus> {
  if (isExpoGo) return 'expo-go';
  const bg = await Location.getBackgroundPermissionsAsync();
  if (!bg.granted) return 'needs-permission';
  if ((await listGyms()).length === 0) return 'no-gyms';
  return 'active';
}

/**
 * Asks for "When in use" then "Always". Returns an error message to show, or null.
 * iOS only shows each prompt once; after a refusal the user has to go to Settings.
 */
export async function requestAlwaysLocation(): Promise<string | null> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return 'Autorise la localisation pour GymTrack dans Réglages > Confidentialité > Localisation.';
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (!bg.granted) {
    return 'Choisis « Toujours » pour GymTrack dans Réglages > Confidentialité > Localisation, sinon l’arrivée à la salle ne peut pas être détectée.';
  }
  await syncGeofences();
  return null;
}

/** Makes iOS watch exactly the saved gyms. Safe to call any time. */
export async function syncGeofences() {
  if (isExpoGo) return;
  const bg = await Location.getBackgroundPermissionsAsync();
  if (!bg.granted) return;
  const gyms = await listGyms();
  const started = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
  if (gyms.length === 0) {
    if (started) await Location.stopGeofencingAsync(GEOFENCE_TASK);
    return;
  }
  // iOS watches at most 20 regions per app.
  await Location.startGeofencingAsync(
    GEOFENCE_TASK,
    gyms.slice(0, 20).map((g) => ({
      identifier: regionId(g.id),
      latitude: g.lat,
      longitude: g.lng,
      radius: g.radiusM,
      notifyOnEnter: true,
      notifyOnExit: true,
    })),
  );
}

/** Current position, for "add this place as a gym". Only needs "When in use". */
export async function getCurrentCoords(): Promise<{ lat: number; lng: number } | string> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return 'Autorise la localisation pour enregistrer ta salle.';
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}
