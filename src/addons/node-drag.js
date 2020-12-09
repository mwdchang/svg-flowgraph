import * as d3 from 'd3';
import { flatten } from '../utils';
import { translate } from '../utils/svg-util';

const nodeDrag = (G) => {
  /**
   * Enable node dragging, this will recalculate edge end points as well
   */
  const enableDrag = () => {
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
        } else if (draggedIds.includes(source)) {
          edge.points[0].x += dx;
          edge.points[0].y += dy;
        } else if (draggedIds.includes(target)) {
          edge.points[edge.points.length - 1].x += dx;
          edge.points[edge.points.length - 1].y += dy;
        }
      });

      // update edges based on new source/target coords
      G.updateEdgePoints();
    }

    function dragEnd() {}

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
