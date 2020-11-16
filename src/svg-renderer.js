import _ from 'lodash';
import * as d3 from 'd3';

import svgUtil from './utils/svg-util';
import GraphRenderer from './base';
import { flatten, traverse, removeChildren } from './utils';

const pathFn = svgUtil.pathFn.curve(d3.curveBasis);

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
 * - Highlight a set of nodes/edges
 * - Collapse and expand compound nodes
 * - Focus/enlarge leaf nodes
 * - De-clutter/cull-out edges whose source/targets are not in the viewport
 *
 * The input specification consist of two things
 * - Graph data specified as a set of nodes and edges
 * - A configuration object to specify the rendering parameters
 *
 * The renderer itself is layout agnostic, it relies upon and expects a layout adapter to be
 * provided as a part of the configuration object. Moreover it expect the adapter to expose a
 * "run()" and "makeRenderingGraph()" methods.
 */
export default class SVGRenderer extends GraphRenderer {
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
    super();
    this.options = options || {};
    this.options.renderMode = this.options.renderMode || 'basic';
    this.options.useEdgeControl = this.options.useEdgeControl || false;
    this.options.edgeControlOffsetType = this.options.edgeControlOffsetType || 'percentage';
    this.options.edgeControlOffset = this.options.edgeControlOffset || 0.66;
    this.options.useDebugger = this.options.useDebugger || false;

    this.adapter = this.options.adapter;

    this.parentEl = null;
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

