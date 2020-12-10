import _ from 'lodash';
import * as d3 from 'd3';

const panZoom = (G) => {
  /**
   * applies a transform to the svg move the graph to the center of the svg viewbox
   */
  const centerGraph = () => {
    const viewBox = G.svgEl.viewBox.baseVal;
    const centerTranslate = {
      x: (viewBox.width - G.layout.width) / 2,
      y: (viewBox.height - G.layout.height) / 2
    };
    d3.select(G.svgEl).call(G.zoom.transform, d3.zoomIdentity.translate(centerTranslate.x, centerTranslate.y));
  };

  /**
   * Centralize provided node in the SVG canvas
   *
   * FIXME: need offset multiplier depending on how nodes are drawn
   *
   * @param {string} nodeId - id
   * @param {number} duration - animation transition time in millis
   *
   * See: https://observablehq.com/@d3/programmatic-zoom
   */
  const moveTo = (nodeId, duration) => {
    const chart = G.chart;
    const chartSize = G.chartSize;
    const svg = d3.select(G.svgEl);
    const width = G.layout.width < chartSize.width ? chartSize.width : G.layout.width;
    const height = G.layout.height < chartSize.height ? chartSize.height : G.layout.height;

    // t.k = scale, t.x = translateX, t.y = translateY
    const t = d3.zoomTransform(chart.node());

    // const node = flatten(G.layout).nodes.find(n => n.id === nodeId);
    const node = chart.selectAll('.node').filter(d => d.id === nodeId);
    if (_.isNil(node)) return;

    let temp = node.datum();
    let globalX = temp.x;
    let globalY = temp.y;

    while (_.isNil(temp.parent)) {
      temp = temp.parent;
      globalX += temp.x;
      globalY += temp.y;
    }

    const dx = globalX + 0.5 * node.datum().width;
    const dy = globalY + 0.5 * node.datum().height;
    svg.transition().duration(duration).call(
      G.zoom.transform,
      d3.zoomIdentity.translate(0, 0).scale(t.k).translate(
        -dx + (0.5 * width) / t.k,
        -dy + (0.5 * height) / t.k
      )
    );
  };

  return [
    { name: 'centerGraph', fn: centerGraph },
    { name: 'moveTo', fn: moveTo }
  ];
};

export { panZoom };
