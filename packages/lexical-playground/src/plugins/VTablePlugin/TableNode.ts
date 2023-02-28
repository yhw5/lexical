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

export type SerializedTableNode = Spread<
  {
    type: 'vtable';
    version: 1;
  },
  SerializedElementNode
>;

export class TableNode extends ElementNode {
  __width = 0;
  __height = 0;

  static getType(): string {
    return 'vtable';
  }

  static clone(node: TableNode): TableNode {
    const table = new TableNode(node.__key);
    table.__width = node.__width;
    table.__height = node.__height;
    return table;
  }

  // View

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('div');
    element.style.position = 'relative';
    this.updateDOMDimensions(element);
    return element;
  }

  updateDOM(prevNode: TableNode, dom: HTMLElement): boolean {
    this.updateDOMDimensions(dom);
    return false;
  }

  updateDOMDimensions(dom: HTMLElement): void {
    const style = dom.style;
    style.width = `${this.__width}px`;
    style.height = `${this.__height}px`;
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

export function $isTableNode(
  node: void | null | LexicalNode | TableNode,
): node is TableNode {
  return node instanceof TableNode;
}
