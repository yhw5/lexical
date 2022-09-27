/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LinkMatcherResult} from '@lexical/react/LexicalAutoLinkPlugin';

import {AutoLinkPlugin} from '@lexical/react/LexicalAutoLinkPlugin';
import * as React from 'react';

const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/g;

// const EMAIL_MATCHER =
//   /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const MATCHERS = [
  (text: string) => {
    const matches = text.match(URL_MATCHER);

    const result: Array<LinkMatcherResult | null> = [];

    if (!matches) {
      return result;
    }

    let currentMatch = matches.shift();

    for (let i = 0; i < text.length; i++) {
      if (currentMatch === undefined) {
        break;
      }

      const substring = text.slice(i, i + currentMatch.length);

      if (currentMatch !== undefined && currentMatch === substring) {
        result.push({
          index: i,
          length: substring.length,
          text: substring,
          url: substring.startsWith('http')
            ? substring
            : `https://${substring}`,
        });

        const nextMatch = matches.shift();
        if (nextMatch !== undefined) {
          currentMatch = nextMatch;
        }
      }
    }

    return result;
  },
];

export default function LexicalAutoLinkPlugin(): JSX.Element {
  return <AutoLinkPlugin matchers={MATCHERS} />;
}
