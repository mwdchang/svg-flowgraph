// src/utils/svg-util.ts
var translate = (x, y) => {
  return `translate(${x}, ${y})`;
};
var pointOnPath = (pathNode, offsetType, offsetValue) => {
  let pos = 0;
  const total = pathNode.getTotalLength();
  if (offsetType === "percentage") {
    pos = offsetValue * total;
  } else {
    pos = offsetValue > 0 ? offsetValue : Math.max(0, total + offsetValue);
  }
  const controlPoint = pathNode.getPointAtLength(pos);
  return controlPoint;
};
export {
  pointOnPath,
  translate
};
//# sourceMappingURL=svg-util.js.map
