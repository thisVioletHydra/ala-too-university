# Schedule interaction rules

This directory contains decisions about user interaction. It does not import React,
Zustand, dnd-kit, or the DOM. An adapter supplies plain data and applies the result.
A Vue implementation can reuse these decisions and the `schedule` domain.

## Where to change a rule

- `keyboard.ts`: key names, platform modifiers, global commands, displayed hints.
  macOS uses Command; Windows uses Control and supports Control+Y for redo.
  Backspace and Delete both remove. KeyboardEvent.key is used rather than keyCode.
- `input-policy.ts`: whether sidebar navigation or focus recovery is permitted;
  when pointer movement takes ownership back from keyboard.
- `sidebar-navigation.ts`: routes between status filters, search, cards and issues.
  DOM lookup and actual focus belong to `accessible/sidebar-navigation.ts`.
- `group-policy.ts`: single/pair/strip layout, opening the picker, pair reordering,
  picker suspension while an editor is open.
- `drop-policy.ts`: cancel at origin, return to tray, move, copy, remove in copy mode.
- `picker-return.ts`: eligibility to return to the picker after accidental selection;
  explicit grab / action / release transitions.
- `cursor-state.ts`: preview phases and ownership of animation callbacks.
- `types.ts`: interaction data shared by adapters, independent of the board context.

## Decision priorities

Cursor: editor > held card > landing animation > idle. An animation callback can
finish only the token it owns; stale callbacks do not clear a new held card.

Drop: return to tray > cancel at original slot > toggle matching lesson in copy
mode > assign template / copy lesson / move lesson. Copying does not replace the
original origin with the last copied lesson.

Group: a single lesson uses regular grid commands. A pair enters card selection;
a held lesson from that pair can change order. Three or more open the picker.
An editor suspends the picker; closing the editor resumes the prior selection.

Keyboard ownership: editing and dragging block sidebar navigation. Focus recovery
also refuses landing animation and repeated key presses. Editable/native controls
are identified at the DOM adapter boundary before invoking grid actions.

## Business conflicts

`schedule/section-assignment.ts` validates a proposed section assignment as a whole:
allowed teacher, one section per teacher per discipline, then every affected lesson.
`schedule/conflicts.ts` checks section collision, teacher availability, capacity and
room collision in explicit order. The first failing rule returns its named reason.
There is no score such as "6 of 7 rules matched". Any hard violation rejects the
transaction; extra lessons remain a soft warning.

Zustand commits only after validation. Rendering does not write assignments or
resolve business conflicts. `features/section-groups.ts` prepares list headings;
`schedule/section-selection.ts` filters and sorts sections without JSX.

## Boundaries still being migrated

`providers.tsx` applies drop decisions, owns transient React state and dnd effects.
`use-hand.ts` applies keyboard routes and manages focus. `SlotLessons` owns native
picker lifecycle and DOM focus. These are adapters, but some event sequencing is
still local: native event ordering and pointer reorder previews. Do not claim
that the whole UI is already a single state machine.

Do not add rules to JSX conditions. Put a named decision in this directory, or a
business validation in `schedule`, and let the adapter apply its result.
