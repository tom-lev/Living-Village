/* מאגר ה-prefabs: לכל סוג אובייקט בקובץ העולם יש פונקציה שיודעת לצייר אותו */
import type { WorldObject } from '../world/types';

export type Prefab = (o: WorldObject) => void;
export const PREFABS: Record<string, Prefab> = {};
export function register(map: Record<string, Prefab>) { Object.assign(PREFABS, map); }