    // Refernece tracker, key nodes' identifiers. This essentially tracks the before-collapse state
    this.collapseTracker = {};
    this.hiddenEdges = {};
  }

  /**
   * Initialize the renderer with given container element
   * @param {HTMLElement} element - container element
   */
  initialize(element) {
    this.parentEl = element;
    this.chartSize.width = this.parentEl.clientWidth;
    this.chartSize.height = this.parentEl.clientHeight;

    this.svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    removeChildren(this.parentEl).appendChild(this.svgEl);
    this.svgEl.style.userSelect = 'none';
  }

  /**
   * Set graph data
   * @param {Object} data - a graph model data
   */
  setData(data) {
    super.setData(data);
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

    this._enableDrag();
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
        const source = d.data.source.replace(/\s/g, '');
        const target = d.data.target.replace(/\s/g, '');
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
   * Highlight a subgraph with gaussian blur
   *
   * @param {object} options - highlight options
   * @param {string} options.color - highlight color
   * @param {number} options.duration - highlight duration
   */
  highlight({ nodes, edges }, options) {
    const svg = d3.select(this.svgEl);
    const chart = this.chart;

    const color = options.color || 'red';
    const duration = options.duration || 2000;

    const highlightId = `glow${(new Date()).getTime()}`;

    // Reset
    // svg.select('#glow').remove();

    // Add temporary filter definition
    const filter = svg.select('defs')
      .append('filter')
      .attr('id', highlightId)
      .attr('width', '200%')
      .attr('filterUnits', 'userSpaceOnUse');

    filter.append('feGaussianBlur')
      .attr('stdDeviation', 4.5)
      .attr('result', 'blur');

    filter.append('feOffset')
      .attr('in', 'blur')
      .attr('result', 'offsetBlur')
      .attr('dx', 0)
      .attr('dy', 0)
      .attr('x', -10)
      .attr('y', -10);

    filter.append('feFlood')
      .attr('in', 'offsetBlur')
      .attr('flood-color', color)
      .attr('flood-opacity', 0.95)
      .attr('result', 'offsetColor');

    filter.append('feComposite')
      .attr('in', 'offsetColor')
      .attr('in2', 'offsetBlur')
      .attr('operator', 'in')
      .attr('result', 'offsetBlur');


    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode')
      .attr('in', 'offsetBlur');

    feMerge.append('feMergeNode')
      .attr('in', 'SourceGraphic');


    // Apply filter
    // FIXME: not very efficient
    const hNodes = chart.selectAll('.node').filter(d => { return nodes.includes(d.id); });
    hNodes.style('filter', `url(#${highlightId})`).classed(`${highlightId}`, true);

    const hEdges = chart.selectAll('.edge').filter(d => { return _.some(edges, edge => edge.source === d.data.source && edge.target === d.data.target); });
    hEdges.style('filter', `url(#${highlightId})`).classed(`${highlightId}`, true);

    svg.select(`#${highlightId}`).select('feGaussianBlur')
      .transition()
      .duration(duration)
      .attr('stdDeviation', 0)
      .on('end', () => {
        hNodes.style('filter', null);
        hEdges.style('filter', null);
      });

    return highlightId;
  }

  unHighlight(id) {
    const svg = d3.select(this.svgEl);
    svg.select(`#${id}`).remove();
    svg.selectAll(`.${id}`).style('filter', null);
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
   * Collapse node and all children nodes.
   * Note edges whose source and/or target are within the collapsed node are assigned
   * to the node.
   *
   * @param {string} nodeId - node identifier
   */
  async collapse(nodeId) {
    // 1) Grab all nodes
    const node = this.chart.selectAll('.node').filter(d => d.id === nodeId);
    const childrenNodeIds = node.selectAll('.node').data().map(d => d.id);
    const collapseTracker = this.collapseTracker;
    const hiddenEdges = this.hiddenEdges;
    collapseTracker[nodeId] = {};
    collapseTracker[nodeId].edgeMap = {};

    if (childrenNodeIds.length === 0) return; // Don't collapse if already a leaf node

    traverse(this.layout, (node) => {
      if (node.id === nodeId) {
        node.width = 40;
        node.height = 40;
        collapseTracker[nodeId].nodes = node.nodes;

        // FIXME: This is buggy, if the edges are specified 2 levels or lower it will remove them.
        // So this means we need to either
        // - Specify all edges at the top level, or
        // - Shift the edges to be co-loated with one of their "new parent"
        node.nodes = [];
        node.collapsed = true;
      }
      if (!node.edges) return;

      const hidden = _.remove(node.edges, edge => {
        return childrenNodeIds.includes(edge.source) && childrenNodeIds.includes(edge.target);
      });
      if (!_.isEmpty(hidden)) {
        hiddenEdges[node.id] = hidden;
      }

      for (let i = 0; i < node.edges.length; i++) {
        const edge = node.edges[i];
        const source = edge.source;
        const target = edge.target;

        const originalEdge = {};
        if (childrenNodeIds.includes(source)) {
          originalEdge.source = edge.source;
          edge.source = nodeId;
        }
        if (childrenNodeIds.includes(target)) {
          originalEdge.target = edge.target;
          edge.target = nodeId;
        }

        if (!_.isEmpty(originalEdge)) {
          collapseTracker[nodeId].edgeMap[edge.id] = originalEdge;
        }
      }
    });
    this.layout = await this.adapter.run(this.layout);
    this.render();
  }

  /**
   * Expand a collapsed node, and restore the original states
   *
   * @param {string} nodeId - node identifier
   */
  async expand(nodeId) {
    const node = this.chart.selectAll('.node').filter(d => d.id === nodeId);
    const collapseTracker = this.collapseTracker;
    const hiddenEdges = this.hiddenEdges;
    const entry = collapseTracker[nodeId];

    node.datum().nodes = entry.nodes;
    node.datum().collapsed = false;

    // Restore hidden edges
    traverse(node.datum(), (n) => {
      if ({}.hasOwnProperty.call(hiddenEdges, n.id)) {
        // console.log('restoring for', n.id, n.collapsed);
        if (n.collapsed === false) {
          n.edges = n.edges.concat(hiddenEdges[n.id]);
          delete hiddenEdges[n.id];
        }
      }
    });

    // Revert adjusted edges
    traverse(this.layout, (node) => {
      if (!node.edges) return;
      for (let i = 0; i < node.edges.length; i++) {
        const edge = node.edges[i];
        if (entry.edgeMap[edge.id]) {
          edge.target = entry.edgeMap[edge.id].target || edge.target;
          edge.source = entry.edgeMap[edge.id].source || edge.source;
        }
      }
    });
    delete collapseTracker[nodeId];

    this.layout = await this.adapter.run(this.layout);
    this.render();
  }


  /**
   * Enlarge node
   *
   * @param {string} nodeId
   */
  async focus(nodeId) {
    const prev = this.chart.selectAll('.node').filter(d => d.focused === true);
    if (prev.size() === 1) {
      const datum = prev.datum();
      delete datum.width;
      delete datum.height;
      delete datum.focused;
    }

    const node = this.chart.selectAll('.node').filter(d => d.id === nodeId);

    // Don't enlarge compound nodes
    if (node.nodes && node.nodes.length > 0) return;

    node.datum().width = 400;
    node.datum().height = 300;
    node.datum().focused = true;

    this.layout = await this.adapter.run(this.layout);
    this.render();
  }

  async unfocus(nodeId) {
    const node = this.chart.selectAll('.node').filter(d => d.id === nodeId);
    const datum = node.datum();
    delete datum.width;
    delete datum.height;
    delete datum.focused;
    this.layout = await this.adapter.run(this.layout);
    this.render();
  }


  /**
   * Group nodes, must be at the same level (all nodes must share the same parent)
   *
   * @param {string} groupName
   * @param {array} nodeIds - node identifiers
   */
  async group(groupName, nodeIds) {
    const chart = this.chart;

    // 0) check parent
    const nodesData = chart.selectAll('.node').filter(d => nodeIds.includes(d.id)).data();
    if (_.uniq(nodesData.map(d => d.parent.id)).length !== 1) {
      console.log('Cannot group across different levels');
      return;
    }

    const groupNode = {
      id: groupName,
      label: groupName,
      concept: groupName,
      depth: nodesData[0].depth,
      type: 'custom',
      parent: nodesData[0].parent,
      nodes: [],
      data: { label: groupName }
    };

    // 1) Move nodes to new group
    const parentData = nodesData[0].parent;
    nodeIds.forEach(nodeId => {
      const temp = _.remove(parentData.nodes, node => node.id === nodeId)[0];

      // Need to create a new node wrapper to avoid double pointers problem
      const newNode = { ...temp };
      newNode.parent = groupNode;
      groupNode.nodes.push(newNode);
    });

    // 2) Add new gruop node
    parentData.nodes.push(groupNode);

    this.layout = await this.adapter.run(this.layout);
    this.render();
  }

  /**
   * Ungroup
   * @param {string} groupName
   */
  async ungroup(groupName) {
    const chart = this.chart;
    const groupData = chart.selectAll('.node').filter(d => d.id === groupName).data()[0];
    const parentData = groupData.parent;

    // 0) Remove group
    _.remove(parentData.nodes, n => n.id === groupName);

    // 1) Add group children back into group parent
    groupData.nodes.forEach(node => {
      const temp = { ...node };
      temp.parent = parentData;
      parentData.nodes.push(temp);
    });
    delete groupData.nodes;

    this.layout = await this.adapter.run(this.layout);
    this.render();
  }


  // See https://github.com/d3/d3-zoom#zoomTransform
  boundary() {
    const chart = this.chart;
    const t = d3.zoomTransform(chart.node());
    const x1 = (0 - t.x) / t.k;
    const y1 = (0 - t.y) / t.k;
    const x2 = (this.layout.width - t.x) / t.k;
    const y2 = (this.layout.height - t.y) / t.k;

    // const x1 = 0 * t.k + t.x;
    // const y1 = 0 * t.k + t.y;
    // const x2 = this.layout.width * t.k + t.x;
    // const y2 = this.layout.height * t.k + t.y;
    return { x1, y1, x2, y2 };
  }


  cullEdges() {
    const { x1, y1, x2, y2 } = this.boundary();

    // Temporarily hide edges
    this.chart.selectAll('.edge').each(function(d) {
      const source = _.first(d.points);
      const target = _.last(d.points);

      if ((source.x < x1 || source.x > x2 || source.y < y1 || source.y > y2) &&
          (target.x < x1 || target.x > x2 || target.y < y1 || target.y > y2)) {
        d3.select(this).style('opacity', 0);
      }
    });
  }

  uncullEdges() {
    d3.selectAll('.edge').style('opacity', 1);
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

    const registered = (eventName) => {
      return ({}.hasOwnProperty.call(registry, eventName));
    };

    svg.on('click', function () {
      d3.event.stopPropagation();
      const pointerCoords = d3.zoomTransform(svg.node()).invert(d3.mouse(this));
      if (registered('backgroundClick')) {
        registry.backgroundClick(d3.select(this), self, {
          x: pointerCoords[0],
          y: pointerCoords[1]
        });
      }
    });

    svg.on('dblclick', function () {
      d3.event.stopPropagation();
      const pointerCoords = d3.zoomTransform(svg.node()).invert(d3.mouse(this));
      if (registered('backgroundDblClick')) {
        registry.backgroundDblClick(d3.select(this), self, {
          x: pointerCoords[0],
          y: pointerCoords[1]
        });
      }
    });

    nodes.on('dblclick', function() {
      d3.event.stopPropagation();
      if (registered('nodeDblClick')) {
        window.clearTimeout(self.clickTimer);
        registry.nodeDblClick(d3.select(this), self);
      }
    });

    nodes.on('click', function() {
      d3.event.stopPropagation();
      if (registered('nodeClick')) {
        const _this = this;
        window.clearTimeout(self.clickTimer);
        self.clickTimer = window.setTimeout(() => {
          registry.nodeClick(d3.select(_this), self);
        }, 200);
      }
    });

    nodes.on('mouseenter', function() {
      d3.event.stopPropagation();
      if (registered('nodeMouseEnter')) {
        registry.nodeMouseEnter(d3.select(this), self);
      }
    });

    nodes.on('mouseleave', function() {
      d3.event.stopPropagation();
      if (registered('nodeMouseLeave')) {
        registry.nodeMouseLeave(d3.select(this), self);
      }
    });

    edges.on('click', function() {
      d3.event.stopPropagation();
      if (registered('edgeClick')) {
        registry.edgeClick(d3.select(this), self);
      }
    });

    edges.on('mouseenter', function() {
      d3.event.stopPropagation();
      if (registered('edgeMouseEnter')) {
        registry.edgeMouseEnter(d3.select(this), self);
      }
    });

    edges.on('mouseleave', function() {
      d3.event.stopPropagation();
      if (registered('edgeMouseLeave')) {
        registry.edgeMouseLeave(d3.select(this), self);
      }
    });
  }

  /**
   * Enable node dragging, this will recalculate edge end points as well
   */
  _enableDrag() {
    const chart = this.chart;
    const options = this.options;
    const data = flatten(this.layout);
    const nodes = chart.selectAll('.node');
    const self = this;

    function updateEdges() {
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

    function dragStart() {
      d3.event.sourceEvent.stopPropagation();
    }

    function dragMove() {
      const node = d3.select(this);
      const draggedIds = [node.datum().id, ...node.selectAll('.node').data().map(d => d.id)];

      // Check if there is a parent container
      const parentData = d3.select(this.parentNode).datum();

      // Adjust node
      const dx = d3.event.dx;
      const dy = d3.event.dy;

      // Short circuit
      if (parentData) {
        if (node.datum().x + node.datum().width + dx > (parentData.width) || node.datum().x + dx < 0) {
          return;
        }
        if (node.datum().y + node.datum().height + dy > (parentData.height) || node.datum().y + dy < 0) {
          return;
        }
      }

      node.datum().x += dx;
      node.datum().y += dy;
      node.attr('transform', svgUtil.translate(node.datum().x, node.datum().y));
      // Adjust edge
      data.edges.forEach(edge => {
        const source = edge.source;
        const target = edge.target;

        // FIXME: ids might not work once the graph is actually database driven.
        if (draggedIds.includes(source) && draggedIds.includes(target)) {
          edge.points.forEach(p => {
            p.x += dx;
            p.y += dy;
          });
        } else if (draggedIds.includes(source)) {
          edge.points[0].x += dx;
          edge.points[0].y += dy;
        } else if (draggedIds.includes(target)) {
          edge.points[edge.points.length - 1].x += dx;
          edge.points[edge.points.length - 1].y += dy;
        }
      });

      // update edges based on new source/target coords
      updateEdges();
    }

    function dragEnd() {
    }

    // FIXME: Need to disable current listeners first before assigning new ones?
    const nodeDrag = d3.drag()
      .on('start', dragStart)
      .on('end', dragEnd)
      .on('drag', dragMove);
    nodes.call(nodeDrag);
  }

  /**
   * Given a node identifier, trace up the ancestor chain and record edges along the way
   *
   * @param {string} id - node identifier
   */
  _trace(nodeId) {
    const checked = {};
    const data = this.layout || { edges: [] };
    const tracedEdges = [];

    function backtrack(id) {
      if ({}.hasOwnProperty.call(checked, id)) return;
      checked[id] = 1;

      const edges = data.edges.filter(edge => edge.data.target === id);
      edges.forEach(edge => {
        tracedEdges.push(edge);
        backtrack(edge.data.source);
      });
    }
    backtrack(nodeId, [nodeId]);

    return {
      edges: tracedEdges.map(edge => {
        return { source: edge.data.source, target: edge.data.target };
      }),
      nodes: _.uniq([...tracedEdges.map(e => e.data.source), ...tracedEdges.map(e => e.data.target)])
    };
  }
}
