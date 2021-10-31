import * as d3 from 'd3';
import { removeChildren } from '../utils/dom-util';
import { traverseGraph, flattenGraph } from './traverse';
import { pointOnPath, translate } from '../utils/svg-util';

import {
  INode, IEdge, IGraph, IRect, IPoint,
  D3Selection, D3SelectionIEdge, D3SelectionINode
} from '../types';
import {D3DragEvent} from 'd3';

interface Options {
  el?: HTMLDivElement

  useEdgeControl?: boolean
  edgeControlOffsetType?: string
  edgeControlOffset?: number

  useZoom?: boolean
  useMinimap?: boolean
  useStableLayout?: boolean
  useStableZoomPan?: boolean
}

export const pathFn = d3.line<{ x: number, y: number}>()
  .x(d => d.x)
  .y(d => d.y);

export abstract class Renderer<V, E> {
  options: Options;
  registry: Map<string, any> = new Map(); // FIXME better type?
  parentMap: Map<string, INode<V>>;
  oldNodeMap: Map<string, IRect> = new Map();
  oldEdgeMap: Map<string, { points: IPoint[] }> = new Map();

  svgEl: SVGElement;
  chart: D3Selection;
  chartSize: { width: number, height: number } = { width: 1, height: 1 };

  graph: IGraph<V, E> = null;

  // misc
  clickTimer: any;
  zoom: d3.ZoomBehavior<Element, unknown>;
  zoomTransformObject: d3.ZoomTransform = null;

  constructor(options: Options) {
    this.parentMap = new Map();
    this.options = options;

    if (this.options.el) {
      this.initalize(this.options.el);
    } else {
      throw new Error('options must provide an element for graph rendering');
    }
  }

  initalize(element: HTMLDivElement): void {
    this.chartSize.width = element.clientWidth;
    this.chartSize.height = element.clientHeight;
    this.svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svgEl.style.userSelect = 'none';
    removeChildren(element).appendChild(this.svgEl);
  }

  setCallback(name: string, fn: any): void {
    this.registry.set(name, fn);
  }

  unsetCallback(name: string): void {
    this.registry.delete(name);
  }

  async setData(graph: IGraph<V, E>): Promise<void> {
    this.graph = graph;
    this.calculateMaps();
  }

  calculateMaps(): void {
    this.parentMap.clear();
    traverseGraph(this.graph, node => {
      if (node.nodes.length > 0) {
        node.nodes.forEach(n => {
          this.parentMap.set(n.id, node);
        });
      }
    });
  }

  getBoundary(): { x1: number, y1: number, x2: number, y2: number } {
    const t = d3.zoomTransform(this.chart.node() as Element);
    const x1 = (0 - t.x) / t.k;
    const y1 = (0 - t.y) / t.k;
    const x2 = (this.chartSize.width) / t.k;
    const y2 = (this.chartSize.height) / t.k;
    return { x1, y1, x2, y2 };
  }

  createChartLayers(): void {
    const { width, height } = this.chartSize;
    const svg = d3.select(this.svgEl);
    svg.selectAll('*').remove();
    svg.attr('width', width + 'px');
    svg.attr('height', height + 'px');
    svg.append('defs');

    svg.append('g').classed('background-layer', true);
    svg.append('g').classed('data-layer', true);
    svg.append('g').classed('foreground-layer', true);

    // Add a nodes layer
    svg.select('.data-layer').append('g').classed('nodes-layer', true);
    this.chart = svg.select('.data-layer');
  }

  async render(): Promise<void> {
    this.oldNodeMap.clear();
    this.oldEdgeMap.clear();

    if (this.chart && this.options.useStableLayout === true) {
      this.chart.selectAll('.node').each((d :INode<V>) => {
        this.oldNodeMap.set(d.id, {
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height
        });
      });
      this.chart.selectAll('.edge').each((d :IEdge<E>) => {
        this.oldEdgeMap.set(d.id, {
          points: d.points
        });
      });
    }

    if (!this.chart) {
      this.createChartLayers();
    }
    this.setupNodes();
    this.setupEdges();

    if (this.options.useEdgeControl === true) {
      this.setupEdgeControls();
    }

    // Enable various interactions
    this.chart.selectAll('.edge').call(this.enableEdgeInteraction, this);
    this.chart.selectAll('.node-ui').call(this.enableNodeInteraction, this);
    this.enableSVGInteraction();

    // Enable dragging nodes
    this.enableNodeDragging();
  }

