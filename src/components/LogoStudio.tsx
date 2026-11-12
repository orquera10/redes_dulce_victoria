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
  Upload,
} from "lucide-react";

type LogoStudioProps = {
  onNotify: (message: string, duration?: number) => void;
};

type Point = {
  x: number;
  y: number;
};

type Size = {
  w: number;
  h: number;
};

const EXPORT_SIZE = 1080;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function LogoStudio({ onNotify }: LogoStudioProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<Size>({ w: 0, h: 0 });
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePan, setImagePan] = useState<Point>({ x: 0, y: 0 });

  const [logoPos, setLogoPos] = useState<Point>({ x: 0.82, y: 0.82 });
  const [logoScalePct, setLogoScalePct] = useState(24);
  const [logoOpacityPct, setLogoOpacityPct] = useState(100);

  const [draggingTarget, setDraggingTarget] = useState<"image" | "logo" | null>(null);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const [stagePixels, setStagePixels] = useState(360);
  const [liveStatus, setLiveStatus] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedImgRef = useRef<HTMLImageElement | null>(null);
  const fileDragDepthRef = useRef(0);

  const dragOriginRef = useRef<{
    target: "image" | "logo";
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPan: Point;
    startLogo: Point;
  } | null>(null);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) setStagePixels(rect.width);
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const clampLogoPos = (pos: Point, scalePct = logoScalePct): Point => {
    const half = scalePct / 200;
    const min = Math.min(0.45, half + 0.02);
    const max = Math.max(0.55, 1 - half - 0.02);
    return {
      x: clamp(pos.x, min, max),
      y: clamp(pos.y, min, max),
    };
  };

  const getCoverMetrics = (boxSize: number, zoom: number) => {
    if (imageSize.w <= 0 || imageSize.h <= 0 || boxSize <= 0) {
      return { dispW: boxSize, dispH: boxSize, maxPanX: 0, maxPanY: 0 };
    }
    const coverScale = Math.max(boxSize / imageSize.w, boxSize / imageSize.h) * zoom;
    const dispW = imageSize.w * coverScale;
    const dispH = imageSize.h * coverScale;
    return {
      dispW,
      dispH,
      maxPanX: Math.max(0, (dispW - boxSize) / 2),
      maxPanY: Math.max(0, (dispH - boxSize) / 2),
    };
  };

  useEffect(() => {
    const preventFileNavigation = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types?.includes("Files")) {
        event.preventDefault();
      }
    };
    window.addEventListener("dragover", preventFileNavigation);
    window.addEventListener("drop", preventFileNavigation);
    return () => {
      window.removeEventListener("dragover", preventFileNavigation);
      window.removeEventListener("drop", preventFileNavigation);
    };
  }, []);

  const loadImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      onNotify("Seleccioná un archivo de imagen (JPG, PNG o WebP).");
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      uploadedImgRef.current = probe;
      setImageSize({ w: probe.naturalWidth, h: probe.naturalHeight });
      setImageUrl(nextUrl);
      setImageZoom(1);
      setImagePan({ x: 0, y: 0 });
      setLiveStatus("Imagen cargada en formato cuadrado 1 a 1.");
      onNotify("Foto cargada. Arrastrá la imagen o el logo para encuadrar.");
    };
    probe.onerror = () => {
      URL.revokeObjectURL(nextUrl);
      onNotify("No pudimos leer esa imagen. Probá con otro archivo.");
    };
    probe.src = nextUrl;
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    loadImageFile(file);
    event.target.value = "";
  };

  const hasDraggedFiles = (event: DragEvent<HTMLElement>) =>
    Array.from(event.dataTransfer?.types ?? []).includes("Files");

  const handleStageDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    fileDragDepthRef.current += 1;
    setIsFileDragOver(true);
  };

  const handleStageDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleStageDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    fileDragDepthRef.current = Math.max(0, fileDragDepthRef.current - 1);
    if (fileDragDepthRef.current === 0) {
      setIsFileDragOver(false);
    }
  };

  const handleStageDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    fileDragDepthRef.current = 0;
    setIsFileDragOver(false);

    const file = event.dataTransfer.files?.[0];
    if (file) loadImageFile(file);
  };

  const handleImagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!imageUrl) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragOriginRef.current = {
      target: "image",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPan: imagePan,
      startLogo: logoPos,
    };
    setDraggingTarget("image");
  };

  const handleImagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const origin = dragOriginRef.current;
    if (!origin || origin.target !== "image" || origin.pointerId !== event.pointerId) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    const { maxPanX, maxPanY } = getCoverMetrics(stagePixels, imageZoom);
    const deltaX = event.clientX - origin.startClientX;
    const deltaY = event.clientY - origin.startClientY;

    setImagePan({
      x: maxPanX > 0 ? clamp(origin.startPan.x + deltaX / maxPanX, -1, 1) : 0,
      y: maxPanY > 0 ? clamp(origin.startPan.y + deltaY / maxPanY, -1, 1) : 0,
    });
  };

  const handleLogoPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (event.pointerType === "mouse" && event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragOriginRef.current = {
      target: "logo",
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPan: imagePan,
      startLogo: logoPos,
    };
    setDraggingTarget("logo");
  };

  const handleLogoPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const origin = dragOriginRef.current;
    if (!origin || origin.target !== "logo" || origin.pointerId !== event.pointerId) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    const deltaX = (event.clientX - origin.startClientX) / stagePixels;
    const deltaY = (event.clientY - origin.startClientY) / stagePixels;

    setLogoPos(
      clampLogoPos({
        x: origin.startLogo.x + deltaX,
        y: origin.startLogo.y + deltaY,
      })
    );
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const origin = dragOriginRef.current;
    if (!origin || origin.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragOriginRef.current = null;
    setDraggingTarget(null);
  };

  const handleLogoKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 0.06 : 0.025;
    let next: Point | null = null;
    if (event.key === "ArrowLeft") next = { x: logoPos.x - step, y: logoPos.y };
    if (event.key === "ArrowRight") next = { x: logoPos.x + step, y: logoPos.y };
    if (event.key === "ArrowUp") next = { x: logoPos.x, y: logoPos.y - step };
    if (event.key === "ArrowDown") next = { x: logoPos.x, y: logoPos.y + step };
    if (!next) return;

    event.preventDefault();
    setLogoPos(clampLogoPos(next));
    setLiveStatus("Posición del logo actualizada.");
  };

  const handleImageKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!imageUrl) return;
    const step = event.shiftKey ? 0.16 : 0.08;
    let next: Point | null = null;
    if (event.key === "ArrowLeft") next = { x: imagePan.x - step, y: imagePan.y };
    if (event.key === "ArrowRight") next = { x: imagePan.x + step, y: imagePan.y };
    if (event.key === "ArrowUp") next = { x: imagePan.x, y: imagePan.y - step };
    if (event.key === "ArrowDown") next = { x: imagePan.x, y: imagePan.y + step };
    if (!next) return;

    event.preventDefault();
    setImagePan({
      x: clamp(next.x, -1, 1),
      y: clamp(next.y, -1, 1),
    });
    setLiveStatus("Encuadre de la imagen actualizado.");
  };

  const setLogoPreset = (label: string, target: Point) => {
    setLogoPos(clampLogoPos(target));
    setLiveStatus(`Logo ubicado en ${label}.`);
  };

  const renderComposedCanvas = async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    canvas.width = EXPORT_SIZE;
    canvas.height = EXPORT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    ctx.fillStyle = "#f8f4e9";
    ctx.fillRect(0, 0, EXPORT_SIZE, EXPORT_SIZE);

    if (uploadedImgRef.current && imageUrl) {
      const { dispW, dispH, maxPanX, maxPanY } = getCoverMetrics(EXPORT_SIZE, imageZoom);
      const drawX = (EXPORT_SIZE - dispW) / 2 + imagePan.x * maxPanX;
      const drawY = (EXPORT_SIZE - dispH) / 2 + imagePan.y * maxPanY;
      ctx.drawImage(uploadedImgRef.current, drawX, drawY, dispW, dispH);
    }

    const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = "/dulce-victoria-logo.png";
    });

    const logoPx = (EXPORT_SIZE * logoScalePct) / 100;
    const logoX = logoPos.x * EXPORT_SIZE - logoPx / 2;
    const logoY = logoPos.y * EXPORT_SIZE - logoPx / 2;

    ctx.save();
    ctx.globalAlpha = logoOpacityPct / 100;
    ctx.shadowColor = "rgba(57, 34, 31, 0.24)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    ctx.drawImage(logoImg, logoX, logoY, logoPx, logoPx);
    ctx.restore();

    return canvas;
  };

  const handleDownload = async () => {
    if (!imageUrl) {
      onNotify("Primero subí una foto para crear tu imagen 1:1.");
      return;
    }
    setIsExporting(true);
    try {
      const canvas = await renderComposedCanvas();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1)
      );
      if (!blob) throw new Error("Blob failed");

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dulce-victoria-1x1-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      onNotify("Imagen 1:1 descargada en formato PNG (1080 × 1080).");
    } catch {
      onNotify("No pudimos generar la imagen. Intentá nuevamente.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (!imageUrl) {
      onNotify("Primero subí una foto para compartir.");
      return;
    }
    setIsExporting(true);
    try {
      const canvas = await renderComposedCanvas();
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1)
      );
      if (!blob) throw new Error("Blob failed");

      const file = new File([blob], "dulce-victoria-1x1.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Dulce Victoria — Imagen 1:1",
          files: [file],
        });
        onNotify("Imagen compartida.");
      } else {
        await handleDownload();
      }
    } catch {
      onNotify("Compartir cancelado o no disponible en este navegador.");
    } finally {
      setIsExporting(false);
    }
  };

  const previewMetrics = getCoverMetrics(stagePixels, imageZoom);
  const previewLeft = (stagePixels - previewMetrics.dispW) / 2 + imagePan.x * previewMetrics.maxPanX;
  const previewTop = (stagePixels - previewMetrics.dispH) / 2 + imagePan.y * previewMetrics.maxPanY;

  return (
    <div>
      <div>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b1776e]">
          Estudio visual 1:1
        </p>
        <h1 className="font-display text-[34px] leading-tight tracking-[-0.035em] md:text-[42px]">
          Prepará tu foto{" "}
          <span className="italic text-[#9b5962]">con el logo de la marca.</span>
        </h1>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,460px)_1fr] md:items-start md:gap-8">
        <div>
          <div
            ref={stageRef}
            className={`studio-stage ${imageUrl ? "has-image" : ""} ${
              draggingTarget === "image" ? "is-dragging" : ""
            } ${isFileDragOver ? "is-file-over" : ""}`}
            tabIndex={imageUrl ? 0 : -1}
            role="application"
            aria-label={
              imageUrl
                ? "Lienzo cuadrado 1 a 1. Arrastrá para encuadrar la foto o soltá otra imagen encima."
                : "Lienzo cuadrado 1 a 1 vacío. Hacé clic o arrastrá una imagen desde tu carpeta."
            }
            onPointerDown={handleImagePointerDown}
            onPointerMove={handleImagePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
            onKeyDown={handleImageKeyDown}
            onDragEnter={handleStageDragEnter}
            onDragOver={handleStageDragOver}
            onDragLeave={handleStageDragLeave}
            onDrop={handleStageDrop}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Vista previa subida para recorte 1 a 1"
                draggable={false}
                className="studio-photo"
                style={{
                  width: `${previewMetrics.dispW}px`,
                  height: `${previewMetrics.dispH}px`,
                  left: `${previewLeft}px`,
                  top: `${previewTop}px`,
                }}
              />
            ) : (
              <button
                type="button"
                className="studio-empty"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="studio-empty-icon">
                  <ImagePlus size={26} aria-hidden="true" />
                </span>
                <strong className="font-display text-xl text-[#563a2a]">
                  Subí o arrastrá una foto aquí
                </strong>
                <span className="text-[12px] text-[#8f6c66]">
                  Desde tu carpeta al cuadrado 1:1 para Instagram
                </span>
              </button>
            )}

            {isFileDragOver && (
              <div className="studio-drop-overlay" aria-hidden="true">
                <Upload size={26} />
                <span>Soltá la imagen para cargarla</span>
              </div>
            )}

            {imageUrl && (
              <div className="studio-grid-overlay" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
            )}

            <button
              type="button"
              className={`studio-logo-handle ${draggingTarget === "logo" ? "is-dragging" : ""}`}
              style={{
                width: `${logoScalePct}%`,
                left: `${logoPos.x * 100}%`,
                top: `${logoPos.y * 100}%`,
                opacity: logoOpacityPct / 100,
              }}
              aria-label="Mover logo de Dulce Victoria. Arrastrá o usá las flechas del teclado."
              onPointerDown={handleLogoPointerDown}
              onPointerMove={handleLogoPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onLostPointerCapture={endDrag}
              onKeyDown={handleLogoKeyDown}
            >
              <img src="/dulce-victoria-logo.png" alt="Logo Dulce Victoria" draggable={false} />
            </button>
          </div>

          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#8f6c66]">
            <Move size={13} aria-hidden="true" />
            Arrastrá la foto para encuadrar y mové el logo libremente
          </p>
        </div>

        <div className="studio-panel space-y-5">
          <input
            ref={fileInputRef}
            id="studio-file-input"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
          />

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              className="studio-primary-btn flex-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} aria-hidden="true" />
              {imageUrl ? "Cambiar foto" : "Subir foto"}
            </button>
            {imageUrl && (
              <button
                type="button"
                className="studio-secondary-btn"
                onClick={() => {
                  setImageZoom(1);
                  setImagePan({ x: 0, y: 0 });
                  setLiveStatus("Encuadre de foto centrado.");
                }}
              >
                <RotateCcw size={15} aria-hidden="true" />
                Centrar foto
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="studio-image-zoom" className="studio-label">
                  Zoom de la foto
                </label>
                <span className="text-[12px] font-bold text-[#694635]">
                  {Math.round(imageZoom * 100)}%
                </span>
              </div>
              <input
                id="studio-image-zoom"
                type="range"
                min={1}
                max={2.6}
                step={0.05}
                value={imageZoom}
                disabled={!imageUrl}
                aria-valuetext={`${Math.round(imageZoom * 100)} por ciento`}
                onChange={(e) => {
                  const nextZoom = Number(e.target.value);
                  setImageZoom(nextZoom);
                }}
                className="studio-range"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="studio-logo-size" className="studio-label">
                  Tamaño del logo
                </label>
                <span className="text-[12px] font-bold text-[#694635]">{logoScalePct}%</span>
              </div>
              <input
                id="studio-logo-size"
                type="range"
                min={14}
                max={45}
                step={1}
                value={logoScalePct}
                aria-valuetext={`${logoScalePct} por ciento del cuadrado`}
                onChange={(e) => {
                  const nextScale = Number(e.target.value);
                  setLogoScalePct(nextScale);
                  setLogoPos((prev) => clampLogoPos(prev, nextScale));
                }}
                className="studio-range"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="studio-logo-opacity" className="studio-label">
                  Opacidad del logo
                </label>
                <span className="text-[12px] font-bold text-[#694635]">{logoOpacityPct}%</span>
              </div>
              <input
                id="studio-logo-opacity"
                type="range"
                min={40}
                max={100}
                step={5}
                value={logoOpacityPct}
                aria-valuetext={`${logoOpacityPct} por ciento`}
                onChange={(e) => setLogoOpacityPct(Number(e.target.value))}
                className="studio-range"
              />
            </div>
          </div>

          <div>
            <p className="studio-label mb-2">Ubicación rápida del logo</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="studio-chip"
                onClick={() => setLogoPreset("esquina superior izquierda", { x: 0.18, y: 0.18 })}
              >
                Sup. izq
              </button>
              <button
                type="button"
                className="studio-chip"
                onClick={() => setLogoPreset("esquina superior derecha", { x: 0.82, y: 0.18 })}
              >
                Sup. der
              </button>
              <button
                type="button"
                className="studio-chip"
                onClick={() => setLogoPreset("centro", { x: 0.5, y: 0.5 })}
              >
                Centro
              </button>
              <button
                type="button"
                className="studio-chip"
                onClick={() => setLogoPreset("esquina inferior izquierda", { x: 0.18, y: 0.82 })}
              >
                Inf. izq
              </button>
              <button
                type="button"
                className="studio-chip"
                onClick={() => setLogoPreset("esquina inferior derecha", { x: 0.82, y: 0.82 })}
              >
                Inf. der
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              className="studio-download-btn flex-1"
              disabled={!imageUrl || isExporting}
              onClick={handleDownload}
            >
              <Download size={17} aria-hidden="true" />
              Descargar 1:1
            </button>
            <button
              type="button"
              className="studio-secondary-btn"
              disabled={!imageUrl || isExporting}
              onClick={handleShare}
            >
              <Share2 size={16} aria-hidden="true" />
              Compartir
            </button>
          </div>

          <div className="flex items-start gap-2 rounded-[14px] bg-[#f8eee7] px-3.5 py-2.5 text-[12px] text-[#7c5b53]">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-[#bd807d]" aria-hidden="true" />
            <span>
              Se exporta en <strong>1080 × 1080 px</strong> con el recorte exacto que ves en
              pantalla.
            </span>
          </div>

          <div className="sr-only" aria-live="polite">
            {liveStatus}
          </div>
        </div>
      </div>
    </div>
  );
}
