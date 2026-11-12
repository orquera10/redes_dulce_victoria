export type BgStyle = "bakery" | "botanical" | "waves" | "hearts" | "clean";
export type TextFrameStyle = "brush" | "scalloped" | "heart-label" | "ribbon" | "none";
export type SeparatorStyle = "none" | "leaves-heart" | "dots-heart" | "swirl-heart";

export type PastelPalette = {
  id: string;
  label: string;
  bg: string;
  wave: string;
  accent: string;
  text: string;
};

export const STORY_W = 1080;
export const STORY_H = 1920;

export const PASTEL_PALETTES: PastelPalette[] = [
  {
    id: "dulce-victoria",
    label: "Rosa Dulce",
    bg: "#f8f4e9",
    wave: "#f1dfda",
    accent: "#bd807d",
    text: "#563a2a",
  },
  {
    id: "lavanda",
    label: "Lavanda",
    bg: "#f7f4fb",
    wave: "#e7ddf3",
    accent: "#9a7fb8",
    text: "#48365c",
  },
  {
    id: "menta",
    label: "Menta",
    bg: "#f2faf7",
    wave: "#d6ede4",
    accent: "#6aa392",
    text: "#2c4c43",
  },
  {
    id: "durazno",
    label: "Durazno",
    bg: "#fdf6f1",
    wave: "#f6dfd2",
    accent: "#d9896b",
    text: "#5a3829",
  },
  {
    id: "celeste",
    label: "Celeste",
    bg: "#f3f8fc",
    wave: "#dae9f6",
    accent: "#729ec4",
    text: "#2e445c",
  },
  {
    id: "vainilla",
    label: "Vainilla",
    bg: "#fdfaf0",
    wave: "#f4e7c6",
    accent: "#c99951",
    text: "#524024",
  },
];

export type BakeryIconPlacement = {
  kind: "cupcake" | "slice" | "cake" | "piping" | "whisk" | "rolling";
  x: number;
  y: number;
  scale: number;
  rotate: number;
};

export const BAKERY_PLACEMENTS: BakeryIconPlacement[] = [
  { kind: "cupcake", x: 108, y: 122, scale: 1.35, rotate: -10 },
  { kind: "whisk", x: 965, y: 126, scale: 1.3, rotate: 18 },
  { kind: "piping", x: 92, y: 318, scale: 1.15, rotate: -16 },
  { kind: "slice", x: 982, y: 320, scale: 1.2, rotate: 10 },
  { kind: "cake", x: 105, y: 1785, scale: 1.35, rotate: -7 },
  { kind: "rolling", x: 966, y: 1790, scale: 1.35, rotate: 14 },
];

type IconShape = {
  fills: string[];
  strokes: string[];
};

