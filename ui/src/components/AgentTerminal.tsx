import { useEffect, useRef, useState } from "react";
import { useCompany } from "../context/CompanyContext";
import { Terminal as TerminalIcon, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentTerminalProps {
  agentId: string;
  runId?: string;
}

/**
 * Live agent terminal that renders heartbeat.run.terminal events from WebSocket.
 * Uses a simple pre-based terminal view (no xterm.js dependency) for elegance.
 * Terminal output streams in real-time from the existing live events WebSocket.
 */
export function AgentTerminal({ agentId, runId }: AgentTerminalProps) {
  const { selectedCompanyId } = useCompany();
  const [lines, setLines] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const termRef = useRef<HTMLPreElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!selectedCompanyId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/companies/${selectedCompanyId}/events/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (
          data.type === "heartbeat.run.terminal" &&
          data.payload?.agentId === agentId &&
          (!runId || data.payload?.runId === runId)
        ) {
          setLines((prev) => {
            const next = [...prev, data.payload.output];
            // Keep last 500 lines to prevent memory issues
            return next.length > 500 ? next.slice(-500) : next;
          });
        }
        // Also capture log events as terminal output
        if (
          data.type === "heartbeat.run.log" &&
          data.payload?.agentId === agentId &&
          (!runId || data.payload?.runId === runId)
        ) {
          const message = data.payload.message ?? data.payload.text ?? "";
          if (message) {
            setLines((prev) => {
              const next = [...prev, message];
              return next.length > 500 ? next.slice(-500) : next;
            });
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [selectedCompanyId, agentId, runId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className={`rounded-lg border border-border bg-[#0a0a0a] ${expanded ? "fixed inset-4 z-50" : ""}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-[#111]">
        <TerminalIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Terminal</span>
        <div className={`h-2 w-2 rounded-full ml-1 ${connected ? "bg-green-500" : "bg-red-500"}`} />
        <span className="text-[10px] text-muted-foreground">{connected ? "connected" : "disconnected"}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto text-muted-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <pre
        ref={termRef}
        className={`p-3 overflow-auto font-mono text-xs text-green-400 leading-relaxed ${expanded ? "h-[calc(100%-2.5rem)]" : "h-64"}`}
      >
        {lines.length === 0 ? (
          <span className="text-muted-foreground">Waiting for agent output...</span>
        ) : (
          lines.map((line, i) => <div key={i}>{line}</div>)
        )}
      </pre>
    </div>
  );
}
