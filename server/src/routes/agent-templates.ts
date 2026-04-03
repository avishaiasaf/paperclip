import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { createAgentTemplateSchema, updateAgentTemplateSchema } from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { agentTemplateService } from "../services/agent-templates.js";
import { assertCompanyAccess } from "./authz.js";

export function agentTemplateRoutes(db: Db) {
  const router = Router();
  const svc = agentTemplateService(db);

  // List templates (built-in + company custom)
  router.get("/companies/:companyId/agent-templates", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const department = req.query.department as string | undefined;
    const result = await svc.list(companyId, department);
    res.json(result);
  });

  // Get template by ID
  router.get("/agent-templates/:templateId", async (req, res) => {
    const template = await svc.getById(req.params.templateId as string);
    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    if (template.companyId) assertCompanyAccess(req, template.companyId);
    res.json(template);
  });

  // Create custom template
  router.post("/companies/:companyId/agent-templates", validate(createAgentTemplateSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const template = await svc.create(companyId, req.body);
    res.status(201).json(template);
  });

  // Update custom template
  router.patch("/agent-templates/:templateId", validate(updateAgentTemplateSchema), async (req, res) => {
    const template = await svc.getById(req.params.templateId as string);
    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    if (template.isBuiltIn) {
      res.status(403).json({ error: "Cannot modify built-in templates" });
      return;
    }
    if (template.companyId) assertCompanyAccess(req, template.companyId);
    const updated = await svc.update(template.id, req.body);
    res.json(updated);
  });

  // Delete custom template
  router.delete("/agent-templates/:templateId", async (req, res) => {
    const template = await svc.getById(req.params.templateId as string);
    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    if (template.isBuiltIn) {
      res.status(403).json({ error: "Cannot delete built-in templates" });
      return;
    }
    if (template.companyId) assertCompanyAccess(req, template.companyId);
    await svc.remove(template.id);
    res.json({ ok: true });
  });

  return router;
}
