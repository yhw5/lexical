/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {DEBUG} from './environment';

export type Key = string;
export type Chunk = {
  key: Key;
  data: string;
  properties: {
    display: 'inline' | 'block';
  };
};
export type DoublyChunk = {
  next: null | DoublyChunk;
  previous: null | DoublyChunk;
  value: Chunk;
};

export type MutationType =
  | {
      type: 'add';
      after: null | Key;
      chunk: Chunk;
    }
  | {
      type: 'remove';
      key: Key;
    }
  | {
      type: 'update';
      chunk: Chunk;
    };

const keyDoublyChunk = new Map<Key, DoublyChunk>();
const domTextNodeDoublyChunk = new Map<Text, DoublyChunk>();
const domRootElementFirstDoublyChunk = new Map<
  HTMLElement,
  null | DoublyChunk
>();

let nextKey = 1;
function generateKey(): Key {
  return String(nextKey++);
}

export function registerElement(rootElement: HTMLElement): void {
  domRootElementFirstDoublyChunk.set(rootElement, null);
}

export function getChunks__EXPENSIVE(rootElement: HTMLElement): Chunk[] {
  const chunks = [];
  let doublyChunk = domRootElementFirstDoublyChunk.get(rootElement) || null;
  while (doublyChunk !== null) {
    chunks.push(doublyChunk.value);
    doublyChunk = doublyChunk.next;
  }
  return chunks;
}

export function update(
  target: HTMLElement,
  domMutation: MutationRecord,
): null | MutationType[] {
  if (!domRootElementFirstDoublyChunk.has(target)) {
    // Element not registered
    return null;
  }
  const domRootElement = target;
  const mutations: MutationType[] = [];
  const domMutationType = domMutation.type;
  if (domMutationType === 'attributes') {
    // TODO attribute changes may have implications on chunk properties
  } else if (domMutationType === 'characterData') {
    const domText = domMutation.target;
    if (domText instanceof Text) {
      const doublyChunk = domTextNodeDoublyChunk.get(domText);
      if (doublyChunk !== undefined) {
        mutations.push(
          replaceDoublyChunk(doublyChunk, {
            data: domText.textContent || '',
            key: doublyChunk.value.key,
            properties: {
              display: 'inline',
            },
          }),
        );
      }
    }
  } else if (domMutationType === 'childList') {
    for (const removed of domMutation.removedNodes) {
      const domTextNodes = findDOMTextNodes(removed);
      for (const domTextNode of domTextNodes) {
        const doublyChunk = domTextNodeDoublyChunk.get(domTextNode);
        if (doublyChunk !== undefined) {
          mutations.push(
            deleteDoublyChunk(domRootElement, domTextNode, doublyChunk),
          );
        }
      }
    }
    for (const added of domMutation.addedNodes) {
      const domTextNodes = findDOMTextNodes(added);
      for (const domTextNode of domTextNodes) {
        const previousTextNode = findPreviousTextNode(
          domRootElement,
          domTextNode,
        );
        let previousDoublyChunk = null;
        if (previousTextNode !== null) {
          previousDoublyChunk =
            domTextNodeDoublyChunk.get(previousTextNode) || null;
        }
        mutations.push(
          insertAfterDoublyChunk(
            domRootElement,
            domTextNode,
            previousDoublyChunk,
            {
              data: domTextNode.textContent || '',
              key: generateKey(),
              properties: {
                display: 'inline',
              },
            },
          ),
        );
      }
    }
  }
  if (DEBUG && mutations.length > 0) {
    // eslint-disable-next-line no-console
    console.info('DOM mutation: ', domMutationType);
    // eslint-disable-next-line no-console
    console.info('Mutations: ', mutations);
    printDoublyChunks(domRootElement);
  }
  return mutations;
}

function replaceDoublyChunk(
  doublyChunk: DoublyChunk,
  replacementChunk: Chunk,
): MutationType {
  doublyChunk.value = replacementChunk;
  return {
    chunk: replacementChunk,
    type: 'update',
  };
}

function insertAfterDoublyChunk(
  domRootElement: HTMLElement,
  domText: Text,
  previousDoublyChunk: null | DoublyChunk,
  chunk: Chunk,
): MutationType {
  const firstDoublyChunk =
    domRootElementFirstDoublyChunk.get(domRootElement) || null;
  const nextDoublyChunk =
    previousDoublyChunk !== null ? previousDoublyChunk.next : firstDoublyChunk;
  const doublyChunk = {
    key: chunk.key,
    next: nextDoublyChunk,
    previous: previousDoublyChunk,
    value: chunk,
  };
  if (previousDoublyChunk !== null) {
    previousDoublyChunk.next = doublyChunk;
  } else {
    domRootElementFirstDoublyChunk.set(domRootElement, doublyChunk);
  }
  if (nextDoublyChunk !== null) {
    nextDoublyChunk.previous = doublyChunk;
  }
  domTextNodeDoublyChunk.set(domText, doublyChunk);
  return {
    after: previousDoublyChunk !== null ? previousDoublyChunk.value.key : null,
    chunk,
    type: 'add',
  };
}

function deleteDoublyChunk(
  domRootElement: HTMLElement,
  domText: Text,
  doublyChunk: DoublyChunk,
): MutationType {
  const previousDoublyChunk = doublyChunk.previous;
  const nextDoublyChunk = doublyChunk.next;
  if (previousDoublyChunk !== null) {
    previousDoublyChunk.next = nextDoublyChunk;
  } else {
    domRootElementFirstDoublyChunk.set(domRootElement, nextDoublyChunk);
  }
  if (nextDoublyChunk !== null) {
    nextDoublyChunk.previous = previousDoublyChunk;
  }
  domTextNodeDoublyChunk.delete(domText);
  return {
    key: doublyChunk.value.key,
    type: 'remove',
  };
}

function findDOMTextNodes(parentNode: Node): Text[] {
  const walker = document.createTreeWalker(
    parentNode,
    NodeFilter.SHOW_TEXT,
    null,
  );
  const nodes: Text[] = [];
  let node = null;
  while ((node = walker.nextNode() as Text)) {
    nodes.push(node);
  }
  return nodes;
}

function findPreviousTextNode(
  domRootElement: HTMLElement,
  text: Text,
): null | Text {
  let node: null | Node = text;
  while (node !== null && node !== domRootElement) {
    const sibling: null | Node = node.previousSibling;
    if (sibling !== null) {
      if (sibling instanceof Text) {
        return sibling;
      }
      const lastDescendant = getLastDescendant(sibling);
      if (lastDescendant instanceof Text) {
        return lastDescendant;
      }
      node = lastDescendant || node;
    } else {
      node = node.parentNode;
    }
  }
  return null;
}

function getLastDescendant(node: Node): null | Node {
  let child = node.lastChild;
  let nextChild;
  while (child !== null && (nextChild = child.lastChild) !== null) {
    child = nextChild;
  }
  return child;
}

function printDoublyChunks(domRootElement: HTMLElement): void {
  // eslint-disable-next-line no-console
  console.info('Chunks:', ...getChunks__EXPENSIVE(domRootElement));
}
