import { defineExtension, registerFeature, type OpenEditExtension } from "@openedit/core";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

declare module "@openedit/core" {
  interface FeatureRegistry {
    "paste-cleanup": true;
  }
}

/**
 * Tidies HTML copied from Word, Google Docs and similar tools, so it becomes
 * clean document content instead of a pile of inline styles:
 *
 * - drops Office markup (`<o:p>`, conditional comments, `mso-*` styles), and
 *   `<style>`, `<meta>`, `<script>` and friends
 * - unwraps the `<b style="font-weight:normal">` wrapper Google Docs adds
 * - turns spans styled bold / italic / underline / strike into real tags
 * - removes `class`, `style`, `id` and `lang` attributes and empty spans
 *
 * Needs a DOM (`DOMParser`), so run it in the browser.
 */
export function cleanPastedHtml(html: string): string {
  const stripped = html
    // Conditional comments carry Word's XML; ordinary comments carry nothing useful.
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?o:p[^>]*>/gi, "")
    .replace(/<\/?(?:w|m|v|st1):[^>]*>/gi, "");
  const doc = new DOMParser().parseFromString(stripped, "text/html");

  doc
    .querySelectorAll("style, script, meta, link, title, xml, head > *")
    .forEach((node) => node.remove());

  // Google Docs wraps everything in a <b> that is styled as not bold.
  doc
    .querySelectorAll('b[style*="font-weight:normal"], b[style*="font-weight: normal"]')
    .forEach((node) => {
      node.replaceWith(...Array.from(node.childNodes));
    });

  doc.querySelectorAll<HTMLElement>("span").forEach((span) => {
    const style = span.getAttribute("style")?.toLowerCase() ?? "";
    const wrappers: string[] = [];
    if (/font-weight:\s*(bold|[6-9]00)/.test(style)) wrappers.push("strong");
    if (/font-style:\s*italic/.test(style)) wrappers.push("em");
    if (/text-decoration[^;]*underline/.test(style)) wrappers.push("u");
    if (/text-decoration[^;]*line-through/.test(style)) wrappers.push("s");
    let content: Node[] = Array.from(span.childNodes);
    for (const tag of wrappers) {
      const wrapper = doc.createElement(tag);
      wrapper.append(...content);
      content = [wrapper];
    }
    span.replaceWith(...content);
  });

  doc.body.querySelectorAll<HTMLElement>("*").forEach((element) => {
    for (const name of ["class", "style", "id", "lang", "dir"]) {
      // Alignment is the one style worth keeping.
      if (name === "style") {
        const align = /text-align:\s*(left|center|right|justify)/i.exec(
          element.getAttribute("style") ?? "",
        );
        if (align) element.setAttribute("style", `text-align: ${align[1]!.toLowerCase()}`);
        else element.removeAttribute("style");
      } else {
        element.removeAttribute(name);
      }
    }
  });

  // Word leaves empty paragraphs holding only a non-breaking space.
  doc.body.querySelectorAll("p").forEach((paragraph) => {
    if (
      !paragraph.textContent?.replace(/\u00a0/g, "").trim() &&
      !paragraph.querySelector("img, br")
    ) {
      paragraph.remove();
    }
  });

  return doc.body.innerHTML.trim();
}

/** Whether HTML looks like it came from a tool that needs {@link cleanPastedHtml}. */
export function needsCleanup(html: string): boolean {
  return /mso-|<o:p|urn:schemas-microsoft-com|docs-internal-guid|class="?Mso|<meta[^>]+(?:Word|Excel|PowerPoint|LibreOffice)/i.test(
    html,
  );
}

/**
 * Cleans up content pasted from Word, Google Docs and similar tools as it
 * arrives. Other pastes are left alone.
 */
export function pasteCleanup(): OpenEditExtension {
  return defineExtension({
    name: "paste-cleanup",
    engine: () =>
      Extension.create({
        name: "pasteCleanup",
        addProseMirrorPlugins: () => [
          new Plugin({
            key: new PluginKey("openeditPasteCleanup"),
            props: {
              transformPastedHTML: (html) => (needsCleanup(html) ? cleanPastedHtml(html) : html),
            },
          }),
        ],
      }),
  });
}

registerFeature("paste-cleanup", () => pasteCleanup());
