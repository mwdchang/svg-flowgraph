## svg-flowgraph
svg-flowgraph provides the basic scaffolding, data management, and utilities for small/medium graphs that need to be highly customizable and interactive.

svg-flowgraph is _NOT_ a layout engine, rather it expects users to provide layout-adapter implementations to transform the output into a compatible format.  We have used it for scaffolding ELK-based layouts (https://github.com/kieler/elkjs) and the example provided here uses dagre (https://github.com/dagrejs/dagre).

### Initialization
TODO
- el
- adapter
- useEdgeControl
- useMinimap
- addons

### Build
Build into dist
```
npm run build
```

### Test/Demo
```
npm run dev
```
