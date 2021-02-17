import _ from 'lodash';
import * as d3 from 'd3';

const astar = (G) => {
  /**
   * A* super basic path searching, not terribly optimized but fast enough for me
   *
   * @param {object} start - coord {x:%, y:%}
   * @param {string} goal - coord {x:%, y:%}
   * @param {function} collider - used during pathing, for routing around obstacles
   * @param {object} grid - optional {x:%, y:%}, default 10,10 - routing is done on this grid
   * @param {number} searchLimit - this is the max number of grid squares astar will search, default 1000
   */
  const getPath = (start, goal, collider = () => false, grid = { x:10, y:10 }, searchLimit = 1000) => {
    const pAsKey = (p) => `${p.x},${p.y}`;
    const keyAsP = (key) => ({ x: parseInt(key.split(',')[0]), y: parseInt(key.split(',')[1]) });
    const distance = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const heuristic = (p) => distance(p, goal) * 1.2;
    const pEqual = (p1, p2) => p1.x === p2.x && p1.y === p2.y;

    const nearestValue = (a, v) => Math.round(a / v) * v;
    const nearestOnGrid = (a) => ({ x: nearestValue(a.x, grid.x), y: nearestValue(a.y, grid.y) });
    const startOnGrid = nearestOnGrid(start);
    const goalOnGrid = nearestOnGrid(goal);

    if (pEqual(startOnGrid, goalOnGrid)) {
      return [start, goal];
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
      ];
    };

    // TOOD: consider replacing pAsKey/keyAsP/gScore/fScore with a js Map or something with a cleaner feeling interface
    openSet.push(pAsKey(startOnGrid));
    gScore[pAsKey(startOnGrid)] = 0;
    fScore[pAsKey(startOnGrid)] = heuristic(startOnGrid);

    // TODO: fairly slow, but it's not much code and it seems to be fast enough for now - consider switching to a priority queue or fibonacci heap later
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

      const neighbours = getNeighbours(current, grid); // canadian spelling, sorry not sorry eh
      // TODO: getJumpPoints used to be here but not anymore no one knows where it went, i guess it went home

      for (let i = 0; i < neighbours.length; i++) {
        const neighbour = neighbours[i];
        const neighbourKey = pAsKey(neighbour);

        if (pEqual(neighbour, goalOnGrid)) {
          const path = [pAsKey(goal), currentKey];
          while (cameFrom[path[path.length - 1]] !== undefined) {
            path.push(cameFrom[path[path.length - 1]]);
          }
          path.push(pAsKey(start));
          return path.map(keyAsP).reverse();
        }

        if (collider(neighbour)) continue;

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
    return [start, goal];
  }

  return [
    { name: 'getPath', fn: getPath }
  ];
};

export { astar };
