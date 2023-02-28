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
    type: 'vtable-cell';
    version: 1;
  },
  SerializedElementNode
>;

function emptyNode(): HTMLElement {
  const nullElement = document.createElement('null');
  nullElement.style.position = 'absolute';
  nullElement.style.display = 'none';
  return nullElement;
}

export class TableCellNode extends ElementNode {
  __row = 0;
  __column = 0;
  __left = 0;
  __top = 0;
  __width = 0;
  __height = 0;
  __displayedHeight = 0;
  __isFirstColumn = false;
  __isFirstRow = false;
  __visible = true;
  __color = 'grey';

  static getType(): string {
    return 'vtable-cell';
  }

  static clone(node: TableCellNode): TableCellNode {
    const cell = new TableCellNode(node.__key);
    cell.__row = node.__row;
    cell.__column = node.__column;
    cell.__left = node.__left;
    cell.__top = node.__top;
    cell.__width = node.__width;
    cell.__height = node.__height;
    cell.__displayedHeight = node.__displayedHeight;
    cell.__isFirstColumn = node.__isFirstColumn;
    cell.__isFirstRow = node.__isFirstRow;
    cell.__visible = node.__visible;
    cell.__color = node.__color;
    return cell;
  }

  // View

  createDOM(config: EditorConfig): null | HTMLElement {
    if (!this.__visible) {
      return null;
    }
    const element = document.createElement('div');
    element.style.position = 'absolute';
    this.updateDOMStyle(element);
    return element;
  }

  updateDOM(prevNode: TableCellNode, dom: HTMLElement): boolean {
    const isVisible = this.__visible;
    if (prevNode.__visible === isVisible) {
      if (isVisible) {
        this.updateDOMStyle(dom);
      }
      return false;
    } else {
      return true;
    }
  }

  updateDOMStyle(dom: HTMLElement): void {
    const style = dom.style;
    style.width = `${this.__width}px`;
    style.height = `${this.__displayedHeight}px`;
    style.transform = `translate(${this.__left}px, ${this.__top}px)`;
    if (this.__isFirstColumn) {
      style.borderLeft = `1px solid ${this.__color}`;
    }
    if (this.__isFirstRow) {
      style.borderTop = `1px solid ${this.__color}`;
    }
    style.borderBottom = `1px solid ${this.__color}`;
    style.borderRight = `1px solid ${this.__color}`;
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

export function $isTableCellNode(
  node: void | null | LexicalNode | TableCellNode,
): node is TableCellNode {
  return node instanceof TableCellNode;
}
