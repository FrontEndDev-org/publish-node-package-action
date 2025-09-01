import type { Config } from 'release-it';

export default {
  git: {
    commit: true,
    tag: true,
    tagMatch: 'v[0-9]*.[0-9]*.[0-9]*',
    push: true,
    requireCleanWorkingDir: false,
    commitMessage: 'chore(release): v5.x',
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
