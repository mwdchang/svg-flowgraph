import _ from 'lodash';
import * as d3 from 'd3';

import svgUtil from './utils/svg-util';
import { GRAPH_EVENTS } from './graph-events';
import { flatten, traverse, removeChildren } from './utils';

const pathFn = svgUtil.pathFn.curve(d3.curveBasis);

// FIXME: This to move out
// - moveTo => parent.depth

/**
 * Just make sure the viewport has a min size so it does not look
 * super large if there are only a few elements
 *
 * @param {object} v - viewport {x2, y2, x2, y2} where x2 y2 are width height respectively
 * @param {object} chartSize - { width, height } the effective size of the chart in pixels
 */
const ensureViewportSize = (v, chartSize) => {
  return {
    x1: v.x1,
    y1: v.y1,
    x2: Math.max(v.x2, chartSize.width),
    y2: Math.max(v.y2, chartSize.height)
  };
};


// TODO
// - Add/Remove without relayout
// - Edge/node look up performance
// - Cull edges is buggy

/**
 * Base support for rendering and manipulating a compound/nested graph.
 *
 * 1. It setups a bare-bone rendering skeleton, In the sense that it renders empty group-nodes and move them
 * into their respective layout positions. It is up to the implementation class to provide the actual rendering
 * functions, which are:
 *
 * Basic rendering mode - redraws everything at every render-loop
 * - renderNode
 * - renderEdge
 *
 * Delta rendering mode - redraws added/removed/updated objects
 * - renderNodeAdded
 * - renderNodeUpdated
 * - renderNodeRemoved
 * - renderEdgeAdded
 * - renderEdgeUpdated
 * - renderEdgeRemoved
 *
 * Common/Misc
 * - renderEdgeControl
 *
 * 2. Provides utility functions to navigate and to manipulate the graph object.
 * - Center on a given node with respect to the container
 *
 * The input specification consist of two things
 * - Graph data specified as a set of nodes and edges
 * - A configuration object to specify the rendering parameters
 *
 * The renderer itself is layout agnostic, it relies upon and expects a layout adapter to be
 * provided as a part of the configuration object. Moreover it expect the adapter to expose a
 * "run()" and "makeRenderingGraph()" methods.
 */
export default class SVGRenderer {
  /**
   * Create Elk graph renderer
   *
   * @param {HTMLElement} options.el - A container element that contains the rendered graph
   * @param {object} options - Renderer options
   * @param {object} options.adapter - Layout adapter
   * @param {string} options.renderMode - "basic" or "delta" modes. The basic mode provides new data-bindings
   *   every single render loop, where the deta mode provides added/updated/delete objects and allows you to
   *   handle them separately with different effects.
   * @param {boolean} options.useEdgeControl - Whether to use edge controls, default to false
   * @param {string} options.edgeControlOffsetType - "percentage" or "unit"
   * @param {numbeer} options.edgeControlOffset - If type is percentage this should be between 0 an 1,
   *   if unit then a positive value is an offset from the source, and a negative offset from the target.
   * @param {boolean} options.useDebugger - prints debugging information
   */
  constructor(options) {
    this.data = {};
    this.registry = new Map();
    this.options = options || {};
    this.options.renderMode = this.options.renderMode || 'basic';
    this.options.useEdgeControl = this.options.useEdgeControl || false;
    this.options.edgeControlOffsetType = this.options.edgeControlOffsetType || 'percentage';
    this.options.edgeControlOffset = this.options.edgeControlOffset || 0.66;
    this.options.useDebugger = this.options.useDebugger || false;
    this.options.addons = this.options.addons || [];

    // Primitive add-on system
    this.options.addons.forEach(addon => {
      addon(this).forEach(d => {
        this[d.name] = d.fn;
      });
    });

    this.adapter = this.options.adapter;

    this.svgEl = null;

    this.chart = null; // D3 chart reference
    this.chartSize = { width: 1, height: 1 };

    // The graph data + positions
    this.layout = null;

    if (options.el) {
      this.initialize(options.el);
    } else {
      throw new Error('options must provide an element for graph rendering');
    }

    // Internal trackers
    this.zoom = null;
  }

  setCallback(name, fn) {
    if (GRAPH_EVENTS.indexOf(name) === -1) {
      throw new Error(`Failed to register callback, unknown name ${name}`);
    } else {
      this.registry.set(name, fn);
    }
  }

