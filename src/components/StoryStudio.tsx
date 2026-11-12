import {
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Download,
  ImagePlus,
  Move,
  RotateCcw,
  Share2,
  Sparkles,
  Type,
  Upload,
} from "lucide-react";

type StoryStudioProps = {
  onNotify: (message: string, duration?: number) => void;
};

type Point = { x: number; y: number };
type Size = { w: number; h: number };

type SlotState = {
  url: string | null;
  natural: Size;
  zoom: number;
  pan: Point;
};

type SlotRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  rotateDeg: number;
};

type BgStyle = "waves" | "botanical" | "hearts" | "clean";
type FrameStyle = "polaroid" | "tape" | "soft";
type PhotoCount = 1 | 2 | 3;

const STORY_W = 1080;
const STORY_H = 1920;

const LAYOUTS: Record<PhotoCount, SlotRect[]> = {
  1: [{ x: 0.09, y: 0.36, w: 0.82, h: 0.44, rotateDeg: -1.2 }],
  2: [
    { x: 0.08, y: 0.34, w: 0.84, h: 0.25, rotateDeg: -2.0 },
    { x: 0.08, y: 0.61, w: 0.84, h: 0.25, rotateDeg: 1.6 },
  ],
  3: [
    { x: 0.11, y: 0.335, w: 0.78, h: 0.275, rotateDeg: -1.5 },
    { x: 0.05, y: 0.625, w: 0.44, h: 0.235, rotateDeg: 2.2 },
    { x: 0.51, y: 0.625, w: 0.44, h: 0.235, rotateDeg: -1.8 },
  ],
};

const TEXT_PRESETS: Array<{ label: string; top: string; script: string }> = [
  { label: "Pedidos del día", top: "Pedidos del día", script: "de hoy" },
  { label: "Cumpleaños", top: "Feliz", script: "Cumpleaños" },
  { label: "Torta", top: "Torta", script: "Chajá" },
  { label: "Mini Tortas", top: "Especial", script: "Mini Tortas" },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function emptySlot(): SlotState {
  return { url: null, natural: { w: 0, h: 0 }, zoom: 1, pan: { x: 0, y: 0 } };
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  stroke = "#c98b88",
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
    ctx.lineWidth = Math.max(2, size * 0.11);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }
  ctx.restore();
}

