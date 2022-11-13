/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// TODO possible conflicts with registerElements under same element
const textCache = new WeakMap<Text, string>();
// TODO filter by element
const count = new Map<string, number>();

export default function strategy(mutation: MutationRecord) {
  const mutationType = mutation.type;
  if (mutationType === 'attributes') {
  } else if (mutationType === 'characterData') {
    for (const removed of [mutation.target]) {
      const textNodes = findTextNodes(removed);
      for (const textNode of textNodes) {
        const textContent = textCache.get(textNode) || '';
        const words = splitWords(textContent);
        for (const word of words) {
          const currentCount = count.get(word) || 1;
          count.set(word, currentCount - 1);
        }
        textCache.set(textNode, textContent);
      }
    }
    for (const added of [mutation.target]) {
      const textNodes = findTextNodes(added);
      for (const textNode of textNodes) {
        const textContent = textNode.textContent || '';
        const words = splitWords(textContent);
        for (const word of words) {
          const currentCount = count.get(word) || 0;
          count.set(word, currentCount + 1);
        }
        textCache.set(textNode, textContent);
      }
    }
    console.info(count);
  } else if (mutationType === 'childList') {
    for (const removed of mutation.removedNodes) {
      const textNodes = findTextNodes(removed);
      for (const textNode of textNodes) {
        const words = splitWords(textCache.get(textNode) || '');
        for (const word of words) {
          const currentCount = count.get(word) || 1;
          count.set(word, currentCount - 1);
        }
      }
    }
    for (const added of mutation.addedNodes) {
      const textNodes = findTextNodes(added);
      for (const textNode of textNodes) {
        const textContent = textNode.textContent || '';
        const words = splitWords(textContent);
        for (const word of words) {
          const currentCount = count.get(word) || 0;
          count.set(word, currentCount + 1);
        }
        textCache.set(textNode, textContent);
      }
    }
    console.info(count);
  }
}

function findTextNodes(parentNode: Node): Text[] {
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

function splitWords(text: string): string[] {
  return text.match(/(\w+)/g) || [];
}
