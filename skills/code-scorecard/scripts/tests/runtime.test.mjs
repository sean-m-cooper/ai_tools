import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { run, withInstallLock } from '../runtime.mjs';
import { execute } from '../run-scorecard.mjs';

test('returns a nonzero child status without turning it into success', async () => {
  assert.equal(await run(process.execPath, ['-e', 'process.exit(7)'], process.cwd()), 7);
});

test('concurrent cache installers serialize and release locks after failures', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scorecard-lock-'));
  const cache = path.join(directory, 'cache');
  const installed = path.join(directory, 'installed');
  let setups = 0;
  const install = () => withInstallLock(cache, async () => {
    if (fs.existsSync(installed)) return;
    setups++;
    await new Promise(resolve => setTimeout(resolve, 150));
    fs.writeFileSync(installed, 'ready');
  });
  try {
    await Promise.all([install(), install()]);
    assert.equal(setups, 1);
    await assert.rejects(withInstallLock(cache, () => { throw new Error('setup failed'); }), /setup failed/);
    await withInstallLock(cache, () => {});
    fs.mkdirSync(cache + '.install-lock');
    await assert.rejects(withInstallLock(cache, () => {}, 1), /abandoned empty lock/);
    fs.rmdirSync(cache + '.install-lock');
  } finally { fs.rmSync(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
});

test('rejects invalid analysis timeouts before starting work', async () => {
  for (const value of ['0', '-1', '1.5', 'Infinity', '86401', 'word'])
    await assert.rejects(execute({ 'timeout-seconds': value }), /timeout-seconds/);
});

test('streams progress before completion and preserves the JSON stdout channel', async () => {
  const runtime = new URL('../runtime.mjs', import.meta.url).href;
  const script = `import {run} from ${JSON.stringify(runtime)}; await run(process.execPath, ['-e', 'console.log("progress"); setTimeout(() => console.log("finished"), 1000)'], process.cwd()); console.log('{"done":true}');`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', script], { windowsHide: true });
  let stdout = '', stderr = '';
  child.stdout.on('data', data => { stdout += data; });
  const progress = new Promise(resolve => child.stderr.on('data', data => { stderr += data; if (stderr.includes('progress')) resolve(); }));
  const closed = new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
  await progress;
  assert.equal(child.exitCode, null);
  assert.equal(stderr.includes('finished'), false);
  assert.equal(await closed, 0);
  assert.deepEqual(JSON.parse(stdout), { done: true });
  assert.match(stderr, /finished/);
});

test('timeout terminates the child process tree', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scorecard-timeout-'));
  const pidFile = path.join(directory, 'grandchild.pid');
  try {
    const script = `const {spawn}=require('node:child_process'); const fs=require('node:fs'); const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{windowsHide:true}); fs.writeFileSync(${JSON.stringify(pidFile)},String(child.pid)); setInterval(()=>{},1000);`;
    await assert.rejects(run(process.execPath, ['-e', script], directory, {}, 1500), /timed out/);
    const pid = Number(fs.readFileSync(pidFile, 'utf8'));
    // Unix may briefly retain a reaped descendant; allow the OS to finish cleanup.
    let alive = true;
    for (let attempt = 0; attempt < 20 && alive; attempt++) {
      try {
        process.kill(pid, 0);
        if (process.platform === 'linux' && /\) Z /.test(fs.readFileSync(`/proc/${pid}/stat`, 'utf8'))) { alive = false; break; }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      catch (error) { if (!['ESRCH', 'ENOENT'].includes(error.code)) throw error; alive = false; }
    }
    assert.equal(alive, false, 'timed-out grandchild must not keep running');
  } finally { fs.rmSync(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
});
