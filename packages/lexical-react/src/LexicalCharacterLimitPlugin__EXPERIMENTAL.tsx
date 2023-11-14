/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, LexicalNode, NodeKey} from 'lexical';

import {$isListItemNode, ListItemNode} from '@lexical/list';
import {createDOMRange} from '@lexical/selection';
import {mergeRegister, positionNodeOnRange} from '@lexical/utils';
import {
  $getNodeByKey,
  $getRoot,
  $isElementNode,
  $isParagraphNode,
  $isTextNode,
  ParagraphNode,
} from 'lexical';
import * as React from 'react';
import {useEffect, useMemo, useState} from 'react';
import invariant from 'shared/invariant';

import {useLexicalComposerContext} from './LexicalComposerContext';

type StrlenFn = (text: string) => number;

let textEncoderInstance: null | TextEncoder = null;

function textEncoder(): null | TextEncoder {
  if (window.TextEncoder === undefined) {
    return null;
  }

  if (textEncoderInstance === null) {
    textEncoderInstance = new window.TextEncoder();
  }

  return textEncoderInstance;
}

export function utf8Length(text: string): number {
  const currentTextEncoder = textEncoder();

  if (currentTextEncoder === null) {
    // http://stackoverflow.com/a/5515960/210370
    const m = encodeURIComponent(text).match(/%[89ABab]/g);
    return text.length + (m ? m.length : 0);
  }

  return currentTextEncoder.encode(text).length;
}

export function utf16Length(text: string): number {
  return text.length;
}

export function CharacterLimitPlugin({
  strlen = utf16Length,
  children,
  maxLength,
}: {
  maxLength: number;
  strlen?: StrlenFn;
  children?: (overflowed: number) => JSX.Element;
}): null | JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [cache, rootSize] = useTextContentSizeCache(editor, strlen);
  useOverlay(cache, maxLength, strlen);

  if (children === undefined) {
    return null;
  }
  return (
    <OverflowCount rootSize={rootSize} maxLength={maxLength}>
      {children}
    </OverflowCount>
  );
}

let infiniteLoop = 0;
function throwsOnInfiniteLoop(ref: string) {
  invariant(
    --infiniteLoop >= 0,
    'CharacterLimit aborted, potential infinite loop. %s',
    String(ref),
  );
}

// // rules.textBefore(paragraph: )
// const BLOCK_RULES = {
//   'paragraph': () => {
//     return {
//       textAfter: paragraph.getNextSibling() !==null ? '\n\n' : ''
//     }
//   }
// }

function listItemTextBeforeRule(listItem: ListItemNode): string {
  return listItem.getParentOrThrow().getType() === 'bullet'
    ? `${listItem.getValue()}.`
    : '';
}

function paragraphTextAfterRule(paragraph: ParagraphNode): string {
  return paragraph.getNextSibling() !== null ? '\n\n' : '';
}

