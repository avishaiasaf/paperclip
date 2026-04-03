import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { agentTemplatesApi } from "../api/agent-templates";
import { useCompany } from "../context/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, Code, Target, Palette, Shield, BarChart, DollarSign, Megaphone, Settings, BookOpen } from "lucide-react";
import type { AgentTemplate, AgentTemplateDepartment } from "@paperclipai/shared";

const DEPT_ICONS: Record<string, React.ElementType> = {
  executive: Target,
  engineering: Code,
  product: BookOpen,
  design: Palette,
  devops: Settings,
  marketing: Megaphone,
  sales: BarChart,
  hr: Users,
  finance: DollarSign,
  operations: Settings,
  security: Shield,
  analytics: BarChart,
};

const DEPT_LABELS: Record<string, string> = {
  executive: "Executive",
  engineering: "Engineering",
  product: "Product",
  design: "Design",
  devops: "DevOps",
  marketing: "Marketing",
  sales: "Sales",
  hr: "HR",
  finance: "Finance",
  operations: "Operations",
  security: "Security",
  analytics: "Analytics",
};

interface AgentTemplatePickerProps {
  onSelect: (template: AgentTemplate) => void;
}

export function AgentTemplatePicker({ onSelect }: AgentTemplatePickerProps) {
  const { selectedCompanyId } = useCompany();
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const { data: templates } = useQuery({
    queryKey: ["agent-templates", selectedCompanyId],
    queryFn: () => agentTemplatesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const filtered = (templates ?? []).filter((t) => {
    if (selectedDept && t.department !== selectedDept) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.role.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const departments = [...new Set((templates ?? []).map((t) => t.department))].sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search templates..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant={selectedDept === null ? "default" : "outline"} onClick={() => setSelectedDept(null)}>
          All
        </Button>
        {departments.map((dept) => {
          const Icon = DEPT_ICONS[dept] ?? Users;
          return (
            <Button key={dept} size="sm" variant={selectedDept === dept ? "default" : "outline"} onClick={() => setSelectedDept(dept)}>
              <Icon className="h-3.5 w-3.5 mr-1" />
              {DEPT_LABELS[dept] ?? dept}
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((template) => {
          const Icon = DEPT_ICONS[template.department] ?? Users;
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="text-left rounded-lg border border-border p-4 hover:bg-accent/50 hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{template.name}</span>
                {template.isBuiltIn && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-accent text-muted-foreground ml-auto">Built-in</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{template.title ?? template.role}</p>
              <span className="inline-block mt-2 text-[11px] px-1.5 py-0.5 rounded bg-accent/50 text-muted-foreground">
                {DEPT_LABELS[template.department] ?? template.department}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No templates match your filters.</p>
      )}
    </div>
  );
}
