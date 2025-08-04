export default [
  // CommonJS build
  {
    input: 'src/foresta.js',
    output: {
      file: 'dist/foresta.js',
      format: 'cjs'
    },
    external: ['esprima']
  },
  // ES Module build  
  {
    input: 'src/foresta.js',
    output: {
      file: 'dist/foresta.esm.js',
      format: 'es'
    },
    external: ['esprima']
  },
  // UMD build for browsers
  {
    input: 'src/foresta.js',
    output: {
      file: 'dist/foresta.umd.js',
      format: 'umd',
      name: 'foresta',
      globals: {
        esprima: 'esprima'
      }
    },
    external: ['esprima']
  }
];