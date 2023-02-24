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

export type SerializedTableNode = Spread<
  {
    type: 'vtable';
    version: 1;
  },
  SerializedElementNode
>;

export class TableNode extends ElementNode {
  __width: number;
  __height: number;

  static getType(): string {
    return 'vtable';
  }

  static clone(node: TableNode): TableNode {
    return new TableNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('div');
    element.style.width = `${this.__width}px`;
    element.style.height = `${this.__height}px`;
    return element;
  }

  updateDOM(prevNode: TableNode, dom: HTMLElement): boolean {
    dom.style.width = `${this.__width}px`;
    dom.style.height = `${this.__height}px`;
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return null;
  }
  static importJSON(serializedNode: SerializedTableNode): TableNode {
    const node = $createTableNode();
    return node;
  }

  exportJSON(): SerializedTableNode {
    return {
      ...super.exportJSON(),
      type: 'vtable',
      version: 1,
    };
  }

  extractWithChild(): boolean {
    return true;
  }
}

export function $createTableNode(): TableNode {
  return new TableNode();
}
