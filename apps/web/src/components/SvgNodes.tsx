import type { ZuNode } from '@ziklub/zu';
import { Fragment } from 'react';

/** Renders the shared drawing nodes from @ziklub/zu as SVG elements. */
export function SvgNodes({ nodes }: { nodes: ZuNode[] }) {
  return (
    <>
      {nodes.map((n, i) => (
        <SvgNode key={i} n={n} />
      ))}
    </>
  );
}

function SvgNode({ n }: { n: ZuNode }) {
  switch (n.t) {
    case 'path':
      return (
        <path
          d={n.d}
          fill={n.fill}
          stroke={n.stroke}
          strokeWidth={n.sw}
          strokeLinecap={n.cap}
          strokeLinejoin={n.stroke ? 'round' : undefined}
          strokeDasharray={n.dash}
          opacity={n.opacity}
        />
      );
    case 'circle':
      return <circle cx={n.cx} cy={n.cy} r={n.r} fill={n.fill} stroke={n.stroke} strokeWidth={n.sw} opacity={n.opacity} />;
    case 'ellipse':
      return <ellipse cx={n.cx} cy={n.cy} rx={n.rx} ry={n.ry} fill={n.fill} opacity={n.opacity} />;
    case 'rect':
      return <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={n.rx} fill={n.fill} stroke={n.stroke} strokeWidth={n.sw} />;
    case 'text':
      return (
        <text x={n.x} y={n.y} fontSize={n.size} fill={n.fill} textAnchor={n.anchor} fontFamily="Sniglet, 'Arial Rounded MT Bold', sans-serif" fontWeight={800}>
          {n.text}
        </text>
      );
    case 'g':
      return (
        <g transform={n.transform}>
          <SvgNodes nodes={n.children} />
        </g>
      );
    case 'clip':
      return (
        <Fragment>
          <clipPath id={n.id}>
            <path d={n.d} />
          </clipPath>
          <g clipPath={`url(#${n.id})`}>
            <SvgNodes nodes={n.children} />
          </g>
        </Fragment>
      );
  }
}
