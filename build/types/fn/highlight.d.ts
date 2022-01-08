import { Renderer } from '../core';
interface HighlightOptions {
    color?: string;
    duration?: number;
}
export declare const highlight: <V, E>(G: Renderer<V, E>, nodes: string[], edges: {
    source: string;
    target: string;
}[], options: HighlightOptions) => string;
export declare const highlightNode: <V, E>(G: Renderer<V, E>, id: string, options: HighlightOptions) => string;
export {};