  updateEdgePoints(): void {
    const chart = this.chart;
    // const options = this.options;
    chart.selectAll('.edge').selectAll('path').attr('d', (d: IEdge<E>) => {
      return pathFn(d.points);
    });
    // FIXME
    // if (options.useEdgeControl) {
    //   chart.selectAll('.edge').each(function() {
    //     const pathNode = d3.select(this).select('path').node();
    //     const controlPoint = self.calculateEdgeControlPlacement(pathNode);
    //     d3.select(this).select('.edge-control')
    //       .attr('transform', translate(controlPoint.x, controlPoint.y));
    //   });
    // }
  }


  /**
   * Edge interactions
  */
  enableEdgeInteraction(selection: D3Selection, renderer: Renderer<V, E>): void {
    selection.each((_, edgeIndex: number, edges: SVGGElement[]) => {
      const edge = d3.select(edges[edgeIndex]);
      const registry = renderer.registry;

      edge.on('click', function(evt) {
        evt.stopPropagation();
        if (registry.has('edgeClick')) { registry.get('edgeClick')(evt, d3.select(this), renderer); }
      });

      edge.on('mouseenter', function(evt) {
        evt.stopPropagation();
        if (registry.has('edgeMouseEnter')) { registry.get('edgeMouseEnter')(evt, d3.select(this), renderer); }
      });

      edge.on('mouseleave', function(evt) {
        evt.stopPropagation();
        if (registry.has('edgeMouseLeave')) { registry.get('edgeMouseLeave')(evt, d3.select(this), renderer); }
      });
    });
  }

  /**
   * Node interactions
  */
  enableNodeInteraction(selection: D3Selection, renderer: Renderer<V, E>): void {
    selection.each((_, nodeIndex, nodes) => {
      const node = d3.select(nodes[nodeIndex]);
      const registry = renderer.registry;

      node.on('dblclick', function(evt) {
        evt.stopPropagation();
        if (registry.has('nodeDblClick')) {
          window.clearTimeout(renderer.clickTimer);
          registry.get('nodeDblClick')(evt, d3.select(this), renderer);
        }
      });

      node.on('click', function(evt) {
        evt.stopPropagation();
        if (registry.has('nodeClick')) {
          const e = d3.select(this);
          window.clearTimeout(renderer.clickTimer);
          renderer.clickTimer = window.setTimeout(() => {
            registry.get('nodeClick')(evt, e, renderer);
          }, 200);
        }
      });

      node.on('mouseenter', function(evt) {
        // Put the active element on top
        const nodeElement = (node.node() as SVGGElement).parentNode;
        const nodesContainer = nodeElement.parentNode;
        nodesContainer.appendChild(nodeElement);

        evt.stopPropagation();
        if (registry.has('nodeMouseEnter')) { registry.get('nodeMouseEnter')(evt, d3.select(this), renderer); }
      });

      node.on('mouseleave', function(evt) {
        evt.stopPropagation();
        if (registry.has('nodeMouseLeave')) { registry.get('nodeMouseLeave')(evt, d3.select(this), renderer); }
      });
    });
  }

  /**
   * Setup background/canvas interactions
  */
  enableSVGInteraction(): void {
    const chart = this.chart;
    const registry = this.registry;
    const svg = d3.select(this.svgEl);
    this.clickTimer = null;

    svg.on('click', function (evt) {
      evt.stopPropagation();
      const pointerCoords = d3.zoomTransform(svg.node()).invert(d3.pointer(evt));
      if (registry.has('backgroundClick')) {
        registry.get('backgroundClick')(evt, d3.select(this), self, {
          x: pointerCoords[0],
          y: pointerCoords[1]
        });
      }
    });

    svg.on('dblclick', function (evt) {
      evt.stopPropagation();
      const pointerCoords = d3.zoomTransform(svg.node()).invert(d3.pointer(evt));
      if (registry.has('backgroundDblClick')) {
        registry.get('backgroundDblClick')(evt, d3.select(this), self, {
          x: pointerCoords[0],
          y: pointerCoords[1]
        });
      }
    });

    // Zoom control
    const zoomed = (evt) =>  {
      if (this.options.useZoom === false) return;
      chart.attr('transform', evt.transform);
    };
    const zoomEnd = () => {
      if (!this.graph) return;

      this.zoomTransformObject = d3.zoomTransform(chart.node() as Element);

      if (this.options.useMinimap === false || this.options.useZoom === false) return;
      const { x1, y1, x2, y2 } = this.getBoundary();
      const minimap = d3.select(this.svgEl).select('.foreground-layer').select('.minimap');
      minimap.select('.current-view').remove();
      minimap.append('rect')
        .classed('current-view', true)
        .attr('x', x1)
        .attr('y', y1)
        .attr('width', x2)
        .attr('height', y2)
        .attr('stroke', '#000')
        .attr('stroke-width', 1)
        .attr('fill', '#369')
        .attr('fill-opacity', 0.1);
    };

    const minZoom = 0.05;
    const maxZoom = Math.max(2, Math.floor(this.graph.width / this.chartSize.width));
    let zoomLevel = Math.min(1, 1 / (this.graph.height / this.chartSize.height));
    this.zoom = d3.zoom().scaleExtent([minZoom, maxZoom]).on('zoom', zoomed).on('end', zoomEnd);
    svg.call(this.zoom).on('dblclick.zoom', null);

    let zoomX = (-(this.graph.width * zoomLevel * 0.5) + 0.5 * this.chartSize.width) / zoomLevel;
    let zoomY = (-(this.graph.height * zoomLevel * 0.5) + 0.5 * this.chartSize.height) / zoomLevel;

    if (this.options.useStableZoomPan === true && this.zoomTransformObject !== null) {
      zoomLevel = this.zoomTransformObject.k;
      zoomX = this.zoomTransformObject.x / zoomLevel;
      zoomY = this.zoomTransformObject.y / zoomLevel;
    }
    svg.call(
      this.zoom.transform,
      d3.zoomIdentity.translate(0, 0).scale(zoomLevel).translate(zoomX, zoomY)
    );
  }

