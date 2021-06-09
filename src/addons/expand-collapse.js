import _ from 'lodash';
import { traverse } from '../utils';

const expandCollapse = (G) => {
  const collapseTracker = new Map();
  const hiddenEdges = new Map();

  /**
   * Collapse node and all children nodes.
   * Note edges whose source and/or target are within the collapsed node are assigned
   * to the node.
   *
   * @param {string} nodeId - node identifier
   */
  const collapse = async (nodeId) => {
    // 1) Grab all nodes
    const node = G.chart.selectAll('.node').filter(d => d.id === nodeId);
    const childrenNodeIds = node.selectAll('.node').data().map(d => d.id);
    collapseTracker.set(nodeId, {});
    collapseTracker.get(nodeId).edgeMap = {};

    if (childrenNodeIds.length === 0) return; // Don't collapse if already a leaf node

    traverse(G.layout, (node) => {
      if (node.id === nodeId) {
        node.width = 40;
        node.height = 40;
        collapseTracker.get(nodeId).nodes = node.nodes;

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
        hiddenEdges.set(nodeId, hidden);
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
          collapseTracker.get(nodeId).edgeMap[edge.id] = originalEdge;
        }
      }
    });
    // G.render();
  };

  /**
   * Expand a collapsed node, and restore the original states
   *
   * @param {string} nodeId - node identifier
   */
  const expand = async (nodeId) => {
    const node = G.chart.selectAll('.node').filter(d => d.id === nodeId);
    const entry = collapseTracker.get(nodeId);

    node.datum().nodes = entry.nodes;
    node.datum().collapsed = false;

    // Restore hidden edges
    traverse(node.datum(), (n) => {
      if (hiddenEdges.has(nodeId)) {
        // console.log('restoring for', n.id, n.collapsed);
        if (n.collapsed === false) {
          G.layout.edges = G.layout.edges.concat(hiddenEdges.get(nodeId));
          hiddenEdges.delete(nodeId);
        }
      }
    });

    // Revert adjusted edges
    traverse(G.layout, (node) => {
      if (!node.edges) return;
      for (let i = 0; i < node.edges.length; i++) {
        const edge = node.edges[i];
        if (entry.edgeMap[edge.id]) {
          edge.target = entry.edgeMap[edge.id].target || edge.target;
          edge.source = entry.edgeMap[edge.id].source || edge.source;
        }
      }
    });
    collapseTracker.delete(nodeId);
    // G.render();
  };

  return [
    { name: 'expand', fn: expand },
    { name: 'collapse', fn: collapse }
  ];
};
export { expandCollapse };
