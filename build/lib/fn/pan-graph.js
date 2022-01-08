// src/fn/pan-graph.ts
import {
  select,
  zoomIdentity,
  zoomTransform
} from "d3";
var panGraph = (G, x, y, duration) => {
  const chart = G.chart;
  const t = zoomTransform(chart.node());
  const svg = select(G.svgEl);
  svg.transition().duration(duration).call(G.zoom.transform, zoomIdentity.translate(t.x, t.y).scale(t.k).translate(x, y));
};
export {
  panGraph
};
//# sourceMappingURL=pan-graph.js.map
