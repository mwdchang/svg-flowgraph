// src/fn/move-to.ts
import {
  select,
  zoomIdentity,
  zoomTransform
} from "d3";
var moveTo = (G, node, duration) => {
  const chart = G.chart;
  const chartSize = G.chartSize;
  const svg = select(G.svgEl);
  const width = G.graph.width < chartSize.width ? chartSize.width : G.graph.width;
  const height = G.graph.height < chartSize.height ? chartSize.height : G.graph.height;
  const t = zoomTransform(chart.node());
  if (!node)
    return;
  const parentMap = G.parentMap;
  let temp = node.datum();
  const nodeWidth = temp.width;
  const nodeHeight = temp.height;
  let globalX = temp.x;
  let globalY = temp.y;
  while (parentMap.has(temp.id) === true) {
    temp = parentMap.get(temp.id);
    globalX += temp.x;
    globalY += temp.y;
  }
  const dx = globalX + 0.5 * nodeWidth;
  const dy = globalY + 0.5 * nodeHeight;
  svg.transition().duration(duration).call(G.zoom.transform, zoomIdentity.translate(0, 0).scale(t.k).translate(-dx + 0.5 * width / t.k, -dy + 0.5 * height / t.k));
};
var moveToLabel = (G, label, duration) => {
  const chart = G.chart;
  const node = chart.selectAll(".node").filter((d) => d.label === label);
  if (!node)
    return;
  moveTo(G, node, duration);
};
export {
  moveTo,
  moveToLabel
};
//# sourceMappingURL=move-to.js.map
