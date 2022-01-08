// src/fn/group.ts
import _ from "lodash";
import { flattenGraph } from "../core/traverse";
var group = (G, groupName, nodeIds) => {
  const nodesData = flattenGraph(G.graph).nodes.filter((d) => nodeIds.includes(d.id));
  const parentId = (id) => {
    if (G.parentMap.has(id)) {
      return G.parentMap.get(id).id;
    }
    return "";
  };
  if (_.uniq(nodesData.map((d) => parentId(d.id))).length !== 1) {
    console.log("Cannot group across different levels");
    return;
  }
  const groupNode = {
    id: groupName,
    label: groupName,
    type: "custom",
    nodes: [],
    data: null,
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };
  if (G.parentMap.has(nodesData[0].id)) {
    const parentData = G.parentMap.get(nodesData[0].id);
    nodeIds.forEach((nodeId) => {
      const temp = _.remove(parentData.nodes, (node) => node.id === nodeId)[0];
      const newNode = { ...temp };
      groupNode.nodes.push(newNode);
    });
    parentData.nodes.push(groupNode);
  } else {
    nodeIds.forEach((nodeId) => {
      const temp = _.remove(G.graph.nodes, (node) => node.id === nodeId)[0];
      const newNode = { ...temp };
      groupNode.nodes.push(newNode);
    });
    G.graph.nodes.push(groupNode);
  }
  G.isGraphDirty = true;
};
var ungroup = (G, groupName) => {
  const groupData = flattenGraph(G.graph).nodes.filter((d) => d.id === groupName)[0];
  if (G.parentMap.has(groupName)) {
    const parentData = G.parentMap.get(groupName);
    _.remove(parentData.nodes, (n) => n.id === groupName);
    groupData.nodes.forEach((node) => {
      const temp = { ...node };
      parentData.nodes.push(temp);
    });
  } else {
    _.remove(G.graph.nodes, (n) => n.id === groupName);
    groupData.nodes.forEach((node) => {
      const temp = { ...node };
      G.graph.nodes.push(temp);
    });
  }
  delete groupData.nodes;
  G.isGraphDirty = true;
};
export {
  group,
  ungroup
};
//# sourceMappingURL=group.js.map
