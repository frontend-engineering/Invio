/* @flow */
import { exec, execSync } from 'child_process';
import { createHash } from 'crypto';
import { nanoid } from 'nanoid'
import {  existsSync } from 'fs';

type NodeJSPlatform = 'aix' | 'darwin' | 'freebsd' | 'linux' | 'openbsd' | 'sunos' | 'win32';

function parseOSFromUA(userAgent: string): NodeJSPlatform | undefined {
    const osRegex = /(Windows NT|Mac OS X|Linux|Android|iOS|CrOS)[/ ]([\d._]+)/;
    const match = userAgent.match(osRegex);
  
    if (match && match.length >= 3) {
      const osName = match[1].toLowerCase();
      switch (osName) {
        case 'windows nt':
          return 'win32';
        case 'mac os x':
          return 'darwin';
        case 'linux':
          return 'linux';
        case 'android':
          return 'linux';
        case 'ios':
          return 'darwin';
        case 'cros':
          return 'linux';
        default:
          return undefined;
      }
    }
  
    return undefined;
  }

const platform = process?.platform || parseOSFromUA(navigator.userAgent);
console.log('get platform: ', platform);

const getWin32BinPath = () => {
    let binPath = '%windir%\\System32\\REG.exe';
    if (!existsSync(binPath)) {
        binPath = '%windir%\\sysnative\\cmd.exe /c %windir%\\System32\\REG.exe'
    }
    return binPath;
}

const guid: Record<string, string> = {
    darwin: 'ioreg -rd1 -c IOPlatformExpertDevice',
    win32:  getWin32BinPath() +
        ' QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography ' +
        '/v MachineGuid',
    linux: '( cat /var/lib/dbus/machine-id /etc/machine-id 2> /dev/null || hostname ) | head -n 1 || :',
    freebsd: 'kenv -q smbios.system.uuid || sysctl -n kern.hostuuid'
};


function hash(guid: string): string {
    return createHash('sha256').update(guid).digest('hex');
}

function expose(result: string): string {
    switch (platform) {
        case 'darwin':
            return result
                .split('IOPlatformUUID')[1]
                .split('\n')[0].replace(/\=|\s+|\"/ig, '')
                .toLowerCase();
        case 'win32':
            return result
                .toString()
                .split('REG_SZ')[1]
                .replace(/\r+|\n+|\s+/ig, '')
                .toLowerCase();
        case 'linux':
            return result
                .toString()
                .replace(/\r+|\n+|\s+/ig, '')
                .toLowerCase();
        case 'freebsd':
            return result
                .toString()
                .replace(/\r+|\n+|\s+/ig, '')
                .toLowerCase();
        default:
            throw new Error(`Unsupported platform: ${platform}`);
    }
}

export function machineIdSync(original: boolean): string {
    if (!platform) {
        return 'fakeid' + nanoid();
    }
    let id: string = expose(execSync(guid[platform]).toString());
    return original ? id : hash(id);
}
