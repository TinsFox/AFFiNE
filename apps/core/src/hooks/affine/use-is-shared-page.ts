import {
  getWorkspaceSharedPagesQuery,
  revokePageMutation,
  sharePageMutation,
} from '@affine/graphql';
import { useMutation, useQuery } from '@affine/workspace/affine/gql';
import { useCallback, useMemo } from 'react';

function prefixPageId(pageId: string) {
  if (/^space:(.+)$/.test(pageId)) {
    return pageId;
  }

  return `space:${pageId}`;
}

export function useIsSharedPage(
  workspaceId: string,
  pageId: string
): [isSharedPage: boolean, setSharedPage: (enable: boolean) => void] {
  // NOTE:
  // old page id was pure random nanoid
  // in the new version of blocksuite, the page id is prefixed with `space:` and `prefixedId` property was removed
  // see https://github.com/toeverything/blocksuite/pull/4747
  pageId = prefixPageId(pageId);
  const { data, mutate } = useQuery({
    query: getWorkspaceSharedPagesQuery,
    variables: {
      workspaceId,
    },
  });
  const { trigger: enableSharePage } = useMutation({
    mutation: sharePageMutation,
  });
  const { trigger: disableSharePage } = useMutation({
    mutation: revokePageMutation,
  });
  return [
    useMemo(
      () => data.workspace.sharedPages.some(id => id === pageId),
      [data.workspace.sharedPages, pageId]
    ),
    useCallback(
      (enable: boolean) => {
        // todo: push notification
        if (enable) {
          enableSharePage({ docId: `${workspaceId}:${pageId}` })
            .then(() => {
              return mutate();
            })
            .catch(console.error);
        } else {
          disableSharePage({
            docId: `${workspaceId}:${pageId}`,
          })
            .then(() => {
              return mutate();
            })
            .catch(console.error);
        }
        mutate().catch(console.error);
      },
      [disableSharePage, enableSharePage, mutate, pageId, workspaceId]
    ),
  ];
}
