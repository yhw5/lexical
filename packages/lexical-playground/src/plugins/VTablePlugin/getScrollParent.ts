/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

function nullthrows(x: any) {
  if (x == null) {
    throw new Error('Unexpected null ', x);
  }
  return x;
}

export default function getScrollParent(
  element: HTMLElement,
  includeHidden: boolean,
): HTMLElement {
  let style = getComputedStyle(element);
  const excludeStaticParent = style.position === 'absolute';
  const overflowRegex = includeHidden
    ? /(auto|scroll|hidden)/
    : /(auto|scroll)/;

  if (style.position === 'fixed') {
    return nullthrows(document.body);
  }
  // @ts-ignore
  for (let parent = element; (parent = parent.parentElement); ) {
    style = getComputedStyle(parent);
    if (excludeStaticParent && style.position === 'static') {
      continue;
    }
    if (
      overflowRegex.test(style.overflow + style.overflowY + style.overflowX) &&
      parent instanceof HTMLElement
    ) {
      return parent;
    }
  }

  return nullthrows(document.body);
}
