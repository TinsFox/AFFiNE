import { rootStore } from '@affine/workspace/store';
import { affinePluginsAtom } from '@toeverything/plugin-infra/atom';
import { AsyncCall } from 'async-call-rpc';
import { MessageChannelMain } from 'electron';
import { BrowserWindow, nativeTheme } from 'electron';
import electronWindowState from 'electron-window-state';
import { join } from 'path';

import { MessagePortElectronChannel } from './async-call-rpc/message-port-electron-channel';
import { getExposedMeta } from './exposed';
import { logger } from './logger';
import { isMacOS, isWindows } from './utils';

const IS_DEV: boolean =
  process.env.NODE_ENV === 'development' && !process.env.CI;

const DEV_TOOL = process.env.DEV_TOOL === 'true';

async function createWindow() {
  logger.info('create window');
  const mainWindowState = electronWindowState({
    defaultWidth: 1000,
    defaultHeight: 800,
  });

  const exposedMeta = getExposedMeta();

  const browserWindow = new BrowserWindow({
    titleBarStyle: isMacOS()
      ? 'hiddenInset'
      : isWindows()
      ? 'hidden'
      : 'default',
    trafficLightPosition: { x: 24, y: 18 },
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    minWidth: 640,
    minHeight: 480,
    visualEffectState: 'active',
    vibrancy: 'under-window',
    height: mainWindowState.height,
    show: false, // Use 'ready-to-show' event to show window
    webPreferences: {
      webgl: true,
      contextIsolation: true,
      sandbox: false,
      webviewTag: false, // The webview tag is not recommended. Consider alternatives like iframe or Electron's BrowserView. https://www.electronjs.org/docs/latest/api/webview-tag#warning
      spellcheck: false, // FIXME: enable?
      preload: join(__dirname, '../preload/index.js'),
      // serialize exposed meta that to be used in preload
      additionalArguments: [`--exposed-meta=` + JSON.stringify(exposedMeta)],
    },
  });

  nativeTheme.themeSource = 'light';

  mainWindowState.manage(browserWindow);

  /**
   * If you install `show: true` then it can cause issues when trying to close the window.
   * Use `show: false` and listener events `ready-to-show` to fix these issues.
   *
   * @see https://github.com/electron/electron/issues/25012
   */
  browserWindow.on('ready-to-show', () => {
    if (IS_DEV) {
      // do not gain focus in dev mode
      browserWindow.showInactive();
    } else {
      browserWindow.show();
    }

    logger.info('main window is ready to show');

    if (DEV_TOOL) {
      browserWindow.webContents.openDevTools({
        mode: 'detach',
      });
    }
  });

  browserWindow.on('close', e => {
    e.preventDefault();
    browserWindow.destroy();
    // TODO: gracefully close the app, for example, ask user to save unsaved changes
  });

  /**
   * URL for main window.
   */
  const pageUrl = process.env.DEV_SERVER_URL || 'file://./index.html'; // see protocol.ts

  logger.info('loading page at', pageUrl);

  await browserWindow.loadURL(pageUrl);

  logger.info('main window is loaded at', pageUrl);

  return browserWindow;
}

// singleton
let browserWindow: Electron.BrowserWindow | undefined;
/**
 * Restore existing BrowserWindow or Create new BrowserWindow
 */
export async function restoreOrCreateWindow() {
  browserWindow = BrowserWindow.getAllWindows().find(w => !w.isDestroyed());

  if (browserWindow === undefined) {
    browserWindow = await createWindow();
  }

  if (browserWindow.isMinimized()) {
    browserWindow.restore();
    logger.info('restore main window');
  }

  await import('@affine/bookmark-block/server');

  rootStore.sub(affinePluginsAtom, () => {
    const plugins = rootStore.get(affinePluginsAtom);
    Object.entries(plugins).map(([id, plugin]) => {
      logger.info('init plugin: ', id);
      const { port1, port2 } = new MessageChannelMain();
      AsyncCall(plugin.rpc.serverSide, {
        channel: new MessagePortElectronChannel(port2),
      });
      port2.postMessage(`plugin:${plugin.definition.id}`);
      browserWindow.webContents.postMessage('plugin-port', null, [port1]);
    });
    if (!browserWindow) {
      logger.error('cannot find browser window');
      return;
    }
  });

  return browserWindow;
}
