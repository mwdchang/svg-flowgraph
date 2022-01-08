import * as d3 from 'd3';
import { EventEmitter } from './event-emitter';
import { INode, IGraph, IRect, IPoint, D3Selection, D3SelectionIEdge } from '../types';
declare type AsyncFunction<A, O> = (args: A) => Promise<O>;
declare type LayoutFuncion<V, E> = AsyncFunction<IGraph<V, E>, IGraph<V, E>>;
interface Options {
    el?: HTMLDivElement;
    runLayout: LayoutFuncion<any, any>;
    useEdgeControl?: boolean;
    edgeControlOffsetType?: string;
    edgeControlOffset?: number;
    useZoom?: boolean;
    useMinimap?: boolean;
    useStableLayout?: boolean;
    useStableZoomPan?: boolean;
    useAStarRouting?: boolean;
}
export declare const pathFn: d3.Line<{
    x: number;
    y: number;
}>;
export declare abstract class Renderer<V, E> extends EventEmitter {
    options: Options;
    parentMap: Map<string, INode<V>>;
    oldNodeMap: Map<string, IRect>;
    oldEdgeMap: Map<string, {
        points: IPoint[];
    }>;
    svgEl: SVGElement;
    chart: D3Selection;
    chartSize: {
        width: number;
        height: number;
    };
    graph: IGraph<V, E>;
    isGraphDirty: boolean;
    canLeverageStableLayout: boolean;
    clickTimer: any;
    zoom: d3.ZoomBehavior<Element, unknown>;
    zoomTransformObject: d3.ZoomTransform;
    constructor(options: Options);
    initalize(element: HTMLDivElement): void;
    setData(graph: IGraph<V, E>): Promise<void>;
    calculateMaps(): void;
    getBoundary(): {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    };
    createChartLayers(): void;
    render(): Promise<void>;
    updateEdgePoints(): void;
    /**
     * Edge interactions
    */
    enableEdgeInteraction(selection: D3Selection, renderer: Renderer<V, E>): void;
    /**
     * Node interactions
    */
    enableNodeInteraction(selection: D3Selection, renderer: Renderer<V, E>): void;
    /**
     * Setup background/canvas interactions
    */
    enableSVGInteraction(renderer: Renderer<V, E>): void;
    setupEdgeControls(): void;
    /**
     * FIXME: Just a simple count, need to handle hierarchies
     * Try to keep layout stable across destructive actions where nodes/edges
     * counts will be smaller than before
     */
    stableLayoutCheck(): boolean;
    enableNodeDragging(renderer: Renderer<V, E>): void;
    renderEdgeControls(_selection: D3SelectionIEdge<E>): void;
    setupDefs(): void;
    abstract setupNodes(): void;
    abstract setupEdges(): void;
}
export {};
