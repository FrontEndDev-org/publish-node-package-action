import cp from 'child_process';
import core from '@actions/core';

export function runCommand(command: string, cwd = process.cwd()) {
    core.info(`> ${command}`);
    cp.execSync(command, {
        cwd,
        stdio: 'inherit',
        env: process.env,
    });
}
