// src/fn/un-highlight.ts
import {
  select
} from "d3";
var unHighlight = (G, id) => {
  const svg = select(G.svgEl);
  svg.select(`#${id}`).remove();
  svg.selectAll(`.${id}`).style("filter", null);
};
export {
  unHighlight
};
//# sourceMappingURL=un-highlight.js.map
