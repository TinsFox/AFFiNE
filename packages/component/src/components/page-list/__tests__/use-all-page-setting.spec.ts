/**
 * @vitest-environment happy-dom
 */
import 'fake-indexeddb/auto';

import { renderHook } from '@testing-library/react';
import { expect, test } from 'vitest';

import { createDefaultFilter, vars } from '../filter/vars';
import { useAllPageSetting } from '../use-all-page-setting';

test('useAllPageSetting', async () => {
  const settingHook = renderHook(() => useAllPageSetting());
  const prevView = settingHook.result.current.currentView;
  expect(settingHook.result.current.savedViews).toEqual([]);
  await settingHook.result.current.updateView({
    ...settingHook.result.current.currentView,
    filterList: [createDefaultFilter(vars[0])],
  });
  settingHook.rerender();
  const nextView = settingHook.result.current.currentView;
  expect(nextView).not.toBe(prevView);
  expect(nextView.filterList).toEqual([createDefaultFilter(vars[0])]);
  settingHook.result.current.backToAll();
  await settingHook.result.current.saveView({
    ...settingHook.result.current.currentView,
    id: '1',
  });
  settingHook.rerender();
  expect(settingHook.result.current.savedViews.length).toBe(1);
  expect(settingHook.result.current.savedViews[0].id).toBe('1');
});
