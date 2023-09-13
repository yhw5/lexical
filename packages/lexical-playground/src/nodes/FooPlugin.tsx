/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getRoot, COMMAND_PRIORITY_LOW, createCommand} from 'lexical';
import {useEffect} from 'react';

import {$createFooNode} from './FooNode';

export const FOO_COMMAND = createCommand('FOO');

export function FooPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerCommand(
      FOO_COMMAND,
      () => {
        console.info('called');
        editor.update(() => {
          $getRoot().getFirstChild()?.insertBefore($createFooNode());
        });
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);
  return null;
}
