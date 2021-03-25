import * as d3 from 'd3';
import { flatten } from '../utils';
import { translate } from '../utils/svg-util';
import { getAStarPath } from '../utils/a-star';
// import { simplifyPath } from '../utils/simplify';


const nodeDrag = (G) => {
  const edgeTracker = new Map();

  /**
   * Enable node dragging, this will recalculate edge end points as well
   */
  const enableDrag = (useAStarRouting) => {
    const chart = G.chart;
    const data = flatten(G.layout);

    function dragStart(evt) {
      evt.sourceEvent.stopPropagation();
    }

    function dragMove(evt) {
      const node = d3.select(this);
      const draggedIds = [node.datum().id, ...node.selectAll('.node').data().map(d => d.id)];

      // Check if there is a parent container
      const parentData = d3.select(this.parentNode).datum();

      // Adjust node
      const dx = evt.dx;
      const dy = evt.dy;

      // Short circuit
      if (parentData) {
        if (node.datum().x + node.datum().width + dx > (parentData.width) || node.datum().x + dx < 0) {
          return;
        }
        if (node.datum().y + node.datum().height + dy > (parentData.height) || node.datum().y + dy < 0) {
          return;
        }
      }

      node.datum().x += dx;
      node.datum().y += dy;
      node.attr('transform', translate(node.datum().x, node.datum().y));
      // Adjust edge
      data.edges.forEach(edge => {
        const source = edge.source;
        const target = edge.target;

        // FIXME: ids might not work once the graph is actually database driven.
        if (draggedIds.includes(source) && draggedIds.includes(target)) {
          edge.points.forEach(p => {
            p.x += dx;
            p.y += dy;
          });
          edgeTracker.set(edge.id, 1);
        } else if (draggedIds.includes(source)) {
          edge.points[0].x += dx;
          edge.points[0].y += dy;
          edgeTracker.set(edge.id, 1);
        } else if (draggedIds.includes(target)) {
          edge.points[edge.points.length - 1].x += dx;
          edge.points[edge.points.length - 1].y += dy;
          edgeTracker.set(edge.id, 1);
        }
      });

      // update edges based on new source/target coords
      G.updateEdgePoints();
    }

    function dragEnd() {
      const collisionFn = (p) => {
        const buffer = 10;
        for (let i = 0; i < data.nodes.length; i++) {
          const node = data.nodes[i];
          if (node.nodes) return false;
          if (p.x >= node.x - buffer && p.x <= node.x + node.width + buffer) {
            if (p.y >= node.y - buffer && p.y <= node.y + node.height + buffer) {
              return true;
            }
          }
        }
        return false;
      };

      if (useAStarRouting === true) {
        data.edges.forEach(e => {
          const points = e.points;
          const start = points[0];
          const end = points[points.length - 1];
          if (e.source === e.target) return;
          if (edgeTracker.has(e.id) === false) return;

          e.points = getAStarPath(start, end, collisionFn, { w: 20, h: 20 });
        });
        G.updateEdgePoints();
      }
      edgeTracker.clear();
    }

    // FIXME: Need to disable current listeners first before assigning new ones?
    const nodeDrag = d3.drag()
      .on('start', dragStart)
      .on('end', dragEnd)
      .on('drag', dragMove);

    const nodes = chart.selectAll('.node');
    nodes.call(nodeDrag);
  };

  return [
    { name: 'enableDrag', fn: enableDrag }
  ];
};
export { nodeDrag };
