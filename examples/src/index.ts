import _ from 'lodash';
import * as d3 from 'd3';
import { BasicRenderer } from '../../src/core/basic-renderer';
// import { panGraph } from '../../src/actions/pan-graph';
// import { moveTo } from '../../src/fn/move-to';
// import { highlight } from '../../src/fn/highlight';
import { group, ungroup } from '../../src/fn/group';
import { IGraph, INode, IEdge } from '../../src/types';

import { runLayout  } from './dagre';

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
  el: div,
  useAStarRouting: true,
  runLayout: runLayout
});
renderer.on('node-click', () => { console.log('node click'); });
renderer.on('node-dbl-click', () => { console.log('node double click'); });
renderer.on('node-mouse-enter', (_eventName: string, _evt: any, selection: D3SelectionINode<NodeData>) => {
  selection.select('rect').style('fill', '#f80');
});
renderer.on('node-mouse-leave', (_eventName: string, _evt: any, selection: D3SelectionINode<NodeData>) => {
  selection.select('rect').style('fill', '#eee');
});

renderer.on('hello', (evtName: string, t: string) => {
  console.log(evtName, t);
});


// Graph data
let g:IGraph<NodeData, EdgeData> = {
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
    },
    {
      id: '789',
      label: '123',
      x: 250,
      y: 120,
      width: 80,
      height: 80,
      nodes: [
        {
          id: '789-1',
          label: '123',
          x: 0,
          y: 0,
          width: 20,
          height: 20,
          nodes: [],
          data: { id: '789-1' }
        }
      ],
      data: { id: '789' }
    }
  ],
  edges: [
    {
      id: 'e1',
      source: '123',
      target: '456',
      points: [
        { x: 60, y: 40 },
        { x: 240, y: 40 },
        { x: 240, y: 240 },
        { x: 320, y: 240 },
      ],
      data: { id: 'e1' }
    },
    {
      id: 'e1',
      source: '789-1',
      target: '456',
      data: { id: 'e2' }
    }
  ]
};

g = runLayout(_.cloneDeep(g));

const run = async () => {
  await renderer.setData(g);
  await renderer.render();
  // highlight(renderer, ['789'], [], {});
  // moveTo(renderer, '123', 2000);

  group(renderer, 'xyz', ['123', '456']);
  renderer.render();

  // ungroup(renderer, 'xyz');
  // renderer.setData(runLayout(renderer.graph));
  // renderer.render();
};

run();