  unsetCallback(name) {
    this.registry.delete(name);
  }

  /**
   * Initialize the renderer with given container element
   * @param {HTMLElement} element - container element
   */
  initialize(element) {
    this.chartSize.width = element.clientWidth;
    this.chartSize.height = element.clientHeight;

    this.svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    removeChildren(element).appendChild(this.svgEl);
    this.svgEl.style.userSelect = 'none';
  }

  /**
   * Set graph data
   * @param {Object} data - a graph model data
   */
  setData(data) {
    this.data = data;
    this.layout = null; // clear previous layout since it needs to be updated
  }


  /**
   * Renders the graph
   */
  async render() {
    const options = this.options;
    if (!this.layout) {
      this.layout = await this.runLayout();
    }

    // Addresses the case where swapping layout introduce sufficient changes that
    // we need to recalculate the viewport dimensions
    if (!this.chart) {
      this.chart = this._createChart();
    } else {
      const x1 = 0;
      const y1 = 0;
      const x2 = this.layout.width;
      const y2 = this.layout.height;
      const vp = ensureViewportSize({ x1, y1, x2, y2 }, this.chartSize);
      d3.select(this.svgEl).attr('viewBox', `${vp.x1} ${vp.y1} ${vp.x2} ${vp.y2}`);

      // Reset zoom
      const svg = d3.select(this.svgEl);
      svg.transition().call(
        this.zoom.transform,
        d3.zoomIdentity
      );

      const maxZoom = Math.max(2, Math.floor(this.layout.width / this.chartSize.width));
      this.zoom.scaleExtent([0.5, maxZoom]);
    }

    this.buildDefs();

    if (options.renderMode === 'basic') {
      this.renderNodes();
      this.renderEdges();
    } else {
      this.renderNodesDelta();
      this.renderEdgesDelta();
    }

    if (options.useEdgeControl) {
      this.renderEdgeControls();
    }

    if (options.useDebugger) {
      this.renderDebug();
    }
    this._enableInteraction();
  }

