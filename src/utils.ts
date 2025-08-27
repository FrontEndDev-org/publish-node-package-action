import cp, { type ExecSyncOptions } from 'child_process';
import core from '@actions/core';
import { cwd } from 'process';

export function runCommand(command: string, options: ExecSyncOptions) {
    core.info(`> ${command}`);
    cp.execSync(command, {
        stdio: 'inherit',
        env: process.env,
        ...options,
    });
}
