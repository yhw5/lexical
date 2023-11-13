/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, LexicalNode} from 'lexical';

import {$isListItemNode, ListItemNode} from '@lexical/list';
import {createDOMRange} from '@lexical/selection';
import {$rootTextContent} from '@lexical/text';
import {mergeRegister, positionNodeOnRange} from '@lexical/utils';
import {
  $getRoot,
  $isElementNode,
  $isParagraphNode,
  $isTextNode,
  ParagraphNode,
} from 'lexical';
import * as React from 'react';
import {useEffect, useState} from 'react';
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
  useOverlay(maxLength, strlen);

  if (children === undefined) {
    return null;
  }
  return (
    <OverflowCount strlen={strlen} maxLength={maxLength}>
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

function useOverlay(maxLength: number, strlen: StrlenFn): void {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    let removePositionNodeOnRange = () => {};
    const removeTextContentListener = editor.registerTextContentListener(() => {
      removePositionNodeOnRange();
      editor.getEditorState().read(() => {
        // Up to O(2n) on a single branch tree
        infiniteLoop = editor.getEditorState()._nodeMap.size * 2;
        let overflowStartNode: null | LexicalNode = $getRoot();
        let overflowStartOffset = 0;
        let characterCount = 0;
        loop: while (overflowStartNode !== null) {
          // Traverse to first descendant
          while (
            $isElementNode(overflowStartNode) &&
            !overflowStartNode.isEmpty()
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
          if (!$isElementNode(overflowStartNode)) {
            characterCount += strlen(overflowStartNode.getTextContent());
            if (characterCount > maxLength) {
              break loop;
            }
          }

          // Traverse to next (& up)
          while (overflowStartNode !== null) {
            throwsOnInfiniteLoop('2');
            // TODO replace with rule
            if ($isParagraphNode(overflowStartNode)) {
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
        invariant(overflowEndNode !== null, 'Unexpected null last editor node');
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
    });
    return mergeRegister(removeTextContentListener, removePositionNodeOnRange);
  }, [editor, maxLength, strlen]);
}

// TODO needs to be rewritten
function OverflowCount({
  strlen,
  children,
  maxLength,
}: {
  maxLength: number;
  strlen: StrlenFn;
  children: (overflowed: number) => JSX.Element;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [overflow, setOverflow] = useState(
    () => -overflowLength(editor, maxLength, strlen),
  );
  useEffect(() => {
    return editor.registerTextContentListener((text) => {
      setOverflow(-overflowLength(editor, maxLength, strlen));
    });
  }, [editor, maxLength, strlen]);
  return children(overflow);
}

function overflowLength(
  editor: LexicalEditor,
  maxLength: number,
  strlen: StrlenFn,
): number {
  return editor.getEditorState().read(() => $overflowLength(maxLength, strlen));
}

function $overflowLength(maxLength: number, strlen: StrlenFn): number {
  return strlen($rootTextContent()) - maxLength;
}
