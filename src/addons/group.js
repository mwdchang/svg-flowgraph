import _ from 'lodash';

const group = (G) => {
  /**
   * Group nodes, must be at the same level (all nodes must share the same parent)
   *
   * @param {string} groupName
   * @param {array} nodeIds - node identifiers
   */
  const group = async(groupName, nodeIds) => {
    const chart = G.chart;

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

    await G.render();
  };

  /**
   * Ungroup
   * @param {string} groupName
   */
  const ungroup = async (groupName) => {
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

    await G.render();
  };

  return [
    { name: 'group', fn: group },
    { name: 'ungroup', fn: ungroup }
  ];
};

export { group };
