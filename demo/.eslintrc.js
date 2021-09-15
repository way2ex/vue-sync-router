module.exports = {
  parser: 'vue-eslint-parser',

  parserOptions: {
    parser: '@typescript-eslint/parser',
    tsconfigRootDir: '.',
    // project: ['./tsconfig.json', './tsconfig.eslint.json'], 不删除这个，会导致 jsx 报错
    ecmaFeatures: {
      jsx: true
    }
  },

  env: {
    node: true,
    browser: true
  },

  plugins: ['vue'],

  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    '@vue/typescript',
    '@vue/typescript/recommended',
    'plugin:prettier/recommended',
    'prettier/@typescript-eslint',
    'prettier/vue'
  ],

  rules: {
    // "@vue/prettier/quotes": ["error", "single"],
    '@typescript-eslint/no-explicit-any': 0,
    '@typescript-eslint/no-non-null-assertion': 'off',
    'no-console': ['error', { allow: ['warn', 'error'] }]
  }
}
