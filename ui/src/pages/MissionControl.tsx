import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { issuesApi } from "../api/issues";
import { heartbeatsApi } from "../api/heartbeats";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { KanbanBoard } from "../components/KanbanBoard";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { Button } from "@/components/ui/button";
import { useDialog } from "../context/DialogContext";
import { LayoutGrid, List, Plus, Activity, Zap } from "lucide-react";

export function MissionControl() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { openNewIssue } = useDialog();
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  useEffect(() => {
    setBreadcrumbs([{ label: "Mission Control" }]);
  }, [setBreadcrumbs]);

  const { data: issues, isLoading } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: liveRuns } = useQuery({
    queryKey: queryKeys.liveRuns(selectedCompanyId!),
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 10_000,
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={LayoutGrid} message="Select a company to view mission control." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="list" />;
  }

  const activeIssues = (issues ?? []).filter((i) => !["done", "cancelled"].includes(i.status));
  const liveRunCount = liveRuns?.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">{liveRunCount} active run{liveRunCount !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
          <Activity className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">{activeIssues.length} open issue{activeIssues.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button size="sm" variant={viewMode === "kanban" ? "default" : "outline"} onClick={() => setViewMode("kanban")}>
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant={viewMode === "list" ? "default" : "outline"} onClick={() => setViewMode("list")}>
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => openNewIssue()}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Issue
          </Button>
        </div>
      </div>

      {/* Board */}
      {issues && issues.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          message="No issues yet. Create your first task to get started."
          action="New Issue"
          onAction={() => openNewIssue()}
        />
      ) : viewMode === "kanban" ? (
        <KanbanBoard issues={issues ?? []} onUpdateIssue={() => {}} />
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {(issues ?? []).map((issue) => (
            <a
              key={issue.id}
              href={`/issues/${issue.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors"
            >
              <span className="text-xs font-mono text-muted-foreground w-16">{issue.identifier ?? issue.issueNumber}</span>
              <span className="text-sm font-medium flex-1 truncate">{issue.title}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-muted-foreground">{issue.status}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
