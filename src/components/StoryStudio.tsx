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
  Maximize2,
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
  1: [{ x: 0.035, y: 0.27, w: 0.93, h: 0.59, rotateDeg: -1.0 }],
  2: [
    { x: 0.03, y: 0.255, w: 0.94, h: 0.32, rotateDeg: -1.6 },
    { x: 0.03, y: 0.59, w: 0.94, h: 0.32, rotateDeg: 1.4 },
  ],
  3: [
    { x: 0.04, y: 0.265, w: 0.92, h: 0.33, rotateDeg: -1.3 },
    { x: 0.025, y: 0.61, w: 0.465, h: 0.3, rotateDeg: 1.8 },
    { x: 0.51, y: 0.61, w: 0.465, h: 0.3, rotateDeg: -1.5 },
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
  ctx.strokeStyle = "#7c524b";
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(38, -58, 72, -110, 140, -185);
  ctx.stroke();

  const leaves = [
    { lx: 22, ly: -32, rot: -42, rx: 22, ry: 9 },
    { lx: 40, ly: -56, rot: 36, rx: 20, ry: 8.5 },
    { lx: 62, ly: -84, rot: -38, rx: 23, ry: 9.5 },
    { lx: 84, ly: -112, rot: 32, rx: 21, ry: 8.5 },
    { lx: 106, ly: -140, rot: -34, rx: 19, ry: 8 },
    { lx: 124, ly: -164, rot: 26, rx: 17, ry: 7 },
    { lx: 142, ly: -188, rot: -8, rx: 16, ry: 7 },
  ];
  leaves.forEach(({ lx, ly, rot, rx, ry }) => {
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.fillStyle = "rgba(232, 184, 180, 0.55)";
    ctx.strokeStyle = "#7c524b";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(rx, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3, 0);
    ctx.lineTo(rx * 1.55, 0);
    ctx.stroke();
    ctx.restore();
  });

  // Delicate blossom buds near branch tip
  [
    { bx: 50, by: -68, r: 6 },
    { bx: 94, by: -125, r: 5.5 },
  ].forEach(({ bx, by, r }) => {
    ctx.fillStyle = "#f4cdc7";
    ctx.strokeStyle = "#7c524b";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawPastelDots(ctx: CanvasRenderingContext2D, dots: Array<[number, number, number, string]>) {
  dots.forEach(([x, y, r, color]) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function createInitialRects(): Record<PhotoCount, SlotRect[]> {
  return {
    1: LAYOUTS[1].map((r) => ({ ...r })),
    2: LAYOUTS[2].map((r) => ({ ...r })),
    3: LAYOUTS[3].map((r) => ({ ...r })),
  };
}

export function StoryStudio({ onNotify }: StoryStudioProps) {
  const [photoCount, setPhotoCount] = useState<PhotoCount>(3);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [slots, setSlots] = useState<SlotState[]>([emptySlot(), emptySlot(), emptySlot()]);
  const [rectsByCount, setRectsByCount] = useState<Record<PhotoCount, SlotRect[]>>(createInitialRects);

  const [bgStyle, setBgStyle] = useState<BgStyle>("botanical");
  const [frameStyle, setFrameStyle] = useState<FrameStyle>("polaroid");

  const [logoPos, setLogoPos] = useState<Point>({ x: 0.5, y: 0.088 });
  const [logoScalePct, setLogoScalePct] = useState(21);

  const [titleTop, setTitleTop] = useState("Pedidos del día");
  const [titleScript, setTitleScript] = useState("de hoy");
  const [footerText, setFooterText] = useState("");
  const [showWhatsappIcon, setShowWhatsappIcon] = useState(true);
  const [hasBrushBg, setHasBrushBg] = useState(true);
  const [textPos, setTextPos] = useState<Point>({ x: 0.5, y: 0.205 });
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
    kind: "slot" | "frame-move" | "frame-resize" | "logo" | "text";
    slotIndex?: number;
    pointerId: number;
    startX: number;
    startY: number;
    startPan?: Point;
    startPos?: Point;
    startRect?: SlotRect;
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

  const updateSlotRect = (slotIdx: number, updater: (rect: SlotRect) => SlotRect) => {
    setRectsByCount((prev) => ({
      ...prev,
      [photoCount]: prev[photoCount].map((r, idx) => (idx === slotIdx ? updater(r) : r)),
    }));
  };

  const handleSlotPointerDown = (
    slotIdx: number,
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    setSelectedSlot(slotIdx);
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    if (!slots[slotIdx]?.url) {
      dragOriginRef.current = {
        kind: "frame-move",
        slotIndex: slotIdx,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startRect: rectsByCount[photoCount][slotIdx],
      };
      setDraggingItem(`frame-move-${slotIdx}`);
      return;
    }

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
    if (!origin || origin.slotIndex !== slotIdx || origin.pointerId !== event.pointerId) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    if (origin.kind === "frame-move" && origin.startRect) {
      const dx = (event.clientX - origin.startX) / stageSize.w;
      const dy = (event.clientY - origin.startY) / stageSize.h;
      const base = origin.startRect;
      updateSlotRect(slotIdx, (current) => ({
        ...current,
        x: clamp(base.x + dx, 0, Math.max(0, 1 - current.w)),
        y: clamp(base.y + dy, 0, Math.max(0, 1 - current.h)),
      }));
      return;
    }

    if (origin.kind !== "slot" || !origin.startPan) return;

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

  const handleFrameHandlePointerDown = (
    kind: "frame-move" | "frame-resize",
    slotIdx: number,
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    setSelectedSlot(slotIdx);
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragOriginRef.current = {
      kind,
      slotIndex: slotIdx,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRect: rectsByCount[photoCount][slotIdx],
    };
    setDraggingItem(`${kind}-${slotIdx}`);
  };

  const handleFrameHandlePointerMove = (
    kind: "frame-move" | "frame-resize",
    slotIdx: number,
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    const origin = dragOriginRef.current;
    if (
      !origin ||
      origin.kind !== kind ||
      origin.slotIndex !== slotIdx ||
      origin.pointerId !== event.pointerId ||
      !origin.startRect
    ) {
      return;
    }
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    const dx = (event.clientX - origin.startX) / stageSize.w;
    const dy = (event.clientY - origin.startY) / stageSize.h;
    const base = origin.startRect;

    if (kind === "frame-move") {
      updateSlotRect(slotIdx, (current) => ({
        ...current,
        x: clamp(base.x + dx, 0, Math.max(0, 1 - current.w)),
        y: clamp(base.y + dy, 0, Math.max(0, 1 - current.h)),
      }));
    } else {
      updateSlotRect(slotIdx, (current) => ({
        ...current,
        w: clamp(base.w + dx, 0.22, Math.max(0.22, 1 - current.x)),
        h: clamp(base.h + dy, 0.14, Math.max(0.14, 1 - current.y)),
      }));
    }
  };

  const handleFrameHandleKeyDown = (
    kind: "frame-move" | "frame-resize",
    slotIdx: number,
    event: KeyboardEvent<HTMLButtonElement>
  ) => {
    const step = event.shiftKey ? 0.04 : 0.015;
    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft") dx = -step;
    if (event.key === "ArrowRight") dx = step;
    if (event.key === "ArrowUp") dy = -step;
    if (event.key === "ArrowDown") dy = step;
    if (dx === 0 && dy === 0) return;

    event.preventDefault();
    if (kind === "frame-move") {
      updateSlotRect(slotIdx, (r) => ({
        ...r,
        x: clamp(r.x + dx, 0, Math.max(0, 1 - r.w)),
        y: clamp(r.y + dy, 0, Math.max(0, 1 - r.h)),
      }));
      setLiveStatus(`Marco ${slotIdx + 1} movido.`);
    } else {
      updateSlotRect(slotIdx, (r) => ({
        ...r,
        w: clamp(r.w + dx, 0.22, Math.max(0.22, 1 - r.x)),
        h: clamp(r.h + dy, 0.14, Math.max(0.14, 1 - r.y)),
      }));
      setLiveStatus(`Tamaño del marco ${slotIdx + 1} actualizado.`);
    }
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
    if (bgStyle === "waves" || bgStyle === "botanical" || bgStyle === "hearts") {
      ctx.fillStyle = "#f1dfda";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(440, 0);
      ctx.bezierCurveTo(350, 185, 175, 195, 0, 340);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(STORY_W, 0);
      ctx.lineTo(STORY_W - 360, 0);
      ctx.bezierCurveTo(STORY_W - 260, 130, STORY_W - 130, 185, STORY_W, 280);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, STORY_H);
      ctx.lineTo(0, STORY_H - 330);
      ctx.bezierCurveTo(230, STORY_H - 230, 410, STORY_H - 130, 590, STORY_H);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(STORY_W, STORY_H);
      ctx.lineTo(STORY_W, STORY_H - 360);
      ctx.bezierCurveTo(STORY_W - 220, STORY_H - 280, STORY_W - 370, STORY_H - 140, STORY_W - 550, STORY_H);
      ctx.closePath();
      ctx.fill();

      // Secondary subtle wave line
      ctx.strokeStyle = "rgba(216, 154, 149, 0.45)";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, 380);
      ctx.bezierCurveTo(180, 230, 370, 200, 480, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(STORY_W, STORY_H - 390);
      ctx.bezierCurveTo(STORY_W - 210, STORY_H - 260, STORY_W - 360, STORY_H - 140, STORY_W - 590, STORY_H);
      ctx.stroke();
    }

    if (bgStyle === "botanical") {
      drawLeafTwig(ctx, 16, 300, 16, 1.25);
      drawLeafTwig(ctx, STORY_W - 16, 330, -142, 1.2);
      drawLeafTwig(ctx, 24, STORY_H - 24, 14, 1.3);
      drawLeafTwig(ctx, STORY_W - 24, STORY_H - 30, -152, 1.3);
      drawPastelDots(ctx, [
        [230, 100, 7, "#e2b8b3"],
        [258, 124, 5, "#e8c48d"],
        [205, 140, 5.5, "#e2b8b3"],
        [STORY_W - 215, 108, 7, "#e2b8b3"],
        [STORY_W - 245, 134, 5, "#e8c48d"],
        [250, STORY_H - 96, 6.5, "#e2b8b3"],
        [285, STORY_H - 118, 5, "#e8c48d"],
        [STORY_W - 240, STORY_H - 102, 7, "#e2b8b3"],
        [STORY_W - 275, STORY_H - 125, 5, "#e8c48d"],
      ]);
      drawHeart(ctx, 290, 225, 30);
      drawHeart(ctx, STORY_W - 290, 225, 30);
      drawHeart(ctx, 110, STORY_H - 235, 32);
      drawHeart(ctx, STORY_W - 110, STORY_H - 235, 32);
      drawHeart(ctx, STORY_W / 2, STORY_H - 72, 28, "#c98b88", "#d89a95");
    }

    if (bgStyle === "waves") {
      drawBurst(ctx, 295, 140, -1, 1);
      drawBurst(ctx, STORY_W - 295, 140, 1, 1);
      drawHeart(ctx, 130, 310, 36);
      drawHeart(ctx, STORY_W - 130, 310, 36);
      drawHeart(ctx, STORY_W / 2, STORY_H - 75, 32);
      ctx.strokeStyle = "#c98b88";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(STORY_W / 2 - 140, STORY_H - 58);
      ctx.lineTo(STORY_W / 2 - 42, STORY_H - 58);
      ctx.moveTo(STORY_W / 2 + 42, STORY_H - 58);
      ctx.lineTo(STORY_W / 2 + 140, STORY_H - 58);
      ctx.stroke();
    }

    if (bgStyle === "hearts") {
      drawBurst(ctx, 295, 140, -1, 1);
      drawBurst(ctx, STORY_W - 295, 140, 1, 1);
      drawHeart(ctx, 118, 280, 40);
      drawHeart(ctx, 215, 175, 24, "#d89a95", "#e2b2ad");
      drawHeart(ctx, STORY_W - 118, 280, 40);
      drawHeart(ctx, STORY_W - 215, 175, 24, "#d89a95", "#e2b2ad");
      drawHeart(ctx, 90, STORY_H - 220, 36);
      drawHeart(ctx, STORY_W - 90, STORY_H - 220, 36);
      drawHeart(ctx, STORY_W / 2, STORY_H - 72, 34, "#c98b88", "#d89a95");
    }

    // Photos in 1, 2, or 3 frames
    const activeLayout = rectsByCount[photoCount];
    activeLayout.forEach((rect, idx) => {
      const slot = slots[idx];
      const img = slotImagesRef.current[idx];
      const fx = rect.x * STORY_W;
      const fy = rect.y * STORY_H;
      const fw = rect.w * STORY_W;
      const fh = rect.h * STORY_H;
      const border = frameStyle === "polaroid" ? 16 : frameStyle === "tape" ? 14 : 10;
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
      const label = footerText.trim();
      ctx.font = '700 36px "DM Sans", sans-serif';
      const textW = ctx.measureText(label).width;
      const iconGap = showWhatsappIcon ? 74 : 0;
      const pillW = Math.min(920, Math.max(460, Math.round(textW + iconGap + 96)));
      const pillH = 82;
      const px = (STORY_W - pillW) / 2;
      const py = STORY_H - 126;

      ctx.shadowColor = "rgba(73, 43, 38, 0.14)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = "#fffefa";
      ctx.strokeStyle = "#d7b7ae";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(px, py, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.stroke();

      const cy = py + pillH / 2;
      if (showWhatsappIcon) {
        const contentW = 54 + 18 + textW;
        const startX = (STORY_W - Math.min(contentW, pillW - 56)) / 2;
        const iconCx = startX + 27;
        const r = 27;

        // Dusty-rose circular WhatsApp badge
        ctx.fillStyle = "#bd807d";
        ctx.beginPath();
        ctx.arc(iconCx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Crisp white WhatsApp speech bubble + handset
        ctx.save();
        ctx.translate(iconCx, cy);
        const s = r / 24;
        ctx.scale(s, s);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.6;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.arc(0, -0.4, 11.4, Math.PI * 0.72, Math.PI * 2.52);
        ctx.lineTo(-11.8, 11.2);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(-4.2, -5.6);
        ctx.bezierCurveTo(-5.4, -5.6, -6.2, -4.6, -6.1, -3.2);
        ctx.bezierCurveTo(-5.9, 1.2, -1.2, 5.8, 3.3, 6.0);
        ctx.bezierCurveTo(4.7, 6.1, 5.7, 5.3, 5.7, 4.1);
        ctx.lineTo(5.5, 2.7);
        ctx.bezierCurveTo(5.3, 2.1, 4.7, 1.8, 4.0, 1.6);
        ctx.lineTo(2.4, 1.1);
        ctx.bezierCurveTo(1.8, 0.9, 1.3, 1.1, 0.9, 1.6);
        ctx.lineTo(0.2, 2.3);
        ctx.bezierCurveTo(-1.1, 1.6, -2.0, 0.7, -2.7, -0.6);
        ctx.lineTo(-2.0, -1.3);
        ctx.bezierCurveTo(-1.5, -1.7, -1.3, -2.2, -1.5, -2.8);
        ctx.lineTo(-2.0, -4.4);
        ctx.bezierCurveTo(-2.2, -5.1, -2.5, -5.6, -3.1, -5.6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#563a2a";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(label, startX + 72, cy + 1, pillW - 130);
      } else {
        ctx.fillStyle = "#563a2a";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, STORY_W / 2, cy + 1, pillW - 72);
      }
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

  const activeLayout = rectsByCount[photoCount];
  const currentSlot = slots[selectedSlot] || slots[0];
  const currentRect = activeLayout[selectedSlot] || activeLayout[0];
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
            {(bgStyle === "waves" || bgStyle === "botanical" || bgStyle === "hearts") && (
              <>
                <g fill="#f1dfda">
                  <path d="M0,0 L440,0 C350,185 175,195 0,340 Z" />
                  <path d="M1080,0 L720,0 C820,130 950,185 1080,280 Z" />
                  <path d="M0,1920 L0,1590 C230,1690 410,1790 590,1920 Z" />
                  <path d="M1080,1920 L1080,1560 C860,1640 710,1780 530,1920 Z" />
                </g>
                <g fill="none" stroke="rgba(216,154,149,0.45)" strokeWidth="3.5">
                  <path d="M0,380 C180,230 370,200 480,0" />
                  <path d="M1080,1530 C870,1660 720,1780 490,1920" />
                </g>
              </>
            )}

            {(bgStyle === "waves" || bgStyle === "hearts") && (
              <g strokeLinecap="round" strokeWidth="6.5">
                <line x1="295" y1="140" x2="258" y2="124" stroke="#d89a95" />
                <line x1="295" y1="140" x2="255" y2="142" stroke="#9dbdc2" />
                <line x1="295" y1="140" x2="262" y2="158" stroke="#e8c48d" />
                <line x1="785" y1="140" x2="822" y2="124" stroke="#d89a95" />
                <line x1="785" y1="140" x2="825" y2="142" stroke="#9dbdc2" />
                <line x1="785" y1="140" x2="818" y2="158" stroke="#e8c48d" />
                <path
                  d="M130,322 C150,300 165,325 130,350 C95,325 110,300 130,322 Z"
                  fill="none"
                  stroke="#c98b88"
                  strokeWidth="4.5"
                />
                <path
                  d="M950,322 C970,300 985,325 950,350 C915,325 930,300 950,322 Z"
                  fill="none"
                  stroke="#c98b88"
                  strokeWidth="4.5"
                />
                <path
                  d="M540,1855 C560,1835 574,1858 540,1880 C506,1858 520,1835 540,1855 Z"
                  fill={bgStyle === "hearts" ? "#d89a95" : "none"}
                  stroke="#c98b88"
                  strokeWidth="4.5"
                />
                {bgStyle === "waves" && (
                  <g stroke="#c98b88" strokeWidth="3">
                    <line x1="400" y1="1862" x2="498" y2="1862" />
                    <line x1="582" y1="1862" x2="680" y2="1862" />
                  </g>
                )}
              </g>
            )}

            {bgStyle === "hearts" && (
              <g>
                <path d="M215,182 C228,168 238,184 215,200 C192,184 202,168 215,182 Z" fill="#e2b2ad" />
                <path d="M865,182 C878,168 888,184 865,200 C842,184 852,168 865,182 Z" fill="#e2b2ad" />
                <path d="M90,1705 C110,1685 125,1708 90,1732 C55,1708 70,1685 90,1705 Z" fill="none" stroke="#c98b88" strokeWidth="4.5" />
                <path d="M990,1705 C1010,1685 1025,1708 990,1732 C955,1708 970,1685 990,1705 Z" fill="none" stroke="#c98b88" strokeWidth="4.5" />
              </g>
            )}

            {bgStyle === "botanical" && (
              <g>
                {/* Top-left branch */}
                <g transform="translate(16 300) rotate(16) scale(1.25)" stroke="#7c524b" fill="rgba(232,184,180,0.55)">
                  <path d="M0,0 C38,-58 72,-110 140,-185" fill="none" strokeWidth="3.2" strokeLinecap="round" />
                  <ellipse cx="42" cy="-36" rx="22" ry="9" transform="rotate(-42 22 -32)" strokeWidth="2.6" />
                  <ellipse cx="58" cy="-58" rx="20" ry="8.5" transform="rotate(36 40 -56)" strokeWidth="2.6" />
                  <ellipse cx="82" cy="-86" rx="23" ry="9.5" transform="rotate(-38 62 -84)" strokeWidth="2.6" />
                  <ellipse cx="102" cy="-114" rx="21" ry="8.5" transform="rotate(32 84 -112)" strokeWidth="2.6" />
                  <ellipse cx="122" cy="-142" rx="19" ry="8" transform="rotate(-34 106 -140)" strokeWidth="2.6" />
                  <ellipse cx="140" cy="-165" rx="17" ry="7" transform="rotate(26 124 -164)" strokeWidth="2.6" />
                  <circle cx="50" cy="-68" r="6" fill="#f4cdc7" strokeWidth="2.2" />
                  <circle cx="94" cy="-125" r="5.5" fill="#f4cdc7" strokeWidth="2.2" />
                </g>
                {/* Top-right branch */}
                <g transform="translate(1064 330) rotate(-142) scale(1.2)" stroke="#7c524b" fill="rgba(232,184,180,0.55)">
                  <path d="M0,0 C38,-58 72,-110 140,-185" fill="none" strokeWidth="3.2" strokeLinecap="round" />
                  <ellipse cx="42" cy="-36" rx="22" ry="9" transform="rotate(-42 22 -32)" strokeWidth="2.6" />
                  <ellipse cx="58" cy="-58" rx="20" ry="8.5" transform="rotate(36 40 -56)" strokeWidth="2.6" />
                  <ellipse cx="82" cy="-86" rx="23" ry="9.5" transform="rotate(-38 62 -84)" strokeWidth="2.6" />
                  <ellipse cx="102" cy="-114" rx="21" ry="8.5" transform="rotate(32 84 -112)" strokeWidth="2.6" />
                  <ellipse cx="122" cy="-142" rx="19" ry="8" transform="rotate(-34 106 -140)" strokeWidth="2.6" />
                  <circle cx="50" cy="-68" r="6" fill="#f4cdc7" strokeWidth="2.2" />
                </g>
                {/* Bottom-left branch */}
                <g transform="translate(24 1896) rotate(14) scale(1.3)" stroke="#7c524b" fill="rgba(232,184,180,0.55)">
                  <path d="M0,0 C38,-58 72,-110 140,-185" fill="none" strokeWidth="3.2" strokeLinecap="round" />
                  <ellipse cx="42" cy="-36" rx="22" ry="9" transform="rotate(-42 22 -32)" strokeWidth="2.6" />
                  <ellipse cx="58" cy="-58" rx="20" ry="8.5" transform="rotate(36 40 -56)" strokeWidth="2.6" />
                  <ellipse cx="82" cy="-86" rx="23" ry="9.5" transform="rotate(-38 62 -84)" strokeWidth="2.6" />
                  <ellipse cx="102" cy="-114" rx="21" ry="8.5" transform="rotate(32 84 -112)" strokeWidth="2.6" />
                  <ellipse cx="122" cy="-142" rx="19" ry="8" transform="rotate(-34 106 -140)" strokeWidth="2.6" />
                  <circle cx="94" cy="-125" r="5.5" fill="#f4cdc7" strokeWidth="2.2" />
                </g>
                {/* Bottom-right branch */}
                <g transform="translate(1056 1890) rotate(-152) scale(1.3)" stroke="#7c524b" fill="rgba(232,184,180,0.55)">
                  <path d="M0,0 C38,-58 72,-110 140,-185" fill="none" strokeWidth="3.2" strokeLinecap="round" />
                  <ellipse cx="42" cy="-36" rx="22" ry="9" transform="rotate(-42 22 -32)" strokeWidth="2.6" />
                  <ellipse cx="58" cy="-58" rx="20" ry="8.5" transform="rotate(36 40 -56)" strokeWidth="2.6" />
                  <ellipse cx="82" cy="-86" rx="23" ry="9.5" transform="rotate(-38 62 -84)" strokeWidth="2.6" />
                  <ellipse cx="102" cy="-114" rx="21" ry="8.5" transform="rotate(32 84 -112)" strokeWidth="2.6" />
                  <ellipse cx="122" cy="-142" rx="19" ry="8" transform="rotate(-34 106 -140)" strokeWidth="2.6" />
                  <circle cx="94" cy="-125" r="5.5" fill="#f4cdc7" strokeWidth="2.2" />
                </g>
                {/* Confetti dots & hearts */}
                <circle cx="230" cy="100" r="7" fill="#e2b8b3" />
                <circle cx="258" cy="124" r="5" fill="#e8c48d" />
                <circle cx="205" cy="140" r="5.5" fill="#e2b8b3" />
                <circle cx="865" cy="108" r="7" fill="#e2b8b3" />
                <circle cx="835" cy="134" r="5" fill="#e8c48d" />
                <circle cx="250" cy="1824" r="6.5" fill="#e2b8b3" />
                <circle cx="285" cy="1802" r="5" fill="#e8c48d" />
                <circle cx="840" cy="1818" r="7" fill="#e2b8b3" />
                <circle cx="805" cy="1795" r="5" fill="#e8c48d" />
                <path d="M290,234 C306,218 318,236 290,255 C262,236 274,218 290,234 Z" fill="none" stroke="#c98b88" strokeWidth="4" />
                <path d="M790,234 C806,218 818,236 790,255 C762,236 774,218 790,234 Z" fill="none" stroke="#c98b88" strokeWidth="4" />
                <path d="M540,1855 C556,1840 568,1858 540,1876 C512,1858 524,1840 540,1855 Z" fill="#d89a95" />
              </g>
            )}
          </svg>

          {/* 1, 2 or 3 Photo Slots */}
          {activeLayout.map((rect, idx) => {
            const slot = slots[idx];
            const frameW = rect.w * stageSize.w;
            const frameH = rect.h * stageSize.h;
            const borderPx =
              (frameStyle === "polaroid" ? 16 : frameStyle === "tape" ? 14 : 10) * uiScale;
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

                {selectedSlot === idx && (
                  <>
                    <button
                      type="button"
                      className="story-frame-move-handle"
                      aria-label={`Mover marco Foto ${idx + 1}. Arrastrá o usá las flechas.`}
                      onPointerDown={(e) => handleFrameHandlePointerDown("frame-move", idx, e)}
                      onPointerMove={(e) => handleFrameHandlePointerMove("frame-move", idx, e)}
                      onPointerUp={endPointerDrag}
                      onPointerCancel={endPointerDrag}
                      onLostPointerCapture={endPointerDrag}
                      onKeyDown={(e) => handleFrameHandleKeyDown("frame-move", idx, e)}
                    >
                      <Move size={11} aria-hidden="true" />
                      <span>Mover</span>
                    </button>
                    <button
                      type="button"
                      className="story-frame-resize-handle"
                      aria-label={`Redimensionar marco Foto ${idx + 1}. Arrastrá o usá las flechas.`}
                      onPointerDown={(e) => handleFrameHandlePointerDown("frame-resize", idx, e)}
                      onPointerMove={(e) => handleFrameHandlePointerMove("frame-resize", idx, e)}
                      onPointerUp={endPointerDrag}
                      onPointerCancel={endPointerDrag}
                      onLostPointerCapture={endPointerDrag}
                      onKeyDown={(e) => handleFrameHandleKeyDown("frame-resize", idx, e)}
                    >
                      <Maximize2 size={12} aria-hidden="true" />
                    </button>
                  </>
                )}
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
              className={`story-footer-pill ${showWhatsappIcon ? "has-wp" : ""}`}
              style={{ fontSize: `${Math.max(10, Math.round(36 * uiScale))}px` }}
            >
              {showWhatsappIcon && (
                <span className="story-wp-badge" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="none">
                    <path
                      d="M12 3.2a8.6 8.6 0 0 0-7.45 12.9L3.5 20.5l4.55-1.02A8.6 8.6 0 1 0 12 3.2Z"
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.45 8.7c-.2-.45-.4-.46-.6-.47h-.5c-.18 0-.47.07-.72.34-.25.27-.95.92-.95 2.25s.97 2.6 1.1 2.78c.14.18 1.88 3 4.64 4.08 2.29.9 2.75.72 3.25.67.5-.05 1.6-.65 1.82-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.31-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.6.13-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.18-1.35-.81-.72-1.35-1.61-1.51-1.88-.16-.27-.02-.42.12-.55.12-.12.27-.32.4-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.13-.59-1.45-.82-1.97Z"
                      fill="#ffffff"
                    />
                  </svg>
                </span>
              )}
              <span>{footerText}</span>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="story-frame-w" className="studio-label">
                  Ancho marco
                </label>
                <span className="text-[11px] font-bold text-[#694635]">
                  {Math.round(currentRect.w * 100)}%
                </span>
              </div>
              <input
                id="story-frame-w"
                type="range"
                min={22}
                max={96}
                step={1}
                value={Math.round(currentRect.w * 100)}
                onChange={(e) => {
                  const nextW = Number(e.target.value) / 100;
                  updateSlotRect(selectedSlot, (r) => ({
                    ...r,
                    w: nextW,
                    x: clamp(r.x, 0, Math.max(0, 1 - nextW)),
                  }));
                }}
                className="studio-range"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="story-frame-h" className="studio-label">
                  Alto marco
                </label>
                <span className="text-[11px] font-bold text-[#694635]">
                  {Math.round(currentRect.h * 100)}%
                </span>
              </div>
              <input
                id="story-frame-h"
                type="range"
                min={14}
                max={75}
                step={1}
                value={Math.round(currentRect.h * 100)}
                onChange={(e) => {
                  const nextH = Number(e.target.value) / 100;
                  updateSlotRect(selectedSlot, (r) => ({
                    ...r,
                    h: nextH,
                    y: clamp(r.y, 0, Math.max(0, 1 - nextH)),
                  }));
                }}
                className="studio-range"
              />
            </div>
          </div>

          <button
            type="button"
            className="studio-chip"
            onClick={() => {
              setRectsByCount((prev) => ({
                ...prev,
                [photoCount]: LAYOUTS[photoCount].map((r) => ({ ...r })),
              }));
              setLiveStatus("Marcos restaurados al diseño original.");
            }}
          >
            <RotateCcw size={12} className="inline mr-1" aria-hidden="true" />
            Restaurar tamaño y posición de marcos
          </button>
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
            <div className="mb-1 flex items-center justify-between gap-2">
              <label htmlFor="story-footer-text" className="studio-label">
                Pie / WhatsApp / Precio (opcional)
              </label>
              <button
                type="button"
                aria-pressed={showWhatsappIcon}
                className={`studio-chip ${showWhatsappIcon ? "is-active" : ""}`}
                onClick={() => setShowWhatsappIcon((prev) => !prev)}
              >
                Ícono WhatsApp
              </button>
            </div>
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
