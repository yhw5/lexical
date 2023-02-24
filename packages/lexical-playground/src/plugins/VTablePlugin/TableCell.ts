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
  NodeKey,
  SerializedElementNode,
  Spread,
} from 'lexical';

import {ElementNode} from 'lexical';

export type SerializedTableCellNode = Spread<
  {
    type: 'vtable-cell';
    version: 1;
  },
  SerializedElementNode
>;

export class TableCellNode extends ElementNode {
  __left: number;
  __top: number;

  static getType(): string {
    return 'vtable-cell';
  }

  static clone(node: TableCellNode): TableCellNode {
    return new TableCellNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('div');
    element.style.position = 'absolute';
    element.style.outline = '1px solid blue';
    element.style.width = '100px';
    element.style.height = '100px';
    element.style.transform = `translate(${this.__left}px, ${this.__top}px)`;
    return element;
  }

  updateDOM(prevNode: TableCellNode, dom: HTMLElement): boolean {
    dom.style.transform = `translate(${this.__left}px, ${this.__top}px`;
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }
  static importJSON(serializedNode: SerializedTableCellNode): TableCellNode {
    const node = $createTableCellNode();
    return node;
  }

  exportJSON(): SerializedTableCellNode {
    return {
      ...super.exportJSON(),
      type: 'vtable-cell',
      version: 1,
    };
  }

  extractWithChild(): boolean {
    return true;
  }
}

export function $createTableCellNode(): TableCellNode {
  return new TableCellNode();
}
