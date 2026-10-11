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
<p>No toolbar here. This layout keeps the page clear and puts every command one keystroke away.</p>
<h2>How it works</h2>
<ul>
  <li><p>Type <code>/</code> to open the command menu, then keep typing to search</p></li>
  <li><p>Select text to format it or add a link</p></li>
  <li><p>Use Markdown: <code>#</code> for headings, <code>&gt;</code> for quotes, <code>[ ]</code> for tasks</p></li>
</ul>
<blockquote><p>The same editor, a different <code>ui</code> prop. Each part of the interface is a slot you can keep, replace or leave out.</p></blockquote>
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
