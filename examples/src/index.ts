import * as d3 from 'd3';
import { BasicRenderer } from '../../src/core/basic-renderer';
// import { panGraph } from '../../src/actions/pan-graph';
// import { moveTo } from '../../src/fn/move-to';
import { IGraph, INode, IEdge } from '../../src/types';

interface NodeData {
  id: string
}

interface EdgeData {
  id: string
}

type D3SelectionINode<T> = d3.Selection<d3.BaseType, INode<T>, null, any>;
type D3SelectionIEdge<T> = d3.Selection<d3.BaseType, IEdge<T>, null, any>;

export const pathFn = d3.line<{ x: number, y: number}>()
  .x(d => d.x)
  .y(d => d.y);

class SampleRenderer extends BasicRenderer<NodeData, EdgeData> {
  constructor(options: any) {
    super(options);
  }

  renderNodes(selection: D3SelectionINode<NodeData>) {
    selection.append('rect')
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .style('fill', '#eee')
      .style('stroke', '#888');
  }

  renderEdges(selection: D3SelectionIEdge<EdgeData>) {
    selection.append('path')
      .attr('d', d => pathFn(d.points))
      .style('fill', 'none')
      .style('stroke', '#000');
  }
}

// Render
const div = document.createElement('div');
div.style.height = '400px';
div.style.width = '400px';
document.body.append(div);

const renderer = new SampleRenderer({
  el: div
});
renderer.setCallback('nodeClick', () => { console.log('node click'); });
renderer.setCallback('nodeDblClick', () => { console.log('node double click'); });
renderer.setCallback('nodeMouseEnter', (_evt: any, selection: D3SelectionINode<NodeData>) => {
  selection.select('rect').style('fill', '#f80');
});
renderer.setCallback('nodeMouseLeave', (_evt: any, selection: D3SelectionINode<NodeData>) => {
  selection.select('rect').style('fill', '#eee');
});


// Graph data
const g:IGraph<NodeData, EdgeData> = {
  width: 400,
  height: 400,
  nodes: [
    {
      id: '123',
      label: '123',
      x: 20,
      y: 20,
      width: 40,
      height: 40,
      nodes: [],
      data: { id: '123' }
    },
    {
      id: '456',
      label: '123',
      x: 320,
      y: 220,
      width: 40,
      height: 40,
      nodes: [],
      data: { id: '123' }
    }
  ],
  edges: [
    {
      id: 'e1',
      source: '123',
      target: '456',
      points: [
        { x: 40, y: 40 },
        { x: 240, y: 40 },
        { x: 240, y: 240 },
        { x: 340, y: 240 },
      ],
      data: { id: 'e1' }
    }
  ]
};

const run = async () => {
  await renderer.setData(g);
  await renderer.render();
  // moveTo(renderer, '123', 2000);
};

run();
