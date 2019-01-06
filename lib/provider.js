'use babel';

import { EventEmitter } from 'events';
import { platform} from 'os';
import { spawnSync } from 'child_process';

// Package settings
import meta from '../package.json';

export const config = {
  MadPascalPath: {
    title: 'Mad-Pascal Exec Path',
    description: 'Specify your path to Mad-Pascal executables: `mp` and `mads`',
    type: 'string',
    default: '\\Atari\\MAD_PASCAL\\',
    order: 0
  },
  MadsArgs: {
    title: 'Mads Exec Args',
    description: 'Specify your custom args to Mads executable: `mads`',
    type: 'string',
    default: '-x -i:\\Atari\\MAD_PASCAL\\base',
    order: 1
  },
  manageDependencies: {
    title: 'Manage Dependencies',
    description: 'When enabled, third-party dependencies will be installed automatically',
    type: 'boolean',
    default: true,
    order: 2
  },
  alwaysEligible: {
    title: 'Always Eligible',
    description: 'The build provider will be available in your project, even when not eligible',
    type: 'boolean',
    default: false,
    order: 3
  }
};

// This package depends on build, make sure it's installed
export function activate() {
  if (atom.config.get(meta.name + '.manageDependencies') === true) {
    this.satisfyDependencies();
  }
}

export function which() {
  if (platform() === 'win32') {
    return 'where';
  }
  return 'which';
}

export function satisfyDependencies() {
  let k;
  let v;

  require('atom-package-deps').install(meta.name);

  const ref = meta['package-deps'];
  const results = [];

  for (k in ref) {
    if (typeof ref !== 'undefined' && ref !== null) {
      v = ref[k];
      if (atom.packages.isPackageDisabled(v)) {
        if (atom.inDevMode()) {
          console.log('Enabling package \'' + v + '\'');
        }
        results.push(atom.packages.enablePackage(v));
      } else {
        results.push(void 0);
      }
    }
  }
  return results;
}

export function provideBuilder() {
  return class MadPascalProvider extends EventEmitter {
    constructor(cwd) {
      super();
      this.cwd = cwd;
      atom.config.observe('build-mad-pascal.MadPascalPath', () => this.emit('refresh'));
      atom.config.observe('build-mad-pascal.MadsArgs', () => this.emit('refresh'));
    }

    getNiceName() {
      return 'Mad-Pascal';
    }

    isEligible() {
      if (atom.config.get(meta.name + '.alwaysEligible') === true) {
        return true;
      }

      const MadPascalPath = atom.config.get(meta.name + '.MadPascalPath').trim();
      //const cmd = spawnSync(which(), ['mp.exe']);
      const mpcmd = spawnSync(which(), [MadPascalPath + ':mp']);
      const madscmd = spawnSync(which(), [MadPascalPath + ':mads']);
      if (!mpcmd.stdout.toString() || !madscmd.stdout.toString()) {
        return false;
      }

      return true;
    }

    settings() {
      const errorMatch = [
        '(?<file>.+)\\((?<line>\\d+)\\,(?<col>\\d+)\\) (?<message>.+)'
      ];

      // User settings
      if (platform() === 'win32') {
        mpcmd = 'mp.exe';
        madscmd = 'mads.exe';
      } else {
        mpcmd = 'mp';
        madscmd = 'mads';
      }

      const MadPascalPath = atom.config.get(meta.name + '.MadPascalPath').trim();
      const MadsArgs = atom.config.get(meta.name + '.MadsArgs').trim().split(" ");
      const MadPascalExec = MadPascalPath + mpcmd;
      const MadsExec = MadPascalPath + madscmd;
      MadsArgs.unshift('{FILE_ACTIVE} ');

      return [
        {
          name: 'Mad-Pascal a65 Compile',
          exec: MadPascalExec,
          args: [ '{FILE_ACTIVE}' ],
          cwd: '{FILE_ACTIVE_PATH}',
          sh: false,
          atomCommandName: 'mad-pascal:compile',
          errorMatch: errorMatch
        },
         {
           name: 'Mad-Pascal obx Assembly',
           exec: MadsExec,
           args: MadsArgs,
           cwd: '{FILE_ACTIVE_PATH}',
           sh: false,
           atomCommandName: 'mad-pascal:assembly',
           errorMatch: errorMatch
         }
      ];
    }
  };
}
