import { Renderer } from './renderer';
import { D3SelectionINode, D3SelectionIEdge } from '../types';
export declare abstract class BasicRenderer<V, E> extends Renderer<V, E> {
    /**
     * Basic nodes setup - redraws everything and invoke callback
    */
    setupNodes(): void;
    /**
     * Basic edge setup - redraws everything and invoke callback
    */
    setupEdges(): void;
    abstract renderNodes(selection: D3SelectionINode<V>): void;
    abstract renderEdges(selection: D3SelectionIEdge<E>): void;
}
