import { Unreachable } from '@affine/env/constant';
import type {
  AppEvents,
  WorkspaceAdapter,
  WorkspaceUISchema,
} from '@affine/env/workspace';
import {
  LoadPriority,
  ReleaseType,
  WorkspaceFlavour,
} from '@affine/env/workspace';

import { CRUD as CloudCRUD } from './cloud/crud';
import { UI as CloudUI } from './cloud/ui';
import { LocalAdapter } from './local';

const unimplemented = () => {
  throw new Error('Not implemented');
};

const bypassList = async () => {
  return [];
};

export const WorkspaceAdapters = {
  [WorkspaceFlavour.LOCAL]: LocalAdapter,
  [WorkspaceFlavour.AFFINE_CLOUD]: {
    releaseType: ReleaseType.UNRELEASED,
    flavour: WorkspaceFlavour.AFFINE_CLOUD,
    loadPriority: LoadPriority.HIGH,
    Events: {} as Partial<AppEvents>,
    CRUD: CloudCRUD,
    UI: CloudUI,
  },
  [WorkspaceFlavour.PUBLIC]: {
    releaseType: ReleaseType.UNRELEASED,
    flavour: WorkspaceFlavour.PUBLIC,
    loadPriority: LoadPriority.LOW,
    Events: {} as Partial<AppEvents>,
    // todo: implement this
    CRUD: {
      get: unimplemented,
      list: bypassList,
      delete: unimplemented,
      create: unimplemented,
    },
    // todo: implement this
    UI: {
      Provider: unimplemented,
      Header: unimplemented,
      PageDetail: unimplemented,
      PageList: unimplemented,
      NewSettingsDetail: unimplemented,
    },
  },
} satisfies {
  [Key in WorkspaceFlavour]: WorkspaceAdapter<Key>;
};

export function getUIAdapter<Flavour extends WorkspaceFlavour>(
  flavour: Flavour
): WorkspaceUISchema<Flavour> {
  const ui = WorkspaceAdapters[flavour].UI as WorkspaceUISchema<Flavour>;
  if (!ui) {
    throw new Unreachable();
  }
  return ui;
}
