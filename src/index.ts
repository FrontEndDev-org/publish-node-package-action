import { publishPackages } from './publish-packages';
import type { InternalPublishOptions, PublishOptions } from './types';
import core from '@actions/core';
import { runCommand } from './utils';

async function main() {
  core.info(`using ${process.env.PKG_NAME}@${process.env.PKG_VERSION}`);
  runCommand('node --version');
  runCommand('npm --version');

  // 1. 读取配置
  const token = core.getInput('token');

  if (token) core.setSecret(token);

  const defaultRegistry = 'https://registry.npmjs.org';
  const inputs: PublishOptions = {
    token,
    tag: core.getInput('tag'),
    dryRun: core.getInput('dryRun') === 'true',
    includePrivate: core.getInput('includePrivate') === 'true',
    disableProvenance: core.getInput('disableProvenance') === 'true',
    disableSync: core.getInput('disableSync') === 'true',
    disableStrip: core.getInput('disableStrip') === 'true',
    disableCopyLicense: core.getInput('disableCopyLicense') === 'true',
    disableCopyReadme: core.getInput('disableCopyReadme') === 'true',
    syncTimeout: Number(core.getInput('syncTimeout') || '30'),
    registry: core.getInput('repository') || defaultRegistry,
  };
  const defaults: InternalPublishOptions = {
    dryRun: false,
    includePrivate: false,
    tag: 'latest',
    token: '',
    disableProvenance: false,
    disableSync: false,
    disableStrip: false,
    disableCopyLicense: false,
    disableCopyReadme: false,
    syncTimeout: 30,
    registry: defaultRegistry,
  };
  const options = {} as InternalPublishOptions;

  for (const [key, defaultVal] of Object.entries(defaults)) {
    const input = inputs[key as keyof PublishOptions];

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    options[key as keyof PublishOptions] = input === undefined ? defaultVal : input;
  }

  if (core.isDebug()) {
    core.debug(`options: ${JSON.stringify(options, null, 2)}`);
  }

  // 2. 重写 package.json + 发布
  await publishPackages(options);
}

main()
  .then(() => {
    core.info('Publish packages successfully');
  })
  .catch((err) => {
    core.setFailed(err.message);
  });
