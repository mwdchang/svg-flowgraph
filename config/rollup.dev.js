import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
// import { eslint } from 'rollup-plugin-eslint';
import pkg from '../package.json';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';


const input = ['src/main.js'];

const external = ['lodash', 'd3'];
const globals = {
  lodash: '_',
  d3: 'd3'
};


export default [
  {
    external,
    input,
    plugins: [
      // eslint(),
      nodeResolve(),
      babel({
        babelrc: false,
        presets: [
          [
            '@babel/preset-env',
            {
              targets: { node: 12 },
              modules: false
            }
          ]
        ]
      }),
      commonjs(),
      terser(),
      serve({
        open: true,
        openPage: '/',
        host: 'localhost',
        port: 3003,
        contentBase: ['./example']
      }),
      livereload({
        watch: ['./example'],
        exts: ['html', 'js', 'css']
      })
    ],
    output: [
      // UMD
      {
        file: `example/${pkg.name}.min.js`,
        format: 'umd',
        name: 'myLibrary', // this is the name of the global object
        esModule: false,
        exports: 'named',
        sourcemap: true,
        globals
      },
      // ESM
      {
        dir: 'example/esm',
        format: 'esm',
        exports: 'named',
        sourcemap: true,
        globals
      }
    ]
  }
];
