import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { knowledgeApi } from "../api/knowledge";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Plus, Search, FileText, ChevronRight } from "lucide-react";
import type { KnowledgePageSummary } from "@paperclipai/shared";

export function Knowledge() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setBreadcrumbs([{ label: "Knowledge" }]);
  }, [setBreadcrumbs]);

  const { data: pages, isLoading } = useQuery({
    queryKey: searchQuery
      ? queryKeys.knowledge.search(selectedCompanyId!, searchQuery)
      : queryKeys.knowledge.list(selectedCompanyId!),
    queryFn: () =>
      searchQuery
        ? knowledgeApi.search(selectedCompanyId!, searchQuery)
        : knowledgeApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const createPage = useMutation({
    mutationFn: () =>
      knowledgeApi.create(selectedCompanyId!, {
        title: "Untitled",
        slug: `untitled-${Date.now()}`,
        body: "",
        publish: true,
      }),
    onSuccess: (page) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.list(selectedCompanyId!) });
      navigate(`/knowledge/${page.id}`);
    },
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={BookOpen} message="Select a company to view knowledge base." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  // Group pages by parent for tree display
  const rootPages = (pages ?? []).filter((p) => !p.parentPageId);
  const childrenMap = new Map<string, KnowledgePageSummary[]>();
  for (const page of pages ?? []) {
    if (page.parentPageId) {
      const children = childrenMap.get(page.parentPageId) ?? [];
      children.push(page);
      childrenMap.set(page.parentPageId, children);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button size="sm" variant="outline" onClick={() => createPage.mutate()} disabled={createPage.isPending}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Page
        </Button>
      </div>

      {(!pages || pages.length === 0) && (
        <EmptyState
          icon={BookOpen}
          message={searchQuery ? "No pages match your search." : "No knowledge pages yet."}
          action={searchQuery ? undefined : "Create First Page"}
          onAction={searchQuery ? undefined : () => createPage.mutate()}
        />
      )}

      {rootPages.length > 0 && (
        <div className="rounded-lg border border-border divide-y divide-border">
          {rootPages.map((page) => (
            <PageRow key={page.id} page={page} childrenMap={childrenMap} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}

function PageRow({
  page,
  childrenMap,
  depth,
}: {
  page: KnowledgePageSummary;
  childrenMap: Map<string, KnowledgePageSummary[]>;
  depth: number;
}) {
  const children = childrenMap.get(page.id) ?? [];

  return (
    <>
      <Link
        to={`/knowledge/${page.id}`}
        className="flex items-center gap-2 px-4 py-3 hover:bg-accent/50 transition-colors"
        style={{ paddingLeft: `${1 + depth * 1.5}rem` }}
      >
        {children.length > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate">{page.title}</span>
        {page.tags && (page.tags as string[]).length > 0 && (
          <div className="flex gap-1 ml-auto">
            {(page.tags as string[]).slice(0, 3).map((tag) => (
              <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-accent text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </Link>
      {children.map((child) => (
        <PageRow key={child.id} page={child} childrenMap={childrenMap} depth={depth + 1} />
      ))}
    </>
  );
}
