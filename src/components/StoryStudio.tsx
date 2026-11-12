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
  Palette,
  RotateCcw,
  Share2,
  Sliders,
  Sparkles,
  Type,
  Upload,
  X,
} from "lucide-react";
import { downloadPngBlob, sharePngBlob } from "../utils/exportImage";
import {
  BAKERY_ICONS,
  BAKERY_PLACEMENTS,
  CLUSTER_SPRIGS,
  FILLED_SPRIG_LEAVES,
  FILLED_SPRIG_STEM,
  HEART_POINTS_BAKERY,
  PASTEL_PALETTES,
  SPARKLE_POINTS,
  STORY_H,
  STORY_W,
  drawSeparatorCanvas,
  drawStoryBackgroundCanvas,
  drawTextFrameCanvas,
  type BgStyle,
  type PastelPalette,
  type SeparatorStyle,
  type TextFrameStyle,
} from "./storyArt";

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

type FrameStyle = "polaroid" | "tape" | "soft";
type PhotoCount = 1 | 2 | 3;

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

  const [bgStyle, setBgStyle] = useState<BgStyle>("bakery");
  const [frameStyle, setFrameStyle] = useState<FrameStyle>("polaroid");
  const [palette, setPalette] = useState<PastelPalette>(PASTEL_PALETTES[0]);

  const [logoPos, setLogoPos] = useState<Point>({ x: 0.5, y: 0.088 });
  const [logoScalePct, setLogoScalePct] = useState(21);

  const [titleTop, setTitleTop] = useState("Pedidos del día");
  const [titleScript, setTitleScript] = useState("de hoy");
  const [footerText, setFooterText] = useState("");
  const [showWhatsappIcon, setShowWhatsappIcon] = useState(true);
  const [textFrame, setTextFrame] = useState<TextFrameStyle>("scalloped");
  const [separatorStyle, setSeparatorStyle] = useState<SeparatorStyle>("none");
  const [textPos, setTextPos] = useState<Point>({ x: 0.5, y: 0.205 });
  const [textScalePct, setTextScalePct] = useState(100);
  const [separatorPos, setSeparatorPos] = useState<Point>({ x: 0.5, y: 0.28 });
  const [footerPos, setFooterPos] = useState<Point>({ x: 0.5, y: 0.94 });

  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [stageSize, setStageSize] = useState<Size>({ w: 320, h: 568 });
  const [activeElementModal, setActiveElementModal] = useState<
    "frame" | "text" | "separator" | "logo" | "footer" | null
  >(null);
  const [isExporting, setIsExporting] = useState(false);
  const [liveStatus, setLiveStatus] = useState("");

  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetSlotRef = useRef(0);
  const slotImagesRef = useRef<(HTMLImageElement | null)[]>([null, null, null]);
  const slotDragDepthRef = useRef<Record<number, number>>({});

  const dragOriginRef = useRef<{
    kind: "slot" | "frame-move" | "frame-resize" | "logo" | "text" | "separator" | "footer";
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

  const isMobileViewport = () =>
    typeof window !== "undefined" && window.innerWidth < 768;

  const openElementSheet = (kind: "frame" | "text" | "separator" | "logo" | "footer") => {
    setActiveElementModal(kind);
  };

  const closeElementSheet = () => {
    setActiveElementModal(null);
  };

  const handleFloatingPointerDown = (
    kind: "logo" | "text" | "separator" | "footer",
    event: ReactPointerEvent<HTMLButtonElement | HTMLDivElement>
  ) => {
    event.stopPropagation();
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    const startPos =
      kind === "logo"
        ? logoPos
        : kind === "text"
        ? textPos
        : kind === "separator"
        ? separatorPos
        : footerPos;

    dragOriginRef.current = {
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPos,
    };
    setDraggingItem(kind);
  };

  const handleFloatingPointerMove = (
    kind: "logo" | "text" | "separator" | "footer",
    event: ReactPointerEvent<HTMLButtonElement | HTMLDivElement>
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
    } else if (kind === "text") {
      setTextPos({ x: clamp(raw.x, 0.14, 0.86), y: clamp(raw.y, 0.08, 0.92) });
    } else if (kind === "separator") {
      setSeparatorPos({ x: clamp(raw.x, 0.14, 0.86), y: clamp(raw.y, 0.06, 0.94) });
    } else if (kind === "footer") {
      setFooterPos({ x: clamp(raw.x, 0.16, 0.84), y: clamp(raw.y, 0.06, 0.96) });
    }
  };

  const endPointerDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const origin = dragOriginRef.current;
    if (!origin || origin.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const movedDist = Math.hypot(
      event.clientX - origin.startX,
      event.clientY - origin.startY
    );
    const wasTap = movedDist < 6;
    const itemKind = origin.kind;

    dragOriginRef.current = null;
    setDraggingItem(null);

    if (wasTap && isMobileViewport()) {
      if (itemKind === "slot" || itemKind === "frame-move" || itemKind === "frame-resize") {
        openElementSheet("frame");
      } else if (itemKind === "logo" || itemKind === "text" || itemKind === "separator" || itemKind === "footer") {
        openElementSheet(itemKind);
      }
    }
  };

  const handleFloatingKeyDown = (
    kind: "logo" | "text" | "separator" | "footer",
    event: KeyboardEvent<HTMLButtonElement | HTMLDivElement>
  ) => {
    const step = event.shiftKey ? 0.04 : 0.018;
    const current =
      kind === "logo"
        ? logoPos
        : kind === "text"
        ? textPos
        : kind === "separator"
        ? separatorPos
        : footerPos;
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
    } else if (kind === "text") {
      setTextPos({ x: clamp(next.x, 0.14, 0.86), y: clamp(next.y, 0.08, 0.92) });
      setLiveStatus("Posición del texto actualizada.");
    } else if (kind === "separator") {
      setSeparatorPos({ x: clamp(next.x, 0.14, 0.86), y: clamp(next.y, 0.06, 0.94) });
      setLiveStatus("Posición del separador actualizada.");
    } else if (kind === "footer") {
      setFooterPos({ x: clamp(next.x, 0.16, 0.84), y: clamp(next.y, 0.06, 0.96) });
      setLiveStatus("Posición del pie actualizada.");
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

    drawStoryBackgroundCanvas(ctx, bgStyle, palette);

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
      ctx.fillStyle = frameStyle === "soft" ? palette.wave : "#fffefa";
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
    const logoImg = await new Promise<HTMLImageElement>((resolve) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => resolve(im);
      im.onerror = () => {
        console.warn("No se pudo cargar el logo para historia, continuando sin logo");
        resolve(im);
      };
      im.src = "/dulce-victoria-logo.png";
      if (im.complete && im.naturalWidth > 0) resolve(im);
    });
    if (logoImg.naturalWidth > 0) {
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
    }

    // Brand text block
    const scaleFactor = textScalePct / 100;
    const tx = textPos.x * STORY_W;
    const ty = textPos.y * STORY_H;

    if (titleTop.trim() || titleScript.trim()) {
      drawTextFrameCanvas(ctx, textFrame, tx, ty, scaleFactor, palette);
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (titleTop.trim()) {
        ctx.fillStyle = palette.text;
        ctx.font = `600 ${Math.round(74 * scaleFactor)}px "DM Serif Display", Georgia, serif`;
        ctx.fillText(titleTop.trim(), tx, ty - (titleScript.trim() ? 38 * scaleFactor : 0));
      }
      if (titleScript.trim()) {
        ctx.fillStyle = palette.accent;
        ctx.font = `700 ${Math.round(108 * scaleFactor)}px "Dancing Script", cursive`;
        ctx.fillText(titleScript.trim(), tx, ty + (titleTop.trim() ? 48 * scaleFactor : 0));
      }
      ctx.restore();
    }

    // Separator block
    if (separatorStyle !== "none") {
      const sx = separatorPos.x * STORY_W;
      const sy = separatorPos.y * STORY_H;
      drawSeparatorCanvas(ctx, separatorStyle, sx, sy, scaleFactor, palette);
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
      const px = footerPos.x * STORY_W - pillW / 2;
      const py = footerPos.y * STORY_H - pillH / 2;

      ctx.shadowColor = "rgba(73, 43, 38, 0.14)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = "#fffefa";
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.roundRect(px, py, pillW, pillH, pillH / 2);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.stroke();

      const cy = py + pillH / 2;
      if (showWhatsappIcon) {
        const contentW = 54 + 18 + textW;
        const startX = px + (pillW - Math.min(contentW, pillW - 56)) / 2;
        const iconCx = startX + 27;
        const r = 27;

        // Circular WhatsApp badge in active accent color
        ctx.fillStyle = palette.accent;
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

        ctx.fillStyle = palette.text;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(label, startX + 72, cy + 1, pillW - 130);
      } else {
        ctx.fillStyle = palette.text;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, px + pillW / 2, cy + 1, pillW - 72);
      }
      ctx.restore();
    }

    return canvas;
  };

  const handleDownloadStory = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderStoryCanvas();
      let blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1)
      );
      if (!blob) {
        const dataUrl = canvas.toDataURL("image/png");
        const res = await fetch(dataUrl);
        blob = await res.blob();
      }
      if (!blob) throw new Error("No se pudo generar el archivo de imagen");

      const msg = await downloadPngBlob(blob, `dulce-victoria-historia-9x16-${Date.now()}.png`);
      onNotify(msg);
    } catch (err) {
      console.error("Error en handleDownloadStory:", err);
      try {
        const canvas = await renderStoryCanvas();
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `dulce-victoria-historia-9x16-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        onNotify("Historia descargada.");
      } catch (fallbackErr) {
        console.error("Fallo respaldo de descarga historia:", fallbackErr);
        onNotify("No pudimos generar la historia. Probá nuevamente.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareStory = async () => {
    setIsExporting(true);
    try {
      const canvas = await renderStoryCanvas();
      let blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1)
      );
      if (!blob) {
        const dataUrl = canvas.toDataURL("image/png");
        const res = await fetch(dataUrl);
        blob = await res.blob();
      }
      if (!blob) throw new Error("No se pudo generar el archivo de imagen");

      const res = await sharePngBlob(
        blob,
        `dulce-victoria-historia-9x16-${Date.now()}.png`,
        "Dulce Victoria — Historia 9:16"
      );
      onNotify(res.message);
    } catch (err) {
      console.error("Error en handleShareStory:", err);
      try {
        await handleDownloadStory();
      } catch {
        onNotify("Compartir cancelado o no disponible en este dispositivo.");
      }
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
        <div ref={stageRef} className="story-stage" style={{ background: palette.bg }}>
          {/* Background SVG decorations */}
          <svg
            className="story-bg-svg"
            viewBox="0 0 1080 1920"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <g fill={palette.wave}>
              <path d="M0,0 L430,0 C335,175 165,185 0,325 Z" />
              <path d="M1080,0 L730,0 C830,125 955,180 1080,270 Z" />
              <path d="M0,1920 L0,1610 C220,1705 395,1800 560,1920 Z" />
              <path d="M1080,1920 L1080,1580 C870,1665 725,1795 550,1920 Z" />
            </g>

            {bgStyle !== "clean" && (
              <g fill="none" stroke={palette.accent} strokeOpacity="0.42" strokeWidth="3">
                <path d="M0,360 C175,215 360,185 465,0" />
                <path d="M1080,1550 C875,1675 730,1790 515,1920" />
              </g>
            )}

            {bgStyle === "bakery" && (
              <g>
                {BAKERY_PLACEMENTS.map((item, idx) => {
                  const icon = BAKERY_ICONS[item.kind];
                  return (
                    <g
                      key={idx}
                      transform={`translate(${item.x} ${item.y}) rotate(${item.rotate}) scale(${item.scale})`}
                    >
                      {icon.fills.map((d, fIdx) => (
                        <path key={fIdx} d={d} fill={palette.wave} />
                      ))}
                      {icon.strokes.map((d, sIdx) => (
                        <path
                          key={sIdx}
                          d={d}
                          fill="none"
                          stroke={palette.text}
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ))}
                    </g>
                  );
                })}
                {SPARKLE_POINTS.map(([sx, sy, sr], idx) => (
                  <path
                    key={`sp-${idx}`}
                    transform={`translate(${sx} ${sy})`}
                    d={`M0,${-sr} Q0,0 ${sr},0 Q0,0 0,${sr} Q0,0 ${-sr},0 Q0,0 0,${-sr} Z`}
                    fill="none"
                    stroke={palette.accent}
                    strokeWidth="2.6"
                    strokeLinejoin="round"
                  />
                ))}
                {HEART_POINTS_BAKERY.map(([hx, hy, hs, filled], idx) => (
                  <path
                    key={`hb-${idx}`}
                    transform={`translate(${hx} ${hy})`}
                    d={`M0,${hs * 0.3} C${hs * 0.55},${-hs * 0.25} ${hs * 0.95},${hs * 0.35} 0,${hs * 0.95} C${-hs * 0.95},${hs * 0.35} ${-hs * 0.55},${-hs * 0.25} 0,${hs * 0.3} Z`}
                    fill={filled ? palette.accent : "none"}
                    stroke={palette.accent}
                    strokeWidth="2.8"
                    strokeLinejoin="round"
                  />
                ))}
              </g>
            )}

            {bgStyle === "botanical" && (
              <g>
                {[
                  { x: 92, y: 148, rot: 18 },
                  { x: 988, y: 148, rot: -18 },
                ].map((sp, idx) => (
                  <g
                    key={`top-sp-${idx}`}
                    transform={`translate(${sp.x} ${sp.y}) rotate(${sp.rot}) scale(1.55)`}
                    opacity="0.68"
                  >
                    <path d={FILLED_SPRIG_STEM} fill="none" stroke={palette.text} strokeWidth="4.2" strokeLinecap="round" />
                    {FILLED_SPRIG_LEAVES.map((d, lIdx) => (
                      <path key={lIdx} d={d} fill={palette.text} />
                    ))}
                  </g>
                ))}
                {[118, 962].map((cx, cIdx) => (
                  <g key={`cl-${cIdx}`} transform={`translate(${cx} 1785) scale(1.35)`} opacity="0.82">
                    {CLUSTER_SPRIGS.map((sp, sIdx) => (
                      <g
                        key={sIdx}
                        transform={`translate(${sp.x} ${sp.y}) rotate(${sp.rot}) scale(${sp.scale})`}
                      >
                        <path d={FILLED_SPRIG_STEM} fill="none" stroke={palette.text} strokeWidth="3.2" strokeLinecap="round" />
                        {FILLED_SPRIG_LEAVES.map((d, lIdx) => (
                          <path key={lIdx} d={d} fill={palette.bg} stroke={palette.text} strokeWidth="2.6" />
                        ))}
                      </g>
                    ))}
                    <path
                      transform="translate(22 -46)"
                      d="M0,6 C11,-5 19,7 0,19 C-19,7 -11,-5 0,6 Z"
                      fill={palette.accent}
                    />
                    <path
                      transform="translate(-56 -34)"
                      d="M0,-11 Q0,0 11,0 Q0,0 0,11 Q0,0 -11,0 Q0,0 0,-11 Z"
                      fill="none"
                      stroke={palette.text}
                      strokeWidth="2.6"
                    />
                    <path
                      transform="translate(-40 -14)"
                      d="M0,-8 Q0,0 8,0 Q0,0 0,8 Q0,0 -8,0 Q0,0 0,-8 Z"
                      fill="none"
                      stroke={palette.text}
                      strokeWidth="2.6"
                    />
                  </g>
                ))}
                {[
                  [210, 96, 12],
                  [870, 96, 12],
                ].map(([sx, sy, sr], idx) => (
                  <path
                    key={`bsp-${idx}`}
                    transform={`translate(${sx} ${sy})`}
                    d={`M0,${-sr} Q0,0 ${sr},0 Q0,0 0,${sr} Q0,0 ${-sr},0 Q0,0 0,${-sr} Z`}
                    fill="none"
                    stroke={palette.accent}
                    strokeWidth="2.6"
                  />
                ))}
                <path
                  d="M265,202 C278,189 288,203 265,218 C242,203 252,189 265,202 Z"
                  fill="none"
                  stroke={palette.accent}
                  strokeWidth="3.2"
                />
                <path
                  d="M815,202 C828,189 838,203 815,218 C792,203 802,189 815,202 Z"
                  fill="none"
                  stroke={palette.accent}
                  strokeWidth="3.2"
                />
              </g>
            )}

            {bgStyle === "waves" && (
              <g strokeLinecap="round" strokeWidth="5.5" stroke={palette.accent}>
                <line x1="285" y1="136" x2="253" y2="122" />
                <line x1="285" y1="136" x2="249" y2="136" />
                <line x1="285" y1="136" x2="253" y2="150" />
                <line x1="795" y1="136" x2="827" y2="122" />
                <line x1="795" y1="136" x2="831" y2="136" />
                <line x1="795" y1="136" x2="827" y2="150" />
                <path
                  d="M118,300 C134,282 146,302 118,322 C90,302 102,282 118,300 Z"
                  fill="none"
                  strokeWidth="3.8"
                />
                <path
                  d="M962,300 C978,282 990,302 962,322 C934,302 946,282 962,300 Z"
                  fill="none"
                  strokeWidth="3.8"
                />
                <path
                  d="M540,1748 C554,1734 564,1750 540,1766 C516,1750 526,1734 540,1748 Z"
                  fill={palette.accent}
                  stroke="none"
                />
                <line x1="400" y1="1754" x2="498" y2="1754" strokeWidth="2.8" />
                <line x1="582" y1="1754" x2="680" y2="1754" strokeWidth="2.8" />
              </g>
            )}

            {bgStyle === "hearts" && (
              <g>
                <path d="M118,275 C136,256 150,278 118,300 C86,278 100,256 118,275 Z" fill="none" stroke={palette.accent} strokeWidth="4" />
                <path d="M962,275 C980,256 994,278 962,300 C930,278 944,256 962,275 Z" fill="none" stroke={palette.accent} strokeWidth="4" />
                <path d="M218,172 C230,159 240,174 218,189 C196,174 206,159 218,172 Z" fill={palette.wave} stroke={palette.accent} strokeWidth="2.6" />
                <path d="M862,172 C874,159 884,174 862,189 C840,174 850,159 862,172 Z" fill={palette.wave} stroke={palette.accent} strokeWidth="2.6" />
                <path d="M96,1720 C114,1702 128,1723 96,1744 C64,1723 78,1702 96,1720 Z" fill="none" stroke={palette.accent} strokeWidth="4" />
                <path d="M984,1720 C1002,1702 1016,1723 984,1744 C952,1723 966,1702 984,1720 Z" fill="none" stroke={palette.accent} strokeWidth="4" />
                {SPARKLE_POINTS.map(([sx, sy, sr], idx) => (
                  <path
                    key={`hsp-${idx}`}
                    transform={`translate(${sx} ${sy})`}
                    d={`M0,${-sr} Q0,0 ${sr},0 Q0,0 0,${sr} Q0,0 ${-sr},0 Q0,0 0,${-sr} Z`}
                    fill="none"
                    stroke={palette.accent}
                    strokeWidth="2.6"
                  />
                ))}
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
              className={`story-text-handle ${
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
              {textFrame !== "none" && (
                <svg
                  className="pointer-events-none absolute inset-[-14%_-16%] h-[128%] w-[132%] overflow-visible"
                  viewBox="-370 -145 740 270"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {textFrame === "brush" && (
                    <rect x="-330" y="-105" width="660" height="215" rx="100" fill={palette.wave} fillOpacity="0.92" />
                  )}
                  {textFrame === "scalloped" && (
                    <>
                      <rect x="-340" y="-112" width="680" height="224" rx="52" fill="#fffefa" stroke={palette.accent} strokeWidth="4.5" />
                      <rect x="-322" y="-96" width="644" height="192" rx="40" fill="none" stroke={palette.accent} strokeWidth="2.6" strokeDasharray="12 9" />
                    </>
                  )}
                  {textFrame === "heart-label" && (
                    <>
                      <rect x="-340" y="-108" width="680" height="216" rx="36" fill={palette.bg} stroke={palette.text} strokeWidth="4" />
                      <rect x="-324" y="-93" width="648" height="186" rx="26" fill="none" stroke={palette.wave} strokeWidth="8" />
                      <path
                        d="M0,-116 C14,-130 24,-115 0,-99 C-24,-115 -14,-130 0,-116 Z"
                        fill={palette.wave}
                        stroke={palette.accent}
                        strokeWidth="3"
                      />
                    </>
                  )}
                  {textFrame === "ribbon" && (
                    <>
                      <path d="M-360,-76 L-270,-76 L-270,96 L-360,96 L-330,10 Z" fill={palette.accent} />
                      <path d="M360,-76 L270,-76 L270,96 L360,96 L330,10 Z" fill={palette.accent} />
                      <rect x="-300" y="-100" width="600" height="200" rx="24" fill={palette.wave} stroke={palette.accent} strokeWidth="3" />
                    </>
                  )}
                </svg>
              )}
              {titleTop.trim() && (
                <span
                  className="story-title-serif relative z-10"
                  style={{ fontSize: `${Math.round(74 * uiScale)}px`, color: palette.text }}
                >
                  {titleTop}
                </span>
              )}
              {titleScript.trim() && (
                <span
                  className="story-title-script relative z-10"
                  style={{ fontSize: `${Math.round(108 * uiScale)}px`, color: palette.accent }}
                >
                  {titleScript}
                </span>
              )}
            </button>
          )}

          {/* Movable Separator Block */}
          {separatorStyle !== "none" && (
            <button
              type="button"
              className={`story-separator-handle ${
                draggingItem === "separator" ? "is-dragging" : ""
              }`}
              style={{
                left: `${separatorPos.x * 100}%`,
                top: `${separatorPos.y * 100}%`,
              }}
              aria-label="Mover separador decorativo. Arrastrá o usá las flechas."
              onPointerDown={(e) => handleFloatingPointerDown("separator", e)}
              onPointerMove={(e) => handleFloatingPointerMove("separator", e)}
              onPointerUp={endPointerDrag}
              onPointerCancel={endPointerDrag}
              onLostPointerCapture={endPointerDrag}
              onKeyDown={(e) => handleFloatingKeyDown("separator", e)}
            >
              <svg
                style={{
                  width: `${Math.round(460 * uiScale * (textScalePct / 100))}px`,
                  height: `${Math.round(52 * uiScale * (textScalePct / 100))}px`,
                }}
                viewBox="-230 -36 460 66"
                aria-hidden="true"
                className="overflow-visible"
              >
                {separatorStyle === "leaves-heart" && (
                  <g>
                    <path
                      d="M0,-6 C15,-21 26,-4 0,13 C-26,-4 -15,-21 0,-6 Z"
                      fill={palette.wave}
                      stroke={palette.accent}
                      strokeWidth="3.5"
                    />
                    {[-1, 1].map((dir) => (
                      <g key={dir} transform={`scale(${dir} 1)`} stroke={palette.text} fill={palette.bg} strokeWidth="3" strokeLinecap="round">
                        <line x1="42" y1="0" x2="155" y2="0" />
                        <ellipse cx="12" cy="0" rx="12" ry="5.5" transform="translate(68 0) rotate(-38)" />
                        <ellipse cx="12" cy="0" rx="12" ry="5.5" transform="translate(72 0) rotate(38)" />
                        <ellipse cx="12" cy="0" rx="12" ry="5.5" transform="translate(102 0) rotate(-34)" />
                        <ellipse cx="12" cy="0" rx="12" ry="5.5" transform="translate(106 0) rotate(34)" />
                        <ellipse cx="12" cy="0" rx="12" ry="5.5" transform="translate(136 0) rotate(-28)" />
                        <ellipse cx="12" cy="0" rx="12" ry="5.5" transform="translate(140 0) rotate(28)" />
                        <ellipse cx="12" cy="0" rx="12" ry="5.5" transform="translate(168 0)" />
                      </g>
                    ))}
                  </g>
                )}
                {separatorStyle === "dots-heart" && (
                  <g>
                    <line x1="-190" y1="0" x2="-68" y2="0" stroke={palette.text} strokeWidth="4" strokeLinecap="round" />
                    <line x1="68" y1="0" x2="190" y2="0" stroke={palette.text} strokeWidth="4" strokeLinecap="round" />
                    <circle cx="-48" cy="0" r="5.5" fill={palette.text} />
                    <circle cx="48" cy="0" r="5.5" fill={palette.text} />
                    <path
                      d="M0,-6 C15,-21 26,-4 0,13 C-26,-4 -15,-21 0,-6 Z"
                      fill={palette.wave}
                      stroke={palette.accent}
                      strokeWidth="3.5"
                    />
                  </g>
                )}
                {separatorStyle === "swirl-heart" && (
                  <path
                    d="M-220,12 C-150,-14 -80,28 -18,12 C8,5 22,-18 8,-28 C-2,-34 -12,-24 -2,-14 C10,-24 0,-34 -10,-28 C-24,-18 -10,5 18,12 C80,28 150,-14 220,12"
                    fill="none"
                    stroke={palette.accent}
                    strokeWidth="4.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </button>
          )}

          {/* Movable Optional Footer Badge */}
          {footerText.trim() && (
            <div
              tabIndex={0}
              role="button"
              aria-label="Mover pie de página con número. Arrastrá o usá las flechas."
              className={`story-footer-pill ${showWhatsappIcon ? "has-wp" : ""} ${
                draggingItem === "footer" ? "is-dragging" : ""
              }`}
              style={{
                left: `${footerPos.x * 100}%`,
                top: `${footerPos.y * 100}%`,
                fontSize: `${Math.max(10, Math.round(36 * uiScale))}px`,
                borderColor: palette.accent,
                color: palette.text,
              }}
              onPointerDown={(e) => handleFloatingPointerDown("footer", e)}
              onPointerMove={(e) => handleFloatingPointerMove("footer", e)}
              onPointerUp={endPointerDrag}
              onPointerCancel={endPointerDrag}
              onLostPointerCapture={endPointerDrag}
              onKeyDown={(e) => handleFloatingKeyDown("footer", e)}
            >
              {showWhatsappIcon && (
                <span
                  className="story-wp-badge"
                  aria-hidden="true"
                  style={{ backgroundColor: palette.accent }}
                >
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
          Tocá cualquier elemento para abrir sus controles y arrastralo para moverlo
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
          <div className="space-y-1.5">
            <p className="studio-label flex items-center gap-1.5">
              <Type size={13} aria-hidden="true" />
              Texto y marquito
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["scalloped", "Etiqueta"],
                  ["heart-label", "Corazón"],
                  ["ribbon", "Cinta"],
                  ["brush", "Pincelada"],
                  ["none", "Sin marco"],
                ] as [TextFrameStyle, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className="studio-chip"
                  aria-pressed={textFrame === id}
                  onClick={() => setTextFrame(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="studio-label pt-1">Separador</p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["leaves-heart", "Ramitas ♥"],
                  ["dots-heart", "Líneas ♥"],
                  ["swirl-heart", "Firulete ♥"],
                  ["none", "Sin separador"],
                ] as [SeparatorStyle, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className="studio-chip"
                  aria-pressed={separatorStyle === id}
                  onClick={() => setSeparatorStyle(id)}
                >
                  {label}
                </button>
              ))}
            </div>
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
                  ["bakery", "Pastelería"],
                  ["botanical", "Botánico"],
                  ["waves", "Ondas"],
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

        {/* Pastel Color Palette */}
        <div className="space-y-2.5 rounded-[16px] border border-[#e6d5cd] bg-[#fcf8f4] p-3">
          <p className="studio-label flex items-center gap-1.5">
            <Palette size={13} aria-hidden="true" />
            Paleta de colores pastel
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PASTEL_PALETTES.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="studio-chip inline-flex items-center gap-1.5"
                aria-pressed={
                  palette.bg === preset.bg &&
                  palette.wave === preset.wave &&
                  palette.accent === preset.accent &&
                  palette.text === preset.text
                }
                onClick={() => setPalette(preset)}
              >
                <span className="inline-flex -space-x-1" aria-hidden="true">
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-black/15"
                    style={{ background: preset.bg }}
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-black/15"
                    style={{ background: preset.wave }}
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-black/15"
                    style={{ background: preset.accent }}
                  />
                </span>
                {preset.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 pt-0.5">
            {(
              [
                ["bg", "Fondo"],
                ["wave", "Ondas"],
                ["accent", "Acento"],
                ["text", "Texto"],
              ] as [keyof Omit<PastelPalette, "id" | "label">, string][]
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-[10px] border border-[#e8dad3] bg-white px-2 py-1.5 text-[10px] font-semibold text-[#694635]"
              >
                <input
                  type="color"
                  value={palette[key]}
                  aria-label={`Color de ${label}`}
                  onChange={(e) =>
                    setPalette((prev) => ({
                      ...prev,
                      id: "custom",
                      [key]: e.target.value,
                    }))
                  }
                  className="h-5 w-full cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span>{label}</span>
              </label>
            ))}
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

      {/* Mobile Bottom Sheet Modal */}
      {activeElementModal && (
        <>
          <div
            className="story-mobile-backdrop md:hidden"
            onClick={closeElementSheet}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="story-sheet-title"
            className="story-mobile-sheet md:hidden"
          >
            <div className="story-sheet-handle-bar" aria-hidden="true" />
            <div className="story-sheet-header">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-[#9b5962]" aria-hidden="true" />
                <h2 id="story-sheet-title" className="text-[13px] font-bold text-[#563a2a]">
                  {activeElementModal === "frame" && `Editar Marco: Foto ${selectedSlot + 1}`}
                  {activeElementModal === "text" && "Editar Título y Estilo"}
                  {activeElementModal === "separator" && "Editar Separador"}
                  {activeElementModal === "logo" && "Ajustar Tamaño del Logo"}
                  {activeElementModal === "footer" && "Editar Pie de Página"}
                </h2>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#8a6861] active:bg-[#f6eae5]"
                onClick={closeElementSheet}
                aria-label="Cerrar controles"
              >
                <X size={18} />
              </button>
            </div>

            <div className="story-sheet-body space-y-4">
              {activeElementModal === "frame" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-[#694635]">
                      Marco {selectedSlot + 1} de {photoCount}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="studio-chip"
                        onClick={() => triggerUploadForSlot(selectedSlot)}
                      >
                        <Upload size={13} className="mr-1 inline" aria-hidden="true" />
                        {currentSlot?.url ? "Cambiar foto" : "Subir foto"}
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
                          <RotateCcw size={13} className="mr-1 inline" aria-hidden="true" />
                          Centrar
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label htmlFor="sheet-slot-zoom" className="studio-label">
                        Zoom de la foto
                      </label>
                      <span className="text-[11px] font-bold text-[#694635]">
                        {Math.round((currentSlot?.zoom || 1) * 100)}%
                      </span>
                    </div>
                    <input
                      id="sheet-slot-zoom"
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
                        <label htmlFor="sheet-frame-w" className="studio-label">
                          Ancho
                        </label>
                        <span className="text-[11px] font-bold text-[#694635]">
                          {Math.round(currentRect.w * 100)}%
                        </span>
                      </div>
                      <input
                        id="sheet-frame-w"
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
                        <label htmlFor="sheet-frame-h" className="studio-label">
                          Alto
                        </label>
                        <span className="text-[11px] font-bold text-[#694635]">
                          {Math.round(currentRect.h * 100)}%
                        </span>
                      </div>
                      <input
                        id="sheet-frame-h"
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
                </div>
              )}

              {activeElementModal === "text" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="sheet-title-top" className="studio-label mb-1">
                        Línea 1 (Serif)
                      </label>
                      <input
                        id="sheet-title-top"
                        type="text"
                        className="story-input"
                        value={titleTop}
                        onChange={(e) => setTitleTop(e.target.value)}
                        placeholder="Ej: Pedidos del día"
                      />
                    </div>
                    <div>
                      <label htmlFor="sheet-title-script" className="studio-label mb-1">
                        Línea 2 (Cursiva)
                      </label>
                      <input
                        id="sheet-title-script"
                        type="text"
                        className="story-input"
                        value={titleScript}
                        onChange={(e) => setTitleScript(e.target.value)}
                        placeholder="Ej: de hoy"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="studio-label mb-1.5">Estilo del marquito</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          ["scalloped", "Etiqueta"],
                          ["heart-label", "Corazón"],
                          ["ribbon", "Cinta"],
                          ["brush", "Pincelada"],
                          ["none", "Sin marco"],
                        ] as [TextFrameStyle, string][]
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          className="studio-chip"
                          aria-pressed={textFrame === id}
                          onClick={() => setTextFrame(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label htmlFor="sheet-text-size" className="studio-label">
                        Tamaño del texto
                      </label>
                      <span className="text-[11px] font-bold text-[#694635]">{textScalePct}%</span>
                    </div>
                    <input
                      id="sheet-text-size"
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
              )}

              {activeElementModal === "separator" && (
                <div className="space-y-3">
                  <p className="studio-label">Estilo del separador</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["leaves-heart", "Ramitas ♥"],
                        ["dots-heart", "Líneas ♥"],
                        ["swirl-heart", "Firulete ♥"],
                        ["none", "Desactivar"],
                      ] as [SeparatorStyle, string][]
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className="studio-chip"
                        aria-pressed={separatorStyle === id}
                        onClick={() => setSeparatorStyle(id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeElementModal === "logo" && (
                <div className="space-y-3">
                  <div className="mb-1 flex items-center justify-between">
                    <label htmlFor="sheet-logo-size" className="studio-label">
                      Tamaño del logo
                    </label>
                    <span className="text-[11px] font-bold text-[#694635]">{logoScalePct}%</span>
                  </div>
                  <input
                    id="sheet-logo-size"
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
              )}

              {activeElementModal === "footer" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="sheet-footer-text" className="studio-label">
                      Texto del pie
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
                    id="sheet-footer-text"
                    type="text"
                    className="story-input"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Ej: Pedidos al 388 465-2336"
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
