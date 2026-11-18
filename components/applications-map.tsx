import Link from "next/link";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import { ALPHA2_TO_NUMERIC } from "@/lib/countries";

const NUMERIC_TO_ALPHA2 = Object.fromEntries(Object.entries(ALPHA2_TO_NUMERIC).map(([a, n]) => [n, a]));

// Computed once per process.
let shapes: { code?: string; d: string }[] | undefined;
function getShapes() {
  if (!shapes) {
    const topology = world as unknown as Topology;
    const all = feature(topology, topology.objects.countries as GeometryCollection);
    const collection = { ...all, features: all.features.filter((f) => f.id !== "010") };
    const path = geoPath(geoEqualEarth().fitSize([960, 500], collection)).digits(1);
    shapes = collection.features.flatMap((f) => {
      const d = path(f);
      return d ? [{ code: NUMERIC_TO_ALPHA2[String(f.id)], d }] : [];
    });
  }
  return shapes;
}

export function ApplicationsMap({
  counts,
  selected,
  lang,
  labels,
}: {
  counts: { code: string; count: number }[];
  selected?: string;
  lang: string;
  labels: Record<string, string>;
}) {
  const countOf = new Map(counts.map((c) => [c.code, c.count]));
  const stroke = { stroke: "var(--color-stock)", strokeWidth: 0.5, vectorEffect: "non-scaling-stroke" } as const;
  return (
    <svg viewBox="0 0 960 500" className="mb-6 h-auto w-full" aria-hidden="true">
      {getShapes().map(({ code, d }, i) => {
        const count = code ? countOf.get(code) : undefined;
        if (!code || count === undefined) {
          return <path key={i} d={d} fill="var(--color-stock-deep)" {...stroke} />;
        }
        const active = code === selected;
        return (
          <Link key={i} href={`/${lang}/applications${active ? "" : `?country=${code}`}`} scroll={false} tabIndex={-1} className="group">
            <title>{`${labels[code] ?? code} — ${count}`}</title>
            <path
              d={d}
              className={`${active ? "fill-ink-deep" : "fill-ink"} group-hover:fill-ink-deep group-focus-visible:fill-ink-deep`}
              {...stroke}
            />
          </Link>
        );
      })}
    </svg>
  );
}
