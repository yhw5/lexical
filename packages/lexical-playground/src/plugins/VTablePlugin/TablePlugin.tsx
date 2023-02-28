/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$findMatchingParent} from '@lexical/utils';
import {
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $nodesOfType,
  LexicalEditor,
  LexicalNode,
} from 'lexical';
import {useEffect} from 'react';
import * as React from 'react';

import {
  $createTableCellNode,
  $isTableCellNode,
  TableCellNode,
} from './TableCell';
import {
  $createTableCellAutosizeNode,
  $isTableCellAutosizeNode,
  TableCellAutosizeNode,
} from './TableCellAutosize';
import {$createTableNode, $isTableNode, TableNode} from './TableNode';
import getScrollParent from './getScrollParent';
import {NodeKey} from 'lexical';

// INITAL_CONFIG -- Move to props
const ROWS = 1000;
const COLUMNS = 4;
const TABLE_WIDTH = 600;
const CELL_HEIGHT = 100;

let double_invoke = false;
let double_invoke2 = false;

function $initializeCell(node: TableCellNode): void {
  const autosize = $createTableCellAutosizeNode();
  const paragraph = $createParagraphNode();
  autosize.append(paragraph);
  node.append(autosize);
}

function $recomputeCellDimensions(
  editor: LexicalEditor,
  autosize: TableCellAutosizeNode,
): void {
  editor.update(() => {
    const autosizeKey = autosize.getKey();
    const domElement = editor.getElementByKey(autosizeKey);
    if (domElement !== null) {
      const resizeObserver = new ResizeObserver((entries) => {
        editor.update(() => {
          const autosize_ = $getNodeByKey(autosizeKey);
          if (autosize_ !== null && autosize.isAttached()) {
            const cell = autosize_.getParent();
            if ($isTableCellNode(cell)) {
              const newHeight = Math.ceil(
                entries[0].contentBoxSize[0].blockSize,
              );
              if (cell.__height !== newHeight) {
                $setCellHeight(cell, newHeight);
              }
            }
          }
        });
        resizeObserver.disconnect();
      });
      resizeObserver.observe(domElement);
    }
  });
}

function $setCellHeight(cell: TableCellNode, height: number): void {
  const previousHeight = cell.__height;
  const previousDisplayedHeight = cell.__displayedHeight;
  const row = cell.__row;
  const writableCell_ = cell.getWritable();
  writableCell_.__height = height;
  writableCell_.__displayedHeight = height;

  let siblingMaxHeight = 0;
  let siblingMaxDisplayedHeight = 0;
  let siblingMinHeight = 0;
  let siblingMinDisplayedHeight = 0;
  // console.time();
  $siblingsFn(writableCell_, (sibling) => {
    if ($isTableCellNode(sibling) && sibling.__row === row) {
      siblingMaxHeight = Math.max(siblingMaxHeight, sibling.__height);
      siblingMaxDisplayedHeight = Math.max(
        siblingMaxDisplayedHeight,
        sibling.__displayedHeight,
      );
      siblingMinHeight = Math.min(siblingMinHeight, sibling.__height);
      siblingMinDisplayedHeight = Math.min(
        siblingMinDisplayedHeight,
        sibling.__displayedHeight,
      );
      return true;
    } else {
      return false;
    }
  });
  if (
    (height < previousHeight && siblingMinDisplayedHeight < height) ||
    (height > previousHeight && siblingMaxHeight < height)
  ) {
    $siblingsFn(writableCell_, (sibling) => {
      const siblingRow = sibling.__row;
      if ($isTableCellNode(sibling) && siblingRow === row) {
        sibling.getWritable().__displayedHeight = height;
        return true;
      } else if ($isTableCellNode(sibling) && siblingRow > row) {
        sibling.getWritable().__top += height - previousDisplayedHeight;
        return true;
      } else {
        return false;
      }
    });
  }
  const table = cell.getParent();
  if ($isTableNode(table)) {
    const lastCell = table.getLastChild();
    if ($isTableCellNode(lastCell)) {
      table.getWritable().__height = lastCell.__top + lastCell.__height;
    }
  }
  // console.timeEnd();
}

function $siblingsFn(node: LexicalNode, fn: (sibling: LexicalNode) => boolean) {
  for (const sibling of node.getPreviousSiblings()) {
    fn(sibling);
  }
  for (const sibling of node.getNextSiblings()) {
    fn(sibling);
  }
}

function getScrollParent2(
  element: HTMLElement,
): [HTMLElement, Document | HTMLElement] {
  let scrollParent = getScrollParent(element, false);
  if (scrollParent === document.body) {
    // @ts-ignore
    return [document.scrollingElement, document];
  } else {
    return [scrollParent, scrollParent];
  }
}

function getAccumulatedOffsetTop(
  element: HTMLElement,
  toElement: HTMLElement,
): null | number {
  // let sum = 0;
  // let parent: null | Element = element;
  // while (
  //   parent instanceof HTMLElement &&
  //   (parent = parent.offsetParent) &&
  //   parent !== toElement &&
  //   parent instanceof HTMLElement
  // ) {
  //   sum += parent.offsetTop;
  // }
  // return sum;
  // return null;
  return (
    element.getBoundingClientRect().y - toElement.getBoundingClientRect().y
  );
}

