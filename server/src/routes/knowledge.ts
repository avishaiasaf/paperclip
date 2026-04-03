import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { createKnowledgePageSchema, updateKnowledgePageSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { knowledgeService, logActivity } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function knowledgeRoutes(db: Db) {
  const router = Router();
  const svc = knowledgeService(db);

  // List pages (optionally filter by parent, search)
  router.get("/companies/:companyId/knowledge", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const q = req.query.q as string | undefined;
    if (q) {
      const results = await svc.search(companyId, q);
      res.json(results);
      return;
    }

    const parentPageId = req.query.parentPageId as string | undefined;
    const result = await svc.list(companyId, {
      parentPageId: parentPageId === "null" ? null : parentPageId,
    });
    res.json(result);
  });

  // Get page by ID
  router.get("/knowledge/:pageId", async (req, res) => {
    const pageId = req.params.pageId as string;
    const page = await svc.getById(pageId);
    if (!page) {
      res.status(404).json({ error: "Knowledge page not found" });
      return;
    }
    assertCompanyAccess(req, page.companyId);
    res.json(page);
  });

  // Create page
  router.post("/companies/:companyId/knowledge", validate(createKnowledgePageSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const actor = getActorInfo(req);
    const page = await svc.create(companyId, req.body, {
      agentId: actor.agentId ?? undefined,
      userId: actor.actorType === "user" ? actor.actorId : undefined,
    });
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "knowledge.page.created",
      entityType: "knowledge_page",
      entityId: page.id,
      details: { title: page.title, slug: page.slug },
    });
    res.status(201).json(page);
  });

  // Update page
  router.patch("/knowledge/:pageId", validate(updateKnowledgePageSchema), async (req, res) => {
    const pageId = req.params.pageId as string;
    const existing = await svc.getById(pageId);
    if (!existing) {
      res.status(404).json({ error: "Knowledge page not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const actor = getActorInfo(req);
    const page = await svc.update(pageId, existing.companyId, req.body, {
      agentId: actor.agentId ?? undefined,
      userId: actor.actorType === "user" ? actor.actorId : undefined,
    });
    if (!page) {
      res.status(404).json({ error: "Knowledge page not found" });
      return;
    }
    await logActivity(db, {
      companyId: existing.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "knowledge.page.updated",
      entityType: "knowledge_page",
      entityId: page.id,
      details: { title: page.title },
    });
    res.json(page);
  });

  // Archive page (soft delete)
  router.delete("/knowledge/:pageId", async (req, res) => {
    const pageId = req.params.pageId as string;
    const existing = await svc.getById(pageId);
    if (!existing) {
      res.status(404).json({ error: "Knowledge page not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const page = await svc.archive(pageId);
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: existing.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "knowledge.page.archived",
      entityType: "knowledge_page",
      entityId: pageId,
      details: { title: existing.title },
    });
    res.json(page);
  });

  // List revisions
  router.get("/knowledge/:pageId/revisions", async (req, res) => {
    const pageId = req.params.pageId as string;
    const existing = await svc.getById(pageId);
    if (!existing) {
      res.status(404).json({ error: "Knowledge page not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const revisions = await svc.listRevisions(pageId);
    res.json(revisions);
  });

  // Get specific revision
  router.get("/knowledge/:pageId/revisions/:revisionId", async (req, res) => {
    const revisionId = req.params.revisionId as string;
    const revision = await svc.getRevision(revisionId);
    if (!revision) {
      res.status(404).json({ error: "Revision not found" });
      return;
    }
    const page = await svc.getById(revision.pageId);
    if (!page) {
      res.status(404).json({ error: "Knowledge page not found" });
      return;
    }
    assertCompanyAccess(req, page.companyId);
    res.json(revision);
  });

  // Get backlinks (pages that link to this page)
  router.get("/knowledge/:pageId/backlinks", async (req, res) => {
    const pageId = req.params.pageId as string;
    const existing = await svc.getById(pageId);
    if (!existing) {
      res.status(404).json({ error: "Knowledge page not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const backlinks = await svc.getBacklinks(existing.companyId, pageId);
    res.json(backlinks);
  });

  return router;
}
