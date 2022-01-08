// src/core/basic-renderer.ts
import {
  select
} from "d3";
import { Renderer } from "./renderer";
import { translate } from "../utils/svg-util";
var BasicRenderer = class extends Renderer {
  setupNodes() {
    const chart = this.chart.select(".nodes-layer");
    chart.selectAll("*").remove();
    const _recursiveBuild = (selection, childrenNodes) => {
      if (!childrenNodes)
        return;
      const nodesGroup = selection.selectAll(".node").data(childrenNodes).enter().append("g").classed("node", true).attr("transform", (d) => {
        return translate(d.x, d.y);
      });
      nodesGroup.each(function(d) {
        const s = select(this);
        s.append("g").classed("node-ui", true);
        _recursiveBuild(s.append("g"), d.nodes);
      });
    };
    _recursiveBuild(chart, this.graph.nodes);
    this.renderNodes(chart.selectAll(".node-ui"));
  }
  setupEdges() {
    const chart = this.chart;
    chart.selectAll(".edge").remove();
    const edges = this.graph.edges;
    chart.selectAll(".edge").data(edges).enter().append("g").classed("edge", true);
    this.renderEdges(chart.selectAll(".edge"));
  }
};
export {
  BasicRenderer
};
//# sourceMappingURL=basic-renderer.js.map
