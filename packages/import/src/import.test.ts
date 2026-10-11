import { createEditor, type DocumentJSON, type OpenEditor } from "@openedit/core";
import { toDocx, toMarkdown } from "@openedit/export";
import "@openedit/extensions";
import { afterEach, describe, expect, it } from "vitest";
import {
  cleanPastedHtml,
  docxToHtml,
  importDocx,
  importFile,
  importHtml,
  importMarkdown,
  markdownToHtml,
  needsCleanup,
} from "./index";

const editors: OpenEditor[] = [];
afterEach(() => editors.splice(0).forEach((editor) => editor.destroy()));

function mount(content = "") {
  const editor = createEditor({
    element: document.createElement("div"),
    features: ["basics", "tables", "images", "paste-cleanup"],
    content,
  });
  editors.push(editor);
  return editor;
}

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAEUlEQVR4nGP4z8DwH4QZYAwAR8oH+Rq28akAAAAASUVORK5CYII=";

/** A document using every kind of content the milestone names. */
const SAMPLE = `
<h1>Quarterly report</h1>
<p>Revenue grew <strong>12%</strong>, <em>mostly</em> from <a href="https://example.com/eu">Europe</a>. See <code>q3.csv</code> and <s>ignore</s> this.</p>
<h2>Highlights</h2>
<ul><li><p>First point</p><ul><li><p>Nested detail</p></li></ul></li><li><p>Second point</p></li></ul>
<ol><li><p>Step one</p></li><li><p>Step two</p></li></ol>
<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Shipped</p></li><li data-type="taskItem" data-checked="false"><p>Pending</p></li></ul>
<blockquote><p>Good quarter.</p></blockquote>
<pre><code class="language-ts">const total = 42;</code></pre>
<table><tr><th>Region</th><th>Growth</th></tr><tr><td>EU</td><td>12%</td></tr><tr><td>US</td><td>4%</td></tr></table>
<img src="${PNG}" alt="Chart">
<hr>
<p>The end.</p>
`;

/** The document reduced to what an interchange format can carry. */
function essence(
  node: DocumentJSON,
  options: { headers?: boolean; language?: boolean } = {},
): unknown {
  const keep: Record<string, string[]> = {
    heading: ["level"],
    taskItem: ["checked"],
    image: ["src", "alt"],
    codeBlock: options.language === false ? [] : ["language"],
  };
  const type = node.type === "tableHeader" && options.headers === false ? "tableCell" : node.type;
  const attrs = Object.fromEntries(
    (keep[node.type ?? ""] ?? []).map((key) => [key, node.attrs?.[key] ?? null]),
  );
  const marks = node.marks
    ?.map((mark) => (mark.type === "link" ? `link:${String(mark.attrs?.href)}` : mark.type))
    .sort();
  return {
    type,
    ...(Object.keys(attrs).length && { attrs }),
    ...(node.text !== undefined && { text: node.text }),
    ...(marks?.length && { marks }),
    ...(node.content && { content: node.content.map((child) => essence(child, options)) }),
  };
}

describe("Markdown", () => {
  it("round-trips a document with headings, lists, tables and images", () => {
    const original = mount(SAMPLE);
    const markdown = toMarkdown(original);

    const copy = mount();
    importMarkdown(copy, markdown);

    expect(essence(copy.getJSON())).toEqual(essence(original.getJSON()));
    // And it is stable: exporting the copy gives the same Markdown.
    expect(toMarkdown(copy)).toBe(markdown);
  });

  it("imports GitHub-flavoured Markdown", () => {
    const editor = mount();
    importMarkdown(
      editor,
      "# Title\n\n- [x] done\n- [ ] todo\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n~~old~~ **new**\n",
    );
    const html = editor.getHTML();

    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain('data-type="taskList"');
    expect(html).toContain('data-checked="true"');
    expect(editor.engine.view.dom.querySelectorAll("th")).toHaveLength(2);
    expect(html).toContain("<s>old</s> <strong>new</strong>");
  });

  it("drops scripts and event handlers embedded in Markdown", () => {
    const editor = mount();
    importMarkdown(
      editor,
      'Hello <script>window.hacked = 1</script><img src="x" onerror="window.hacked = 1"> [x](javascript:alert(1))',
    );
    const html = editor.getHTML();

    expect(html).not.toMatch(/script|onerror|javascript:/i);
    expect((window as unknown as { hacked?: number }).hacked).toBeUndefined();
  });

  it("converts task lists and block images when asked for HTML only", () => {
    const html = markdownToHtml("- [ ] a\n\n![alt](https://x.test/i.png)\n");
    expect(html).toContain('<li data-type="taskItem" data-checked="false">a</li>');
    expect(html).not.toContain("<p><img");
  });
});

