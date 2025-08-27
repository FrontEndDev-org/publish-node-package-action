import core from '@actions/core';
import github from '@actions/github';
import glob from 'fast-glob';
import fs from 'fs';
import path from 'path';
import type { InternalPublishOptions, PKG } from './types';
import { publishPackage } from './publish-package';
import { syncPackage } from './sync-package';
import { registryRecord } from './const';

export async function publishPackages(options: InternalPublishOptions) {
    const registry = registryRecord[options.target];

    if (!registry) {
        throw new Error(`Invalid registry target: ${options.target}`);
    }

    // @ref https://github.com/actions/toolkit/blob/457303960f03375db6f033e214b9f90d79c3fe5c/packages/github/src/context.ts
    const repoOwner = github.context.payload.repository?.owner.login;
    const cwd = process.cwd();

    if (!repoOwner) {
        throw new Error('No owner found in context');
    }

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
                name: pkg.name,
                version: pkg.version,
                repoOwner: repoOwner,
            },
            options,
        );
    }
}
