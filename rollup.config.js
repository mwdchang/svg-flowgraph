import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
// import { eslint } from 'rollup-plugin-eslint';
import pkg from './package.json';


const input = ['src/main.js'];


export default [
  // UMD
  {
    external: ['lodash', 'd3'],
    input,
    plugins: [
      // eslint(),
      nodeResolve(),
      commonjs(),
      terser()
    ],
    output: {
      file: `dist/${pkg.name}.min.js`,
      format: 'umd',
      name: 'myLibrary', // this is the name of the global object
      esModule: false,
      exports: 'named',
      sourcemap: true,
      globals: {
        lodash: '_',
        d3: 'd3'
      }
    }
  },
  // ESM
  {
    external: ['lodash', 'd3'],
    input,
    plugins: [
      // eslint(),
      nodeResolve(),
      commonjs(),
      terser()
    ],
    output: [
      {
        dir: 'dist/esm',
        format: 'esm',
        exports: 'named',
        sourcemap: true,
        globals: {
          lodash: '_',
          d3: 'd3'
        }
      },
      {
        dir: 'dist/cjs',
        format: 'cjs',
        exports: 'named',
        sourcemap: true,
        globals: {
          lodash: '_',
          d3: 'd3'
        }
      }
    ]
  }
];