// All icons live in a centered -32..32 x -32..32 box for clean rotation/scaling in both SVG and Canvas
export const BAKERY_ICONS: Record<BakeryIconPlacement["kind"], IconShape> = {
  cupcake: {
    fills: [
      "M-16,4 L16,4 L12,24 C11,26 -11,26 -12,24 Z",
      "M-18,4 C-21,-4 -13,-10 -8,-10 C-7,-18 0,-24 4,-25 C3,-19 10,-16 14,-10 C19,-8 20,0 16,4 Z",
    ],
    strokes: [
      "M-16,4 L16,4 L12,24 C11,26 -11,26 -12,24 Z",
      "M-8,4 L-6,24 M0,4 L0,25 M8,4 L6,24",
      "M-18,4 C-21,-4 -13,-10 -8,-10 C-7,-18 0,-24 4,-25 C3,-19 10,-16 14,-10 C19,-8 20,0 16,4 Z",
      "M-11,-3 C-5,-6 5,-6 11,-2",
    ],
  },
  slice: {
    fills: [
      "M-22,2 L18,-10 L20,18 L-22,22 Z",
      "M-22,2 L2,-14 L18,-10 L-22,2 Z",
    ],
    strokes: [
      "M-22,2 L18,-10 L20,18 L-22,22 Z",
      "M-22,2 L2,-14 L18,-10",
      "M-22,10 L19,1 M-22,16 L19,10",
      "M2,-18 A4.5,4.5 0 1,1 2,-9 A4.5,4.5 0 1,1 2,-18",
      "M3,-18 C5,-24 9,-26 12,-25",
    ],
  },
  cake: {
    fills: [
      "M-20,-2 L20,-2 L20,18 L-20,18 Z",
    ],
    strokes: [
      "M-25,18 L25,18 C22,23 -22,23 -25,18 Z",
      "M-20,-2 L20,-2 L20,18 L-20,18 Z",
      "M-20,5 C-14,10 -7,10 0,5 C7,10 14,10 20,5",
      "M-10,-2 L-10,-12 M0,-2 L0,-14 M10,-2 L10,-12",
      "M-10,-16 C-8,-20 -12,-20 -10,-16 M0,-18 C2,-22 -2,-22 0,-18 M10,-16 C12,-20 8,-20 10,-16",
    ],
  },
  piping: {
    fills: [
      "M-16,18 L-2,-12 L12,2 Z",
    ],
    strokes: [
      "M-16,18 L-2,-12 L12,2 Z",
      "M-2,-12 C2,-20 10,-22 14,-16 C18,-12 16,-4 12,2",
      "M2,-16 L6,-22 M9,-12 L16,-16 M12,-5 L18,-6",
      "M-16,18 L-21,23",
    ],
  },
  whisk: {
    fills: [
      "M-16,12 L-4,0 L0,4 L-12,16 C-15,18 -18,15 -16,12 Z",
    ],
    strokes: [
      "M-16,12 L-4,0 L0,4 L-12,16 C-15,18 -18,15 -16,12 Z",
      "M-2,2 C6,-18 22,-22 20,-8 C18,6 2,10 -2,2 Z",
      "M-2,2 C2,-10 16,-18 19,-11 M-2,2 C8,-2 17,-4 19,-11",
    ],
  },
  rolling: {
    fills: [
      "M-15,-9 L15,-9 L15,9 L-15,9 Z",
    ],
    strokes: [
      "M-15,-9 L15,-9 L15,9 L-15,9 Z",
      "M-15,-3 L-23,-3 C-26,-3 -26,3 -23,3 L-15,3",
      "M15,-3 L23,-3 C26,-3 26,3 23,3 L15,3",
    ],
  },
};

export const SPARKLE_POINTS: Array<[number, number, number]> = [
  [215, 92, 13],
  [865, 96, 13],
  [208, 226, 9],
  [872, 224, 9],
  [188, 1730, 11],
  [892, 1730, 11],
];

export const HEART_POINTS_BAKERY: Array<[number, number, number, boolean]> = [
  [265, 168, 20, false],
  [815, 168, 20, false],
  [235, 1842, 22, true],
  [845, 1842, 22, true],
];

