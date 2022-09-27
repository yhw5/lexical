/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getSelection,
  COMMAND_PRIORITY_LOW,
  ElementNode,
  KEY_BACKSPACE_COMMAND,
  KEY_SPACE_COMMAND,
  LexicalEditor,
  LexicalNode,
  PASTE_COMMAND,
} from 'lexical';

import {
  $createAutoLinkNode,
  $isAutoLinkNode,
  $isLinkNode,
  AutoLinkNode,
} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {mergeRegister} from '@lexical/utils';
import {
  $createTextNode,
  $isElementNode,
  $isLineBreakNode,
  $isTextNode,
  TextNode,
} from 'lexical';
import {useEffect} from 'react';
import invariant from 'shared/invariant';
import {$isRangeSelection} from 'lexical';
import {$isTextNode} from 'lexical';

type ChangeHandler = (url: string | null, prevUrl: string | null) => void;

export type LinkMatcherResult = {
  index: number;
  length: number;
  text: string;
  url: string;
};

export type LinkMatcher = (text: string) => Array<LinkMatcherResult | null>;

function getAllMatches(
  text: string,
  matchers: Array<LinkMatcher>,
): Array<LinkMatcherResult> {
  const result = [];

  for (const matcher of matchers) {
    const matches = matcher(text);

    for (const match of matches) {
      if (match) {
        result.push(match);
      }
    }
  }

  return result;
}

function handleLinkCreation(
  node: TextNode,
  matchers: Array<LinkMatcher>,
  onChange: ChangeHandler,
): void {
  const nodeText = node.getTextContent();
  const matches = getAllMatches(nodeText, matchers);

  const offsets = [];

  for (const match of matches) {
    offsets.push(match.index, match.index + match.length);
  }

  const textNodes = node.splitText(...offsets);

  let match = matches.shift();

  for (const index in textNodes) {
    const textNode = textNodes[index];

    if (match !== undefined && match.text === textNode.getTextContent()) {
      const nodeFormat = textNode.__format;
      const linkNode = $createAutoLinkNode(match.url);
      linkNode.append($createTextNode(match.text).setFormat(nodeFormat));
      textNode.replace(linkNode);
      onChange(match.url, null);
      match = matches.shift();
    }
  }
}

function handleLinkEdit(
  linkNode: AutoLinkNode,
  matchers: Array<LinkMatcher>,
  onChange: ChangeHandler,
): void {
  console.log(linkNode);
  // // Check text content fully matches
  // const text = linkNode.getTextContent();
  // // const match = findFirstMatch(text, matchers);
  // if (match === null || match.text !== text) {
  //   replaceWithChildren(linkNode);
  //   onChange(null, linkNode.getURL());
  //   return;
  // }
}

function replaceWithChildren(node: ElementNode): Array<LexicalNode> {
  const children = node.getChildren();
  const childrenLength = children.length;

  for (let j = childrenLength - 1; j >= 0; j--) {
    node.insertAfter(children[j]);
  }

  node.remove();
  return children.map((child) => child.getLatest());
}

function useAutoLink(
  editor: LexicalEditor,
  matchers: Array<LinkMatcher>,
  onChange?: ChangeHandler,
): void {
  useEffect(() => {
    if (!editor.hasNodes([AutoLinkNode])) {
      invariant(
        false,
        'LexicalAutoLinkPlugin: AutoLinkNode not registered on editor',
      );
    }

    const onChangeWrapped = (url: string | null, prevUrl: string | null) => {
      if (onChange) {
        onChange(url, prevUrl);
      }
    };

    return mergeRegister(
      editor.registerNodeTransform(TextNode, (textNode: TextNode) => {
        const parent = textNode.getParentOrThrow();

        if (!$isLinkNode(parent)) {
          if (
            textNode.isSimpleText() &&
            textNode.getTextContent().endsWith(' ')
          ) {
            handleLinkCreation(textNode, matchers, onChangeWrapped);
          }
        }
      }),
      editor.registerNodeTransform(AutoLinkNode, (linkNode: AutoLinkNode) => {
        handleLinkEdit(linkNode, matchers, onChangeWrapped);
      }),

      editor.registerCommand(
        PASTE_COMMAND,
        (event: KeyboardEvent) => {
          const selection = $getSelection();

          if (!$isRangeSelection(selection)) {
            return false;
          }

          const removeTransform = editor.registerNodeTransform(
            TextNode,
            (textNode) => {
              const parent = textNode.getParentOrThrow();

              if (!$isLinkNode(parent)) {
                if (textNode.isSimpleText()) {
                  handleLinkCreation(textNode, matchers, onChangeWrapped);
                }
              }
            },
          );

          // selection.getNodes().map((node) => {
          //   console.log(node);
          //   if ($isTextNode(node)) {
          //     console.log(node);
          //     handleLinkCreation(node, matchers, onChangeWrapped);
          //   }
          // });

          removeTransform();

          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, matchers, onChange]);
}

export function AutoLinkPlugin({
  matchers,
  onChange,
}: {
  matchers: Array<LinkMatcher>;
  onChange?: ChangeHandler;
}): JSX.Element | null {
  const [editor] = useLexicalComposerContext();

  useAutoLink(editor, matchers, onChange);

  return null;
}
