import { h } from "./dom-service.js";

// Reordering of list rows: drag and drop, ↑ / ↓, and lists whose rows open
// one at a time (links, wiki topics and entries).

// Moves array[from] to position "to"; false when nothing moved
export function moveItem(array, from, to) {
  if (from === to || to < 0 || to >= array.length) return false;
  array.splice(to, 0, array.splice(from, 1)[0]);
  return true;
}

// Drag and drop between the rows of one list. "handle" is the part that is
// dragged (inputs inside a draggable element cannot be selected with the
// mouse); "state" ({ index: null }) is shared by the rows of one list, so
// rows of a nested list never land in the outer one.
export function sortableRow(row, handle, index, state, move) {
  handle.draggable = true;
  handle.addEventListener("dragstart", (e) => {
    e.stopPropagation();
    state.index = index;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", handle.textContent); // Firefox only drags with data set
  });
  row.addEventListener("dragover", (e) => {
    if (state.index === null) return;
    e.preventDefault();
    e.stopPropagation();
    row.classList.add("drop-target");
  });
  row.addEventListener("dragleave", () => row.classList.remove("drop-target"));
  row.addEventListener("drop", (e) => {
    if (state.index === null) return;
    e.preventDefault();
    e.stopPropagation();
    const from = state.index;
    state.index = null;
    row.classList.remove("drop-target");
    move(from, index);
  });
  handle.addEventListener("dragend", () => {
    state.index = null;
    document.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
  });
}

// Rows that open one at a time. Each row: ⠿, title, ↑ ↓ ✕; the open row
// also shows body(item, index, refreshTitle). Call refreshTitle after the
// item's title was edited.
export function accordionList({ items, openIndex, title, body, toggle, move, remove, removeLabel, state }) {
  const last = items.length - 1;
  return h("ul", { class: "acc-list" }, items.map((item, index) => {
    const open = index === openIndex;
    const label = h("span", { class: "acc-label" });
    const refreshTitle = () => (label.textContent = title(item) || "(untitled)");
    refreshTitle();
    const head = h("div", { class: "acc-head" },
      h("span", { class: "grip", "aria-hidden": "true" }, "⠿"),
      h("button", { class: "acc-title", "aria-expanded": String(open), onclick: () => toggle(index) },
        h("span", { class: "acc-arrow", "aria-hidden": "true" }, open ? "▾" : "▸"),
        label,
      ),
      h("button", { class: "icon", title: "Move up", disabled: index === 0, onclick: () => move(index, index - 1) }, "↑"),
      h("button", { class: "icon", title: "Move down", disabled: index === last, onclick: () => move(index, index + 1) }, "↓"),
      h("button", { class: "icon", title: removeLabel, onclick: () => remove(index) }, "✕"),
    );
    const row = h("li", { class: open ? "acc-row open" : "acc-row" }, head, open && h("div", { class: "acc-body" }, body(item, index, refreshTitle)));
    sortableRow(row, head, index, state, move);
    return row;
  }));
}

// The index "open" has after moving from → to
export function followMove(open, from, to) {
  if (open === null || open === undefined) return open;
  if (open === from) return to;
  if (from < open && open <= to) return open - 1;
  if (to <= open && open < from) return open + 1;
  return open;
}
