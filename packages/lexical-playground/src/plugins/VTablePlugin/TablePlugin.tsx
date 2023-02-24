/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
} from 'lexical';
import {useEffect} from 'react';
import * as React from 'react';

import {$createTableCellNode, TableCellNode} from './TableCell';
import {$createTableNode} from './TableNode';

const ROWS = 4000;
const COLUMNS = 4;
const CELL_SIZE = 100;

const populated = new Set();

function $populate(node: TableCellNode): void {
  const paragraph = $createParagraphNode();
  const text = $createTextNode();
  text.setTextContent('hello world');
  paragraph.append(text);
  node.append(paragraph);

  populated.add(node.__key);
}

function $unpopulate(node: TableCellNode): void {
  if (!populated.has(node.__key)) {
    return;
  }
  node.clear();

  populated.delete(node.__key);
}

export function TablePlugin(): null | JSX.Element {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      if (root.getLastChildOrThrow().__type !== 'vtable') {
        const table = $createTableNode();
        let y = 0;
        let x = 0;
        for (let i = 0; i < COLUMNS * ROWS; i++) {
          if (i !== 0 && i % COLUMNS === 0) {
            y += CELL_SIZE;
            x = 0;
          }
          const y_ = y;
          const x_ = x;
          // createCell(rootElement, x_, y_, () => {});
          const cell = $createTableCellNode();
          cell.__left = x;
          cell.__top = y;
          // $populate(cell);
          if (i >= COLUMNS * ROWS - 32) {
            table.append(cell);
          }
          x += CELL_SIZE;
        }
        table.__width = CELL_SIZE * COLUMNS;
        table.__height = y + CELL_SIZE;

        root.append(table);
      }
    });

    return editor.registerMutationListener(TableCellNode, (mutations) => {
      for (const [key, mutation] of mutations) {
        const element = editor.getElementByKey(key);
        if (element !== null && mutation === 'created') {
          console.info('a');
          const observer = new IntersectionObserver((entries) => {
            const entry = entries[0];
            editor.update(() => {
              const node = $getNodeByKey(key);
              console.info('is intersecting', String(entry.isIntersecting));
              if (entry.isIntersecting) {
                $populate(node);
              } else {
                // console.info('destroy', left, top);
                // cell.textContent = '';
                $unpopulate(node);
              }
            });
          });
          observer.observe(element);
        }
      }
    });
  }, [editor]);

  return null;
}
