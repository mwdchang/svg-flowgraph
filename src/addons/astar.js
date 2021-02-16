import _ from 'lodash';
import * as d3 from 'd3';

const astar = (G) => {
  /**
   * A* super basic path search
   *
   * @param {object} options - highlight options
   * @param {string} options.color - highlight color
   * @param {number} options.duration - highlight duration
   */

  const getPath = (originalStart, originalGoal, grid, collider) => {
    const pAsKey = (p) => `${p.x},${p.y}`;
    const keyAsP = (key) => ({ x: parseInt(key.split(',')[0]), y: parseInt(key.split(',')[1]) });
    const distance = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const heuristic = (p) => distance(p, originalGoal) * 1.2;
    const pEqual = (p1, p2) => p1.x === p2.x && p1.y === p2.y;
    const nearestValue = (a, v) => Math.round(a / v) * v;
    const nearestOnGrid = (a) => ({ x: nearestValue(a.x, grid.x), y: nearestValue(a.y, grid.y) });
    const start = nearestOnGrid(originalStart);
    const goal = nearestOnGrid(originalGoal);

    if (pEqual(start, goal)) {
      return [originalStart, originalGoal];
    }

    const openSet = [];
    const cameFrom = [];
    const gScore = [];
    const fScore = [];

    const getNeighbours = (p, grid) => {
      return [
        // orthogonals
        { x: p.x + grid.x, y: p.y },
        { x: p.x - grid.x, y: p.y },
        { x: p.x, y: p.y - grid.y },
        { x: p.x, y: p.y + grid.y },

        // diagonals
        { x: p.x + grid.x, y: p.y + grid.y },
        { x: p.x + grid.x, y: p.y - grid.y },
        { x: p.x - grid.x, y: p.y - grid.y },
        { x: p.x - grid.x, y: p.y + grid.y }
      ].filter(p => !collider(p));
    };

    openSet.push(pAsKey(start));
    gScore[pAsKey(start)] = 0;
    fScore[pAsKey(start)] = heuristic(start);

    // FIXME: very slow, , but it's not much code and it seems to be fast enough
    const getMin = () => {
      let minScore = Number.MAX_VALUE;
      let minKey = '';
      for (let i = 0; i < openSet.length; i++) {
        const key = openSet[i];
        if (fScore[key] < minScore) {
          minScore = fScore[key];
          minKey = key;
        }
      }
      return minKey;
    };

    let count = 0;
    while (openSet.length > 0) {
      count = count + 1;
      if (count > 1000) {
        break;
      }

      const currentKey = getMin(fScore);
      const current = keyAsP(currentKey);
      openSet.splice(openSet.indexOf(currentKey), 1);

      if (pEqual(current, goal)) {
        const path = [currentKey];
        while (cameFrom[path[path.length - 1]] !== undefined) {
          path.push(cameFrom[path[path.length - 1]]);
        }
        return [].concat([originalStart], path.map(keyAsP).reverse(), [originalGoal]);
      }

      const neighbours = getNeighbours(current, grid); // thats right, i'm canadian
      // getJumpPoints used to be here but not anymore no one knows where it went, i guess it went home

      for (let i = 0; i < neighbours.length; i++) {
        const neighbour = neighbours[i];
        const neighbourKey = pAsKey(neighbour);

        const tentativeScore = gScore[pAsKey(current)] + distance(current, neighbour);
        if (gScore[neighbourKey] === undefined || tentativeScore < gScore[neighbourKey]) {
          cameFrom[neighbourKey] = currentKey;
          gScore[neighbourKey] = tentativeScore;
          fScore[neighbourKey] = tentativeScore + heuristic(neighbour);
          if (openSet.indexOf(neighbourKey) === -1) {
            openSet.push(neighbourKey);
          }
        }
      }
    }
    return [originalStart, originalGoal];
  }

  return [
    { name: 'getPath', fn: getPath }
  ];
};

export { astar };
