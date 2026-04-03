import { and, asc, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { knowledgePages, knowledgePageRevisions, knowledgePageLinks } from "@paperclipai/db";

const WIKI_LINK_RE = /\[\[([^\]]+)\]\]/g;

export function knowledgeService(db: Db) {
  return {
    list: (companyId: string, opts?: { parentPageId?: string | null; includeArchived?: boolean }) =>
      db
        .select({
          id: knowledgePages.id,
          companyId: knowledgePages.companyId,
          slug: knowledgePages.slug,
          title: knowledgePages.title,
          parentPageId: knowledgePages.parentPageId,
          tags: knowledgePages.tags,
          updatedAt: knowledgePages.updatedAt,
        })
        .from(knowledgePages)
        .where(
          and(
            eq(knowledgePages.companyId, companyId),
            opts?.parentPageId !== undefined
              ? opts.parentPageId === null
                ? isNull(knowledgePages.parentPageId)
                : eq(knowledgePages.parentPageId, opts.parentPageId)
              : undefined,
            opts?.includeArchived ? undefined : isNull(knowledgePages.archivedAt),
          ),
        )
        .orderBy(asc(knowledgePages.title)),

    getById: (id: string) =>
      db
        .select()
        .from(knowledgePages)
        .where(eq(knowledgePages.id, id))
        .then((rows) => rows[0] ?? null),

    getBySlug: (companyId: string, slug: string) =>
      db
        .select()
        .from(knowledgePages)
        .where(and(eq(knowledgePages.companyId, companyId), eq(knowledgePages.slug, slug)))
        .then((rows) => rows[0] ?? null),

    search: (companyId: string, query: string) =>
      db
        .select({
          id: knowledgePages.id,
          companyId: knowledgePages.companyId,
          slug: knowledgePages.slug,
          title: knowledgePages.title,
          parentPageId: knowledgePages.parentPageId,
          tags: knowledgePages.tags,
          updatedAt: knowledgePages.updatedAt,
        })
        .from(knowledgePages)
        .where(
          and(
            eq(knowledgePages.companyId, companyId),
            isNull(knowledgePages.archivedAt),
            or(
              ilike(knowledgePages.title, `%${query}%`),
              ilike(knowledgePages.body, `%${query}%`),
            ),
          ),
        )
        .orderBy(desc(knowledgePages.updatedAt))
        .limit(50),

    create: async (
      companyId: string,
      data: {
        slug: string;
        title: string;
        body?: string;
        format?: string;
        parentPageId?: string | null;
        tags?: string[];
        publish?: boolean;
      },
      actor: { agentId?: string; userId?: string },
    ) => {
      const page = await db
        .insert(knowledgePages)
        .values({
          companyId,
          slug: data.slug,
          title: data.title,
          body: data.body ?? "",
          format: data.format ?? "markdown",
          parentPageId: data.parentPageId ?? null,
          tags: data.tags ?? [],
          publishedAt: data.publish !== false ? new Date() : null,
          createdByAgentId: actor.agentId ?? null,
          createdByUserId: actor.userId ?? null,
          updatedByAgentId: actor.agentId ?? null,
          updatedByUserId: actor.userId ?? null,
        })
        .returning()
        .then((rows) => rows[0]);

      // Create initial revision
      await db.insert(knowledgePageRevisions).values({
        companyId,
        pageId: page.id,
        revisionNumber: 1,
        body: data.body ?? "",
        changeSummary: "Initial version",
        createdByAgentId: actor.agentId ?? null,
        createdByUserId: actor.userId ?? null,
      });

      // Extract and store wiki-links
      await syncWikiLinks(db, companyId, page.id, data.body ?? "");

      return page;
    },

    update: async (
      id: string,
      companyId: string,
      data: {
        slug?: string;
        title?: string;
        body?: string;
        format?: string;
        parentPageId?: string | null;
        tags?: string[];
        changeSummary?: string;
      },
      actor: { agentId?: string; userId?: string },
    ) => {
      const existing = await db
        .select()
        .from(knowledgePages)
        .where(eq(knowledgePages.id, id))
        .then((rows) => rows[0] ?? null);
      if (!existing) return null;

      const page = await db
        .update(knowledgePages)
        .set({
          ...(data.slug !== undefined ? { slug: data.slug } : {}),
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.body !== undefined ? { body: data.body } : {}),
          ...(data.format !== undefined ? { format: data.format } : {}),
          ...(data.parentPageId !== undefined ? { parentPageId: data.parentPageId } : {}),
          ...(data.tags !== undefined ? { tags: data.tags } : {}),
          updatedByAgentId: actor.agentId ?? null,
          updatedByUserId: actor.userId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(knowledgePages.id, id))
        .returning()
        .then((rows) => rows[0] ?? null);

      if (page && data.body !== undefined) {
        // Get next revision number
        const lastRevision = await db
          .select({ revisionNumber: knowledgePageRevisions.revisionNumber })
          .from(knowledgePageRevisions)
          .where(eq(knowledgePageRevisions.pageId, id))
          .orderBy(desc(knowledgePageRevisions.revisionNumber))
          .limit(1)
          .then((rows) => rows[0]);

        const nextRevision = (lastRevision?.revisionNumber ?? 0) + 1;

        await db.insert(knowledgePageRevisions).values({
          companyId,
          pageId: id,
          revisionNumber: nextRevision,
          body: data.body,
          changeSummary: data.changeSummary ?? null,
          createdByAgentId: actor.agentId ?? null,
          createdByUserId: actor.userId ?? null,
        });

        // Re-sync wiki-links
        await syncWikiLinks(db, companyId, id, data.body);
      }

      return page;
    },

    archive: (id: string) =>
      db
        .update(knowledgePages)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(knowledgePages.id, id))
        .returning()
        .then((rows) => rows[0] ?? null),

    listRevisions: (pageId: string) =>
      db
        .select()
        .from(knowledgePageRevisions)
        .where(eq(knowledgePageRevisions.pageId, pageId))
        .orderBy(desc(knowledgePageRevisions.revisionNumber)),

    getRevision: (revisionId: string) =>
      db
        .select()
        .from(knowledgePageRevisions)
        .where(eq(knowledgePageRevisions.id, revisionId))
        .then((rows) => rows[0] ?? null),

    getBacklinks: (companyId: string, pageId: string) =>
      db
        .select({
          id: knowledgePages.id,
          slug: knowledgePages.slug,
          title: knowledgePages.title,
          linkText: knowledgePageLinks.linkText,
        })
        .from(knowledgePageLinks)
        .innerJoin(knowledgePages, eq(knowledgePageLinks.sourcePageId, knowledgePages.id))
        .where(
          and(
            eq(knowledgePageLinks.companyId, companyId),
            eq(knowledgePageLinks.targetPageId, pageId),
          ),
        ),
  };
}