function drawBurst(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dir: 1 | -1,
  scale = 1
) {
  const colors = ["#d89a95", "#9dbdc2", "#e8c48d"];
  const angles = [-0.42, 0, 0.42];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(dir * scale, scale);
  angles.forEach((angle, idx) => {
    ctx.save();
    ctx.rotate(angle);
    ctx.strokeStyle = colors[idx];
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(36, 0);
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

function drawLeafTwig(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angleDeg: number,
  scale = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "#8a5a52";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(40, -60, 105, -135);
  ctx.stroke();

  const leaves = [
    { lx: 28, ly: -38, rot: -35 },
    { lx: 56, ly: -74, rot: 35 },
    { lx: 78, ly: -102, rot: -32 },
    { lx: 102, ly: -132, rot: 12 },
  ];
  leaves.forEach(({ lx, ly, rot }) => {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.fillStyle = "rgba(232, 188, 184, 0.45)";
    ctx.strokeStyle = "#8a5a52";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(18, 0, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
}

export function StoryStudio({ onNotify }: StoryStudioProps) {
  const [photoCount, setPhotoCount] = useState<PhotoCount>(3);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [slots, setSlots] = useState<SlotState[]>([emptySlot(), emptySlot(), emptySlot()]);

  const [bgStyle, setBgStyle] = useState<BgStyle>("waves");
  const [frameStyle, setFrameStyle] = useState<FrameStyle>("polaroid");

  const [logoPos, setLogoPos] = useState<Point>({ x: 0.5, y: 0.115 });
  const [logoScalePct, setLogoScalePct] = useState(24);

  const [titleTop, setTitleTop] = useState("Pedidos del día");
  const [titleScript, setTitleScript] = useState("de hoy");
  const [footerText, setFooterText] = useState("");
  const [hasBrushBg, setHasBrushBg] = useState(true);
  const [textPos, setTextPos] = useState<Point>({ x: 0.5, y: 0.255 });
  const [textScalePct, setTextScalePct] = useState(100);

  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState<Size>({ w: 320, h: 568 });
  const [isExporting, setIsExporting] = useState(false);
  const [liveStatus, setLiveStatus] = useState("");

  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetSlotRef = useRef(0);
  const slotImagesRef = useRef<(HTMLImageElement | null)[]>([null, null, null]);
  const slotDragDepthRef = useRef<Record<number, number>>({});

  const dragOriginRef = useRef<{
    kind: "slot" | "logo" | "text";
    slotIndex?: number;
    pointerId: number;
    startX: number;
    startY: number;
    startPan?: Point;
    startPos?: Point;
  } | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize({ w: rect.width, h: rect.height });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const preventDropNav = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types?.includes("Files")) {
        event.preventDefault();
      }
    };
    window.addEventListener("dragover", preventDropNav);
    window.addEventListener("drop", preventDropNav);
    return () => {
      window.removeEventListener("dragover", preventDropNav);
      window.removeEventListener("drop", preventDropNav);
    };
  }, []);

  const loadSlotFile = (slotIdx: number, file: File) => {
    if (!file.type.startsWith("image/")) {
      onNotify("Seleccioná una imagen válida (JPG, PNG o WebP).");
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      slotImagesRef.current[slotIdx] = probe;
      setSlots((prev) => {
        const oldUrl = prev[slotIdx]?.url;
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        return prev.map((slot, idx) =>
          idx === slotIdx
            ? {
                url: nextUrl,
                natural: { w: probe.naturalWidth, h: probe.naturalHeight },
                zoom: 1,
                pan: { x: 0, y: 0 },
              }
            : slot
        );
      });
      setSelectedSlot(slotIdx);
      setLiveStatus(`Foto ${slotIdx + 1} cargada.`);
      onNotify(`Foto ${slotIdx + 1} cargada. Podés moverla dentro del marco.`);
    };
    probe.onerror = () => {
      URL.revokeObjectURL(nextUrl);
      onNotify("No pudimos leer esa imagen.");
    };
    probe.src = nextUrl;
  };

  const triggerUploadForSlot = (slotIdx: number) => {
    uploadTargetSlotRef.current = slotIdx;
    setSelectedSlot(slotIdx);
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    loadSlotFile(uploadTargetSlotRef.current, file);
    event.target.value = "";
  };

  const getSlotCoverMetrics = (
    natural: Size,
    frameW: number,
    frameH: number,
    zoom: number
  ) => {
    if (natural.w <= 0 || natural.h <= 0 || frameW <= 0 || frameH <= 0) {
      return { dispW: frameW, dispH: frameH, maxPanX: 0, maxPanY: 0 };
    }
    const scale = Math.max(frameW / natural.w, frameH / natural.h) * zoom;
    const dispW = natural.w * scale;
    const dispH = natural.h * scale;
    return {
      dispW,
      dispH,
      maxPanX: Math.max(0, (dispW - frameW) / 2),
      maxPanY: Math.max(0, (dispH - frameH) / 2),
    };
  };

  const handleSlotPointerDown = (
    slotIdx: number,
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    setSelectedSlot(slotIdx);
    if (!slots[slotIdx]?.url) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragOriginRef.current = {
      kind: "slot",
      slotIndex: slotIdx,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPan: slots[slotIdx].pan,
    };
    setDraggingItem(`slot-${slotIdx}`);
  };

  const handleSlotPointerMove = (
    slotIdx: number,
    rect: SlotRect,
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    const origin = dragOriginRef.current;
    if (
      !origin ||
      origin.kind !== "slot" ||
      origin.slotIndex !== slotIdx ||
      origin.pointerId !== event.pointerId ||
      !origin.startPan
    ) {
      return;
    }
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    const frameW = rect.w * stageSize.w;
    const frameH = rect.h * stageSize.h;
    const slot = slots[slotIdx];
    const { maxPanX, maxPanY } = getSlotCoverMetrics(
      slot.natural,
      frameW,
      frameH,
      slot.zoom
    );
    const dx = event.clientX - origin.startX;
    const dy = event.clientY - origin.startY;
    const nextPan: Point = {
      x: maxPanX > 0 ? clamp(origin.startPan.x + dx / maxPanX, -1, 1) : 0,
      y: maxPanY > 0 ? clamp(origin.startPan.y + dy / maxPanY, -1, 1) : 0,
    };

    setSlots((prev) =>
      prev.map((item, idx) => (idx === slotIdx ? { ...item, pan: nextPan } : item))
    );
  };

  const clampLogoPos = (pos: Point, scalePct = logoScalePct): Point => {
    const halfX = scalePct / 200 + 0.02;
    const halfY = (scalePct * (STORY_W / STORY_H)) / 200 + 0.02;
    return {
      x: clamp(pos.x, halfX, 1 - halfX),
      y: clamp(pos.y, halfY, 1 - halfY),
    };
  };

  const handleFloatingPointerDown = (
    kind: "logo" | "text",
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragOriginRef.current = {
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPos: kind === "logo" ? logoPos : textPos,
    };
    setDraggingItem(kind);
  };

  const handleFloatingPointerMove = (
    kind: "logo" | "text",
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    const origin = dragOriginRef.current;
    if (
      !origin ||
      origin.kind !== kind ||
      origin.pointerId !== event.pointerId ||
      !origin.startPos
    ) {
      return;
    }
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    const dx = (event.clientX - origin.startX) / stageSize.w;
    const dy = (event.clientY - origin.startY) / stageSize.h;
    const raw = { x: origin.startPos.x + dx, y: origin.startPos.y + dy };
    if (kind === "logo") {
      setLogoPos(clampLogoPos(raw));
    } else {
      setTextPos({ x: clamp(raw.x, 0.14, 0.86), y: clamp(raw.y, 0.08, 0.92) });
    }
  };

  const endPointerDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const origin = dragOriginRef.current;
    if (!origin || origin.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragOriginRef.current = null;
    setDraggingItem(null);
  };

  const handleFloatingKeyDown = (
    kind: "logo" | "text",
    event: KeyboardEvent<HTMLButtonElement>
  ) => {
    const step = event.shiftKey ? 0.04 : 0.018;
    const current = kind === "logo" ? logoPos : textPos;
    let next: Point | null = null;
    if (event.key === "ArrowLeft") next = { x: current.x - step, y: current.y };
    if (event.key === "ArrowRight") next = { x: current.x + step, y: current.y };
    if (event.key === "ArrowUp") next = { x: current.x, y: current.y - step };
    if (event.key === "ArrowDown") next = { x: current.x, y: current.y + step };
    if (!next) return;
    event.preventDefault();
    if (kind === "logo") {
      setLogoPos(clampLogoPos(next));
      setLiveStatus("Posición del logo actualizada.");
    } else {
      setTextPos({ x: clamp(next.x, 0.14, 0.86), y: clamp(next.y, 0.08, 0.92) });
      setLiveStatus("Posición del texto actualizada.");
    }
  };

  const hasDraggedFiles = (event: DragEvent<HTMLElement>) =>
    Array.from(event.dataTransfer?.types ?? []).includes("Files");

  const handleSlotDragEnter = (slotIdx: number, event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    slotDragDepthRef.current[slotIdx] = (slotDragDepthRef.current[slotIdx] || 0) + 1;
    setDragOverSlot(slotIdx);
  };

  const handleSlotDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleSlotDragLeave = (slotIdx: number, event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const nextDepth = Math.max(0, (slotDragDepthRef.current[slotIdx] || 1) - 1);
    slotDragDepthRef.current[slotIdx] = nextDepth;
    if (nextDepth === 0 && dragOverSlot === slotIdx) {
      setDragOverSlot(null);
    }
  };

  const handleSlotDrop = (slotIdx: number, event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    slotDragDepthRef.current[slotIdx] = 0;
    setDragOverSlot(null);
    const file = event.dataTransfer.files?.[0];
    if (file) loadSlotFile(slotIdx, file);
  };

  const renderStoryCanvas = async (): Promise<HTMLCanvasElement> => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    const canvas = document.createElement("canvas");
    canvas.width = STORY_W;
    canvas.height = STORY_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");

    // Base cream background
    ctx.fillStyle = "#f8f4e9";
    ctx.fillRect(0, 0, STORY_W, STORY_H);

    // Decorative background elements matching Dulce Victoria brand
    if (bgStyle === "waves" || bgStyle === "botanical") {
      ctx.fillStyle = "#f1dfda";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(420, 0);
      ctx.bezierCurveTo(340, 170, 170, 180, 0, 320);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(STORY_W, 0);
      ctx.lineTo(STORY_W - 320, 0);
      ctx.bezierCurveTo(STORY_W - 240, 120, STORY_W - 120, 170, STORY_W, 250);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, STORY_H);
      ctx.lineTo(0, STORY_H - 300);
      ctx.bezierCurveTo(220, STORY_H - 220, 380, STORY_H - 120, 560, STORY_H);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(STORY_W, STORY_H);
      ctx.lineTo(STORY_W, STORY_H - 340);
      ctx.bezierCurveTo(STORY_W - 210, STORY_H - 270, STORY_W - 350, STORY_H - 130, STORY_W - 520, STORY_H);
      ctx.closePath();
      ctx.fill();
    }

    if (bgStyle === "botanical") {
      drawLeafTwig(ctx, 20, 260, 18, 1.1);
      drawLeafTwig(ctx, STORY_W - 20, 320, -145, 1.05);
      drawLeafTwig(ctx, 40, STORY_H - 30, 8, 1.15);
      drawLeafTwig(ctx, STORY_W - 40, STORY_H - 40, -155, 1.15);
      drawHeart(ctx, 145, 420, 34);
      drawHeart(ctx, STORY_W - 130, 480, 32);
    }

    if (bgStyle === "hearts" || bgStyle === "waves") {
      drawBurst(ctx, 260, 170, -1, 1);
      drawBurst(ctx, STORY_W - 260, 170, 1, 1);
      drawHeart(ctx, 130, 330, 38);
      drawHeart(ctx, STORY_W - 125, 480, 36);
      drawHeart(ctx, 110, 1140, 36);
      drawHeart(ctx, STORY_W - 105, 1260, 36);
      drawHeart(ctx, STORY_W / 2, STORY_H - 120, 34);
    }

    // Photos in 1, 2, or 3 frames
    const activeLayout = LAYOUTS[photoCount];
    activeLayout.forEach((rect, idx) => {
      const slot = slots[idx];
      const img = slotImagesRef.current[idx];
      const fx = rect.x * STORY_W;
      const fy = rect.y * STORY_H;
      const fw = rect.w * STORY_W;
      const fh = rect.h * STORY_H;
      const border = frameStyle === "polaroid" ? 24 : frameStyle === "tape" ? 20 : 14;
      const radius = frameStyle === "soft" ? 36 : 8;

      ctx.save();
      ctx.translate(fx + fw / 2, fy + fh / 2);
      if (frameStyle !== "soft") {
        ctx.rotate((rect.rotateDeg * Math.PI) / 180);
      }

      // Frame shadow & card
      ctx.shadowColor = "rgba(73, 43, 38, 0.18)";
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = frameStyle === "soft" ? "#f1dfda" : "#fffefa";
      ctx.beginPath();
      ctx.roundRect(-fw / 2, -fh / 2, fw, fh, radius);
      ctx.fill();
      ctx.shadowColor = "transparent";

      const innerX = -fw / 2 + border;
      const innerY = -fh / 2 + border;
      const innerW = fw - border * 2;
      const innerH = fh - border * 2;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(innerX, innerY, innerW, innerH, Math.max(4, radius - 8));
      ctx.clip();
      ctx.fillStyle = "#efe6dc";
      ctx.fillRect(innerX, innerY, innerW, innerH);

      if (slot?.url && img) {
        const { dispW, dispH, maxPanX, maxPanY } = getSlotCoverMetrics(
          slot.natural,
          innerW,
          innerH,
          slot.zoom
        );
        const drawX = innerX + (innerW - dispW) / 2 + slot.pan.x * maxPanX;
        const drawY = innerY + (innerH - dispH) / 2 + slot.pan.y * maxPanY;
        ctx.drawImage(img, drawX, drawY, dispW, dispH);
      }
      ctx.restore();

      if (frameStyle === "tape") {
        ctx.fillStyle = "rgba(232, 212, 198, 0.85)";
        ctx.save();
        ctx.translate(-fw / 2 + 24, -fh / 2 + 6);
        ctx.rotate(-0.45);
        ctx.fillRect(-44, -16, 88, 32);
        ctx.restore();

        ctx.save();
        ctx.translate(fw / 2 - 24, -fh / 2 + 6);
        ctx.rotate(0.45);
        ctx.fillRect(-44, -16, 88, 32);
        ctx.restore();
      }
      ctx.restore();
    });

    // Logo
    const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = "/dulce-victoria-logo.png";
    });
    const logoPx = (STORY_W * logoScalePct) / 100;
    ctx.save();
    ctx.shadowColor = "rgba(57, 34, 31, 0.2)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.drawImage(
      logoImg,
      logoPos.x * STORY_W - logoPx / 2,
      logoPos.y * STORY_H - logoPx / 2,
      logoPx,
      logoPx
    );
    ctx.restore();

    // Brand text block
    const scaleFactor = textScalePct / 100;
    const tx = textPos.x * STORY_W;
    const ty = textPos.y * STORY_H;

    if (titleTop.trim() || titleScript.trim()) {
      ctx.save();
      if (hasBrushBg) {
        ctx.fillStyle = "rgba(241, 223, 218, 0.9)";
        ctx.beginPath();
        ctx.roundRect(
          tx - 330 * scaleFactor,
          ty - 105 * scaleFactor,
          660 * scaleFactor,
          215 * scaleFactor,
          100 * scaleFactor
        );
        ctx.fill();
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (titleTop.trim()) {
        ctx.fillStyle = "#563a2a";
        ctx.font = `600 ${Math.round(74 * scaleFactor)}px "DM Serif Display", Georgia, serif`;
        ctx.fillText(titleTop.trim(), tx, ty - (titleScript.trim() ? 38 * scaleFactor : 0));
      }
      if (titleScript.trim()) {
        ctx.fillStyle = "#bd807d";
        ctx.font = `700 ${Math.round(108 * scaleFactor)}px "Dancing Script", cursive`;
        ctx.fillText(titleScript.trim(), tx, ty + (titleTop.trim() ? 48 * scaleFactor : 0));
      }
      ctx.restore();
    }

    // Optional bottom footer badge
    if (footerText.trim()) {
      ctx.save();
      const pillW = 760;
      const pillH = 92;
      const px = (STORY_W - pillW) / 2;
      const py = STORY_H - 180;
      ctx.fillStyle = "#fffefa";
      ctx.strokeStyle = "#d7b7ae";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(px, py, pillW, pillH, 46);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#563a2a";
      ctx.font = '700 36px "DM Sans", sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(footerText.trim(), STORY_W / 2, py + pillH / 2);
      ctx.restore();
    }

    return canvas;
  };

  const handleDownloadStory = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderStoryCanvas();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1)
      );
      if (!blob) throw new Error("Blob failed");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dulce-victoria-historia-9x16-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      onNotify("Historia 9:16 descargada en PNG (1080 × 1920).");
    } catch {
      onNotify("No pudimos generar la historia. Probá nuevamente.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareStory = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderStoryCanvas();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1)
      );
      if (!blob) throw new Error("Blob failed");
      const file = new File([blob], "dulce-victoria-historia.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: "Dulce Victoria — Historia 9:16", files: [file] });
        onNotify("Historia compartida.");
      } else {
        await handleDownloadStory();
      }
    } catch {
      onNotify("Compartir cancelado o no disponible en este navegador.");
    } finally {
      setIsExporting(false);
    }
  };

  const activeLayout = LAYOUTS[photoCount];
  const currentSlot = slots[selectedSlot] || slots[0];
  const uiScale = stageSize.w / STORY_W;

  return (
    <div className="mt-2 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,370px)_1fr] md:items-start md:gap-8">
      <div>
        <div ref={stageRef} className="story-stage">
          {/* Background SVG decorations */}
          <svg
            className="story-bg-svg"
            viewBox="0 0 1080 1920"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {(bgStyle === "waves" || bgStyle === "botanical") && (
              <g fill="#f1dfda">
                <path d="M0,0 L420,0 C340,170 170,180 0,320 Z" />
                <path d="M1080,0 L760,0 C840,120 960,170 1080,250 Z" />
                <path d="M0,1920 L0,1620 C220,1700 380,1800 560,1920 Z" />
                <path d="M1080,1920 L1080,1580 C870,1650 730,1790 560,1920 Z" />
              </g>
            )}
            {(bgStyle === "hearts" || bgStyle === "waves") && (
              <g strokeLinecap="round" strokeWidth="7">
                <line x1="255" y1="168" x2="218" y2="152" stroke="#d89a95" />
                <line x1="255" y1="168" x2="215" y2="170" stroke="#9dbdc2" />
                <line x1="255" y1="168" x2="222" y2="186" stroke="#e8c48d" />
                <line x1="825" y1="168" x2="862" y2="152" stroke="#d89a95" />
                <line x1="825" y1="168" x2="865" y2="170" stroke="#9dbdc2" />
                <line x1="825" y1="168" x2="858" y2="186" stroke="#e8c48d" />
                <path
                  d="M130,342 C152,320 168,345 130,372 C92,345 108,320 130,342 Z"
                  fill="none"
                  stroke="#c98b88"
                  strokeWidth="5"
                />
                <path
                  d="M955,492 C977,470 993,495 955,522 C917,495 933,470 955,492 Z"
                  fill="none"
                  stroke="#c98b88"
                  strokeWidth="5"
                />
                <path
                  d="M540,1812 C562,1790 578,1815 540,1842 C502,1815 518,1790 540,1812 Z"
                  fill="none"
                  stroke="#c98b88"
                  strokeWidth="5"
                />
              </g>
            )}
            {bgStyle === "botanical" && (
              <g stroke="#8a5a52" strokeWidth="3.5" fill="rgba(232,188,184,0.45)">
                <path d="M25,260 Q75,205 140,130" fill="none" />
                <ellipse cx="66" cy="212" rx="18" ry="8" transform="rotate(-25 66 212)" />
                <ellipse cx="105" cy="175" rx="18" ry="8" transform="rotate(35 105 175)" />
                <path d="M1055,1870 Q995,1800 945,1725" fill="none" />
                <ellipse cx="1008" cy="1812" rx="18" ry="8" transform="rotate(28 1008 1812)" />
                <ellipse cx="972" cy="1765" rx="18" ry="8" transform="rotate(-32 972 1765)" />
              </g>
            )}
          </svg>

          {/* 1, 2 or 3 Photo Slots */}
          {activeLayout.map((rect, idx) => {
            const slot = slots[idx];
            const frameW = rect.w * stageSize.w;
            const frameH = rect.h * stageSize.h;
            const borderPx =
              (frameStyle === "polaroid" ? 24 : frameStyle === "tape" ? 20 : 14) * uiScale;
            const innerW = Math.max(10, frameW - borderPx * 2);
            const innerH = Math.max(10, frameH - borderPx * 2);
            const metrics = getSlotCoverMetrics(slot.natural, innerW, innerH, slot.zoom);
            const imgLeft = (innerW - metrics.dispW) / 2 + slot.pan.x * metrics.maxPanX;
            const imgTop = (innerH - metrics.dispH) / 2 + slot.pan.y * metrics.maxPanY;

            return (
              <div
                key={idx}
                className={`story-frame story-frame-${frameStyle} ${
                  selectedSlot === idx ? "is-selected" : ""
                } ${dragOverSlot === idx ? "is-file-over" : ""} ${
                  draggingItem === `slot-${idx}` ? "is-dragging" : ""
                }`}
                style={{
                  left: `${rect.x * 100}%`,
                  top: `${rect.y * 100}%`,
                  width: `${rect.w * 100}%`,
                  height: `${rect.h * 100}%`,
                  padding: `${borderPx}px`,
                  transform:
                    frameStyle === "soft" ? "none" : `rotate(${rect.rotateDeg}deg)`,
                }}
                onPointerDown={(e) => handleSlotPointerDown(idx, e)}
                onPointerMove={(e) => handleSlotPointerMove(idx, rect, e)}
                onPointerUp={endPointerDrag}
                onPointerCancel={endPointerDrag}
                onLostPointerCapture={endPointerDrag}
                onDragEnter={(e) => handleSlotDragEnter(idx, e)}
                onDragOver={handleSlotDragOver}
                onDragLeave={(e) => handleSlotDragLeave(idx, e)}
                onDrop={(e) => handleSlotDrop(idx, e)}
              >
                {frameStyle === "tape" && (
                  <>
                    <span className="story-tape story-tape-left" aria-hidden="true" />
                    <span className="story-tape story-tape-right" aria-hidden="true" />
                  </>
                )}
                <div className="story-frame-inner">
                  {slot.url ? (
                    <img
                      src={slot.url}
                      alt={`Foto ${idx + 1} de la historia`}
                      draggable={false}
                      className="studio-photo"
                      style={{
                        width: `${metrics.dispW}px`,
                        height: `${metrics.dispH}px`,
                        left: `${imgLeft}px`,
                        top: `${imgTop}px`,
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="story-slot-empty"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerUploadForSlot(idx);
                      }}
                    >
                      <ImagePlus size={20} aria-hidden="true" />
                      <span>Foto {idx + 1}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Movable Logo */}
          <button
            type="button"
            className={`studio-logo-handle story-floating ${
              draggingItem === "logo" ? "is-dragging" : ""
            }`}
            style={{
              width: `${logoScalePct}%`,
              left: `${logoPos.x * 100}%`,
              top: `${logoPos.y * 100}%`,
            }}
            aria-label="Mover logo en la historia. Arrastrá o usá las flechas."
            onPointerDown={(e) => handleFloatingPointerDown("logo", e)}
            onPointerMove={(e) => handleFloatingPointerMove("logo", e)}
            onPointerUp={endPointerDrag}
            onPointerCancel={endPointerDrag}
            onLostPointerCapture={endPointerDrag}
            onKeyDown={(e) => handleFloatingKeyDown("logo", e)}
          >
            <img src="/dulce-victoria-logo.png" alt="Logo Dulce Victoria" draggable={false} />
          </button>

          {/* Movable Brand Text Block */}
          {(titleTop.trim() || titleScript.trim()) && (
            <button
              type="button"
              className={`story-text-handle ${hasBrushBg ? "has-brush" : ""} ${
                draggingItem === "text" ? "is-dragging" : ""
              }`}
              style={{
                left: `${textPos.x * 100}%`,
                top: `${textPos.y * 100}%`,
                transform: `translate(-50%, -50%) scale(${textScalePct / 100})`,
              }}
              aria-label="Mover texto en la historia. Arrastrá o usá las flechas."
              onPointerDown={(e) => handleFloatingPointerDown("text", e)}
              onPointerMove={(e) => handleFloatingPointerMove("text", e)}
              onPointerUp={endPointerDrag}
              onPointerCancel={endPointerDrag}
              onLostPointerCapture={endPointerDrag}
              onKeyDown={(e) => handleFloatingKeyDown("text", e)}
            >
              {titleTop.trim() && (
                <span
                  className="story-title-serif"
                  style={{ fontSize: `${Math.round(74 * uiScale)}px` }}
                >
                  {titleTop}
                </span>
              )}
              {titleScript.trim() && (
                <span
                  className="story-title-script"
                  style={{ fontSize: `${Math.round(108 * uiScale)}px` }}
                >
                  {titleScript}
                </span>
              )}
            </button>
          )}

          {/* Optional Footer Badge */}
          {footerText.trim() && (
            <div
              className="story-footer-pill"
              style={{ fontSize: `${Math.max(10, Math.round(36 * uiScale))}px` }}
            >
              {footerText}
            </div>
          )}
        </div>

        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#8f6c66]">
          <Move size={13} aria-hidden="true" />
          Arrastrá fotos desde tu carpeta a cada marco y mové logo y texto
        </p>
      </div>

      {/* Controls Panel */}
      <div className="studio-panel space-y-5">
        <input
          ref={fileInputRef}
          id="story-file-input"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileInputChange}
        />

        <div>
          <p className="studio-label mb-2">Cantidad de fotos</p>
          <div className="story-segmented" role="toolbar" aria-label="Cantidad de fotos">
            {([1, 2, 3] as PhotoCount[]).map((count) => (
              <button
                key={count}
                type="button"
                className="story-seg-btn"
                aria-pressed={photoCount === count}
                onClick={() => {
                  setPhotoCount(count);
                  if (selectedSlot >= count) setSelectedSlot(0);
                }}
              >
                {count} {count === 1 ? "foto" : "fotos"}
              </button>
            ))}
          </div>
        </div>

        {/* Selected slot controls */}
        <div className="rounded-[16px] border border-[#eadbd4] bg-[#fbf8ef] p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] font-bold text-[#694635]">
              Marco activo: Foto {selectedSlot + 1}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="studio-chip"
                onClick={() => triggerUploadForSlot(selectedSlot)}
              >
                <Upload size={13} className="inline mr-1" aria-hidden="true" />
                {currentSlot?.url ? "Cambiar" : "Subir"}
              </button>
              {currentSlot?.url && (
                <button
                  type="button"
                  className="studio-chip"
                  onClick={() =>
                    setSlots((prev) =>
                      prev.map((s, idx) =>
                        idx === selectedSlot ? { ...s, zoom: 1, pan: { x: 0, y: 0 } } : s
                      )
                    )
                  }
                >
                  <RotateCcw size={13} className="inline mr-1" aria-hidden="true" />
                  Centrar
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="story-slot-zoom" className="studio-label">
                Zoom foto {selectedSlot + 1}
              </label>
              <span className="text-[12px] font-bold text-[#694635]">
                {Math.round((currentSlot?.zoom || 1) * 100)}%
              </span>
            </div>
            <input
              id="story-slot-zoom"
              type="range"
              min={1}
              max={2.4}
              step={0.05}
              value={currentSlot?.zoom || 1}
              disabled={!currentSlot?.url}
              onChange={(e) => {
                const zoom = Number(e.target.value);
                setSlots((prev) =>
                  prev.map((s, idx) => (idx === selectedSlot ? { ...s, zoom } : s))
                );
              }}
              className="studio-range"
            />
          </div>
        </div>

        {/* Text controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="studio-label flex items-center gap-1.5">
              <Type size={13} aria-hidden="true" />
              Texto al estilo del logo
            </p>
            <button
              type="button"
              className="studio-chip"
              aria-pressed={hasBrushBg}
              onClick={() => setHasBrushBg((v) => !v)}
            >
              Fondo pincelada
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {TEXT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="studio-chip"
                onClick={() => {
                  setTitleTop(preset.top);
                  setTitleScript(preset.script);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label htmlFor="story-title-top" className="studio-label mb-1">
                Línea 1 (Serif)
              </label>
              <input
                id="story-title-top"
                type="text"
                className="story-input"
                value={titleTop}
                onChange={(e) => setTitleTop(e.target.value)}
                placeholder="Ej: Pedidos del día"
              />
            </div>
            <div>
              <label htmlFor="story-title-script" className="studio-label mb-1">
                Línea 2 (Cursiva)
              </label>
              <input
                id="story-title-script"
                type="text"
                className="story-input"
                value={titleScript}
                onChange={(e) => setTitleScript(e.target.value)}
                placeholder="Ej: de hoy"
              />
            </div>
          </div>

          <div>
            <label htmlFor="story-footer-text" className="studio-label mb-1">
              Pie / WhatsApp / Precio (opcional)
            </label>
            <input
              id="story-footer-text"
              type="text"
              className="story-input"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Ej: Pedidos al 388 465-2336"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="story-logo-size" className="studio-label">
                  Logo
                </label>
                <span className="text-[11px] font-bold text-[#694635]">{logoScalePct}%</span>
              </div>
              <input
                id="story-logo-size"
                type="range"
                min={14}
                max={34}
                step={1}
                value={logoScalePct}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setLogoScalePct(next);
                  setLogoPos((prev) => clampLogoPos(prev, next));
                }}
                className="studio-range"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="story-text-size" className="studio-label">
                  Tamaño texto
                </label>
                <span className="text-[11px] font-bold text-[#694635]">{textScalePct}%</span>
              </div>
              <input
                id="story-text-size"
                type="range"
                min={70}
                max={135}
                step={5}
                value={textScalePct}
                onChange={(e) => setTextScalePct(Number(e.target.value))}
                className="studio-range"
              />
            </div>
          </div>
        </div>

        {/* Frames & Background Details */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="studio-label mb-1.5">Marquitos de fotos</p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["polaroid", "Polaroid"],
                  ["tape", "Cinta"],
                  ["soft", "Suave"],
                ] as [FrameStyle, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className="studio-chip"
                  aria-pressed={frameStyle === id}
                  onClick={() => setFrameStyle(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="studio-label mb-1.5">Detalles de fondo</p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["waves", "Ondas"],
                  ["botanical", "Botánico"],
                  ["hearts", "Corazones"],
                  ["clean", "Limpio"],
                ] as [BgStyle, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className="studio-chip"
                  aria-pressed={bgStyle === id}
                  onClick={() => setBgStyle(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            type="button"
            className="studio-download-btn flex-1"
            disabled={isExporting}
            onClick={handleDownloadStory}
          >
            <Download size={17} aria-hidden="true" />
            Descargar Historia 9:16
          </button>
          <button
            type="button"
            className="studio-secondary-btn"
            disabled={isExporting}
            onClick={handleShareStory}
          >
            <Share2 size={16} aria-hidden="true" />
            Compartir
          </button>
        </div>

        <div className="flex items-start gap-2 rounded-[14px] bg-[#f8eee7] px-3.5 py-2.5 text-[12px] text-[#7c5b53]">
          <Sparkles size={14} className="mt-0.5 shrink-0 text-[#bd807d]" aria-hidden="true" />
          <span>
            Se exporta en <strong>1080 × 1920 px</strong> listo para subir a tus Historias de
            Instagram.
          </span>
        </div>

        <div className="sr-only" aria-live="polite">
          {liveStatus}
        </div>
      </div>
    </div>
  );
}
