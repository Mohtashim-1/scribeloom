import { describe, expect, it } from "vitest";
import { toHtmlDocument, toMarkdown, wrapHtmlDocument } from "./index";
import { readImageInfo } from "./image-size";

const text = (value: string, ...marks: Array<string | { type: string; attrs: object }>) => ({
  type: "text",
  text: value,
  marks: marks.map((mark) => (typeof mark === "string" ? { type: mark } : mark)),
});
const p = (...content: object[]) => ({ type: "paragraph", content });
const doc = (...content: object[]) => ({ type: "doc", content });

describe("toMarkdown", () => {
  it("writes headings, paragraphs and dividers", () => {
    const markdown = toMarkdown(
      doc({ type: "heading", attrs: { level: 2 }, content: [text("Title")] }, p(text("Body")), {
        type: "horizontalRule",
      }),
    );
    expect(markdown).toBe("## Title\n\nBody\n\n---\n");
  });

  it("nests marks cleanly and keeps spaces outside the markers", () => {
    const markdown = toMarkdown(
      doc(
        p(
          text("plain "),
          text("bold ", "bold"),
          text("both", "bold", "italic"),
          text(" strike", "strike"),
          text(" code", "code"),
        ),
      ),
    );
    expect(markdown).toBe("plain **bold *both*** ~~strike~~ `code`\n");
  });

  it("writes links, including formatted text inside one link", () => {
    const link = { type: "link", attrs: { href: "https://example.com/a b" } };
    const markdown = toMarkdown(doc(p(text("see ", link), text("this", link, "bold"))));
    expect(markdown).toBe("[see **this**](https://example.com/a%20b)\n");
  });

  it("uses inline HTML for underline and highlight", () => {
    expect(toMarkdown(doc(p(text("u", "underline"), text(" "), text("h", "highlight"))))).toBe(
      "<u>u</u> <mark>h</mark>\n",
    );
  });

  it("escapes characters that would be read as Markdown", () => {
    expect(toMarkdown(doc(p(text("2 * 3 = [6] _ok_ `x`"))))).toBe(
      "2 \\* 3 = \\[6\\] \\_ok\\_ \\`x\\`\n",
    );
    expect(toMarkdown(doc(p(text("# not a heading")), p(text("1. not a list"))))).toBe(
      "\\# not a heading\n\n1\\. not a list\n",
    );
  });

  it("writes nested bullet, numbered and task lists", () => {
    const item = (label: string, ...rest: object[]) => ({
      type: "listItem",
      content: [p(text(label)), ...rest],
    });
    const markdown = toMarkdown(
      doc(
        {
          type: "bulletList",
          content: [
            item("one", {
              type: "orderedList",
              attrs: { start: 3 },
              content: [item("three"), item("four")],
            }),
            item("two"),
          ],
        },
        {
          type: "taskList",
          content: [
            { type: "taskItem", attrs: { checked: true }, content: [p(text("done"))] },
            { type: "taskItem", attrs: { checked: false }, content: [p(text("todo"))] },
          ],
        },
      ),
    );
    expect(markdown).toBe("- one\n  3. three\n  4. four\n- two\n\n- [x] done\n- [ ] todo\n");
  });

  it("writes quotes and code blocks, growing the fence when needed", () => {
    const markdown = toMarkdown(
      doc(
        { type: "blockquote", content: [p(text("quoted")), p(text("twice"))] },
        { type: "codeBlock", attrs: { language: "ts" }, content: [text("const a = `x`;\n```")] },
      ),
    );
    expect(markdown).toBe("> quoted\n>\n> twice\n\n````ts\nconst a = `x`;\n```\n````\n");
  });

  it("writes tables, escaping pipes", () => {
    const cell = (type: string, value: string) => ({ type, content: [p(text(value))] });
    const markdown = toMarkdown(
      doc({
        type: "table",
        content: [
          { type: "tableRow", content: [cell("tableHeader", "Name"), cell("tableHeader", "Note")] },
          { type: "tableRow", content: [cell("tableCell", "a|b"), cell("tableCell", "ok")] },
        ],
      }),
    );
    expect(markdown).toBe("| Name | Note |\n| --- | --- |\n| a\\|b | ok |\n");
  });

  it("writes images and hard breaks", () => {
    const markdown = toMarkdown(
      doc(
        {
          type: "image",
          attrs: { src: "https://x.test/a.png", alt: "A [cat]", title: 'Say "hi"' },
        },
        p(text("line one"), { type: "hardBreak" }, text("line two")),
      ),
    );
    expect(markdown).toBe(
      '![A \\[cat\\]](https://x.test/a.png "Say \\"hi\\"")\n\nline one\\\nline two\n',
    );
  });

  it("returns an empty string for an empty document", () => {
    expect(toMarkdown(doc())).toBe("");
  });
});

describe("HTML documents", () => {
  it("wraps a fragment in a page and escapes the title", () => {
    const html = wrapHtmlDocument("<p>Hi</p>", { title: "A <b> & C", css: "p{}" });
    expect(html).toContain("<title>A &lt;b&gt; &amp; C</title>");
    expect(html).toContain("<style>p{}</style>");
    expect(html).toContain("<body>\n<p>Hi</p>\n</body>");
  });

  it("exports an editor as a full page", () => {
    const editor = { getHTML: () => "<h1>Doc</h1>" } as Parameters<typeof toHtmlDocument>[0];
    expect(toHtmlDocument(editor)).toMatch(/^<!doctype html>[\s\S]*<h1>Doc<\/h1>/);
  });
});

describe("readImageInfo", () => {
  it("reads PNG, GIF and JPEG sizes and rejects other data", () => {
    const png = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAMAAAACCAYAAACddGYaAAAAEUlEQVR4nGP4z8DwH4QZYAwAR8oH+Rq28akAAAAASUVORK5CYII=",
      ),
      (c) => c.charCodeAt(0),
    );
    expect(readImageInfo(png)).toEqual({ kind: "png", width: 3, height: 2 });

    const gif = Uint8Array.from(
      atob("R0lGODlhBQAHAIAAAAAAAP///yH5BAAAAAAALAAAAAAFAAcAAAIFhI+py1gAOw=="),
      (c) => c.charCodeAt(0),
    );
    expect(readImageInfo(gif)).toEqual({ kind: "gif", width: 5, height: 7 });

    const jpegHeader = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0, 9, 0, 16, 1, 1, 0x11, 0,
    ]);
    expect(readImageInfo(jpegHeader)).toEqual({ kind: "jpg", width: 16, height: 9 });

    expect(
      readImageInfo(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>")),
    ).toBeNull();
  });
});