async function syncWikiLinks(db: Db, companyId: string, sourcePageId: string, body: string) {
  // Delete existing links from this page
  await db
    .delete(knowledgePageLinks)
    .where(
      and(
        eq(knowledgePageLinks.companyId, companyId),
        eq(knowledgePageLinks.sourcePageId, sourcePageId),
      ),
    );

  // Extract wiki-links from body
  const links: Array<{ slug: string; text: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = WIKI_LINK_RE.exec(body)) !== null) {
    const raw = match[1].trim();
    const [slug, ...rest] = raw.split("|");
    links.push({ slug: slug.trim(), text: rest.join("|").trim() || slug.trim() });
  }

  if (links.length === 0) return;

  // Resolve slugs to page IDs
  const uniqueSlugs = [...new Set(links.map((l) => l.slug))];
  const targetPages = await db
    .select({ id: knowledgePages.id, slug: knowledgePages.slug })
    .from(knowledgePages)
    .where(
      and(
        eq(knowledgePages.companyId, companyId),
        inArray(knowledgePages.slug, uniqueSlugs),
      ),
    );

  const slugToId = new Map(targetPages.map((p) => [p.slug, p.id]));

  const newLinks = links
    .filter((l) => slugToId.has(l.slug))
    .map((l) => ({
      companyId,
      sourcePageId,
      targetPageId: slugToId.get(l.slug)!,
      linkText: l.text,
    }));

  if (newLinks.length > 0) {
    // Deduplicate by targetPageId
    const seen = new Set<string>();
    const deduped = newLinks.filter((l) => {
      if (seen.has(l.targetPageId)) return false;
      seen.add(l.targetPageId);
      return true;
    });
    await db.insert(knowledgePageLinks).values(deduped);
  }
}
