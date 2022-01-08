// src/core/renderer.ts
import {
  curveBasis,
  drag,
  line,
  pointer,
  select,
  zoom,
  zoomIdentity,
  zoomTransform
} from "d3";
import { EventEmitter } from "./event-emitter";
import { removeChildren } from "../utils/dom-util";
import { traverseGraph, flattenGraph, getAStarPath } from "./traverse";
import { pointOnPath, translate } from "../utils/svg-util";
var pathFn = line().x((d) => d.x).y((d) => d.y).curve(curveBasis);
var Renderer = class extends EventEmitter {
  constructor(options) {
    super();
    this.oldNodeMap = new Map();
    this.oldEdgeMap = new Map();
    this.chartSize = { width: 1, height: 1 };
    this.graph = null;
    this.isGraphDirty = true;
    this.canLeverageStableLayout = false;
    this.zoomTransformObject = null;
    this.parentMap = new Map();
    this.options = options;
    if (this.options.el) {
      this.initalize(this.options.el);
    } else {
      throw new Error("options must provide an element for graph rendering");
    }
  }
  initalize(element) {
    this.chartSize.width = element.clientWidth;
    this.chartSize.height = element.clientHeight;
    this.svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svgEl.style.userSelect = "none";
    removeChildren(element).appendChild(this.svgEl);
  }
  async setData(graph) {
    this.graph = graph;
    this.calculateMaps();
  }
  calculateMaps() {
    this.parentMap.clear();
    traverseGraph(this.graph, (node) => {
      if (node.nodes.length > 0) {
        node.nodes.forEach((n) => {
          this.parentMap.set(n.id, node);
        });
      }
    });
  }
  getBoundary() {
    const t = zoomTransform(this.chart.node());
    const x1 = (0 - t.x) / t.k;
    const y1 = (0 - t.y) / t.k;
    const x2 = this.chartSize.width / t.k;
    const y2 = this.chartSize.height / t.k;
    return { x1, y1, x2, y2 };
  }
  createChartLayers() {
    const { width, height } = this.chartSize;
    const svg = select(this.svgEl);
    svg.selectAll("*").remove();
    svg.attr("width", width + "px");
    svg.attr("height", height + "px");
    svg.append("defs");
    svg.append("g").classed("background-layer", true);
    svg.append("g").classed("data-layer", true);
    svg.append("g").classed("foreground-layer", true);
    svg.select(".data-layer").append("g").classed("nodes-layer", true);
    this.chart = svg.select(".data-layer");
  }
  async render() {
    this.oldNodeMap.clear();
    this.oldEdgeMap.clear();
    if (this.chart && this.options.useStableLayout === true) {
      this.chart.selectAll(".node").each((d) => {
        this.oldNodeMap.set(d.id, {
          x: d.x,
          y: d.y,
          width: d.width,
          height: d.height
        });
      });
      this.chart.selectAll(".edge").each((d) => {
        this.oldEdgeMap.set(d.id, {
          points: d.points
        });
      });
    }
    if (this.isGraphDirty === true) {
      console.log("Rerung layout");
      this.graph = await this.options.runLayout(this.graph);
      this.calculateMaps();
    }
    if (!this.chart) {
      this.createChartLayers();
    }
    this.canLeverageStableLayout = this.stableLayoutCheck();
    this.setupDefs();
    this.setupNodes();
    this.setupEdges();
    if (this.options.useEdgeControl === true) {
      this.setupEdgeControls();
    }
    this.chart.selectAll(".edge").call(this.enableEdgeInteraction, this);
    this.chart.selectAll(".node-ui").call(this.enableNodeInteraction, this);
    this.enableSVGInteraction(this);
    this.enableNodeDragging(this);
    this.isGraphDirty = false;
  }
  updateEdgePoints() {
    const chart = this.chart;
    const options = this.options;
    chart.selectAll(".edge").selectAll("path").attr("d", (d) => {
      return pathFn(d.points);
    });
    if (options.useEdgeControl) {
      chart.selectAll(".edge").each(function() {
        const pathNode = select(this).select("path").node();
        const controlPoint = pointOnPath(pathNode, options.edgeControlOffsetType, options.edgeControlOffset);
        select(this).select(".edge-control").attr("transform", translate(controlPoint.x, controlPoint.y));
      });
    }
  }
  enableEdgeInteraction(selection, renderer) {
    selection.each((_, edgeIndex, edges) => {
      const edge = select(edges[edgeIndex]);
      const emit = renderer.emit.bind(renderer);
      edge.on("click", function(evt) {
        evt.stopPropagation();
        emit("edge-click", evt, select(this), renderer);
      });
      edge.on("mouseenter", function(evt) {
        evt.stopPropagation();
        emit("edge-mouse-enter", evt, select(this), renderer);
      });
      edge.on("mouseleave", function(evt) {
        evt.stopPropagation();
        emit("edge-mouse-leave", evt, select(this), renderer);
      });
    });
  }
  enableNodeInteraction(selection, renderer) {
    selection.each((_, nodeIndex, nodes) => {
      const node = select(nodes[nodeIndex]);
      const emit = renderer.emit.bind(renderer);
      node.on("dblclick", function(evt) {
        evt.stopPropagation();
        window.clearTimeout(renderer.clickTimer);
        emit("node-dbl-click", evt, select(this), renderer);
      });
      node.on("click", function(evt) {
        evt.stopPropagation();
        const e = select(this);
        window.clearTimeout(renderer.clickTimer);
        renderer.clickTimer = window.setTimeout(() => {
          emit("node-click", evt, e, renderer);
        }, 200);
      });
      node.on("mouseenter", function(evt) {
        const nodeElement = node.node().parentNode;
        const nodesContainer = nodeElement.parentNode;
        nodesContainer.appendChild(nodeElement);
        evt.stopPropagation();
        emit("node-mouse-enter", evt, select(this), renderer);
      });
      node.on("mouseleave", function(evt) {
        evt.stopPropagation();
        emit("node-mouse-leave", evt, select(this), renderer);
      });
    });
  }
  enableSVGInteraction(renderer) {
    const chart = this.chart;
    const emit = renderer.emit.bind(renderer);
    const svg = select(this.svgEl);
    this.clickTimer = null;
    svg.on("click", function(evt) {
      evt.stopPropagation();
      const pointerCoords = zoomTransform(svg.node()).invert(pointer(evt));
      emit("background-click", evt, select(this), renderer, {
        x: pointerCoords[0],
        y: pointerCoords[1]
      });
    });
    svg.on("dblclick", function(evt) {
      evt.stopPropagation();
      const pointerCoords = zoomTransform(svg.node()).invert(pointer(evt));
      emit("background-dbl-click", evt, select(this), renderer, {
        x: pointerCoords[0],
        y: pointerCoords[1]
      });
    });
    const zoomed = (evt) => {
      if (this.options.useZoom === false)
        return;
      chart.attr("transform", evt.transform);
    };
    const zoomEnd = () => {
      if (!this.graph)
        return;
      this.zoomTransformObject = zoomTransform(chart.node());
      if (this.options.useMinimap === false || this.options.useZoom === false)
        return;
      const { x1, y1, x2, y2 } = this.getBoundary();
      const minimap = select(this.svgEl).select(".foreground-layer").select(".minimap");
      minimap.select(".current-view").remove();
      minimap.append("rect").classed("current-view", true).attr("x", x1).attr("y", y1).attr("width", x2).attr("height", y2).attr("stroke", "#000").attr("stroke-width", 1).attr("fill", "#369").attr("fill-opacity", 0.1);
    };
    const minZoom = 0.05;
    const maxZoom = Math.max(2, Math.floor(this.graph.width / this.chartSize.width));
    let zoomLevel = Math.min(1, 1 / (this.graph.height / this.chartSize.height));
    this.zoom = zoom().scaleExtent([minZoom, maxZoom]).on("zoom", zoomed).on("end", zoomEnd);
    svg.call(this.zoom).on("dblclick.zoom", null);
    let zoomX = (-(this.graph.width * zoomLevel * 0.5) + 0.5 * this.chartSize.width) / zoomLevel;
    let zoomY = (-(this.graph.height * zoomLevel * 0.5) + 0.5 * this.chartSize.height) / zoomLevel;
    if (this.options.useStableZoomPan === true && this.zoomTransformObject !== null) {
      zoomLevel = this.zoomTransformObject.k;
      zoomX = this.zoomTransformObject.x / zoomLevel;
      zoomY = this.zoomTransformObject.y / zoomLevel;
    }
    svg.call(this.zoom.transform, zoomIdentity.translate(0, 0).scale(zoomLevel).translate(zoomX, zoomY));
  }
  setupEdgeControls() {
    if (this.options.useEdgeControl === false)
      return;
    const chart = this.chart;
    const edges = chart.selectAll(".edge");
    const options = this.options;
    edges.selectAll(".edge-control").remove();
    edges.each(function() {
      const pathNode = select(this).select("path").node();
      const controlPoint = pointOnPath(pathNode, options.edgeControlOffsetType, options.edgeControlOffset);
      select(this).append("g").classed("edge-control", true).attr("transform", translate(controlPoint.x, controlPoint.y));
    });
    chart.selectAll(".edge-control").call(this.renderEdgeControls);
  }
  stableLayoutCheck() {
    const chart = this.chart;
    const options = this.options;
    const flattened = flattenGraph(this.graph);
    const numNodes = flattened.nodes.length - 1;
    return options.useStableLayout && numNodes <= chart.selectAll(".node").size();
  }
  enableNodeDragging(renderer) {
    const options = this.options;
    const edges = this.graph.edges;
    const nodes = this.graph.nodes;
    const updateEdgePoints = this.updateEdgePoints.bind(this);
    const emitWrapper = renderer.emit.bind(renderer);
    let node = null;
    let nodeDraggingIds = [];
    let sufficientlyMoved = false;
    function collisionFn(p) {
      const buffer = 10;
      for (let i = 0; i < nodes.length; i++) {
        const node2 = nodes[i];
        if (p.x >= node2.x - buffer && p.x <= node2.x + node2.width + buffer) {
          if (p.y >= node2.y - buffer && p.y <= node2.y + node2.height + buffer) {
            return true;
          }
        }
      }
      return false;
    }
    function nodeDragStart(evt) {
      evt.sourceEvent.stopPropagation();
      node = select(this);
      const childrenNodes = node.selectAll(".node");
      nodeDraggingIds = [node.datum().label, ...childrenNodes.data().map((d) => d.label)];
      sufficientlyMoved = false;
      emitWrapper("node-drag-start", evt, node, renderer);
    }
    function nodeDragMove(evt) {
      const dx = evt.dx;
      const dy = evt.dy;
      sufficientlyMoved = true;
      node.datum().x += dx;
      node.datum().y += dy;
      node.attr("transform", translate(node.datum().x, node.datum().y));
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const source = edge.source;
        const target = edge.target;
        if (nodeDraggingIds.includes(source) && nodeDraggingIds.includes(target)) {
          edge.points.forEach((p) => {
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
      emitWrapper("node-drag-move", evt, node, renderer);
    }
    function nodeDragEnd(evt) {
      if (options.useAStarRouting && sufficientlyMoved) {
        for (let i = 0; i < edges.length; i++) {
          const edge = edges[i];
          const source = edge.source;
          const target = edge.target;
          if (nodeDraggingIds.includes(source) || nodeDraggingIds.includes(target)) {
            const points = edge.points;
            const start = points[0];
            const end = points[points.length - 1];
            if (edge.source === edge.target)
              continue;
            edge.points = getAStarPath(start, end, collisionFn, { w: 20, h: 20 });
          }
        }
        updateEdgePoints();
      }
      nodeDraggingIds = [];
      emitWrapper("node-drag-end", evt, node, renderer);
    }
    const nodeDrag = drag().on("start", nodeDragStart).on("end", nodeDragEnd).on("drag", nodeDragMove);
    this.chart.selectAll(".node").call(nodeDrag);
  }
  renderEdgeControls(_selection) {
  }
  setupDefs() {
  }
};
export {
  Renderer,
  pathFn
};
//# sourceMappingURL=renderer.js.map
