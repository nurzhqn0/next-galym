import Link from "next/link";
import { geoCentroid, geoEqualEarth, geoPath } from "d3-geo";
import { feature, merge, mesh } from "topojson-client";
import { presimplify, simplify } from "topojson-simplify";
import type { GeometryCollection, MultiPolygon, Objects, Polygon, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import { ALPHA2_TO_NUMERIC } from "@/lib/countries";

const NUMERIC_TO_ALPHA2 = Object.fromEntries(Object.entries(ALPHA2_TO_NUMERIC).map(([a, n]) => [n, a]));

// Countries missing from countries-110m: [lon, lat].
const MARKERS: Record<string, [number, number]> = { SG: [103.82, 1.35] };

// Drop detail finer than about 3px: the paths are sent three times (HTML and two flight copies).
const topology = simplify(presimplify(world as unknown as Topology<Objects<Record<string, never>>>), 0.3);
const countries = topology.objects.countries as GeometryCollection;
const land = countries.geometries.filter((g) => g.id !== "010") as (Polygon | MultiPolygon)[];
const projection = geoEqualEarth().fitSize([960, 500], feature(topology, { type: "GeometryCollection", geometries: land }));
const path = geoPath(projection).digits(0);

// Computed once per process. Countries under ~4 px² would be invisible as paths, so they get a marker.
const bordersD = path(mesh(topology, countries, (a, b) => a !== b && a.id !== "010" && b.id !== "010")) ?? "";
const features = new Map(
  land.flatMap((g) => {
    const code = NUMERIC_TO_ALPHA2[String(g.id)];
    if (!code) return [];
    const f = feature(topology, g);
    const c = projection(geoCentroid(f));
    return [[code, { g, d: path(f) ?? "", tiny: path.area(f) < 4, c }] as const];
  }),
);
const restCache = new Map<string, string>();

export function ApplicationsMap({
  counts,
  lang,
  labels,
}: {
  counts: { code: string; count: number }[];
  lang: string;
  labels: Record<string, string>;
}) {
  const countOf = new Map(counts.map((c) => [c.code, c.count]));
  const linked = [...features].filter(([code]) => countOf.has(code));
  const key = linked.map(([code]) => code).sort().join();
  let restD = restCache.get(key);
  if (restD === undefined) {
    const skip = new Set(linked.map(([, f]) => f.g));
    restD = path(merge(topology, land.filter((g) => !skip.has(g)))) ?? "";
    restCache.set(key, restD);
  }
  const stroke = { stroke: "var(--color-stock)", strokeWidth: 0.5, vectorEffect: "non-scaling-stroke" } as const;
  const markers = [
    ...linked.flatMap(([code, f]) => (f.tiny && f.c ? [{ code, x: Math.round(f.c[0]), y: Math.round(f.c[1]) }] : [])),
    ...Object.entries(MARKERS).flatMap(([code, lonLat]) => {
      const p = projection(lonLat);
      return p && countOf.has(code) ? [{ code, x: Math.round(p[0]), y: Math.round(p[1]) }] : [];
    }),
  ];
  const pts = new Map<string, [number, number]>();
  for (const [code, f] of linked) if (f.c) pts.set(code, f.c);
  for (const m of markers) pts.set(m.code, [m.x, m.y]);
  // Below sm: zoom to the linked countries (padded, 960:500, clamped, k <= 3).
  const xs = [...pts.values()].map((p) => p[0]);
  const ys = [...pts.values()].map((p) => p[1]);
  const w = pts.size
    ? Math.min(960, Math.max(320, Math.max(...xs) - Math.min(...xs) + 80, ((Math.max(...ys) - Math.min(...ys) + 80) * 960) / 500))
    : 960;
  const h = (w * 500) / 960;
  const bx = pts.size ? Math.min(960 - w, Math.max(0, (Math.min(...xs) + Math.max(...xs)) / 2 - w / 2)) : 0;
  const by = pts.size ? Math.min(500 - h, Math.max(0, (Math.min(...ys) + Math.max(...ys)) / 2 - h / 2)) : 0;
  const k = 960 / w;
  const hitRadius = (code: string, [x, y]: [number, number]) => {
    const near = Math.min(...[...pts].filter(([c]) => c !== code).map(([, q]) => Math.hypot(q[0] - x, q[1] - y) / 2));
    return Math.min(22 / ((288 / 960) * k), near);
  };
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const href = (code: string) => `/${lang}/applications?country=${code}`;
  const item = (code: string, shape: (fill: string) => React.ReactNode) => {
    const fill = `fill-ink group-hover:fill-ink-deep group-focus-visible:fill-ink-deep motion-safe:transition-[fill] duration-150`;
    return (
      <Link key={code} href={href(code)} data-code={code} prefetch={false} scroll={false} tabIndex={-1} className="group">
        <title>{`${labels[code] ?? code} — ${countOf.get(code)}`}</title>
        {shape(fill)}
      </Link>
    );
  };
  return (
    <svg data-map viewBox="0 0 960 500" className="mb-6 h-auto w-full" aria-hidden="true">
      <g
        className="max-sm:[transform:translate(calc(var(--tx)*1px),calc(var(--ty)*1px))_scale(var(--k))]"
        style={
          {
            "--tx": round1(-bx * k),
            "--ty": round1(-by * k),
            "--k": Math.round(k * 1000) / 1000,
            "--ki": Math.round(1000 / k) / 1000,
          } as React.CSSProperties
        }
      >
        <path d={restD} fill="var(--color-stock-deep)" />
        <path d={bordersD} fill="none" {...stroke} />
        {[...pts].map(([code, [x, y]]) => (
          <Link key={code} href={href(code)} data-code={code} prefetch={false} scroll={false} tabIndex={-1}>
            <circle cx={round1(x)} cy={round1(y)} r={round1(hitRadius(code, [x, y]))} fill="transparent" className="sm:pointer-events-none" />
          </Link>
        ))}
        {linked.flatMap(([code, f]) => (f.tiny ? [] : [item(code, (fill) => <path d={f.d} className={fill} {...stroke} />)]))}
        {markers.map(({ code, x, y }) =>
          item(code, (fill) => (
            <g transform={`translate(${x} ${y})`}>
              <circle r={6} className={`${fill} max-sm:[transform:scale(var(--ki))]`} {...stroke} />
            </g>
          )),
        )}
      </g>
    </svg>
  );
}
