import { Renderer } from './renderer';
import { D3SelectionINode, D3SelectionIEdge } from '../types';
export declare abstract class DeltaRenderer<V, E> extends Renderer<V, E> {
    setupNodes(): void;
    setupEdges(): void;
    abstract renderNodesAdded(selection: D3SelectionINode<V>): void;
    abstract renderNodesUpdated(selection: D3SelectionINode<V>): void;
    abstract renderNodesRemoved(selection: D3SelectionINode<V>): void;
    abstract renderEdgesAdded(selection: D3SelectionIEdge<E>): void;
    abstract renderEdgesUpdated(selection: D3SelectionIEdge<E>): void;
    abstract renderEdgesRemoved(selection: D3SelectionIEdge<E>): void;
}
