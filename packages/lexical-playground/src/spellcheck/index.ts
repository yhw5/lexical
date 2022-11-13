/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// TODO:
// - cacheBuilder
// - Auto register to input and contenteditable

import strategy from './RepeatedStrategy';

// [im] a cat -> [I'm] a cat
// [He] [are] funny -> [He] [is] funny

// function findTextNodes(node: Node)

// const DATA = [
//   ['im', "I'm"],
//   ['he', null, (node, offset, document) => {
//     if (nextWord === 'are') {
//       return 'error'
//     }
//   }]
// ];

let mounted = false;
const registeredElements = new Set();
const cache = new WeakMap();

function observed(mutations: MutationRecord[], observer: MutationObserver) {
  for (const mutation of mutations) {
    let target: null | Node = mutation.target;
    while (target !== null) {
      if (registeredElements.has(target)) {
        console.info(mutation);
        strategy(mutation);
      }
      target = target.parentElement;
    }
  }
}

function mount() {
  const mutationObserver = new MutationObserver(observed);
  mutationObserver.observe(document, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });
  mounted = true;
}

// class Spellcheck(strategies);

export function registerElement(element: HTMLElement) {
  if (!mounted) {
    mount();
  }
  registeredElements.add(element);
}
