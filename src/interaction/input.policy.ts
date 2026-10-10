type NavigationContext = {
  composing: boolean;
  shiftPressed: boolean;
  sidebarHidden: boolean;
  carrying: boolean;
  dragging: boolean;
  editing: boolean;
  landing: boolean;
  repeated: boolean;
};

export function navigationPermissions(context: NavigationContext): { sidebar: boolean; recoverFocus: boolean } {
  const busy = context.carrying || context.dragging || context.editing;
  const unavailable = context.composing || context.shiftPressed || context.sidebarHidden;
  const sidebar = !busy && !unavailable;
  return { sidebar, recoverFocus: sidebar && !context.landing && !context.repeated };
}
