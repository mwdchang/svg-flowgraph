// src/fn/highlight.ts
import {
  select
} from "d3";
import _ from "lodash";
var highlight = (G, nodes, edges, options) => {
  const svg = select(G.svgEl);
  const chart = G.chart;
  const color = options.color || "red";
  const duration = options.duration || 2e3;
  const highlightId = `glow${new Date().getTime()}`;
  const filter = svg.select("defs").append("filter").attr("id", highlightId).attr("width", "200%").attr("filterUnits", "userSpaceOnUse");
  filter.append("feGaussianBlur").attr("stdDeviation", 4.5).attr("result", "blur");
  filter.append("feOffset").attr("in", "blur").attr("result", "offsetBlur").attr("dx", 0).attr("dy", 0).attr("x", -10).attr("y", -10);
  filter.append("feFlood").attr("in", "offsetBlur").attr("flood-color", color).attr("flood-opacity", 0.95).attr("result", "offsetColor");
  filter.append("feComposite").attr("in", "offsetColor").attr("in2", "offsetBlur").attr("operator", "in").attr("result", "offsetBlur");
  const feMerge = filter.append("feMerge");
  feMerge.append("feMergeNode").attr("in", "offsetBlur");
  feMerge.append("feMergeNode").attr("in", "SourceGraphic");
  const hNodes = chart.selectAll(".node").filter((d) => {
    return nodes.includes(d.id);
  });
  hNodes.style("filter", `url(#${highlightId})`).classed(`${highlightId}`, true);
  const hEdges = chart.selectAll(".edge").filter((d) => {
    return _.some(edges, (edge) => edge.source === d.source && edge.target === d.target);
  });
  hEdges.style("filter", `url(#${highlightId})`).classed(`${highlightId}`, true);
  if (duration > 0) {
    svg.select(`#${highlightId}`).select("feGaussianBlur").transition().duration(duration).attr("stdDeviation", 0.1).on("end", () => {
      hNodes.style("filter", null);
      hEdges.style("filter", null);
      svg.select(`#${highlightId}`).remove();
    });
  }
  return highlightId;
};
var highlightNode = (G, id, options) => {
  return highlight(G, [id], [], options);
};
export {
  highlight,
  highlightNode
};
//# sourceMappingURL=highlight.js.map
