import * as d3 from 'd3';

/* SVG Utility functions */

/**
 * Chart wrapper
 * @param {object} svg - D3 svg selection
 * @param {number} w - width
 * @param {number} h - height
 */
export const createChart = (svg, w, h) => {
  svg.attr('width', w + 'px');
  svg.attr('height', h + 'px');
  svg.append('defs');
  return svg;
};

export const translate = (x, y) => { return `translate(${x}, ${y})`; };

export const line = (x1, y1, x2, y2) => {
  return 'M' + x1 + ',' + y1 + 'L' + x2 + ',' + y2;
};

// A path generator
export const pathFn = d3.line()
  .x(d => d.x)
  .y(d => d.y);


// Pre-canned path/glyphs, we assume all paths are bounded by a 10x10 grid and centered at (0, 0)
// - Arrows point left-to-right
export const MARKER_VIEWBOX = '-5 -5 10 10';
export const ARROW = 'M 0,-3.25 L 5 ,0 L 0,3.25';
export const ARROW_SHARP = 'M 0,-3 L 5 ,0 L 0,3 L 1 0';

export default {
  createChart,
  translate,
  line,
  pathFn,

  MARKER_VIEWBOX,
  ARROW,
  ARROW_SHARP
};
