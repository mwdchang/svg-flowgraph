import _ from 'lodash';
import * as d3 from 'd3';

const highlight = (G) => {
  /**
   * Highlight a subgraph with gaussian blur
   *
   * @param {object} options - highlight options
   * @param {string} options.color - highlight color
   * @param {number} options.duration - highlight duration
   */
  const highlight = ({ nodes, edges }, options) => {
    const svg = d3.select(G.svgEl);
    const chart = G.chart;

    const color = options.color || 'red';
    const duration = options.duration || 2000;

    const highlightId = `glow${(new Date()).getTime()}`;

    // Add temporary filter definition
    const filter = svg.select('defs')
      .append('filter')
      .attr('id', highlightId)
      .attr('width', '200%')
      .attr('filterUnits', 'userSpaceOnUse');

    filter.append('feGaussianBlur')
      .attr('stdDeviation', 4.5)
      .attr('result', 'blur');

    filter.append('feOffset')
      .attr('in', 'blur')
      .attr('result', 'offsetBlur')
      .attr('dx', 0)
      .attr('dy', 0)
      .attr('x', -10)
      .attr('y', -10);

    filter.append('feFlood')
      .attr('in', 'offsetBlur')
      .attr('flood-color', color)
      .attr('flood-opacity', 0.95)
      .attr('result', 'offsetColor');

    filter.append('feComposite')
      .attr('in', 'offsetColor')
      .attr('in2', 'offsetBlur')
      .attr('operator', 'in')
      .attr('result', 'offsetBlur');


    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode')
      .attr('in', 'offsetBlur');

    feMerge.append('feMergeNode')
      .attr('in', 'SourceGraphic');


    // Apply filter
    // FIXME: not very efficient
    const hNodes = chart.selectAll('.node').filter(d => { return nodes.includes(d.id); });
    hNodes.style('filter', `url(#${highlightId})`).classed(`${highlightId}`, true);

    const hEdges = chart.selectAll('.edge').filter(d => {
      return _.some(edges, edge => edge.source === d.source && edge.target === d.target);
    });
    hEdges.style('filter', `url(#${highlightId})`).classed(`${highlightId}`, true);

    if (duration > 0) {
      svg.select(`#${highlightId}`).select('feGaussianBlur')
        .transition()
        .duration(duration)
        .attr('stdDeviation', 0.1) // Set to 0 create a weird flashing effect
        .on('end', () => {
          hNodes.style('filter', null);
          hEdges.style('filter', null);
          svg.select(`#${highlightId}`).remove();
        });
    }
    return highlightId;
  };

  const unHighlight = (id) => {
    const svg = d3.select(G.svgEl);
    svg.select(`#${id}`).remove();
    svg.selectAll(`.${id}`).style('filter', null);
  };

  return [
    { name: 'highlight', fn: highlight },
    { name: 'unHighlight', fn: unHighlight }
  ];
};

export { highlight };
