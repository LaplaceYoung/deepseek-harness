import { clientBundle } from '../tsdown.client.ts'

export default clientBundle(
  '@deepseek-ai/dsh-client-ui-skin-wexin',
  ['lib/types/index.js', 'lib/types/invariant.js'],
  {
    lib: {
      copy: [{ from: 'src/styles/*', to: 'lib/styles' }],
    },
  },
)
