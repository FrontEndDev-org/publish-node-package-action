import type { PublishTarget } from './types';

export const registryRecord: Record<PublishTarget, string> = {
    npm: 'https://registry.npmjs.org',
    github: 'https://npm.pkg.github.com',
};
