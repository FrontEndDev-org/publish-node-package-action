import core from '@actions/core';
import github from '@actions/github';
import glob from 'fast-glob';
import fs from 'fs';
import path from 'path';
import type { InternalPublishMeta, InternalPublishOptions, PKG } from './types';
import { publishPackage } from './publish-package';

export async function publishPackages(options: InternalPublishOptions) {
  const context = github.context;
  // @ref https://github.com/actions/toolkit/blob/457303960f03375db6f033e214b9f90d79c3fe5c/packages/github/src/context.ts
  const repoOwner = context.repo.owner;

  const octokit = github.getOctokit(options.token);
  const { data: repoInfo } = await octokit.rest.repos.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
  });
  const repoType = repoInfo.owner.type as InternalPublishMeta['repoType'];

  core.info(`repo type: ${repoType}`);
  core.info(`repo owner: ${context.repo.owner}`);
  core.info(`repo name: ${context.repo.repo}`);

  const cwd = process.cwd();
  const rootPkgFile = path.join(cwd, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(rootPkgFile, 'utf-8')) as PKG;
  const childPkgPaths = glob.sync(
    (pkg.workspaces || []).map((ws) => path.join(ws, 'package.json')),
    { cwd, onlyFiles: true },
  );

  const pkgPaths = ['package.json', ...childPkgPaths];
  core.info(`pkgPaths: ${JSON.stringify(pkgPaths)}`);
  const length = pkgPaths.length;

  const pkgsByPath: Record<
    string,
    {
      pkgFile: string;
      pkgRoot: string;
      pkgString: string;
      pkgObject: PKG;
    }
  > = {};
  const pkgsByName: Record<string, PKG> = {};

  let order = 1;
  for (const pkgPath of pkgPaths) {
    core.info(`[${order++}/${length}] read package ${pkgPath}`);

    const pkgFile = path.join(cwd, pkgPath);
    const pkgString = fs.readFileSync(pkgFile, 'utf-8');
    const pkgObject = JSON.parse(pkgString) as PKG;

    pkgsByPath[pkgPath] = {
      pkgRoot: path.dirname(pkgFile),
      pkgFile,
      pkgString,
      pkgObject,
    };
    pkgsByName[pkgObject.name] = pkgObject;
  }

  order = 1;
  for (const pkgPath of pkgPaths) {
    core.info(`[${order++}/${length}] publish package ${pkgPath}`);
    const pkgInfo = pkgsByPath[pkgPath];

    await publishPackage(
      {
        ...pkgInfo,
        pkgsByName,
        repoOwner,
        repoType,
      },
      options,
    );
  }
}
