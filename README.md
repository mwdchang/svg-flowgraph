## svg-flowgraph
svg-flowgraph provides the basic blueprints for doing customizable renderings for small-to-medium graphs (up to ~500 nodes). It provides the scaffolding, data management, and utilities to abstract out the common chores for building interactive graphs so you can focus on the rendering aspect.

Note svg-flowgraph is _NOT_ a layout engine, you need to write your own layout heuristics, or use an off-the-shelf algorithm. We have used svg-flowgraph with ELK-JS (https://github.com/kieler/elkjs).

![example1](example1.png)

The example provided here uses Dagre (https://github.com/dagrejs/dagre).

![example2](example2.png)


### Usage

### Data format

### Events
These event hooks are emitted for customizing logic, emitters send back these parameters: eventName, event object, selection, renderer object.
- node-click
- node-dbl-click
- node-mouse-enter
- node-mouse-leave
- node-drag-start
- node-drag-move
- node-drag-end
- edge-click
- edge-mouse-enter
- edge-mouse-leave
- background-click, also sends clicked coordinates
- background-dbl-click, also send clicked coordinates

Example:

```
renderer.on('node-dbl-click', (name, evt, selection, renderer) => {
  selection.selectAll('text').style('font-size', 15);
});
```
