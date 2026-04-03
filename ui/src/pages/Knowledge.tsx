import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { knowledgeApi } from "../api/knowledge";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { KnowledgeEditor } from "../components/knowledge-editor/KnowledgeEditor";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Plus,
  Search,
  FileText,
  ChevronRight,
  FolderOpen,
  Folder,
  FolderPlus,
  Save,
  Trash2,
  Link2,
} from "lucide-react";
import type { KnowledgePageSummary } from "@paperclipai/shared";

export function Knowledge() {
  const { pageId: urlPageId } = useParams<{ pageId?: string }>();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedPageId, setSelectedPageId] = useState<string | null>(urlPageId ?? null);
  const [searchQuery, setSearchQuery] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "history" | "backlinks">("edit");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newPageParentId, setNewPageParentId] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ label: "Knowledge" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (urlPageId && urlPageId !== selectedPageId) {
      setSelectedPageId(urlPageId);
    }
  }, [urlPageId]);

  // Page list
  const { data: pages, isLoading: listLoading } = useQuery({
    queryKey: searchQuery
      ? queryKeys.knowledge.search(selectedCompanyId!, searchQuery)
      : queryKeys.knowledge.list(selectedCompanyId!),
    queryFn: () =>
      searchQuery
        ? knowledgeApi.search(selectedCompanyId!, searchQuery)
        : knowledgeApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  // Auto-expand folders that have children on first load
  useEffect(() => {
    if (pages && expandedIds.size === 0) {
      const withChildren = new Set<string>();
      for (const p of pages) {
        if (p.parentPageId) withChildren.add(p.parentPageId);
      }
      if (withChildren.size > 0) setExpandedIds(withChildren);
    }
  }, [pages]);

  // Selected page detail
  const { data: page } = useQuery({
    queryKey: queryKeys.knowledge.detail(selectedPageId!),
    queryFn: () => knowledgeApi.get(selectedPageId!),
    enabled: !!selectedPageId,
  });

  const { data: revisions } = useQuery({
    queryKey: queryKeys.knowledge.revisions(selectedPageId!),
    queryFn: () => knowledgeApi.listRevisions(selectedPageId!),
    enabled: !!selectedPageId && activeTab === "history",
  });

  const { data: backlinks } = useQuery({
    queryKey: queryKeys.knowledge.backlinks(selectedPageId!),
    queryFn: () => knowledgeApi.getBacklinks(selectedPageId!),
    enabled: !!selectedPageId && activeTab === "backlinks",
  });

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setBody(page.body);
      setIsDirty(false);
      setActiveTab("edit");
    }
  }, [page]);

  const handleBodyChange = useCallback((newBody: string) => {
    setBody(newBody);
    setIsDirty(true);
  }, []);

  const createPage = useMutation({
    mutationFn: (parentId: string | null) =>
      knowledgeApi.create(selectedCompanyId!, {
        title: "Untitled",
        slug: `untitled-${Date.now()}`,
        body: "",
        parentPageId: parentId,
        publish: true,
      }),
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.list(selectedCompanyId!) });
      setSelectedPageId(newPage.id);
      navigate(`/knowledge/${newPage.id}`, { replace: true });
    },
  });

  const createFolder = useMutation({
    mutationFn: (name: string) =>
      knowledgeApi.create(selectedCompanyId!, {
        title: name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        body: "",
        parentPageId: newPageParentId,
        publish: true,
      }),
    onSuccess: (newFolder) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.list(selectedCompanyId!) });
      setExpandedIds((prev) => new Set([...prev, newFolder.id]));
      setShowNewFolder(false);
      setNewFolderName("");
      setNewPageParentId(null);
    },
  });

  const savePage = useMutation({
    mutationFn: () => knowledgeApi.update(selectedPageId!, { title, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.detail(selectedPageId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.list(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.revisions(selectedPageId!) });
      setIsDirty(false);
    },
  });

  const archivePage = useMutation({
    mutationFn: () => knowledgeApi.archive(selectedPageId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.list(selectedCompanyId!) });
      setSelectedPageId(null);
      navigate("/knowledge", { replace: true });
    },
  });

  const selectPage = (id: string) => {
    setSelectedPageId(id);
    navigate(`/knowledge/${id}`, { replace: true });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!selectedCompanyId) {
    return <EmptyState icon={BookOpen} message="Select a company to view knowledge base." />;
  }

  if (listLoading) {
    return <PageSkeleton variant="list" />;
  }

  const allPages = pages ?? [];
  const rootPages = allPages.filter((p) => !p.parentPageId);
  const childrenMap = new Map<string, KnowledgePageSummary[]>();
  for (const p of allPages) {
    if (p.parentPageId) {
      const children = childrenMap.get(p.parentPageId) ?? [];
      children.push(p);
      childrenMap.set(p.parentPageId, children);
    }
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Left: Page tree sidebar */}
      <div className="w-60 shrink-0 border-r border-border flex flex-col bg-background">
        <div className="p-2 border-b border-border space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-7 h-7 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs"
              onClick={() => createPage.mutate(null)}
              disabled={createPage.isPending}
            >
              <Plus className="h-3 w-3 mr-1" />
              Page
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs"
              onClick={() => { setNewPageParentId(null); setShowNewFolder(true); }}
            >
              <FolderPlus className="h-3 w-3 mr-1" />
              Folder
            </Button>
          </div>
        </div>

        {/* New folder dialog inline */}
        {showNewFolder && (
          <div className="p-2 border-b border-border bg-accent/30">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newFolderName.trim()) createFolder.mutate(newFolderName.trim());
              }}
              className="flex gap-1"
            >
              <Input
                placeholder="Folder name..."
                className="h-7 text-xs flex-1"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
              />
              <Button size="sm" className="h-7 text-xs px-2" type="submit" disabled={!newFolderName.trim() || createFolder.isPending}>
                OK
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}>
                &times;
              </Button>
            </form>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto py-1">
          {allPages.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">
              {searchQuery ? "No pages match." : "No pages yet."}
            </p>
          ) : (
            rootPages.map((p) => (
              <TreeItem
                key={p.id}
                page={p}
                childrenMap={childrenMap}
                depth={0}
                selectedId={selectedPageId}
                expandedIds={expandedIds}
                onSelect={selectPage}
                onToggleExpand={toggleExpand}
                onCreatePageIn={(parentId) => createPage.mutate(parentId)}
                onCreateFolderIn={(parentId) => { setNewPageParentId(parentId); setShowNewFolder(true); }}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: Editor */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {!selectedPageId || !page ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <BookOpen className="h-8 w-8 mx-auto opacity-30" />
              <p className="text-sm">Select a page or create a new one</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0">
              <Input
                value={title}
                onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
                className="text-base font-semibold border-none shadow-none px-0 focus-visible:ring-0 h-8"
                placeholder="Page title"
              />
              <div className="flex items-center gap-1 shrink-0">
                {isDirty && (
                  <Button size="sm" className="h-7 text-xs" onClick={() => savePage.mutate()} disabled={savePage.isPending}>
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive"
                  onClick={() => { if (confirm("Archive this page?")) archivePage.mutate(); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-1 px-4 py-1 border-b border-border text-xs shrink-0">
              {(["edit", "history", "backlinks"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-1 rounded transition-colors ${
                    activeTab === tab
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "edit" && "Edit"}
                  {tab === "history" && `History${revisions ? ` (${revisions.length})` : ""}`}
                  {tab === "backlinks" && `Backlinks${backlinks ? ` (${backlinks.length})` : ""}`}
                </button>
              ))}
              <span className="ml-auto text-[10px] text-muted-foreground font-mono">{page.slug}</span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {activeTab === "edit" && (
                <KnowledgeEditor value={body} onChange={handleBodyChange} />
              )}
              {activeTab === "history" && (
                <div className="p-4 space-y-1">
                  {revisions && revisions.length > 0 ? (
                    revisions.map((rev) => (
                      <div key={rev.id} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-accent/50 text-sm">
                        <span className="text-xs font-mono text-muted-foreground w-6">v{rev.revisionNumber}</span>
                        <span className="flex-1 truncate">{rev.changeSummary ?? "No description"}</span>
                        <span className="text-xs text-muted-foreground">{new Date(rev.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No revision history.</p>
                  )}
                </div>
              )}
              {activeTab === "backlinks" && (
                <div className="p-4 space-y-1">
                  {backlinks && backlinks.length > 0 ? (
                    backlinks.map((link) => (
                      <button
                        key={link.id}
                        onClick={() => selectPage(link.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-accent/50 text-sm text-left"
                      >
                        <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{link.title}</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No pages link to this page.</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Tree item component ---

function TreeItem({
  page,
  childrenMap,
  depth,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
  onCreatePageIn,
  onCreateFolderIn,
}: {
  page: KnowledgePageSummary;
  childrenMap: Map<string, KnowledgePageSummary[]>;
  depth: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onCreatePageIn: (parentId: string) => void;
  onCreateFolderIn: (parentId: string) => void;
}) {
  const children = childrenMap.get(page.id) ?? [];
  const hasChildren = children.length > 0;
  const isSelected = selectedId === page.id;
  const isExpanded = expandedIds.has(page.id);

  return (
    <>
      <div
        className={`flex items-center gap-0 w-full text-[13px] rounded-md transition-colors group
          hover:bg-accent/50 ${isSelected ? "bg-accent text-accent-foreground font-medium" : "text-foreground/80"}`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {/* Chevron — expand/collapse only, does NOT select */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggleExpand(page.id);
          }}
          className="w-6 h-7 flex items-center justify-center shrink-0"
        >
          {hasChildren ? (
            <ChevronRight
              className={`h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
            />
          ) : (
            <span className="w-3.5" />
          )}
        </button>

        {/* Icon + label — selects the page */}
        <button
          onClick={() => onSelect(page.id)}
          className="flex items-center gap-1.5 flex-1 min-w-0 py-1.5 pr-1 text-left"
        >
          {hasChildren ? (
            isExpanded ? (
              <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
            )
          ) : (
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">{page.title}</span>
        </button>

        {/* Quick actions on hover */}
        <div className="hidden group-hover:flex items-center shrink-0 pr-1">
          <button
            onClick={(e) => { e.stopPropagation(); onCreatePageIn(page.id); }}
            className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
            title="New page inside"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onCreateFolderIn(page.id); }}
            className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
            title="New folder inside"
          >
            <FolderPlus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {children.map((child) => (
            <TreeItem
              key={child.id}
              page={child}
              childrenMap={childrenMap}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onCreatePageIn={onCreatePageIn}
              onCreateFolderIn={onCreateFolderIn}
            />
          ))}
        </div>
      )}
    </>
  );
}