  setupEdgeControls(): void {
    const chart = this.chart;
    const edges = chart.selectAll('.edge');
    const options = this.options;
    edges.selectAll('.edge-control').remove();
    edges.each(function() {
      const pathNode = d3.select(this).select('path').node() as SVGPathElement;
      const controlPoint = pointOnPath(pathNode, options.edgeControlOffsetType, options.edgeControlOffset);
      d3.select(this).append('g')
        .classed('edge-control', true)
        .attr('transform', translate(controlPoint.x, controlPoint.y));
    });
    chart.selectAll('.edge-control').call(this.renderEdgeControls);
  }

  /**
   * FIXME: Just a simple count, need to handle hierarchies
   * Try to keep layout stable across destructive actions where nodes/edges
   * counts will be smaller than before
   */
  canLeverageStableLayout(): boolean {
    const chart = this.chart;
    const options = this.options;
    const flattened = flattenGraph(this.graph);
    const numNodes = flattened.nodes.length - 1; // Exclude super parent
    return options.useStableLayout && numNodes <= chart.selectAll('.node').size();
  }

  enableNodeDragging(): void {
    console.log(this);
    const edges = this.graph.edges;
    const updateEdgePoints = this.updateEdgePoints.bind(this);
    
    let node: D3SelectionINode<V> = null;
    let nodeDraggingIds: string[] = [];

    function nodeDragStart(evt: any): void  {
      console.log('node-drag start', this);
      evt.sourceEvent.stopPropagation();

      node = d3.select(this) as D3SelectionINode<V>;
      const childrenNodes = node.selectAll('.node') as D3SelectionINode<V>;
      nodeDraggingIds = [node.datum().id, ...childrenNodes.data().map(d => d.id)];
    }

    function nodeDragMove(evt: any) {
      console.log('node-drag move');
      const dx = evt.dx;
      const dy = evt.dy;

      node.datum().x += dx;
      node.datum().y += dy;
      node.attr('transform', translate(node.datum().x, node.datum().y));


      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const source = edge.source;
        const target = edge.target;

        if (nodeDraggingIds.includes(source) && nodeDraggingIds.includes(target)) {
          edge.points.forEach(p => {
            p.x += dx;
            p.y += dy;
          });
        } else if (nodeDraggingIds.includes(source)) {
          edge.points[0].x += dx;
          edge.points[0].y += dy;
        } else if (nodeDraggingIds.includes(target)) {
          edge.points[edge.points.length - 1].x += dx;
          edge.points[edge.points.length - 1].y += dy;
        }
      }
      updateEdgePoints();
    }

    function nodeDragEnd(): void {
      console.log('node-drag end');
    }

    const nodeDrag = d3.drag()
      .on('start', nodeDragStart)
      .on('end', nodeDragEnd)
      .on('drag', nodeDragMove);
    this.chart.selectAll('.node').call(nodeDrag);
  }


  // Need to implement or to overide
  renderEdgeControls(selection: D3SelectionIEdge<E>): void {
    console.log(selection);
  }

  abstract setupNodes(): void
  abstract setupEdges(): void
}
