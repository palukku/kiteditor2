import test from "node:test";
import assert from "node:assert/strict";
import { plainToRich, sectionsToRich, knowledgeToRich, isRich, migrateProject, LINKS, KNOWLEDGE, LEGAL, ABOUT } from "../lib/content-format.mjs";

test("plain text becomes paragraphs with line breaks, escaped", () => {
  assert.equal(plainToRich("a <b>\nc\n\n d & e "), "<p>a &lt;b&gt;<br>c</p><p>d &amp; e</p>");
  assert.equal(plainToRich(""), "");
  assert.ok(isRich(plainToRich("x")));
  assert.ok(!isRich("plain"));
});

test("old legal sections become headings, lines and links", () => {
  const html = sectionsToRich([
    { heading: "H", lines: ["a", "b"] },
    { heading: "I", paragraphs: ["p", [{ type: "text", text: "Web: " }, { type: "link", text: "x", href: "https://x.de" }, { type: "link", text: "bad", href: "javascript:alert(1)" }]] },
  ]);
  assert.equal(html, '<h2>H</h2><p>a<br>b</p><h2>I</h2><p>p</p><p>Web: <a href="https://x.de">x</a></p>');
});

test("wiki (Quelle) becomes a link to the source", () => {
  assert.equal(knowledgeToRich({ fullText: "A (Quelle).\n\nB", sourceUrl: "https://s.de" }), '<p>A <a href="https://s.de">(Quelle)</a>.</p><p>B</p>');
  assert.equal(knowledgeToRich({ fullText: "A (Quelle)" }), "<p>A (Quelle)</p>");
});

test("migrateProject converts old content overrides once", () => {
  const project = {
    texts: {},
    content: {
      [LINKS]: [{ title: "L", desc: "plain" }],
      [KNOWLEDGE]: [{ title: "T", items: [{ title: "E", fullText: "x (Quelle)", sourceUrl: "https://s.de" }] }],
      [LEGAL]: { impressum: { title: "I", sections: [{ heading: "H", lines: ["a"] }] }, datenschutz: { title: "D", toolbar: { resetLabel: "R" }, sections: [] } },
    },
  };
  assert.equal(migrateProject(project), true);
  assert.equal(project.content[LINKS][0].desc, "<p>plain</p>");
  assert.deepEqual(project.content[KNOWLEDGE][0].items[0], { title: "E", fullText: '<p>x <a href="https://s.de">(Quelle)</a></p>' });
  assert.deepEqual(project.content[LEGAL].impressum, { title: "I", html: "<h2>H</h2><p>a</p>" });
  assert.deepEqual(project.content[LEGAL].datenschutz, { title: "D", toolbar: { resetLabel: "R" }, html: "" });
  assert.equal(migrateProject(project), false);
});

test("migrateProject folds the old about text slots into the about content", () => {
  const original = { [ABOUT]: { title: "T", html: "<h2>A</h2><p>a1</p><p>a2</p><h2>B</h2><p>b1</p>" } };
  const project = { content: {}, texts: { "about.title": "New", "about.1.text2": "x<y", "about.2.heading": "BB", "start.button": "GO" } };
  assert.equal(migrateProject(project, original), true);
  assert.deepEqual(project.content[ABOUT], { title: "New", html: "<h2>A</h2><p>a1</p><p>x&lt;y</p><h2>BB</h2><p>b1</p>" });
  assert.deepEqual(project.texts, { "start.button": "GO" });
  assert.equal(migrateProject({ content: {}, texts: {} }, original), false);
});
