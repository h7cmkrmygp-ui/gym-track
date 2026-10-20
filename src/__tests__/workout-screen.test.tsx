import { fireEvent, render, screen } from '@testing-library/react-native';

import WorkoutScreen from '@/app/workout/[id]';
import { setSetting } from '@/db/settings';
import type { WorkoutDetail } from '@/db/workouts';

// Reproduces opening a workout just started from a planned session.
const mockDetail: WorkoutDetail = {
  id: 1,
  templateId: 5,
  name: 'Ma séance',
  startedAt: Date.now() - 60_000,
  endedAt: null,
  exercises: [
    {
      exerciseId: 10,
      name: 'Développé couché',
      restS: 120,
      target: { sets: 3, reps: 8 },
      sets: [
        { id: 1, exerciseId: 10, weightKg: 0, reps: 8, completedAt: null },
        { id: 2, exerciseId: 10, weightKg: 0, reps: 8, completedAt: null },
      ],
      previous: [],
      plateau: null,
    },
    {
      exerciseId: 11,
      name: 'Squat',
      restS: 150,
      target: { sets: 2, reps: 5 },
      sets: [{ id: 3, exerciseId: 11, weightKg: 100, reps: 5, completedAt: null }],
      previous: [{ weightKg: 95, reps: 5 }],
      plateau: { deloadKg: 85 },
    },
  ],
};

jest.mock('@/global.css', () => ({}));
// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories must require lazily
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: '1' }),
  useIsFocused: () => true,
  Stack: { Screen: () => null, Toolbar: Object.assign(() => null, { Button: () => null }) },
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));
jest.mock('@/db/workouts', () => ({
  getWorkoutDetail: jest.fn(async () => mockDetail),
  recordsBefore: jest.fn(async () => new Map()),
}));
jest.mock('@/db/settings', () => ({
  getSettings: jest.fn(async () => ({ unit: 'lbs', restDefaultS: 90, weeklyGoal: 3, workoutScroll: null })),
  setSetting: jest.fn(async () => {}),
}));
jest.mock('expo-router/react-navigation', () => ({ useHeaderHeight: () => 100 }));
jest.mock('@/state/rest-timer', () => ({
  useRestTimer: () => null,
  startRest: jest.fn(),
  stopRest: jest.fn(),
  addRest: jest.fn(),
}));
jest.mock('@/components/exercise-picker', () => ({ ExercisePicker: () => null }));

test('renders a workout started from a planned session', async () => {
  await render(<WorkoutScreen />);
  expect(await screen.findByText(/Développé couché/)).toBeTruthy();
  expect(screen.getByText(/Squat/)).toBeTruthy();
  // Stops the duration timer.
  screen.unmount();
});

// Reopening the workout puts it back where it was left: the screen remembers its scroll.
test('remembers where the workout was scrolled to', async () => {
  await render(<WorkoutScreen />);
  await screen.findByText(/Squat/);
  fireEvent(screen.getByTestId('screen'), 'momentumScrollEnd', { nativeEvent: { contentOffset: { x: 0, y: 420 } } });
  expect(setSetting).toHaveBeenCalledWith('workoutScroll', { workoutId: 1, y: 420 });
  screen.unmount();
});