  // FIXME: Should provide very basic marker definitions and leave the work to the
  // implementation renderers
  buildDefs() {
    const svg = d3.select(this.svgEl);
    const edges = flatten(this.layout).edges;

    // Clean up
    svg.select('defs').selectAll('.edge-marker-end').remove();

    svg.select('defs')
      .selectAll('.edge-marker-end')
      .data(edges)
      .enter()
      .append('marker')
      .classed('edge-marker-end', true)
      .attr('id', d => {
        const source = d.source.replace(/\s/g, '');
        const target = d.target.replace(/\s/g, '');
        return `arrowhead-${source}-${target}`;
      })
      .attr('viewBox', svgUtil.MARKER_VIEWBOX)
      .attr('refX', 2)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 15)
      .attr('markerHeight', 15)
      .attr('markerUnits', 'userSpaceOnUse')
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', svgUtil.ARROW)
      .style('fill', '#000')
      .style('stroke', 'none');
  }


  /**
   * A fancier version of renderEdges, figure out the delta between
   * different layout runs and provide access to added, updated, and
   * removed graph elements.
   */
  renderEdgesDelta() {
    const chart = this.chart;
    let allEdges = [];

    traverse(this.layout, (node) => {
      if (node.edges && node.edges.length > 0) {
        allEdges = allEdges.concat(node.edges);
      }
    });

    const edgesGroup = chart.selectAll('.edge').data(allEdges, d => d.id);

    // Scaffold added/updated/removed
    const newEdges = edgesGroup.enter().append('g').classed('edge', true);

    edgesGroup.exit().each(d => (d.state = 'removed'));
    newEdges.each(d => (d.state = 'new'));
    edgesGroup.each(d => (d.state = 'updated'));

    // Rebind because children point to different reference
    chart.selectAll('.edge').filter(d => d.state === 'updated').each(function(d) {
      d3.select(this).selectAll('.edge-path').datum(d);
    });

    chart.selectAll('.edge').filter(d => d.state === 'new').call(this.renderEdgeAdded);
    chart.selectAll('.edge').filter(d => d.state === 'updated').call(this.renderEdgeUpdated);
    chart.selectAll('.edge').filter(d => d.state === 'removed').call(this.renderEdgeRemoved);
  }

  renderEdges() {
    const chart = this.chart;
    chart.selectAll('.edge').remove();

    const _recursiveBuild = (n) => {
      if (n.nodes) {
        n.nodes.forEach(node => {
          _recursiveBuild(node);
        });
      }
      if (!n.edges) return;

      chart.selectAll('.edge')
        .data(n.edges, d => d.id)
        .enter().append('g')
        .classed('edge', true);
    };
    _recursiveBuild(this.layout);
    chart.selectAll('.edge').call(this.renderEdge);
  }


  /**
   * A fancier version of renderNodes, figures out the delta between
   * different layout runs and provide access to added, updated, and
   * removed graph elements.
   */
  renderNodesDelta() {
    const chart = this.chart;

    const _recursiveBuild = (selection, childrenNodes) => {
      if (!childrenNodes) return;

      const nodesGroup = selection.selectAll('.node').filter(function() {
        return this.parentNode === selection.node();
      }).data(childrenNodes, d => d.id);

      const newNodes = nodesGroup.enter().append('g')
        .classed('node', true);

      // nodesGroup.exit().remove();
      nodesGroup.exit().each(d => (d.state = 'removed'));
      newNodes.each(d => (d.state = 'new'));
      nodesGroup.each(d => (d.state = 'updated'));

      [newNodes, nodesGroup].forEach(g => {
        g.each(function(d) {
          const selection = d3.select(this);

          // Allocate for the node itself
          if (selection.select('.node-ui').size() === 0) {
            selection.append('g').classed('node-ui', true);
          }
          selection.select('.node-ui').datum(d);

          // Allocate for the node's children
          if (selection.select('.node-children').size() === 0) {
            selection.append('g').classed('node-children', true);
          }
          _recursiveBuild(selection.select('.node-children'), d.nodes);
        });

        g.transition().duration(1000).attr('transform', d => {
          return svgUtil.translate(d.x, d.y);
        });
      });
    };
    _recursiveBuild(chart, this.layout.nodes);

    chart.selectAll('.node-ui').filter(d => d.state === 'new').call(this.renderNodeAdded);
    chart.selectAll('.node-ui').filter(d => d.state === 'updated').call(this.renderNodeUpdated);
    chart.selectAll('.node-ui').filter(d => d.state === 'removed').call(this.renderNodeRemoved);
  }

  /**
   * Simple basic renderNodes, just wipe out all nodes and redraw
   */
  renderNodes() {
    const chart = this.chart;
    chart.selectAll('.node').remove();

    const _recursiveBuild = (selection, childrenNodes) => {
      if (!childrenNodes) return;
      const nodesGroup = selection.selectAll('.node')
        .data(childrenNodes)
        .enter().append('g')
        .classed('node', true)
        .attr('transform', d => {
          return svgUtil.translate(d.x, d.y);
        });

      nodesGroup.each(function(d) {
        const s = d3.select(this);
        s.append('g').classed('node-ui', true);
        _recursiveBuild(s.append('g'), d.nodes);
      });
    };
    _recursiveBuild(chart, this.layout.nodes);
    chart.selectAll('.node-ui').call(this.renderNode);
  }

  calculateEdgeControlPlacement(pathNode) {
    const options = this.options;
    let pos = 0;
    const total = pathNode.getTotalLength();
    const offset = options.edgeControlOffset;
    if (options.edgeControlOffsetType === 'percentage') {
      pos = offset * total;
    } else {
      pos = offset > 0 ? offset : Math.max(0, (total + offset));
    }
    const controlPoint = pathNode.getPointAtLength(pos);
    return controlPoint;
  }

  /**
   * Renders a controller UI element along the edge path
   */
  renderEdgeControls() {
    const chart = this.chart;
    const edges = chart.selectAll('.edge');
    edges.selectAll('.edge-control').remove();

    const self = this;

    edges.each(function() {
      const pathNode = d3.select(this).select('path').node();
      const controlPoint = self.calculateEdgeControlPlacement(pathNode);
      d3.select(this).append('g')
        .classed('edge-control', true)
        .attr('transform', svgUtil.translate(controlPoint.x, controlPoint.y));
    });
    chart.selectAll('.edge-control').call(this.renderEdgeControl);
  }

  /**
   * Debugging information
   */
  renderDebug() {
    const chart = this.chart;
    const options = this.options;
    const chartSize = this.chartSize;
    const background = d3.select(this.svgEl).select('.background-layer');
    const width = this.layout.width < chartSize.width ? chartSize.width : this.layout.width;
    const height = this.layout.height < chartSize.height ? chartSize.height : this.layout.height;
    const halfW = 0.5 * width;
    const halfH = 0.5 * height;
    const gridData = [
      [-5000, halfH, 5000, halfH],
      [halfW, -5000, halfW, 5000]
    ];

    background.selectAll('.info').remove();
    const info = background.append('g').classed('info', true);

    const t = d3.zoomTransform(chart.node());
    info.append('text').text('TS: ' + t.k.toFixed(2));
    info.append('text').text('TX: ' + t.x.toFixed(2));
    info.append('text').text('TY: ' + t.y.toFixed(2));
    info.append('text').text('Mode: ' + options.renderMode);
    info.selectAll('text')
      .attr('x', 3)
      .attr('y', (d, i) => (i + 1) * 14)
      .style('font-size', '10px');


    background.selectAll('.grid').remove();
    background.selectAll('.grid')
      .data(gridData)
      .enter()
      .append('path')
      .classed('grid', true)
      .attr('d', d => svgUtil.line(...d))
      .style('fill', 'none')
      .style('stroke', '#00F')
      .style('stroke-width', 1.5)
      .style('opacity', 0.5);
  }

  async runLayout() {
    const renderingGraph = this.adapter.makeRenderingGraph(this.data);
    const layout = this.adapter.run(renderingGraph);
    return layout;
  }

  /**
   * Centralize provided node in the SVG canvas
   *
   * @param {string} nodeId - id
   * @param {number} duration - animation transition time in millis
   *
   * See: https://observablehq.com/@d3/programmatic-zoom
   */
  moveTo(nodeId, duration) {
    const chart = this.chart;
    const chartSize = this.chartSize;
    const svg = d3.select(this.svgEl);
    const width = this.layout.width < chartSize.width ? chartSize.width : this.layout.width;
    const height = this.layout.height < chartSize.height ? chartSize.height : this.layout.height;

    // t.k = scale, t.x = translateX, t.y = translateY
    const t = d3.zoomTransform(chart.node());

    const node = flatten(this.layout).nodes.find(n => n.id === nodeId);
    if (_.isNil(node)) return;

    let globalX = node.x;
    let globalY = node.y;
    let temp = node;
    // while (true) {
    //   if (_.isNil(temp.parent) || temp.parent.depth === 0) break;
    while (temp.parent && temp.parent.depth !== 0) {
      temp = temp.parent;
      globalX += temp.x;
      globalY += temp.y;
      console.log(globalX, globalY);
    }

    const dx = globalX + 0.5 * node.width;
    const dy = globalY + 0.5 * node.height;
    svg.transition().duration(duration).call(
      this.zoom.transform,
      d3.zoomIdentity.translate(0, 0).scale(t.k).translate(
        -dx + (0.5 * width) / t.k,
        -dy + (0.5 * height) / t.k
      )
    );
  }

  /**
   * Prepare the SVG and returns a chart refrence. This function will create three "layers": background,
   * data, and foreground layers. The data-layer corresponds to the chart.
   */
  _createChart() {
    const { width, height } = this.chartSize;
    const viewPort = {
      x1: 0,
      y1: 0,
      x2: this.layout.width,
      y2: this.layout.height
    };
    const svg = d3.select(this.svgEl);
    svg.selectAll('*').remove();

    const treatedSVG = svgUtil.createChart(svg, width, height, ensureViewportSize(viewPort, this.chartSize));

    // change to xMinyMin
    treatedSVG.attr('preserveAspectRatio', 'xMidYMid meet');

    // Add a debugging/background layer
    treatedSVG.append('g').classed('background-layer', true);

    // Add chart group
    const chart = treatedSVG.append('g').classed('data-layer', true);

    // Add a foreground layer
    treatedSVG.append('g').classed('foreground-layer', true);

    const _this = this;
    function zoomed() {
      chart.attr('transform', d3.event.transform);
      if (_this.options.useDebugger) {
        _this.renderDebug();
      }
    }

    const maxZoom = Math.max(2, Math.floor(this.layout.width / this.chartSize.width));
    this.zoom = d3.zoom().scaleExtent([0.5, maxZoom]).on('zoom', zoomed);
    svg.call(this.zoom).on('dblclick.zoom', null);
    return chart;
  }

  /**
   * Standard interaction hooks, these are essentially callback functions
   * that takes in two parameters: A d3 selection of the element, and a
   * reference to the renderer.
   */
  _enableInteraction() {
    const chart = this.chart;
    const self = this;
    const registry = this.registry;
    const svg = d3.select(this.svgEl);
    const nodes = chart.selectAll('.node');
    const edges = chart.selectAll('.edge');
    self.clickTimer = null;

    svg.on('click', function () {
      d3.event.stopPropagation();
      const pointerCoords = d3.zoomTransform(svg.node()).invert(d3.mouse(this));
      if (registry.has('backgroundClick')) {
        registry.get('backgroundClick')(d3.select(this), self, {
          x: pointerCoords[0],
          y: pointerCoords[1]
        });
      }
    });

    svg.on('dblclick', function () {
      d3.event.stopPropagation();
      const pointerCoords = d3.zoomTransform(svg.node()).invert(d3.mouse(this));
      if (registry.has('backgroundDblClick')) {
        registry.get('backgroundDblClick')(d3.select(this), self, {
          x: pointerCoords[0],
          y: pointerCoords[1]
        });
      }
    });

    nodes.on('dblclick', function() {
      d3.event.stopPropagation();
      if (registry.has('nodeDblClick')) {
        window.clearTimeout(self.clickTimer);
        registry.get('nodeDblClick')(d3.select(this), self);
      }
    });

    nodes.on('click', function() {
      d3.event.stopPropagation();
      if (registry.has('nodeClick')) {
        const _this = this;
        window.clearTimeout(self.clickTimer);
        self.clickTimer = window.setTimeout(() => {
          registry.get('nodeClick')(d3.select(_this), self);
        }, 200);
      }
    });

    nodes.on('mouseenter', function() {
      d3.event.stopPropagation();
      if (registry.has('nodeMouseEnter')) { registry.get('nodeMouseEnter')(d3.select(this), self); }
    });

    nodes.on('mouseleave', function() {
      d3.event.stopPropagation();
      if (registry.has('nodeMouseLeave')) { registry.get('nodeMouseLeave')(d3.select(this), self); }
    });

    edges.on('click', function() {
      d3.event.stopPropagation();
      if (registry.has('edgeClick')) { registry.get('edgeClick')(d3.select(this), self); }
    });

    edges.on('mouseenter', function() {
      d3.event.stopPropagation();
      if (registry.has('edgeMouseEnter')) { registry.get('edgeMouseEnter')(d3.select(this), self); }
    });

    edges.on('mouseleave', function() {
      d3.event.stopPropagation();
      if (registry.has('edgeMouseLeave')) { registry.get('edgeMouseLeave')(d3.select(this), self); }
    });
  }

  updateEdgePoints() {
    const chart = this.chart;
    const options = this.options;
    const self = this;
    chart.selectAll('.edge').selectAll('path').attr('d', d => {
      return pathFn(d.points);
    });
    if (options.useEdgeControl) {
      chart.selectAll('.edge').each(function() {
        const pathNode = d3.select(this).select('path').node();
        const controlPoint = self.calculateEdgeControlPlacement(pathNode);
        d3.select(this).select('.edge-control')
          .attr('transform', svgUtil.translate(controlPoint.x, controlPoint.y));
      });
    }
  }

  /**
   * Given a node identifier, trace up the ancestor chain and record edges along the way
   *
   * @param {string} id - node identifier
   */
  trace(nodeId) {
    const checked = new Map();
    const data = this.layout || { edges: [] };
    const tracedEdges = [];

    function backtrack(id) {
      if (checked.has(id)) return;
      checked.set(id, 1);

      const edges = data.edges.filter(edge => edge.target === id);
      edges.forEach(edge => {
        tracedEdges.push(edge);
        backtrack(edge.source);
      });
    }
    backtrack(nodeId, [nodeId]);

    return {
      edges: tracedEdges.map(edge => {
        return { source: edge.source, target: edge.target };
      }),
      nodes: _.uniq([...tracedEdges.map(e => e.source), ...tracedEdges.map(e => e.target)])
    };
  }
}
