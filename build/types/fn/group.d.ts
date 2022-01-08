import { Renderer } from '../core';
export declare const group: <V, E>(G: Renderer<V, E>, groupName: string, nodeIds: string[]) => void;
export declare const ungroup: <V, E>(G: Renderer<V, E>, groupName: string) => void;
