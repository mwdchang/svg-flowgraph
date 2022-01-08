// src/utils/simplify.ts
var simplifyDPStep = (points, first, last, sqTolerance, simplified) => {
  const sqSegmentDistance = (p, p1, p2) => {
    const sqDifference = (a, b) => (a - b) * (a - b);
    const sqDistance = (p12, p22) => sqDifference(p12.x, p22.x) + sqDifference(p12.y, p22.y);
    if (p1.x === p2.x && p1.y === p2.y)
      return sqDistance(p, p1);
    const t = ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / sqDistance(p2, p1);
    if (t > 1)
      return sqDistance(p, p2);
    else if (t > 0)
      return sqDistance(p, { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t });
    else
      return sqDistance(p, p1);
  };
  let maxSqDist = sqTolerance;
  let index = -1;
  for (let i = first + 1; i < last; i++) {
    const sqDist = sqSegmentDistance(points[i], points[first], points[last]);
    if (sqDist > maxSqDist) {
      index = i;
      maxSqDist = sqDist;
    }
  }
  if (maxSqDist > sqTolerance) {
    if (index - first > 1)
      simplifyDPStep(points, first, index, sqTolerance, simplified);
    simplified.push(points[index]);
    if (last - index > 1)
      simplifyDPStep(points, index, last, sqTolerance, simplified);
  }
};
var simplifyDouglasPeucker = (points, sqTolerance) => {
  const last = points.length - 1;
  const simplified = [points[0]];
  simplifyDPStep(points, 0, last, sqTolerance, simplified);
  simplified.push(points[last]);
  return simplified;
};
var simplifyPath = (points, tolerance = 8) => {
  if (points.length <= 2)
    return points;
  return simplifyDouglasPeucker(points, tolerance * tolerance);
};
export {
  simplifyPath
};
//# sourceMappingURL=simplify.js.map