function useOverlay(
  cache: TextContentSizeCache,
  maxLength: number,
  strlen: StrlenFn,
): void {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    let removePositionNodeOnRange = () => {};
    const removeTextContentListener = editor.registerUpdateListener(
      ({editorState, dirtyElements, dirtyLeaves}) => {
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
          return;
        }
        removePositionNodeOnRange();
        editorState.read(() => {
          // Up to O(2n) on a single branch tree with empty cache
          infiniteLoop = editor.getEditorState()._nodeMap.size * 2;
          let overflowStartNode: null | LexicalNode = $getRoot();
          let overflowStartOffset = 0;
          let characterCount = 0;
          function cacheOverflows(): null | boolean {
            let cached: undefined | number;
            if (
              overflowStartNode === null ||
              (cached = cache.get(overflowStartNode.getKey())) === undefined
            ) {
              return null;
            }
            return characterCount + cached > maxLength;
          }
          loop: while (overflowStartNode !== null) {
            // Traverse to first descendant
            while (
              $isElementNode(overflowStartNode) &&
              !overflowStartNode.isEmpty() &&
              cacheOverflows() !== false
            ) {
              throwsOnInfiniteLoop('1');
              // TODO replace with rule
              if ($isListItemNode(overflowStartNode)) {
                characterCount += strlen(
                  listItemTextBeforeRule(overflowStartNode),
                );
                if (characterCount > maxLength) {
                  break loop;
                }
              }
              overflowStartNode = overflowStartNode.getFirstChildOrThrow();
            }

            // Process Node
            let cacheCounted = null;
            if (cacheOverflows() === false) {
              const cached = cache.get(overflowStartNode.getKey());
              invariant(
                cached !== undefined,
                'Expected to find cache after cacheOverflows() call',
              );
              characterCount += cached;
              cacheCounted = overflowStartNode;
            } else if (!$isElementNode(overflowStartNode)) {
              characterCount += strlen(overflowStartNode.getTextContent());
              if (characterCount > maxLength) {
                break loop;
              }
            }

            // Traverse to next (& up)
            while (overflowStartNode !== null) {
              throwsOnInfiniteLoop('2');
              // TODO replace with rule
              if (
                cacheCounted !== overflowStartNode &&
                $isParagraphNode(overflowStartNode)
              ) {
                characterCount += strlen(
                  paragraphTextAfterRule(overflowStartNode),
                );
                if (characterCount > maxLength) {
                  overflowStartOffset = overflowStartNode.getTextContentSize();
                  break loop;
                }
              }
              const sibling: null | LexicalNode =
                overflowStartNode.getNextSibling();
              if (sibling !== null) {
                overflowStartNode = sibling;
                break;
              }
              overflowStartNode = overflowStartNode.getParent();
            }
          }

          if (overflowStartNode === null) {
            removePositionNodeOnRange = () => {};
            return;
          }

          // Find offset in TextNode
          if ($isTextNode(overflowStartNode)) {
            const nodeCapacity =
              strlen(overflowStartNode.getTextContent()) -
              (characterCount - maxLength);
            let left = 0;
            let right = overflowStartNode.getTextContentSize() - 1;
            while (left <= right) {
              const mid = Math.floor((right - left) / 2) + left;
              const overflows =
                strlen(overflowStartNode.getTextContent().slice(0, mid + 1)) >
                nodeCapacity;
              if (overflows) {
                right = mid - 1;
              } else {
                left = mid + 1;
              }
            }
            overflowStartOffset = left;
          }

          const overflowEndNode = $getRoot().getLastDescendant();
          invariant(
            overflowEndNode !== null,
            'Unexpected null last editor node',
          );
          // revise offset for strlen
          const range = createDOMRange(
            editor,
            overflowStartNode,
            overflowStartOffset,
            overflowEndNode,
            overflowEndNode.getTextContentSize(),
          );
          if (range !== null) {
            removePositionNodeOnRange = positionNodeOnRange(
              editor,
              range,
              (domNodes) => {
                for (const domNode of domNodes) {
                  domNode.style.backgroundColor = 'red';
                }
              },
            );
          }
        });
      },
    );
    return mergeRegister(removeTextContentListener, removePositionNodeOnRange);
  }, [cache, editor, maxLength, strlen]);
}

type TextContentSizeCache = Map<NodeKey, number>;

function useTextContentSizeCache(
  editor: LexicalEditor,
  strlen: StrlenFn,
): [TextContentSizeCache, number] {
  const cache = useMemo(() => new Map<NodeKey, number>(), []);
  const [rootSize, setRootSize] = useState(0);
  useEffect(() => {
    function $removeKey(nodeKey: NodeKey) {
      cache.delete(nodeKey);
      let node = $getNodeByKey(nodeKey);
      while (node !== null) {
        cache.delete(node.getKey());
        node = node.getParent();
      }
    }
    const removeUpdateListener = editor.registerUpdateListener(
      ({editorState, dirtyElements, dirtyLeaves}) => {
        const newRootSize = editorState.read(() => {
          if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
            return cache.get('root') || 0;
          }
          // Invalidate parent cache (mimic markNodeAsDirty)
          for (const [nodeKey] of dirtyElements) {
            $removeKey(nodeKey);
          }
          for (const nodeKey of dirtyLeaves) {
            $removeKey(nodeKey);
          }

          // Traverse the tree to refill missing cache (mimic reconciler)
          function makeCache(node: LexicalNode): number {
            const key = node.getKey();
            let size = cache.get(key);
            if (size === undefined) {
              size = 0;
              // TODO replace with rule before
              if ($isListItemNode(node)) {
                size += strlen(listItemTextBeforeRule(node));
              }
              if ($isElementNode(node)) {
                const children = node.getChildren();
                for (const child of children) {
                  size += makeCache(child);
                }
              } else {
                size += strlen(node.getTextContent());
              }
              // TODO replace with rule after
              if ($isParagraphNode(node)) {
                size += strlen(paragraphTextAfterRule(node));
              }
              cache.set(key, size);
            }
            return size;
          }
          return makeCache($getRoot());
        });
        setRootSize(newRootSize);
      },
    );
    return mergeRegister(removeUpdateListener, () => cache.clear());
  }, [cache, editor, strlen]);
  return [cache, rootSize];
}

function OverflowCount({
  rootSize,
  maxLength,
  children,
}: {
  rootSize: number;
  maxLength: number;
  children: (overflow: number) => JSX.Element;
}) {
  const overflow = maxLength - rootSize;
  return children(overflow);
}
