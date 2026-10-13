import { h, emit, changed } from "./dom-service.js";
import { addNode } from "./novel-model-service.js";

// Node ids never contain "#", so this cannot collide with one
const NEW_NODE = "#new";
const STEP_LABELS = { say: "Message", join: "Character appears", exit: "Characters leave", sound: "Sound", bias: "Bias marker" };
const DEFAULT_CHARACTER = 5;
const NEUTRAL_EXPRESSION = 11;

// Form for the selected node: what happens in it and where it leads
class NodeForm extends HTMLElement {

  novel = null;
  node = null;
  meta = null;

  connectedCallback() {
    this.render();
  }

  // A change that the graph shows (label, first text, connections)
  update() {
    changed(this);
    emit(this, "node-updated");
  }

  render() {
    const node = this.node;
    if (!node) return this.replaceChildren();
    // Wrapped in h(): it flattens the lists and drops the "false" entries
    this.replaceChildren(h("div", null,
      h("label", { class: "field" },
        h("span", null, "Node name (only for you)"),
        h("input", { type: "text", value: node.label ?? "", oninput: (e) => { node.label = e.target.value; this.update(); } }),
      ),
      h("h3", null, "What happens"),
      node.steps.length === 0 && h("p", { class: "muted" }, "Nothing yet. Add a message below."),
      node.steps.map((step, index) => this.renderStep(step, index)),
      h("div", { class: "row wrap" }, Object.keys(STEP_LABELS).map((type) => h("button", { class: "small", onclick: () => this.addStep(type) }, `＋ ${STEP_LABELS[type]}`))),
      h("h3", null, "What comes next"),
      this.renderEnding(),
    ));
  }

  select(options, value, onchange) {
    return h("select", { value: String(value ?? ""), onchange: (e) => onchange(e.target.value) },
      options.map(([optionValue, label]) => h("option", { value: String(optionValue) }, label)),
    );
  }

  characterSelect(step) {
    const options = this.meta.characters.map((c) => [c.id, c.id === 1 ? "You (player)" : c.id === 4 ? "Info text" : c.name]);
    return this.select(options, step.character, (v) => { step.character = Number(v); changed(this); });
  }

  expressionSelect(step) {
    return this.select(this.meta.expressions.map((e) => [e.id, e.name]), step.expression, (v) => { step.expression = Number(v); changed(this); });
  }

  renderStep(step, index) {
    const steps = this.node.steps;
    const move = (delta) => () => {
      steps.splice(index + delta, 0, steps.splice(index, 1)[0]);
      this.update();
      this.render();
    };
    let fields = [];
    if (step.type === "say") {
      fields = [
        h("div", { class: "row" }, this.characterSelect(step), this.expressionSelect(step)),
        h("textarea", { rows: 2, placeholder: "What is said…", value: step.text ?? "", oninput: (e) => { step.text = e.target.value; this.update(); } }),
      ];
    } else if (step.type === "join") {
      fields = [h("div", { class: "row" }, this.characterSelect(step), this.expressionSelect(step))];
    } else if (step.type === "sound") {
      fields = [this.select(this.meta.sounds.map((s) => [s, s]), step.clip, (v) => { step.clip = v; changed(this); })];
    } else if (step.type === "bias") {
      fields = [h("input", { type: "text", list: "bias-list", placeholder: "Bias shown in the feedback", value: step.bias ?? "", oninput: (e) => { step.bias = e.target.value; changed(this); } })];
    }
    return h("div", { class: "step" },
      h("div", { class: "row" },
        h("span", { class: "badge grow" }, STEP_LABELS[step.type] ?? step.type),
        h("button", { class: "icon", title: "Move up", disabled: index === 0, onclick: move(-1) }, "↑"),
        h("button", { class: "icon", title: "Move down", disabled: index === steps.length - 1, onclick: move(1) }, "↓"),
        h("button", { class: "icon", title: "Remove", onclick: () => { steps.splice(index, 1); this.update(); this.render(); } }, "✕"),
      ),
      fields,
    );
  }

  addStep(type) {
    // New messages continue with the character that spoke last
    const lastSpeaker = this.novel.nodes.flatMap((n) => n.steps).findLast((s) => s.type === "join")?.character ?? DEFAULT_CHARACTER;
    const step = { type };
    if (type === "say" || type === "join") Object.assign(step, { character: lastSpeaker, expression: NEUTRAL_EXPRESSION });
    if (type === "say") step.text = "";
    if (type === "sound") step.clip = this.meta.sounds[0];
    if (type === "bias") step.bias = "";
    this.node.steps.push(step);
    this.update();
    this.render();
  }

  // Dropdown with every node plus "new node"; calls set(id) with the choice
  targetSelect(current, set) {
    const options = [["", "— choose —"], ...this.novel.nodes.filter((n) => n !== this.node).map((n) => [n.id, n.label || n.id]), [NEW_NODE, "＋ new node…"]];
    return this.select(options, current ?? "", (value) => {
      if (value !== NEW_NODE) {
        set(value || null);
        return this.update();
      }
      const created = addNode(this.novel, this.node);
      set(created.id);
      this.update();
      emit(this, "node-select", { id: created.id });
    });
  }

  renderEnding() {
    const node = this.node;
    const radio = (value, label) =>
      h("label", { class: "row" },
        h("input", { type: "radio", name: "ending", checked: node.ending === value, onchange: () => { node.ending = value; this.update(); this.render(); } }),
        label,
      );
    let detail = null;
    if (node.ending === "choices") {
      detail = [
        node.choices.map((choice, index) =>
          h("div", { class: "row choice" },
            h("input", { type: "text", class: "grow", placeholder: "Answer the player can pick", value: choice.text ?? "", oninput: (e) => { choice.text = e.target.value; changed(this); } }),
            h("span", null, "→"),
            this.targetSelect(choice.to, (id) => (choice.to = id)),
            h("button", { class: "icon", title: "Remove", onclick: () => { node.choices.splice(index, 1); this.update(); this.render(); } }, "✕"),
          ),
        ),
        h("button", { class: "small", onclick: () => { node.choices.push({ text: "", to: null }); this.update(); this.render(); } }, "＋ Answer"),
      ];
    } else if (node.ending === "next") {
      detail = h("div", { class: "row" }, h("span", null, "Continue with"), this.targetSelect(node.next, (id) => (node.next = id)));
    }
    return h("div", null,
      h("datalist", { id: "bias-list" }, this.meta.biases.map((bias) => h("option", { value: bias }))),
      h("div", { class: "row wrap" }, radio("choices", "The player picks an answer"), radio("next", "Continue in another node"), radio("end", "The novel ends")),
      detail,
    );
  }
}

customElements.define("node-form", NodeForm);