export function drawHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  stroke: string,
  fill?: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.3);
  ctx.bezierCurveTo(size * 0.55, -size * 0.25, size * 0.95, size * 0.35, 0, size * 0.95);
  ctx.bezierCurveTo(-size * 0.95, size * 0.35, -size * 0.55, -size * 0.25, 0, size * 0.3);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  } else {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(2, size * 0.12);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  stroke: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.6;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.quadraticCurveTo(0, 0, 0, r);
  ctx.quadraticCurveTo(0, 0, -r, 0);
  ctx.quadraticCurveTo(0, 0, 0, -r);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

// Solid botanical sprig (adapted from user's first botanical reference)
export const FILLED_SPRIG_STEM = "M0,44 C0,14 8,-14 26,-42";
export const FILLED_SPRIG_LEAVES = [
  "M3,26 C15,24 23,14 25,6 C15,8 7,16 3,26 Z",
  "M1,14 C-11,10 -19,0 -20,-10 C-10,-6 -2,4 1,14 Z",
  "M7,4 C19,2 28,-8 30,-18 C19,-16 11,-6 7,4 Z",
  "M8,-10 C-4,-14 -11,-24 -12,-34 C-2,-30 5,-20 8,-10 Z",
  "M15,-20 C26,-22 34,-31 36,-40 C26,-38 19,-29 15,-20 Z",
  "M22,-34 C14,-40 12,-50 14,-58 C22,-51 24,-42 22,-34 Z",
  "M26,-42 C32,-50 38,-56 44,-60 C41,-50 34,-44 26,-42 Z",
];

// Outlined 3-sprig cluster (adapted from user's second botanical reference)
export const CLUSTER_SPRIGS: Array<{ x: number; y: number; rot: number; scale: number }> = [
  { x: -34, y: 26, rot: -48, scale: 0.72 },
  { x: 0, y: 28, rot: -12, scale: 0.96 },
  { x: 34, y: 26, rot: 26, scale: 0.85 },
];

export function drawFilledBotanicalSprig(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angleDeg: number,
  scale: number,
  color: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.globalAlpha = 0.68;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4.2;
  ctx.lineCap = "round";
  ctx.stroke(new Path2D(FILLED_SPRIG_STEM));
  ctx.fillStyle = color;
  for (const d of FILLED_SPRIG_LEAVES) {
    ctx.fill(new Path2D(d));
  }
  ctx.restore();
}

export function drawOutlinedBotanicalCluster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  stroke: string,
  fill: string,
  accent: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = 0.82;
  for (const sp of CLUSTER_SPRIGS) {
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate((sp.rot * Math.PI) / 180);
    ctx.scale(sp.scale, sp.scale);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    ctx.stroke(new Path2D(FILLED_SPRIG_STEM));
    ctx.fillStyle = fill;
    ctx.lineWidth = 2.6;
    for (const d of FILLED_SPRIG_LEAVES) {
      const p = new Path2D(d);
      ctx.fill(p);
      ctx.stroke(p);
    }
    ctx.restore();
  }
  drawHeart(ctx, 22, -46, 20, accent, accent);
  drawSparkle(ctx, -56, -34, 11, stroke);
  drawSparkle(ctx, -40, -14, 8, stroke);
  ctx.restore();
}

