// Small DOM helpers. User text always goes through properties
// (textContent / value), never through HTML strings.

// Creates an element: h("button", { class: "x", onclick: fn }, "Label")
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  el.append(...children.flat(Infinity).filter((child) => child != null && child !== false));
  // Props after children, so a <select> value finds its <option>
  for (const [key, value] of Object.entries(props ?? {})) {
    if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else if (key === "class") el.className = value;
    // "list" is a read-only property on inputs; objects can only be properties
    else if (key !== "list" && (key in el || typeof value === "object")) el[key] = value;
    else el.setAttribute(key, value);
  }
  return el;
}

// Dispatches a bubbling custom event
export function emit(el, name, detail = {}) {
  el.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
}

// Tells the editor that the project object was changed. preview: true
// reloads the preview after the save (novels), "live" shows the change in the
// running preview right away (General items), false only saves.
export function changed(el, preview = false) {
  emit(el, "project-change", { preview });
}

// A button for destructive actions: the first click arms it and counts down
// ("Really reset? 5…"); only a second click within that time runs the action,
// otherwise it falls back to its label.
export function confirmButton(label, question, action, seconds = 5, props = {}) {
  let timer = null;
  let left = 0;
  const disarm = () => {
    clearInterval(timer);
    timer = null;
    button.classList.remove("armed");
    button.textContent = label;
  };
  const tick = () => {
    if (left === 0) return disarm();
    button.textContent = `${question} ${left}…`;
    left--;
  };
  const button = h("button", {
    ...props,
    onclick: () => {
      if (!timer) {
        left = seconds;
        button.classList.add("armed");
        tick();
        timer = setInterval(tick, 1000);
        return;
      }
      disarm();
      action();
    },
  }, label);
  return button;
}
