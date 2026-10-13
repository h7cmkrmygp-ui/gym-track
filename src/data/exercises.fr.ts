export const MUSCLE_GROUPS = [
  'Pectoraux',
  'Dos',
  'Épaules',
  'Biceps',
  'Triceps',
  'Jambes',
  'Fessiers',
  'Mollets',
  'Abdos',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const STARTER_EXERCISES: [name: string, group: MuscleGroup][] = [
  ['Développé couché', 'Pectoraux'],
  ['Développé incliné barre', 'Pectoraux'],
  ['Développé couché haltères', 'Pectoraux'],
  ['Développé incliné haltères', 'Pectoraux'],
  ['Développé décliné', 'Pectoraux'],
  ['Écarté haltères', 'Pectoraux'],
  ['Écarté poulie (crossover)', 'Pectoraux'],
  ['Pec deck', 'Pectoraux'],
  ['Dips', 'Pectoraux'],
  ['Pompes', 'Pectoraux'],

  ['Tractions', 'Dos'],
  ['Tirage vertical', 'Dos'],
  ['Rowing barre', 'Dos'],
  ['Rowing haltère', 'Dos'],
  ['Rowing assis poulie', 'Dos'],
  ['Rowing T-bar', 'Dos'],
  ['Soulevé de terre', 'Dos'],
  ['Pull-over poulie', 'Dos'],
  ['Shrugs', 'Dos'],

  ['Développé militaire', 'Épaules'],
  ['Développé haltères assis', 'Épaules'],
  ['Élévations latérales', 'Épaules'],
  ['Élévations latérales poulie', 'Épaules'],
  ['Oiseau (deltoïde arrière)', 'Épaules'],
  ['Face pull', 'Épaules'],
  ['Rowing menton', 'Épaules'],

  ['Curl barre', 'Biceps'],
  ['Curl haltères', 'Biceps'],
  ['Curl marteau', 'Biceps'],
  ['Curl incliné', 'Biceps'],
  ['Curl pupitre', 'Biceps'],
  ['Curl poulie', 'Biceps'],

  ['Extension triceps poulie', 'Triceps'],
  ['Extension triceps corde', 'Triceps'],
  ['Barre au front', 'Triceps'],
  ['Extension nuque haltère', 'Triceps'],
  ['Développé couché prise serrée', 'Triceps'],
  ['Dips banc', 'Triceps'],

  ['Squat', 'Jambes'],
  ['Front squat', 'Jambes'],
  ['Presse à cuisses', 'Jambes'],
  ['Hack squat', 'Jambes'],
  ['Fentes', 'Jambes'],
  ['Squat bulgare', 'Jambes'],
  ['Leg extension', 'Jambes'],
  ['Leg curl allongé', 'Jambes'],
  ['Leg curl assis', 'Jambes'],
  ['Soulevé de terre roumain', 'Jambes'],

  ['Hip thrust', 'Fessiers'],
  ['Abduction machine', 'Fessiers'],
  ['Kickback poulie', 'Fessiers'],

  ['Mollets debout', 'Mollets'],
  ['Mollets assis', 'Mollets'],
  ['Mollets à la presse', 'Mollets'],

  ['Crunch', 'Abdos'],
  ['Crunch poulie', 'Abdos'],
  ['Relevés de jambes suspendu', 'Abdos'],
  ['Gainage (planche)', 'Abdos'],
  ['Roue abdominale', 'Abdos'],
];

/** Starter Push / Pull / Legs split: [template, exercises as [name, sets, reps, rest seconds]]. */
export const PPL_PRESET: [string, [string, number, number, number][]][] = [
  [
    'Push',
    [
      ['Développé couché', 4, 6, 150],
      ['Développé incliné haltères', 3, 10, 120],
      ['Développé militaire', 3, 8, 120],
      ['Élévations latérales', 3, 15, 60],
      ['Extension triceps corde', 3, 12, 60],
    ],
  ],
  [
    'Pull',
    [
      ['Tractions', 4, 8, 150],
      ['Rowing barre', 3, 8, 120],
      ['Tirage vertical', 3, 10, 90],
      ['Face pull', 3, 15, 60],
      ['Curl haltères', 3, 12, 60],
    ],
  ],
  [
    'Legs',
    [
      ['Squat', 4, 6, 180],
      ['Soulevé de terre roumain', 3, 8, 150],
      ['Presse à cuisses', 3, 12, 120],
      ['Leg curl assis', 3, 12, 60],
      ['Mollets debout', 4, 12, 60],
    ],
  ],
];
