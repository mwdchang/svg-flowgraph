import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
// import { eslint } from 'rollup-plugin-eslint';
import pkg from './package.json';


const input = ['src/main.js'];

const external = ['lodash', 'd3'];
const globals = {
  lodash: '_',
  d3: 'd3'
};


export default [
  // UMD
  {
    external,
    input,
    plugins: [
      // eslint(),
      nodeResolve(),
      babel({
        babelrc: false,
        presets: [['@babel/preset-env', { modules: false }]]
      }),
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
      globals
    }
  },
  // ESM
  {
    external,
    input,
    plugins: [
      // eslint(),
      nodeResolve(),
      babel({
        babelrc: false,
        presets: [['@babel/preset-env', { modules: false }]]
      }),
      commonjs(),
      terser()
    ],
    output: [
      {
        dir: 'dist/esm',
        format: 'esm',
        exports: 'named',
        sourcemap: true,
        globals
      },
      {
        dir: 'dist/cjs',
        format: 'cjs',
        exports: 'named',
        sourcemap: true,
        globals
      }
    ]
  }
];
