const shape = (G) => {
  const simplifyDPStep = (points, first, last, sqTolerance, simplified) => {
    const sqSegmentDistance = (p, p1, p2) => {
      const sqDifference = (a, b) => (a - b) * (a - b);
      const sqDistance = (p1, p2) => sqDifference(p1.x, p2.x) + sqDifference(p1.y, p2.y);

      if (p1.x === p2.x && p1.y === p2.y) return sqDistance(p, p1);

      const t = ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / sqDistance(p2, p1);
      if (t > 1) return sqDistance(p, p2);
      else if (t > 0) return sqDistance(p, { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t });
      else return sqDistance(p, p1);
    };

    let maxSqDist = sqTolerance;
    let index;

    for (let i = first + 1; i < last; i++) {
      const sqDist = sqSegmentDistance(points[i], points[first], points[last]);
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
  };

  const simplifyDouglasPeucker = (points, sqTolerance) => {
    const last = points.length - 1;
    const simplified = [points[0]];
    simplifyDPStep(points, 0, last, sqTolerance, simplified);
    simplified.push(points[last]);
    return simplified;
  };

  /**
   * Ramer-Douglas-Peucker shape simplification algorithm
   * https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm
   *
   * @param {array} points - array of coords {x:%, y:%}
   * @param {number} tolerance - distance from shape which triggers recursive simplification
   */
  const simplifyPath = (points, tolerance = 8.0) => {
    if (points.length <= 2) return points;
    return simplifyDouglasPeucker(points, tolerance * tolerance);
  };

  const addPoints = (path, minDistance = 10.0) => {
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const pointsalong = (a, b, n) => Array.from(Array(n + 2), (_, i) => ({ x: (b.x - a.x) * (i / (n + 1)) + a.x, y: (b.y - a.y) * (i / (n + 1)) + a.y }));
    const slidingwindow = (arr, n, func) => arr.slice(0, arr.length - n + 1).map((_, i) => func(arr.slice(i, i + n)));

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
