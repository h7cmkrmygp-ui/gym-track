export type RotationTemplate = { id: number; rotationOrder: number | null; archived?: boolean };

/**
 * The template that follows the last one done in the rotation (wrapping around),
 * or the first one when there is no usable history.
 */
export function nextInRotation<T extends RotationTemplate>(templates: T[], lastId: number | null): T | null {
  const rotation = templates
    .filter((t) => t.rotationOrder !== null && !t.archived)
    .sort((a, b) => a.rotationOrder! - b.rotationOrder!);
  if (rotation.length === 0) return null;

  const lastIndex = rotation.findIndex((t) => t.id === lastId);
  if (lastIndex === -1) return rotation[0];
  return rotation[(lastIndex + 1) % rotation.length];
}
