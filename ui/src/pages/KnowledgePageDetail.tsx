import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { knowledgeApi } from "../api/knowledge";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { PageSkeleton } from "../components/PageSkeleton";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Save, Trash2, History, Link2, ArrowLeft } from "lucide-react";

export function KnowledgePageDetail() {
  const { pageId } = useParams<{ pageId: string }>();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: page, isLoading } = useQuery({
    queryKey: queryKeys.knowledge.detail(pageId!),
    queryFn: () => knowledgeApi.get(pageId!),
    enabled: !!pageId,
  });

  const { data: revisions } = useQuery({
    queryKey: queryKeys.knowledge.revisions(pageId!),
    queryFn: () => knowledgeApi.listRevisions(pageId!),
    enabled: !!pageId,
  });

  const { data: backlinks } = useQuery({
    queryKey: queryKeys.knowledge.backlinks(pageId!),
    queryFn: () => knowledgeApi.getBacklinks(pageId!),
    enabled: !!pageId,
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setBody(page.body);
      setIsDirty(false);
    }
  }, [page]);

  useEffect(() => {
    setBreadcrumbs([
      { label: "Knowledge", href: "/knowledge" },
      { label: page?.title ?? "Loading..." },
    ]);
  }, [setBreadcrumbs, page?.title]);

  const updatePage = useMutation({
    mutationFn: () =>
      knowledgeApi.update(pageId!, { title, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.detail(pageId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.list(selectedCompanyId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.revisions(pageId!) });
      setIsDirty(false);
    },
  });

  const archivePage = useMutation({
    mutationFn: () => knowledgeApi.archive(pageId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knowledge.list(selectedCompanyId!) });
      navigate("/knowledge");
    },
  });

  const handleBodyChange = useCallback((newBody: string) => {
    setBody(newBody);
    setIsDirty(true);
  }, []);

  if (isLoading || !page) {
    return <PageSkeleton variant="detail" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate("/knowledge")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setIsDirty(true);
          }}
          className="text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0"
          placeholder="Page title"
        />
        <div className="flex items-center gap-1 ml-auto">
          {isDirty && (
            <Button size="sm" onClick={() => updatePage.mutate()} disabled={updatePage.isPending}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              if (confirm("Archive this page?")) archivePage.mutate();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        <span className="font-mono">{page.slug}</span>
      </div>

      <Tabs defaultValue="edit" className="w-full">
        <TabsList>
          <TabsTrigger value="edit">
            <BookOpen className="h-3.5 w-3.5 mr-1" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-3.5 w-3.5 mr-1" />
            History ({revisions?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="backlinks">
            <Link2 className="h-3.5 w-3.5 mr-1" />
            Backlinks ({backlinks?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="mt-4">
          <div className="min-h-[400px] rounded-lg border border-border p-4">
            <MarkdownEditor
              value={body}
              onChange={handleBodyChange}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {revisions && revisions.length > 0 ? (
            <div className="rounded-lg border border-border divide-y divide-border">
              {revisions.map((rev) => (
                <div key={rev.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground">v{rev.revisionNumber}</span>
                  <span className="text-sm flex-1">{rev.changeSummary ?? "No description"}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No revision history.</p>
          )}
        </TabsContent>

        <TabsContent value="backlinks" className="mt-4">
          {backlinks && backlinks.length > 0 ? (
            <div className="rounded-lg border border-border divide-y divide-border">
              {backlinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => navigate(`/knowledge/${link.id}`)}
                  className="w-full px-4 py-3 flex items-center gap-2 hover:bg-accent/50 transition-colors text-left"
                >
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{link.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No pages link to this page.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
