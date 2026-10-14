import { setsPerMuscle } from '../volume';

const at = (day: number) => new Date(2026, 9, day, 18).getTime();
const monday = new Date(2026, 9, 12).getTime();

describe('setsPerMuscle', () => {
  test('counts the week’s sets per muscle, most trained first, zeros last', () => {
    const sets = [
      { muscleGroup: 'Dos', at: at(12) },
      { muscleGroup: 'Pectoraux', at: at(13) },
      { muscleGroup: 'Pectoraux', at: at(14) },
      { muscleGroup: 'Pectoraux', at: at(5) }, // previous week
      { muscleGroup: 'Jambes', at: at(19) }, // next week
    ];
    expect(setsPerMuscle(sets, ['Pectoraux', 'Dos', 'Jambes'], monday)).toEqual([
      { group: 'Pectoraux', sets: 2 },
      { group: 'Dos', sets: 1 },
      { group: 'Jambes', sets: 0 },
    ]);
  });

  test('includes groups outside the known list', () => {
    expect(setsPerMuscle([{ muscleGroup: 'Avant-bras', at: at(13) }], ['Dos'], monday)).toEqual([
      { group: 'Avant-bras', sets: 1 },
      { group: 'Dos', sets: 0 },
    ]);
  });
});
