export const simpleContent = `
<h1>Getting started</h1>
<p>Welcome to <mark>OpenEdit</mark>, a rich text editor where <strong>everything is free</strong>: the editor, the UI you are looking at, and every feature on the roadmap. MIT licensed.</p>
<p>This demo is <code>&lt;RichTextEditor /&gt;</code> from <code>@openedit/ui</code>, with no configuration.</p>
<pre><code>import { RichTextEditor } from "@openedit/ui";
import "@openedit/ui/styles.css";</code></pre>
<h2>Things to try</h2>
<blockquote><p><em>Select some text for the floating menu, type <code>/</code> on an empty line for the command menu, or use Markdown shortcuts like <code>##</code> and <code>-</code>.</em></p></blockquote>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><p>Format text from the toolbar or with keyboard shortcuts</p></li>
  <li data-type="taskItem" data-checked="true"><p>Add a <a href="https://github.com">link</a>, then click it to edit</p></li>
  <li data-type="taskItem" data-checked="false"><p>Paste or drop an image, then drag a corner to resize it</p></li>
  <li data-type="taskItem" data-checked="false"><p>Click into the table below and use its menu</p></li>
</ul>
<table>
  <tr><th>Feature</th><th>Package</th><th>Status</th></tr>
  <tr><td>Core editor</td><td>@openedit/core</td><td>Ready</td></tr>
  <tr><td>Default UI</td><td>@openedit/ui</td><td>Ready</td></tr>
  <tr><td>Collaboration</td><td>@openedit/extensions</td><td>Next</td></tr>
</table>
<p></p>
`;

export const notionContent = `
<h1>Notes, the quiet way</h1>
<p>No toolbar here. Hover a block for its handle, type <code>/</code> for commands, or <code>@</code> to mention someone, like <span data-type="mention" data-id="ada" data-label="Ada Lovelace"></span>.</p>
<div data-callout="info"><p><strong>Tip.</strong> Drag the grip beside a block to move it, or press Ctrl/Cmd + Shift + Up or Down.</p></div>
<h2>Blocks</h2>
<div data-columns="2">
  <div data-column><h3>Left column</h3><p>Columns hold any blocks, side by side. On a narrow screen they stack.</p></div>
  <div data-column><h3>Right column</h3><ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Callouts</p></li><li data-type="taskItem" data-checked="true"><p>Toggles</p></li><li data-type="taskItem" data-checked="false"><p>Your idea here</p></li></ul></div>
</div>
<details open><summary>A toggle: click the arrow to fold it</summary><div data-type="detailsContent"><p>Hidden details live here until someone needs them.</p></div></details>
<div data-callout="warning"><p>Formulas are LaTeX, rendered with KaTeX. Click one to edit it.</p></div>
<div data-type="block-math" data-latex="e^{i\\pi} + 1 = 0"></div>
<p></p>
`;

export const customContent = `
<h1>Make it yours</h1>
<p>This editor uses the same components with two changes.</p>
<h2>1. Theme tokens</h2>
<p>A few CSS variables change the accent colour, corner radius and typeface. Try the <mark>highlight</mark> and a <a href="https://example.com">link</a> to see the accent.</p>
<h2>2. A replaced toolbar</h2>
<p>The toolbar above is a custom component, passed through the <code>Toolbar</code> slot and built from the same parts as the default one.</p>
<p></p>
`;

export const collabContent = `
<h1>Write together</h1>
<p>Everyone in this room sees each change as it is typed, with a named cursor for each person.</p>
<ul>
  <li><p>Type in either editor and watch the other follow</p></li>
  <li><p>Use the Wi-Fi button to go offline, edit on both sides, then reconnect</p></li>
</ul>
<p></p>
`;