describe("DOCX", () => {
  it("round-trips a document with headings, lists, tables and images", async () => {
    const original = mount(SAMPLE);
    const bytes = await toDocx(original, { title: "Report" });
    // A .docx file is a zip archive.
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);

    const copy = mount();
    const warnings = await importDocx(copy, bytes);

    // Word has no notion of a code block's language.
    const options = { language: false };
    expect(essence(copy.getJSON(), options)).toEqual(essence(original.getJSON(), options));
    expect(warnings).toEqual([]);
  });

  it("reports the HTML and accepts a Blob", async () => {
    const bytes = await toDocx({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "From a blob" }] }],
    });
    const { html } = await docxToHtml(new Blob([bytes as BlobPart]));
    expect(html).toBe("<p>From a blob</p>");
  });

  it("writes a placeholder for images Word cannot embed", async () => {
    const svg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
    const bytes = await toDocx({
      type: "doc",
      content: [{ type: "image", attrs: { src: svg, alt: "Logo" } }],
    });
    const { html } = await docxToHtml(bytes);
    expect(html).toContain("[image: Logo]");
  });
});

describe("HTML and pasted content", () => {
  const WORD = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta name=Generator content="Microsoft Word 15"><style>p.MsoNormal{margin:0}</style></head><body><!--[if gte mso 9]><xml><o:x/></xml><![endif]--><p class=MsoNormal style='mso-margin-top-alt:auto;text-align:center'><span style='font-size:11pt;font-weight:bold'>Bold</span> and <span style='font-style:italic'>italic</span><o:p></o:p></p><p class=MsoNormal><o:p>&nbsp;</o:p></p></body></html>`;
  const GDOCS = `<meta charset='utf-8'><b style="font-weight:normal;" id="docs-internal-guid-1"><p dir="ltr" style="line-height:1.38"><span style="font-size:11pt;font-weight:700;">Bold</span><span style="font-weight:400;text-decoration:underline;"> under</span></p></b>`;

  it("recognises content from Word and Google Docs", () => {
    expect(needsCleanup(WORD)).toBe(true);
    expect(needsCleanup(GDOCS)).toBe(true);
    expect(needsCleanup("<p>plain</p>")).toBe(false);
  });

  it("cleans Word markup down to semantic HTML", () => {
    expect(cleanPastedHtml(WORD)).toBe(
      '<p style="text-align: center"><strong>Bold</strong> and <em>italic</em></p>',
    );
  });

  it("cleans Google Docs markup", () => {
    expect(cleanPastedHtml(GDOCS)).toBe("<p><strong>Bold</strong><u> under</u></p>");
  });

  it("imports HTML, cleaning it when needed", () => {
    const editor = mount();
    importHtml(editor, WORD);
    expect(editor.getHTML()).toBe(
      '<p style="text-align: center;"><strong>Bold</strong> and <em>italic</em></p>',
    );
  });

  it("cleans Word content as it is pasted", () => {
    const editor = mount("<p></p>");
    // The simulated DOM has no ClipboardEvent, so pass a plain event.
    editor.engine.view.pasteHTML(WORD, new Event("paste") as ClipboardEvent);
    expect(editor.getHTML()).toContain("<strong>Bold</strong> and <em>italic</em>");
    expect(editor.getHTML()).not.toMatch(/Mso|mso-/);
  });
});

describe("importFile", () => {
  it("chooses the importer by extension", async () => {
    const editor = mount();

    await importFile(editor, new File(["# From a file"], "notes.md"));
    expect(editor.getHTML()).toMatch(/^<h1>From a file<\/h1>/);

    await importFile(editor, new File(["<h2>Web</h2>"], "page.html"));
    expect(editor.getHTML()).toMatch(/^<h2>Web<\/h2>/);

    await expect(importFile(editor, new File(["x"], "archive.zip"))).rejects.toThrow(/unsupported/);
  });
});
