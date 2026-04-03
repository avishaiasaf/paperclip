export interface KnowledgePage {
  id: string;
  companyId: string;
  slug: string;
  title: string;
  body: string;
  format: string;
  parentPageId: string | null;
  tags: string[];
  createdByAgentId: string | null;
  createdByUserId: string | null;
  updatedByAgentId: string | null;
  updatedByUserId: string | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgePageSummary {
  id: string;
  companyId: string;
  slug: string;
  title: string;
  parentPageId: string | null;
  tags: string[];
  updatedAt: Date;
}

export interface KnowledgePageRevision {
  id: string;
  companyId: string;
  pageId: string;
  revisionNumber: number;
  body: string;
  changeSummary: string | null;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  createdAt: Date;
}

export interface KnowledgePageLink {
  id: string;
  companyId: string;
  sourcePageId: string;
  targetPageId: string;
  linkText: string | null;
  createdAt: Date;
}
