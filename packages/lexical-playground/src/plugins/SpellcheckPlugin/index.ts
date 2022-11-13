/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useEffect} from 'react';

import {registerElement} from '../../spellcheck';

export default function SpellcheckPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    const element = editor.getRootElement();
    // TODO unregister
    if (element !== null) {
      registerElement(element);
    }
    editor.registerRootListener((newRootElement) => {
      if (newRootElement !== null) {
        registerElement(newRootElement);
      }
    });
  }, [editor]);
  return null;
}
