class BinaryHeap {
  constructor(maxsize, scoreFn) {
    this.size = 0;
    this.maxsize = maxsize;
    this.data = new Array(this.maxsize + 1);
    this.scoreFn = scoreFn;
  }

  getParent(index) { return Math.round(index / 2); }
  getLeftChild(index) { return 2 * index; }
  getRightChild(index) { return 2 * index + 1; }
  isLeaf(index) { return index >= this.size / 2 && index <= this.size; }

  swap(indexA, indexB) {
    const tmp = this.data[indexA];
    this.data[indexA] = this.data[indexB];
    this.data[indexB] = tmp;
  }

  heapify(index) {
    if (this.isLeaf(index)) return;
    const scoreFn = this.scoreFn;
    const data = this.data;
    const e = data[index];
    const leftChildIndex = this.getLeftChild(index);
    const rightChildIndex = this.getRightChild(index);

    if (scoreFn(e) > scoreFn(data[leftChildIndex]) || scoreFn(e) > scoreFn(data[rightChildIndex])) {
      if (scoreFn(data[leftChildIndex]) < scoreFn(data[rightChildIndex])) {
        this.swap(index, leftChildIndex);
        this.heapify(this.getLeftChild(index));
      } else {
        this.swap(index, rightChildIndex);
        this.heapify(this.getRightChild(index));
      }
    }
  }

  insert(e) {
    if (this.size >= this.maxsize) return;
    const scoreFn = this.scoreFn;
    this.data[++this.size] = e;

    let currentIndex = this.size;
    while (scoreFn(this.data[currentIndex]) < scoreFn(this.data[this.getParent(currentIndex)])) {
      this.swap(currentIndex, this.getParent(currentIndex));
      currentIndex = this.getParent(currentIndex);
    }
  }

  pop() {
    const e = this.data[1];
    this.data[1] = this.data[this.size - 1];
    this.size--;
    this.heapify(1);
    return e;
  }
}

/**
 * A* super basic path searching, not terribly optimized but fast enough for me
 *
 * @param {object} start - coord {x:%, y:%}
 * @param {string} goal - coord {x:%, y:%}
 * @param {function} collider - used during pathing, for routing around obstacles
 * @param {object} gridCell - optional {w:%, h:%}, default 10,10 - routing is done on this grid
 * @param {number} searchLimit - this is the max number of grid squares astar will search, default 1000
 */
const getAStarPath = (start, goal, collider = () => false, gridCell = { w: 10, h: 10 }, searchLimit = 5000) => {
  const PRIME = 756065179;
  const SIZE = 8000;
  const pAsKey = (p) => {
    return (Math.round(p.x) + SIZE) * PRIME + (p.y + SIZE);
  };
  const keyAsP = (v) => {
    const y = v % PRIME;
    const x = (v - y) / PRIME;
    return { x: x - SIZE, y: y - SIZE };
  };

  const sqDifference = (a, b) => (a - b) * (a - b);
  const sqDistance = (p1, p2) => sqDifference(p1.x, p2.x) + sqDifference(p1.y, p2.y);

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

  const getNeighbours = (p, grid) => {
    return [
      // orthogonals
      { x: p.x + gridCell.w, y: p.y },
      { x: p.x - gridCell.w, y: p.y },
      { x: p.x, y: p.y - gridCell.h },
      { x: p.x, y: p.y + gridCell.h },

      // diagonals
      { x: p.x + gridCell.w, y: p.y + gridCell.h },
      { x: p.x + gridCell.w, y: p.y - gridCell.h },
      { x: p.x - gridCell.w, y: p.y - gridCell.h },
      { x: p.x - gridCell.w, y: p.y + gridCell.h }
    ];
  };

  // TOOD: consider replacing pAsKey/keyAsP/gScore/fScore with a js Map or something with a cleaner feeling interface
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

    const neighbours = getNeighbours(current, gridCell); // canadian spelling, sorry not sorry eh
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

      const tentativeScore = gScore[pAsKey(current)] + sqDistance(current, neighbour);
      if (gScore[neighbourKey] === undefined || tentativeScore < gScore[neighbourKey]) {
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


export { getAStarPath };
