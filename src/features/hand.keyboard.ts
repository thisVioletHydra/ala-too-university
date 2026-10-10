import type { HandKeyContext } from './hand.types.ts';

import { hasCommandModifier, matchesKey } from '#accessible/keyboard.bindings.ts';
import { navigationPermissions } from '#interaction/input.policy.ts';
import { isTextInputTarget, targetZone } from '#accessible/keyboard.context.ts';
import { handleSidebarNavigation, recoverHandFocus, navigateHand } from './hand.navigation.ts';
import { handleHandCommand } from './hand.commands.ts';
import { placeHand } from './hand.placement.ts';

export function handleHandKey(context: HandKeyContext): void {
  const { event, input, board, hand } = context;
  if (event.defaultPrevented || hasCommandModifier(event)) return;

  const permissions = navigationPermissions({
    composing: event.isComposing,
    shiftPressed: event.shiftKey,
    sidebarHidden: input.listHidden,
    carrying: hand !== null,
    dragging: board.ghost !== null,
    editing: board.editor !== null,
    landing: board.landing !== null,
    repeated: event.repeat,
  });
  if (handleSidebarNavigation(context, permissions)) return;

  if (isTextInputTarget(event.target)) return;

  const place = targetZone(event.target);
  const navigation = matchesKey('navigation', event.key);
  if (navigation && place === null) {
    recoverHandFocus(context, permissions);

    return;
  }

  if (handleHandCommand(context, place)) return;

  if (place === null) return;

  if (navigation) navigateHand(context, place);
  else placeHand(context, place);
}
