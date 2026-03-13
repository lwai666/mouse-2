// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    unocss: true,
    formatters: true,
  },
  {
    rules: {
      'style/quotes': 'off',
      'ts/consistent-type-definitions': 'off',
      'ts/method-signature-style': 'off',
      'style/indent': 'off',
      'antfu/if-newline': 'off',
      'style/arrow-parens': 'off',
      'unicorn/number-literal-case': 'off',
      'style/brace-style': 'off',
    },
  },
)
