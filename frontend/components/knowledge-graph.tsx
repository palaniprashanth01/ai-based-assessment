"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Network } from "lucide-react";
import type { GraphEdge, GraphNode } from "@/lib/types";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

// Navigate-aligned palette: lime is the primary accent; everything else stays
// in the cream/desaturated range to keep contrast against the black canvas.
const TYPE_COLORS: Record<string, string> = {
  person: "#fdf9f0",
  organization: "#a3b8ff",
  concept: "#c7ff69",
  location: "#ffd166",
  event: "#ef9bd8",
  artifact: "#7adfe6",
};

export function KnowledgeGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState({ width: 600, height: 480 });

  React.useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ width: r.width, height: Math.max(420, r.width * 0.65) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const data = React.useMemo(
    () => ({
      nodes: nodes.map((n) => ({ ...n, color: TYPE_COLORS[n.type ?? "concept"] ?? "#fdf9f0" })),
      links: edges.map((e) => ({ source: e.source, target: e.target, label: e.relation })),
    }),
    [nodes, edges],
  );

  // Empty-state — required by component rules.
  if (nodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Network className="h-4 w-4 text-primary" />
            Knowledge graph
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-sm border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No entities extracted from this document.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Network className="h-4 w-4 text-primary" />
          Knowledge graph
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {nodes.length} nodes · {edges.length} edges
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="overflow-hidden rounded-sm border border-border bg-black">
          <ForceGraph2D
            graphData={data}
            width={size.width}
            height={size.height}
            backgroundColor="#000000"
            nodeLabel={(n) => `${(n as GraphNode).label}${(n as GraphNode).type ? ` (${(n as GraphNode).type})` : ""}`}
            linkLabel={(l) => (l as { label: string }).label}
            linkColor={() => "rgba(253, 249, 240, 0.25)"}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.15}
            nodeCanvasObject={(node, ctx, scale) => {
              const n = node as GraphNode & { x: number; y: number; color: string };
              const label = n.label;
              const fontSize = 11 / scale;
              ctx.beginPath();
              ctx.arc(n.x, n.y, 5, 0, 2 * Math.PI, false);
              ctx.fillStyle = n.color;
              ctx.fill();
              ctx.font = `500 ${fontSize}px Space Grotesk, Aeonik, sans-serif`;
              ctx.fillStyle = "#fdf9f0";
              ctx.textAlign = "center";
              ctx.fillText(label, n.x, n.y + 12);
            }}
            cooldownTicks={120}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-xs capitalize text-muted-foreground"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              {type}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
