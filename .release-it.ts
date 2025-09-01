import type { Config } from 'release-it';

export default {
  git: {
    commit: true,
    tag: true,
    push: true,
    requireCleanWorkingDir: false,
    commitMessage: 'chore(release): ${git branch --show-current}',
  },
  github: {
    release: true,
    comments: {
      submit: true,
    },
  },
  npm: {
    publish: false,
  },
  hooks: {
    'after:bump': ['npm run build'],
  },
  plugins: {
    '@release-it/conventional-changelog': {
      preset: 'angular',
    },
  },
} satisfies Config;