export function drawStoryBackgroundCanvas(
  ctx: CanvasRenderingContext2D,
  bgStyle: BgStyle,
  palette: PastelPalette
) {
  // Base background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  // Soft corner waves
  ctx.fillStyle = palette.wave;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(430, 0);
  ctx.bezierCurveTo(335, 175, 165, 185, 0, 325);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(STORY_W, 0);
  ctx.lineTo(STORY_W - 350, 0);
  ctx.bezierCurveTo(STORY_W - 250, 125, STORY_W - 125, 180, STORY_W, 270);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, STORY_H);
  ctx.lineTo(0, STORY_H - 310);
  ctx.bezierCurveTo(220, STORY_H - 215, 395, STORY_H - 120, 560, STORY_H);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(STORY_W, STORY_H);
  ctx.lineTo(STORY_W, STORY_H - 340);
  ctx.bezierCurveTo(STORY_W - 210, STORY_H - 255, STORY_W - 355, STORY_H - 125, STORY_W - 530, STORY_H);
  ctx.closePath();
  ctx.fill();

  if (bgStyle === "clean") return;

  // Subtle accent wave contour
  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 360);
  ctx.bezierCurveTo(175, 215, 360, 185, 465, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(STORY_W, STORY_H - 370);
  ctx.bezierCurveTo(STORY_W - 205, STORY_H - 245, STORY_W - 350, STORY_H - 130, STORY_W - 565, STORY_H);
  ctx.stroke();
  ctx.restore();

  if (bgStyle === "bakery") {
    for (const item of BAKERY_PLACEMENTS) {
      const icon = BAKERY_ICONS[item.kind];
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate((item.rotate * Math.PI) / 180);
      ctx.scale(item.scale, item.scale);
      ctx.fillStyle = palette.wave;
      for (const d of icon.fills) {
        ctx.fill(new Path2D(d));
      }
      ctx.strokeStyle = palette.text;
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const d of icon.strokes) {
        ctx.stroke(new Path2D(d));
      }
      ctx.restore();
    }
    for (const [sx, sy, sr] of SPARKLE_POINTS) {
      drawSparkle(ctx, sx, sy, sr, palette.accent);
    }
    for (const [hx, hy, hs, filled] of HEART_POINTS_BAKERY) {
      drawHeart(ctx, hx, hy, hs, palette.accent, filled ? palette.accent : undefined);
    }
    return;
  }

  if (bgStyle === "botanical") {
    drawFilledBotanicalSprig(ctx, 92, 148, 18, 1.55, palette.text);
    drawFilledBotanicalSprig(ctx, STORY_W - 92, 148, -18, 1.55, palette.text);
    drawOutlinedBotanicalCluster(ctx, 118, STORY_H - 135, 1.35, palette.text, palette.bg, palette.accent);
    drawOutlinedBotanicalCluster(ctx, STORY_W - 118, STORY_H - 135, 1.35, palette.text, palette.bg, palette.accent);
    drawSparkle(ctx, 210, 96, 12, palette.accent);
    drawSparkle(ctx, STORY_W - 210, 96, 12, palette.accent);
    drawHeart(ctx, 265, 195, 22, palette.accent);
    drawHeart(ctx, STORY_W - 265, 195, 22, palette.accent);
    return;
  }

  if (bgStyle === "waves") {
    const drawBurst = (cx: number, cy: number, dir: 1 | -1) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(dir, 1);
      [-0.4, 0, 0.4].forEach((angle) => {
        ctx.save();
        ctx.rotate(angle);
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(32, 0);
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    };
    drawBurst(285, 136, -1);
    drawBurst(STORY_W - 285, 136, 1);
    drawHeart(ctx, 118, 290, 28, palette.accent);
    drawHeart(ctx, STORY_W - 118, 290, 28, palette.accent);
    drawHeart(ctx, STORY_W / 2, STORY_H - 178, 24, palette.accent, palette.accent);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(STORY_W / 2 - 140, STORY_H - 166);
    ctx.lineTo(STORY_W / 2 - 42, STORY_H - 166);
    ctx.moveTo(STORY_W / 2 + 42, STORY_H - 166);
    ctx.lineTo(STORY_W / 2 + 140, STORY_H - 166);
    ctx.stroke();
    return;
  }

  if (bgStyle === "hearts") {
    drawHeart(ctx, 118, 265, 32, palette.accent);
    drawHeart(ctx, 218, 165, 20, palette.accent, palette.wave);
    drawHeart(ctx, STORY_W - 118, 265, 32, palette.accent);
    drawHeart(ctx, STORY_W - 218, 165, 20, palette.accent, palette.wave);
    drawHeart(ctx, 96, STORY_H - 210, 30, palette.accent);
    drawHeart(ctx, STORY_W - 96, STORY_H - 210, 30, palette.accent);
    for (const [sx, sy, sr] of SPARKLE_POINTS) {
      drawSparkle(ctx, sx, sy, sr, palette.accent);
    }
  }
}

