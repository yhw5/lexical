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

import {Chunk, connect, DocumentKey, MutationType, queue} from './comms';
import {DoublyChunk, update} from './update';

// [im] a cat -> [I'm] a cat
// [He] [are] funny -> [He] [is] funny

// server
// function subscriber(mutations: MutationType, document: DocumentType): void {
//   for (const mutation of mutations) {

//   }
// }
// Spellchecker('word');

let initialized = false;
let mounted = false;

// const cache = new WeakMap();

export function lazyInitialize(): void {
  //
  initialized = true;
}

function mount(): void {
  const domMutationObserver = new MutationObserver(observed);
  domMutationObserver.observe(document, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });
  connect();
  mounted = true;
}

export function registerElement(element: HTMLElement): void {
  if (!mounted) {
    mount();
  }
  registerElementForComms();
  registerElementForUpdate();
}

function observed(domMutations: MutationRecord[], observer: MutationObserver) {
  for (const domMutation of domMutations) {
    let target: null | Node = domMutation.target;
    while (target !== null && target instanceof HTMLElement) {
      const mutations = update(target, domMutation);
      if (mutations !== null) {
        queue(target, mutations);
      }
      target = target.parentElement;
    }
  }
}
