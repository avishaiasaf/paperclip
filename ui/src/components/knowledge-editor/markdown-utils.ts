import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import TurndownService from "turndown";
// @ts-expect-error — no types available
import { gfm } from "turndown-plugin-gfm";

// --- Markdown → HTML (for loading into Tiptap) ---

function convertWikiLinks(markdown: string): string {
  return markdown.replace(/\[\[([^\]]+)\]\]/g, (_match, pageName: string) => {
    const slug = pageName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `<a data-wiki-link="true" data-page-name="${pageName}" href="#page:${slug}" class="wiki-link">${pageName}</a>`;
  });
}

function fixTaskListHtml(html: string): string {
  html = html.replace(
    /<ul class="contains-task-list">/g,
    '<ul data-type="taskList" class="task-list">',
  );
  html = html.replace(
    /<li class="task-list-item">\s*<input type="checkbox"([^>]*)>\s*([\s\S]*?)(?=<\/li>)/g,
    (_match, attrs: string, content: string) => {
      const checked = attrs.includes("checked");
      const cleanContent = content.trim();
      return `<li data-type="taskItem" data-checked="${checked}"><label><input type="checkbox"${checked ? " checked" : ""}></label><div><p>${cleanContent}</p></div>`;
    },
  );
  return html;
}

export async function markdownToHtml(markdown: string): Promise<string> {
  const preprocessed = convertWikiLinks(markdown);
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(preprocessed);
  return fixTaskListHtml(String(result));
}

// --- HTML → Markdown (for saving from Tiptap) ---

const turndown = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  fence: "```",
  emDelimiter: "*",
  strongDelimiter: "**",
});

turndown.use(gfm);

turndown.addRule("codeBlock", {
  filter: (node) =>
    node.nodeName === "PRE" && node.firstChild !== null && node.firstChild.nodeName === "CODE",
  replacement: (_content, node) => {
    const code = node.firstChild as HTMLElement;
    const lang = code.getAttribute("class")?.replace("language-", "") || "";
    const text = code.textContent || "";
    return `\n\`\`\`${lang}\n${text}\n\`\`\`\n`;
  },
});

turndown.addRule("wikiLink", {
  filter: (node) =>
    node.nodeName === "A" && node.getAttribute("data-wiki-link") === "true",
  replacement: (content, node) => {
    const pageName = (node as HTMLElement).getAttribute("data-page-name") || content;
    return `[[${pageName}]]`;
  },
});

export function htmlToMarkdown(html: string): string {
  return turndown.turndown(html);
}
