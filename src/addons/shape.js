
const shape = (G) => {
  const getSqDiff = (a, b) => (a - b) * (a - b);
  const getSqDist = (p1, p2) => getSqDiff(p1.x, p2.x) + getSqDiff(p1.y, p2.y);
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const pointsalong = (a, b, n) => Array.from(Array(n + 2), (_, i) => ({x: (b.x - a.x) * (i / (n + 1)) + a.x, y: (b.y - a.y) * (i / (n + 1)) + a.y }));
  const slidingwindow = (arr, n, func) => arr.slice(0, arr.length - n + 1).map((_, i) => func(arr.slice(i, i + n)));

  const getSqSegDist = (p, p1, p2) => {
    if (p1.x === p2.x && p1.y === p2.y) return getSqDist(p, p1);

    const t = ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / getSqDist(p2, p1);
    if (t > 1) return getSqDist(p, p2);
    else if (t > 0) return getSqDist(p, { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t });
    else return getSqDist(p, p1);
  }

  const simplifyDPStep = (points, first, last, sqTolerance, simplified) => {
    let maxSqDist = sqTolerance, index;

    for (let i = first + 1; i < last; i++) {
      const sqDist = getSqSegDist(points[i], points[first], points[last]);
      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }

    if (maxSqDist > sqTolerance) {
      if (index - first > 1) simplifyDPStep(points, first, index, sqTolerance, simplified);
      simplified.push(points[index]);
      if (last - index > 1) simplifyDPStep(points, index, last, sqTolerance, simplified);
    }
  }

  const simplifyDouglasPeucker = (points, sqTolerance) => {
    const last = points.length - 1;
    const simplified = [points[0]];
    simplifyDPStep(points, 0, last, sqTolerance, simplified);
    simplified.push(points[last]);
    return simplified;
  }

  const simplifyPath = (points, tolerance = 10.0) => {
    if (points.length <= 2) return points;
    return simplifyDouglasPeucker(points, tolerance * tolerance);
  }

  const addPoints = (path, minDistance = 10.0) => {
    return [].concat(...slidingwindow(path, 2, (pair) => {
      if (distance(pair[0], pair[1]) < minDistance) {
        return [pair[0]];
      } else {
        return pointsalong(pair[0], pair[1], Math.floor(distance(pair[0], pair[1]) / minDistance));
      };
    }), [path[path.length - 1]]);
  };

  return [
    { name: 'simplifyPath', fn: simplifyPath },
    { name: 'addPoints', fn: addPoints }
  ];
};

export { shape };
