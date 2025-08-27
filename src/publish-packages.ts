import core from '@actions/core';
import glob from 'fast-glob';
import fs from 'fs';
import path from 'path';
import type { InternalPublishMeta, InternalPublishOptions, PKG } from './types';
import { publishPackage } from './publish-package';

export async function publishPackages(options: InternalPublishOptions) {
  const prjRoot = process.cwd();
  const rootPkgFile = path.join(prjRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(rootPkgFile, 'utf-8')) as PKG;
  const childPkgPaths = glob.sync(
    (pkg.workspaces || []).map((ws) => path.join(ws, 'package.json')),
    { cwd: prjRoot, onlyFiles: true },
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

    const pkgFile = path.join(prjRoot, pkgPath);
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
        prjRoot,
        pkgsByName,
      },
      options,
    );
  }
}
