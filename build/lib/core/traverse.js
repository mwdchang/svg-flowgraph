// src/core/traverse.ts
import { BinaryHeap } from "../utils/binary-heap";
var traverseNode = (node, callback) => {
  callback(node);
  for (let i = 0; i < node.nodes.length; i++) {
    traverseNode(node.nodes[i], callback);
  }
};
var traverseGraph = (graph, callback) => {
  for (let i = 0; i < graph.nodes.length; i++) {
    traverseNode(graph.nodes[i], callback);
  }
};
var flattenGraph = (graph) => {
  let nodes = [];
  traverseGraph(graph, (node) => {
    nodes = nodes.concat(node);
  });
  return {
    nodes,
    edges: graph.edges
  };
};
var getAStarPath = (start, goal, collider, gridCell = { w: 10, h: 10 }, searchLimit = 7e3) => {
  const PRIME = 756065179;
  const SIZE = 8e3;
  const pAsKey = (p) => {
    return (Math.round(p.x) + SIZE) * PRIME + (p.y + SIZE);
  };
  const keyAsP = (v) => {
    const y = v % PRIME;
    const x = (v - y) / PRIME;
    return { x: x - SIZE, y: y - SIZE };
  };
  const sqDifference = (a, b) => (a - b) * (a - b);
  const sqDistance = (p1, p2) => {
    return sqDifference(p1.x, p2.x) + sqDifference(p1.y, p2.y);
  };
  const heuristic = (p) => sqDistance(p, goal) * 1.2;
  const pEqual = (p1, p2) => p1.x === p2.x && p1.y === p2.y;
  const nearestValue = (a, v) => Math.round(a / v) * v;
  const nearestOnGrid = (a) => ({ x: nearestValue(a.x, gridCell.w), y: nearestValue(a.y, gridCell.h) });
  const startOnGrid = nearestOnGrid(start);
  const goalOnGrid = nearestOnGrid(goal);
  if (pEqual(startOnGrid, goalOnGrid)) {
    return [start, goal];
  }
  const cameFrom = [];
  const gScore = {};
  const fScore = {};
  const heap = new BinaryHeap(9999, (e) => {
    return fScore[e];
  });
  const getNeighbours = (p) => {
    return [
      { x: p.x + gridCell.w, y: p.y },
      { x: p.x - gridCell.w, y: p.y },
      { x: p.x, y: p.y - gridCell.h },
      { x: p.x, y: p.y + gridCell.h },
      { x: p.x + gridCell.w, y: p.y + gridCell.h },
      { x: p.x + gridCell.w, y: p.y - gridCell.h },
      { x: p.x - gridCell.w, y: p.y - gridCell.h },
      { x: p.x - gridCell.w, y: p.y + gridCell.h }
    ];
  };
  heap.insert(pAsKey(startOnGrid));
  gScore[pAsKey(startOnGrid)] = 0;
  fScore[pAsKey(startOnGrid)] = heuristic(startOnGrid);
  let count = 0;
  while (heap.size > 0) {
    count = count + 1;
    if (count > searchLimit) {
      break;
    }
    const currentKey = heap.pop();
    const current = keyAsP(currentKey);
    const neighbours = getNeighbours(current);
    for (let i = 0; i < neighbours.length; i++) {
      const neighbour = neighbours[i];
      const neighbourKey = pAsKey(neighbour);
      if (pEqual(neighbour, goalOnGrid)) {
        const path = [pAsKey(goal), currentKey];
        while (cameFrom[path[path.length - 1]] !== void 0) {
          path.push(cameFrom[path[path.length - 1]]);
        }
        path.push(pAsKey(start));
        return path.map(keyAsP).reverse();
      }
      if (collider(neighbour))
        continue;
      const tentativeScore = gScore[pAsKey(current)] + sqDistance(current, neighbour);
      if (gScore[neighbourKey] === void 0 || tentativeScore < gScore[neighbourKey]) {
        cameFrom[neighbourKey] = currentKey;
        gScore[neighbourKey] = tentativeScore;
        fScore[neighbourKey] = tentativeScore + heuristic(neighbour);
        if (heap.data.indexOf(neighbourKey) === -1) {
          heap.insert(neighbourKey);
        }
      }
    }
  }
  return [start, goal];
};
export {
  flattenGraph,
  getAStarPath,
  traverseGraph,
  traverseNode
};
//# sourceMappingURL=traverse.js.map
