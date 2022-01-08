// src/core/delta-renderer.ts
import {
  select
} from "d3";
import { translate } from "../utils/svg-util";
import { Renderer } from "./renderer";
var DeltaRenderer = class extends Renderer {
  setupNodes() {
    const chart = this.chart.select(".nodes-layer");
    const oldNodeMap = this.oldNodeMap;
    const useStableLayout = this.canLeverageStableLayout;
    const _recursiveBuild = (selection, childrenNodes) => {
      if (!childrenNodes)
        return;
      const nodesGroup = selection.selectAll(".node").filter(function() {
        return this.parentNode === selection.node();
      }).data(childrenNodes, (d) => d.id);
      const newNodes = nodesGroup.enter().append("g").classed("node", true);
      nodesGroup.exit().each((d) => d.state = "removed");
      newNodes.each((d) => d.state = "new");
      nodesGroup.each((d) => d.state = "updated");
      [newNodes, nodesGroup].forEach((g) => {
        g.each(function(d) {
          const selection2 = select(this);
          if (selection2.select(".node-ui").size() === 0) {
            selection2.append("g").classed("node-ui", true);
          }
          if (useStableLayout === true && oldNodeMap.has(d.id)) {
            const oldPosition = oldNodeMap.get(d.id);
            d.x = oldPosition.x;
            d.y = oldPosition.y;
            d.width = oldPosition.width;
            d.height = oldPosition.height;
          }
          selection2.select(".node-ui").datum(d);
          if (selection2.select(".node-children").size() === 0) {
            selection2.append("g").classed("node-children", true);
          }
          _recursiveBuild(selection2.select(".node-children"), d.nodes);
        });
        g.attr("transform", (d) => translate(d.x, d.y));
      });
    };
    _recursiveBuild(chart, this.graph.nodes);
    this.renderNodesAdded(chart.selectAll(".node-ui").filter((d) => d.state === "new"));
    this.renderNodesUpdated(chart.selectAll(".node-ui").filter((d) => d.state === "updated"));
    this.renderNodesRemoved(chart.selectAll(".node-ui").filter((d) => d.state === "removed"));
  }
  setupEdges() {
    const chart = this.chart;
    const oldEdgeMap = this.oldEdgeMap;
    const useStableLayout = this.canLeverageStableLayout;
    const allEdges = this.graph.edges;
    allEdges.forEach((edge) => {
      if (useStableLayout === true && oldEdgeMap.has(edge.id)) {
        edge.points = oldEdgeMap.get(edge.id).points;
      }
    });
    const edgesGroup = chart.selectAll(".edge").data(allEdges, (d) => d.id);
    const newEdges = edgesGroup.enter().append("g").classed("edge", true);
    edgesGroup.exit().each((d) => d.state = "removed");
    newEdges.each((d) => d.state = "new");
    edgesGroup.each((d) => d.state = "updated");
    chart.selectAll(".edge").filter((d) => d.state === "updated").each(function(d) {
      select(this).selectAll(".edge-path").datum(d);
    });
    this.renderEdgesAdded(chart.selectAll(".edge").filter((d) => d.state === "new"));
    this.renderEdgesUpdated(chart.selectAll(".edge").filter((d) => d.state === "updated"));
    this.renderEdgesRemoved(chart.selectAll(".edge").filter((d) => d.state === "removed"));
  }
};
export {
  DeltaRenderer
};
//# sourceMappingURL=delta-renderer.js.map
