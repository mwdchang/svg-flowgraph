const nodeSize = (G) => {
  /**
   * Enlarge node
   *
   * @param {string} nodeId
   */
  const setNodeSize = (nodeId, w, h) => {
    const prev = G.chart.selectAll('.node').filter(d => d.focused === true);
    if (prev.size() === 1) {
      const datum = prev.datum();
      delete datum.width;
      delete datum.height;
      delete datum.focused;
    }

    const node = G.chart.selectAll('.node').filter(d => d.id === nodeId);

    // Don't enlarge compound nodes
    if (node.nodes && node.nodes.length > 0) return;

    node.datum().width = w;
    node.datum().height = h;
    node.datum().focused = true;
  };

  const resetNodeSize = (nodeId) => {
    const node = G.chart.selectAll('.node').filter(d => d.id === nodeId);
    const datum = node.datum();
    delete datum.width;
    delete datum.height;
    delete datum.focused;
  };

  return [
    { name: 'setNodeSize', fn: setNodeSize },
    { name: 'resetNodeSize', fn: resetNodeSize }
  ];
};

export { nodeSize };
