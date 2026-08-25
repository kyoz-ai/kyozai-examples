import { PageConfig } from '@jupyterlab/coreutils';
import type { Contents, ServiceManagerPlugin } from '@jupyterlab/services';
import { IDefaultDrive } from '@jupyterlab/services';
import { membershipTable, personalObjects } from './platform.js';

import { KyozaiDrive } from './drive.js';

const defaultDrive: ServiceManagerPlugin<Contents.IDrive> = {
  id: '@kyozai/jupyterlite-drive:default-drive',
  autoStart: true,
  provides: IDefaultDrive,
  activate: () =>
    new KyozaiDrive(personalObjects, membershipTable('notebook_progress'), {
      baseUrl: PageConfig.getBaseUrl(),
      contentsIndex: PageConfig.getOption('contentsAllJsonFile'),
    }),
};

export default [defaultDrive];
