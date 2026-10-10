import { motionValue } from 'motion/react';
import { useState } from 'react';
import type { Point, PointValues } from './stage';

export function usePointValues(start: Point): PointValues {
  const [values] = useState(() => ({ x: motionValue(start.x), y: motionValue(start.y) }));
  return values;
}
