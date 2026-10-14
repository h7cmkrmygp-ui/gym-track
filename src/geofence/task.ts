// Imported from the root layout so the task is defined in the global scope:
// iOS relaunches the app in the background, with no screen mounted, to deliver events.
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { listGyms, recordEnter, recordExit } from '@/db/gyms';
import { listTemplates } from '@/db/templates';
import { lastRotationTemplateId } from '@/db/workouts';
import { nextInRotation } from '@/logic/rotation';
import { notifyArrival } from '@/notifications';
import { refreshWidget } from '@/widget';

export const GEOFENCE_TASK = 'gym-geofence';

const REGION_PREFIX = 'gym-';
export const regionId = (gymId: number) => `${REGION_PREFIX}${gymId}`;

function gymIdFromRegion(identifier: string | undefined): number | null {
  if (!identifier?.startsWith(REGION_PREFIX)) return null;
  const id = Number(identifier.slice(REGION_PREFIX.length));
  return Number.isInteger(id) ? id : null;
}

type GeofenceEvent = { eventType: Location.GeofencingEventType; region: Location.LocationRegion };

/** Handles one enter/exit event. Also used by the "simulate" buttons in Expo Go. */
export async function handleGeofenceEvent(gymId: number, eventType: Location.GeofencingEventType, now = Date.now()) {
  if (eventType === Location.GeofencingEventType.Exit) {
    await recordExit(gymId, now);
    // Leaving closes the visit, which is when it starts counting as a gym day.
    await refreshWidget();
    return;
  }
  const started = await recordEnter(gymId, now);
  if (!started) return;
  const gym = (await listGyms()).find((g) => g.id === gymId);
  const next = nextInRotation(await listTemplates(), await lastRotationTemplateId());
  await notifyArrival(gym?.name ?? 'la salle', next ? { id: next.id, name: next.name } : null);
}

TaskManager.defineTask<GeofenceEvent>(GEOFENCE_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const gymId = gymIdFromRegion(data.region.identifier);
  if (gymId === null) return;
  await handleGeofenceEvent(gymId, data.eventType);
});
