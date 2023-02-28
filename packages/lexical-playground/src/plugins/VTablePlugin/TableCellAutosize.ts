/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMConversionMap,
  EditorConfig,
  LexicalNode,
  SerializedElementNode,
  Spread,
} from 'lexical';

import {ElementNode} from 'lexical';

export type SerializedTableCellNode = Spread<
  {
    type: 'vtable-cell-autosize';
    version: 1;
  },
  SerializedElementNode
>;

export class TableCellAutosizeNode extends ElementNode {
  static getType(): string {
    return 'vtable-cell-autosize';
  }

  static clone(node: TableCellAutosizeNode): TableCellAutosizeNode {
    return new TableCellAutosizeNode(node.__key);
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    return document.createElement('div');
  }

  updateDOM(prevNode: TableCellAutosizeNode, dom: HTMLElement): boolean {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }

  static importJSON(
    serializedNode: SerializedTableCellNode,
  ): TableCellAutosizeNode {
    return $createTableCellAutosizeNode();
  }

  exportJSON(): SerializedTableCellNode {
    return {
      ...super.exportJSON(),
      type: 'vtable-cell-autosize',
      version: 1,
    };
  }

  extractWithChild(): boolean {
    return true;
  }
}

export function $createTableCellAutosizeNode(): TableCellAutosizeNode {
  return new TableCellAutosizeNode();
}

export function $isTableCellAutosizeNode(
  node: void | null | LexicalNode | TableCellAutosizeNode,
): node is TableCellAutosizeNode {
  return node instanceof TableCellAutosizeNode;
}
