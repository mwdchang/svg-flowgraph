import * as d3 from 'd3';
import { translate } from '../utils/svg-util';
import { Renderer } from './renderer';
import { INode, IEdge, D3Selection, D3SelectionINode, D3SelectionIEdge } from '../types';


export abstract class DeltaRenderer<V, E> extends Renderer<V, E> {
  setupNodes(): void {
    const chart = this.chart.select('.nodes-layer');
    const oldNodeMap = this.oldNodeMap;
    const useStableLayout = this.canLeverageStableLayout();

    const _recursiveBuild = (selection: D3Selection, childrenNodes: INode<V>[]) => {
      if (!childrenNodes) return;

      const nodesGroup = selection.selectAll('.node')
        .filter(function() {
          return (this as any).parentNode === selection.node(); // FIXME any?
        })
        .data(childrenNodes, (d: INode<V>) => d.id);

      const newNodes = nodesGroup.enter().append('g')
        .classed('node', true);

      // nodesGroup.exit().remove();
      nodesGroup.exit().each((d: INode<V>) => (d.state = 'removed'));
      newNodes.each((d: INode<V>) => (d.state = 'new'));
      nodesGroup.each((d: INode<V>) => (d.state = 'updated'));

      [newNodes, nodesGroup].forEach(g => {
        g.each(function(d) {
          const selection = d3.select(this);

          // Allocate for the node itself
          if (selection.select('.node-ui').size() === 0) {
            selection.append('g').classed('node-ui', true);
          }
          if (useStableLayout === true && oldNodeMap.has(d.id)) {
            const oldPosition = oldNodeMap.get(d.id);
            d.x = oldPosition.x;
            d.y = oldPosition.y;
            d.width = oldPosition.width;
            d.height = oldPosition.height;
          }

          selection.select('.node-ui').datum(d);

          // Allocate for the node's children
          if (selection.select('.node-children').size() === 0) {
            selection.append('g').classed('node-children', true);
          }
          _recursiveBuild(selection.select('.node-children'), d.nodes);
        });

        g.attr('transform', d => translate(d.x, d.y));
      });
    };
    _recursiveBuild(chart, this.graph.nodes);

    chart.selectAll('.node-ui').filter((d: INode<V>) => d.state === 'new').call(this.renderNodesAdded, this);
    chart.selectAll('.node-ui').filter((d: INode<V>) => d.state === 'updated').call(this.renderNodesUpdated, this);
    chart.selectAll('.node-ui').filter((d: INode<V>) => d.state === 'removed').call(this.renderNodesRemoved, this);
  }

  setupEdges(): void {
    const chart = this.chart;
    const oldEdgeMap = this.oldEdgeMap;
    const useStableLayout = this.canLeverageStableLayout();

    const allEdges = this.graph.edges;

    // Test stablization
    allEdges.forEach(edge => {
      if (useStableLayout === true && oldEdgeMap.has(edge.id)) {
        edge.points = oldEdgeMap.get(edge.id).points;
      }
    });

    const edgesGroup = chart.selectAll('.edge')
      .data(allEdges, (d: IEdge<V>) => d.id);

    // Scaffold added/updated/removed
    const newEdges = edgesGroup.enter().append('g').classed('edge', true);

    edgesGroup.exit().each((d: IEdge<E>) => (d.state = 'removed'));
    newEdges.each((d: IEdge<E>) => (d.state = 'new'));
    edgesGroup.each((d: IEdge<E>) => (d.state = 'updated'));

    // Rebind because children point to different reference
    chart.selectAll('.edge').filter((d: IEdge<E>) => d.state === 'updated').each(function(d) {
      d3.select(this).selectAll('.edge-path').datum(d);
    });

    chart.selectAll('.edge').filter((d: IEdge<E>) => d.state === 'new').call(this.renderEdgesAdded, this);
    chart.selectAll('.edge').filter((d: IEdge<E>) => d.state === 'updated').call(this.renderEdgesUpdated, this);
    chart.selectAll('.edge').filter((d: IEdge<E>) => d.state === 'removed').call(this.renderEdgesRemoved, this);
  }

  abstract renderNodesAdded(selection: D3SelectionINode<V>): void;
  abstract renderNodesUpdated(selection: D3SelectionINode<V>): void;
  abstract renderNodesRemoved(selection: D3SelectionINode<V>): void;

  abstract renderEdgesAdded(selection: D3SelectionIEdge<E>): void;
  abstract renderEdgesUpdated(selection: D3SelectionIEdge<E>): void;
  abstract renderEdgesRemoved(selection: D3SelectionIEdge<E>): void;
}