export function drawTextFrameCanvas(
  ctx: CanvasRenderingContext2D,
  frame: TextFrameStyle,
  tx: number,
  ty: number,
  scaleFactor: number,
  palette: PastelPalette
) {
  if (frame === "none") return;
  ctx.save();
  ctx.translate(tx, ty);
  ctx.scale(scaleFactor, scaleFactor);

  if (frame === "brush") {
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = palette.wave;
    ctx.beginPath();
    ctx.roundRect(-330, -105, 660, 215, 100);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (frame === "scalloped") {
    // Scalloped/bracketed label with dashed inner border (inspired by top-left reference)
    ctx.shadowColor = "rgba(73, 43, 38, 0.1)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = "#fffefa";
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.roundRect(-340, -112, 680, 224, 52);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.stroke();

    ctx.setLineDash([12, 9]);
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.roundRect(-322, -96, 644, 192, 40);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }

  if (frame === "heart-label") {
    // Double-bordered cream label with top heart (inspired by top-center reference)
    ctx.shadowColor = "rgba(73, 43, 38, 0.1)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = palette.bg;
    ctx.strokeStyle = palette.text;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-340, -108, 680, 216, 36);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.stroke();

    ctx.strokeStyle = palette.wave;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(-324, -93, 648, 186, 26);
    ctx.stroke();

    drawHeart(ctx, 0, -124, 24, palette.accent, palette.wave);
    drawHeart(ctx, 0, -124, 24, palette.accent);
    ctx.restore();
    return;
  }

  if (frame === "ribbon") {
    // Pastel ribbon banner with notched tails (inspired by banner reference)
    ctx.shadowColor = "rgba(73, 43, 38, 0.12)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 5;
    // Left & right ribbon tails
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    ctx.moveTo(-360, -76);
    ctx.lineTo(-270, -76);
    ctx.lineTo(-270, 96);
    ctx.lineTo(-360, 96);
    ctx.lineTo(-330, 10);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(360, -76);
    ctx.lineTo(270, -76);
    ctx.lineTo(270, 96);
    ctx.lineTo(360, 96);
    ctx.lineTo(330, 10);
    ctx.closePath();
    ctx.fill();

    // Main center banner
    ctx.fillStyle = palette.wave;
    ctx.beginPath();
    ctx.roundRect(-300, -100, 600, 200, 24);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
}

export function drawSeparatorCanvas(
  ctx: CanvasRenderingContext2D,
  sep: SeparatorStyle,
  cx: number,
  cy: number,
  scaleFactor: number,
  palette: PastelPalette
) {
  if (sep === "none") return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scaleFactor, scaleFactor);

  if (sep === "leaves-heart") {
    // Outward horizontal leaf sprigs flanking central outlined heart
    drawHeart(ctx, 0, -14, 28, palette.accent, palette.wave);
    drawHeart(ctx, 0, -14, 28, palette.accent);

    const drawSideSprig = (dir: 1 | -1) => {
      ctx.save();
      ctx.scale(dir, 1);
      ctx.strokeStyle = palette.text;
      ctx.fillStyle = palette.bg;
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(42, 0);
      ctx.lineTo(155, 0);
      ctx.stroke();
      const leaves: Array<[number, number, number]> = [
        [68, 0, -38],
        [72, 0, 38],
        [102, 0, -34],
        [106, 0, 34],
        [136, 0, -28],
        [140, 0, 28],
        [168, 0, 0],
      ];
      for (const [lx, ly, rot] of leaves) {
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate((rot * Math.PI) / 180);
        ctx.beginPath();
        ctx.ellipse(12, 0, 12, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    };
    drawSideSprig(-1);
    drawSideSprig(1);
    ctx.restore();
    return;
  }

  if (sep === "dots-heart") {
    // Horizontal lines + dots + central outlined heart
    ctx.strokeStyle = palette.text;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-190, 0);
    ctx.lineTo(-68, 0);
    ctx.moveTo(68, 0);
    ctx.lineTo(190, 0);
    ctx.stroke();

    ctx.fillStyle = palette.text;
    ctx.beginPath();
    ctx.arc(-48, 0, 5.5, 0, Math.PI * 2);
    ctx.arc(48, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();

    drawHeart(ctx, 0, -14, 28, palette.accent, palette.wave);
    drawHeart(ctx, 0, -14, 28, palette.accent);
    ctx.restore();
    return;
  }

  if (sep === "swirl-heart") {
    // Continuous flowing ribbon flourish looping into a central heart
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 4.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(
      new Path2D(
        "M-220,12 C-150,-14 -80,28 -18,12 C8,5 22,-18 8,-28 C-2,-34 -12,-24 -2,-14 C10,-24 0,-34 -10,-28 C-24,-18 -10,5 18,12 C80,28 150,-14 220,12"
      )
    );
    ctx.restore();
  }
}
