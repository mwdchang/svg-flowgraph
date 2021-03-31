import _ from 'lodash';

const group = (G) => {
  /**
   * Group nodes, must be at the same level (all nodes must share the same parent)
   *
   * @param {string} groupName
   * @param {array} nodeIds - node identifiers
   */
  const group = (groupName, nodeIds) => {
    const chart = G.chart;

    // 0) check parent
    const nodesData = chart.selectAll('.node').filter(d => nodeIds.includes(d.id)).data();
    if (_.uniq(nodesData.map(d => G.parentMap.get(d.id).id)).length !== 1) {
      console.log('Cannot group across different levels');
      return;
    }

    const groupNode = {
      id: groupName,
      label: groupName,
      concept: groupName,
      type: 'custom',
      nodes: [],
      data: { label: groupName }
    };

    // 1) Move nodes to new group
    const parentData = G.parentMap.get(nodesData[0].id);
    nodeIds.forEach(nodeId => {
      const temp = _.remove(parentData.nodes, node => node.id === nodeId)[0];

      // Need to create a new node wrapper to avoid double pointers problem
      const newNode = { ...temp };
      groupNode.nodes.push(newNode);
    });

    // 2) Add new gruop node
    parentData.nodes.push(groupNode);

    G.calculteMaps();
  };

  /**
   * Ungroup
   * @param {string} groupName
   */
  const ungroup = (groupName) => {
    const chart = G.chart;
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
  };

  return [
    { name: 'group', fn: group },
    { name: 'ungroup', fn: ungroup }
  ];
};

export { group };
