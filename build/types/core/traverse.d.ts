import { IEdge, IGraph, INode, IPoint } from '../types';
export declare const traverseNode: <T>(node: INode<T>, callback: (node: INode<T>) => void) => void;
export declare const traverseGraph: <V, E>(graph: IGraph<V, E>, callback: (node: INode<V>) => void) => void;
/**
 * Returns a flat representation of all nodes and edges.
 */
export declare const flattenGraph: <V, E>(graph: IGraph<V, E>) => {
    nodes: INode<V>[];
    edges: IEdge<E>[];
};
/**
 * AStar path find
*/
interface IGrid {
    w: number;
    h: number;
}
declare type ColliderFn = (p: IPoint) => boolean;
export declare const getAStarPath: (start: IPoint, goal: IPoint, collider: ColliderFn, gridCell?: IGrid, searchLimit?: number) => IPoint[];
export {};
