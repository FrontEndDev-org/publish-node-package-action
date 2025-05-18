import core from '@actions/core';
import type { PublishOptions } from './types';

async function sync(name: string) {
    const syncURL = `https://registry-direct.npmmirror.com/${name}/sync?sync_upstream=true`;

    try {
        core.debug(`PUT ${syncURL}`);
        const resp = await fetch(syncURL, {
            method: 'PUT',
        });
        const json = (await resp.json()) as { ok: boolean; logId: string };
        core.debug(`response status = ${resp.status}`);
        core.debug(`response headers = ${resp.headers}`);
        core.debug(`response json = ${json}`);

        if (json && typeof json === 'object' && json.ok && json.logId && typeof json.logId === 'string') {
            return json.logId;
        }

        core.debug('响应结果不匹配');
        return '';
    } catch (err) {
        core.debug('请求或响应错误');
        core.debug(String(err));
        return '';
    }
}

export async function check(name: string, logId: string) {
    try {
        const checkURL = `https://registry-direct.npmmirror.com/${name}/sync/log/${logId}`;
        core.debug(`GET ${checkURL}`);
        const resp = await fetch(checkURL);
        const json = (await resp.json()) as { syncDone: boolean };
        core.debug(`response status = ${resp.status}`);
        core.debug(`response headers = ${resp.headers}`);
        core.debug(`response json = ${JSON.stringify(json)}`);

        if (json && typeof json === 'object' && json.syncDone) return true;

        core.debug(`响应结果不匹配`);
        return false;
    } catch (err) {
        // 忽略错误
        core.debug(`请求或响应错误`);
        core.debug(String(err));
        return false;
    }
}

export async function syncPackage(name: string, options: PublishOptions) {
    const logId = await sync(name);

    // 忽略错误
    if (!logId) {
        core.error('检查失败：未查询到同步日志 ID');
        return true;
    }

    const startCheckTime = Date.now();
    let checked = false;
    let times = 0;

    while (!checked && Date.now() - startCheckTime < options.syncTimeout) {
        times++;
        core.info(`第 ${times} 次同步结果检查`);
        checked = await check(name, logId);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
}