export function TablePlugin(): null | JSX.Element {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (double_invoke) {
      return;
    }
    double_invoke = true;

    editor.update(() => {
      const table = $createTableNode();
      table.__width = TABLE_WIDTH;
      table.__height = ROWS * CELL_HEIGHT;
      const cellWidth = TABLE_WIDTH / COLUMNS;
      for (let i = 0; i < ROWS; i++) {
        for (let j = 0; j < COLUMNS; j++) {
          const cell = $createTableCellNode();
          cell.__column = j;
          cell.__row = i;
          cell.__width = cellWidth;
          cell.__displayedHeight = CELL_HEIGHT;
          cell.__left = j * cellWidth;
          cell.__top = i * CELL_HEIGHT;
          cell.__isFirstColumn = j === 0;
          cell.__isFirstRow = i === 0;
          cell.__visible = true;
          $initializeCell(cell);
          table.append(cell);
        }
      }
      $getRoot().append(table);
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(
      ({editorState, dirtyElements, dirtyLeaves}) => {
        editorState.read(() => {
          const autosizes = new Set<TableCellAutosizeNode>();
          for (const [key] of dirtyElements) {
            const node = $getNodeByKey(key);
            if (node !== null) {
              const autosize = $findMatchingParent(
                node,
                $isTableCellAutosizeNode,
              );
              if ($isTableCellAutosizeNode(autosize)) {
                autosizes.add(autosize);
              }
            }
          }
          for (const key of dirtyLeaves) {
            const node = $getNodeByKey(key);
            if (node !== null) {
              const autosize = $findMatchingParent(
                node,
                $isTableCellAutosizeNode,
              );
              if ($isTableCellAutosizeNode(autosize)) {
                autosizes.add(autosize);
              }
            }
          }
          if (autosizes.size < 10) {
            for (const autosize of autosizes) {
              $recomputeCellDimensions(editor, autosize);
            }
          }
        });
      },
    );
  }, [editor]);

  useEffect(() => {
    if (double_invoke2) {
      return;
    }
    double_invoke2 = true;

    let previousScrollParent;
    const tableData = new Map<
      NodeKey,
      {
        firstVisible: NodeKey;
        lastVisible: NodeKey;
      }
    >();
    let firstVisible;
    let lastVisible;
    let scrollParent;

    function computeAll(element: HTMLElement) {
      const [scrollElement] = getScrollParent2(element);
      const {scrollTop, offsetTop, scrollHeight, clientHeight, offsetHeight} =
        scrollElement;
      editor.getEditorState().read(() => {
        const tables = $nodesOfType(TableNode);
        for (const table of tables) {
          const tableDOM = editor.getElementByKey(table.getKey());
          if (tableDOM !== null) {
            const {
              scrollTop: tableScrollTop,
              offsetTop: tableOffsetTop,
              scrollHeight: tableScrollHeight,
              offsetHeight: tableOffsetHeight,
            } = tableDOM;
            const accumulateTableOffsetTop =
              getAccumulatedOffsetTop(tableDOM, scrollElement) || 0;
            // debugger;
            for (const cell of table.getChildren()) {
              // const cellDOM = editor.getElementByKey(cell.getKey());
              if ($isTableCellNode(cell)) {
                // const {
                //   scrollTop: cellScrollTop,
                //   offsetTop: cellOffsetTop,
                //   scrollHeight: cellScrollHeight,
                //   offsetHeight: cellOffsetHeight,
                // } = cellDOM;
                const visibleStart = scrollTop;
                const visibleEnd = visibleStart + clientHeight;
                const cellVisibleStart = accumulateTableOffsetTop + cell.__top;
                const cellVisibleEnd =
                  cellVisibleStart + cell.__displayedHeight;
                // console.info({
                //   visibleStart,
                //   visibleEnd,
                //   cellVisibleEnd,
                //   cellVisibleStart,
                //   accumulateTableOffsetTop,
                // });
                if (
                  cellVisibleEnd < visibleStart ||
                  cellVisibleStart > visibleEnd
                ) {
                  // console.info('hide', cell.__row, cell.__column);
                  editor.update(() => {
                    // console.info('not visible');
                    const writableCell = cell.getWritable();
                    writableCell.__color = 'red';
                    writableCell.__visible = false;
                  });
                } else {
                  // console.info('show', cell.__row, cell.__column);
                  editor.update(() => {
                    const writableCell = cell.getWritable();
                    console.info('yes visible', writableCell);
                    writableCell.__color = 'green';
                    writableCell.__visible = true;
                  });
                }
              }
            }
          }
        }
      });
    }
    setInterval(() => {
      computeAll(editor.getRootElement());
    }, 5e3);

    function onScroll(): void {
      //
    }

    // const removeMutationListener = editor.registerMutationListener

    const removeRootListener = editor.registerRootListener(
      (rootElement, previousRootElement) => {
        if (rootElement !== null) {
          // computeAll(rootElement);
        }
      },
    );

    return () => {
      removeRootListener();
    };
  }, [editor]);

  return null;
}
