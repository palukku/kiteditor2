import { h, emit, changed } from "./dom-service.js";
import { addNode, deleteNode, edgesOf } from "./novel-model-service.js";

const SVG_NS = "http://www.w3.org/2000/svg";
// Must match .graph-node in editor.css
const NODE_WIDTH = 200;
const NODE_HEIGHT = 64;
const DRAG_THRESHOLD_PX = 4;

// Node graph of one novel: boxes that can be dragged, curves for connections
class NovelGraph extends HTMLElement {

  novel = null;
  selectedId = null;

  connectedCallback() {
    this.svg = document.createElementNS(SVG_NS, "svg");
    this.canvas = h("div", { class: "graph-canvas" });
    this.scroller = h("div", { class: "graph-scroller" }, this.canvas);
    this.append(
      h("div", { class: "row graph-tools" },
        h("button", { class: "small", onclick: () => this.addNode() }, "＋ Node"),
        h("button", { class: "small", onclick: () => this.setStart() }, "Set as start"),
        h("button", { class: "small", onclick: () => this.deleteSelected() }, "Delete node"),
        h("span", { class: "muted" }, "Drag nodes to arrange them. Connections are set in the node below."),
      ),
      this.scroller,
    );
    this.render();
  }

  get selected() {
    return this.novel.nodes.find((n) => n.id === this.selectedId) ?? null;
  }

  // Rebuilds boxes and curves; the scroller stays, so the scroll position is kept
  render() {
    if (!this.novel || !this.canvas) return;
    this.boxes = new Map();
    this.canvas.replaceChildren(this.svg, ...this.novel.nodes.map((node) => this.renderNode(node)));
    this.drawEdges();
  }

  renderNode(node) {
    const firstLine = node.steps.find((s) => s.type === "say")?.text ?? "";
    const classes = ["graph-node", node.id === this.selectedId && "selected", node.id === this.novel.start && "start", node.ending === "end" && "end"];
    const box = h("div", { class: classes.filter(Boolean).join(" "), style: `left:${node.x}px;top:${node.y}px` },
      h("strong", null, node.label || node.id),
      h("span", null, firstLine.length > 60 ? `${firstLine.slice(0, 60)}…` : firstLine),
    );
    box.addEventListener("pointerdown", (event) => this.startDrag(event, node, box));
    this.boxes.set(node.id, box);
    return box;
  }

  startDrag(event, node, box) {
    const origin = { x: event.clientX - node.x, y: event.clientY - node.y };
    let moved = false;
    box.setPointerCapture(event.pointerId);
    const move = (e) => {
      const x = Math.max(0, Math.round(e.clientX - origin.x));
      const y = Math.max(0, Math.round(e.clientY - origin.y));
      if (!moved && Math.abs(x - node.x) + Math.abs(y - node.y) < DRAG_THRESHOLD_PX) return;
      moved = true;
      node.x = x;
      node.y = y;
      box.style.left = `${x}px`;
      box.style.top = `${y}px`;
      this.drawEdges();
    };
    const up = () => {
      box.removeEventListener("pointermove", move);
      box.removeEventListener("pointerup", up);
      box.removeEventListener("pointercancel", up);
      if (moved) changed(this);
      if (node.id !== this.selectedId) emit(this, "node-select", { id: node.id });
    };
    box.addEventListener("pointermove", move);
    box.addEventListener("pointerup", up);
    box.addEventListener("pointercancel", up);
  }

  drawEdges() {
    const byId = new Map(this.novel.nodes.map((n) => [n.id, n]));
    const width = Math.max(...this.novel.nodes.map((n) => n.x), 0) + NODE_WIDTH + 300;
    const height = Math.max(...this.novel.nodes.map((n) => n.y), 0) + NODE_HEIGHT + 200;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.svg.setAttribute("width", width);
    this.svg.setAttribute("height", height);

    const paths = edgesOf(this.novel).map(({ from, to }) => {
      const a = byId.get(from);
      const b = byId.get(to);
      const x1 = a.x + NODE_WIDTH;
      const y1 = a.y + NODE_HEIGHT / 2;
      const x2 = b.x;
      const y2 = b.y + NODE_HEIGHT / 2;
      // Wider curve when the target is to the left (a jump back)
      const bend = Math.max(60, Math.abs(x2 - x1) / 2);
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`);
      if (from === this.selectedId) path.setAttribute("class", "out");
      else if (to === this.selectedId) path.setAttribute("class", "in");
      return path;
    });
    this.svg.replaceChildren(...paths);
  }

  addNode() {
    const node = addNode(this.novel, this.selected);
    changed(this);
    emit(this, "node-select", { id: node.id });
    this.boxes.get(node.id)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  setStart() {
    if (!this.selected) return;
    this.novel.start = this.selectedId;
    changed(this);
    this.render();
  }

  deleteSelected() {
    const node = this.selected;
    if (!node) return;
    if (node.id === this.novel.start) return alert("The start node cannot be deleted. Set another node as start first.");
    if (!confirm(`Delete the node "${node.label || node.id}"?`)) return;
    deleteNode(this.novel, node);
    changed(this);
    emit(this, "node-select", { id: this.novel.start });
  }
}

customElements.define("novel-graph", NovelGraph);
