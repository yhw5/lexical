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
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';

import {$applyNodeReplacement, DecoratorNode, DOMExportOutput} from 'lexical';
import * as React from 'react';
import {Suspense} from 'react';

export type SerializedFooNode = Spread<
  {
    Foo: string;
    inline: boolean;
  },
  SerializedLexicalNode
>;

export class FooNode extends DecoratorNode<JSX.Element> {
  static getType(): string {
    return 'Foo';
  }

  static clone(node: FooNode): FooNode {
    return new FooNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  static importJSON(serializedNode: SerializedFooNode): FooNode {
    const node = $createFooNode();
    return node;
  }

  exportJSON(): SerializedFooNode {
    return {
      Foo: this.getFoo(),
      inline: this.__inline,
      type: 'Foo',
      version: 1,
    };
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const element = document.createElement(this.__inline ? 'span' : 'div');
    return element;
  }

  exportDOM(): DOMExportOutput {
    return {element: null};
  }

  static importDOM(): DOMConversionMap | null {
    return {};
  }

  updateDOM(prevNode: FooNode): boolean {
    // If the inline property changes, replace the element
    return this.__inline !== prevNode.__inline;
  }

  getTextContent(): string {
    return '';
  }

  decorate(): JSX.Element {
    return (
      <Suspense fallback={null}>
        <span>foo</span>
      </Suspense>
    );
  }
}

export function $createFooNode(): FooNode {
  const node = new FooNode();
  return $applyNodeReplacement(node);
}

export function $isFooNode(
  node: LexicalNode | null | undefined,
): node is FooNode {
  return node instanceof FooNode;
}
