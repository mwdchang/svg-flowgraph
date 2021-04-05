/**
 * Recursively traverse a graph that looks like
 * {
 *   nodes: [
 *     {
 *       nodes: [
 *         {
 *           nodes: [ ... ],
 *           edges: [ ... ]
 *         }
 *       ],
 *       edges: [ ... ]
 *     },
 *     ...
 *   ],
 *   edges: [...]
 * }
 */
export const traverse = (root, callBackFn) => {
  callBackFn(root);
  if (root.nodes) {
    for (let i = 0; i < root.nodes.length; i++) {
      traverse(root.nodes[i], callBackFn);
    }
  }
};



/**
 * Returns a flat representation of all nodes and edges.
 */
export const flatten = (root) => {
  let nodes = [];
  let edges = [];

  traverse(root, (node) => {
    nodes = nodes.concat(node);
    if (node.edges) {
      edges = edges.concat(node.edges);
    }
  });
  return {
    nodes, edges
  };
};
