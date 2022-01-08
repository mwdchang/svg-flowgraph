import { IPoint } from '../types';
/**
 * Ramer-Douglas-Peucker shape simplification algorithm
 * https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm
 */
export declare const simplifyPath: (points: IPoint[], tolerance?: number) => IPoint[];
