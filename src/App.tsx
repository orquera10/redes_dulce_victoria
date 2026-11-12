import { type CSSProperties, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  Home,
  ImagePlus,
  Lightbulb,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { LogoStudio } from "./components/LogoStudio";

type Post = {
  id: number;
  day: string;
  date: string;
  time: string;
  title: string;
  format: string;
  channel: string;
  tone: "rose" | "lilac" | "peach";
  done: boolean;
};

type Tab = "agenda" | "ideas" | "studio" | "progress";

const STORAGE_KEY = "dulce_victoria_posts_v1";

const initialPosts: Post[] = [
  {
    id: 1,
    day: "LUN",
    date: "12",
    time: "19:00",
    title: "Detrás de escena",
    format: "Reel · Preparando pedidos",
    channel: "Instagram",
    tone: "rose",
    done: true,
  },
  {
    id: 2,
    day: "MIÉ",
    date: "14",
    time: "12:30",
    title: "Producto favorito",
    format: "Carrusel · 4 fotos",
    channel: "Instagram",
    tone: "lilac",
    done: false,
  },
  {
    id: 3,
    day: "SÁB",
    date: "17",
    time: "11:00",
    title: "Momento dulce",
    format: "Historia · Encuesta",
    channel: "Instagram",
    tone: "peach",
    done: false,
  },
];

const ideas: [string, string][] = [
  ["El detalle de la semana", "Mostrá un primer plano del producto y contá qué lo hace especial."],
  ["Antes y después", "Compartí el proceso: desde los ingredientes hasta el resultado final."],
  ["Tu comunidad elige", "Usá una encuesta en historias para decidir el próximo sabor."],
];

const weekLabels = ["5 — 11 AGO", "12 — 18 AGO", "19 — 25 AGO"];

function loadPosts(): Post[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialPosts;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialPosts;
  } catch {
    return initialPosts;
  }
}

export default function App() {
  const [posts, setPosts] = useState<Post[]>(loadPosts);
  const [activeTab, setActiveTab] = useState<Tab>("agenda");
  const [week, setWeek] = useState(1);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const noticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    } catch {
      // Ignore storage quota errors
    }
  }, [posts]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isComposerOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isComposerOpen]);

  // Progressive enhancement fallback for browsers without <dialog closedby="any">
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    const outside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    let pressedOutside = false;
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = outside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && outside(e)) {
        dialog.close();
      }
    };

    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const showToast = (message: string, duration = 2400) => {
    setNotice(message);
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice("");
      noticeTimerRef.current = null;
    }, duration);
  };

  const completed = posts.filter((post) => post.done).length;
  const progress = Math.round((completed / Math.max(posts.length, 1)) * 100);
  const sortedPosts = useMemo(() => posts, [posts]);

  const toggleDone = (id: number) => {
    setPosts((current) =>
      current.map((post) => (post.id === id ? { ...post, done: !post.done } : post)),
    );
  };

  const addPost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const dayValue = String(data.get("day"));
    const dayMap: Record<string, [string, string]> = {
      Lunes: ["LUN", "19"],
      Miércoles: ["MIÉ", "21"],
      Viernes: ["VIE", "23"],
      Domingo: ["DOM", "25"],
    };
    const [day, date] = dayMap[dayValue] ?? ["MIÉ", "21"];

    setPosts((current) => [
      ...current,
      {
        id: Date.now(),
        day,
        date,
        time: String(data.get("time")),
        title: String(data.get("title")).trim(),
        format: `${String(data.get("format"))} · Nuevo contenido`,
        channel: "Instagram",
        tone: "rose",
        done: false,
      },
    ]);
    form.reset();
    setComposerOpen(false);
    showToast("Contenido agendado");
  };

  return (
    <div className="min-h-dvh bg-[#f8f4e9] text-[#563a2a]">
      <header className="sticky top-0 z-20 border-b border-[#eaded7]/80 bg-[#f8f4e9]/95 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-5 py-3.5 md:px-8 md:py-4">
          <button
            type="button"
            className="brand-logo-button"
            onClick={() => setActiveTab("agenda")}
            aria-label="Ir a la agenda de Dulce Victoria"
          >
            <img src="/dulce-victoria-logo.png" alt="Dulce Victoria" />
          </button>

          <div className="ml-auto mr-1 text-right leading-none md:ml-1 md:mr-0 md:text-left">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#bd807d] md:text-[10px]">
              Mi plan semanal
            </p>
            <p className="mt-1.5 font-display text-[14px] italic text-[#694635] md:text-[15px]">
              Crear · compartir · crecer
            </p>
          </div>

          <nav className="top-nav md:ml-auto" aria-label="Navegación principal">
            <button
              type="button"
              className="top-nav-link"
              aria-current={activeTab === "agenda" ? "page" : undefined}
              onClick={() => setActiveTab("agenda")}
            >
              <Home size={16} aria-hidden="true" />
              <span>Agenda</span>
            </button>
            <button
              type="button"
              className="top-nav-link"
              aria-current={activeTab === "ideas" ? "page" : undefined}
              onClick={() => setActiveTab("ideas")}
            >
              <Lightbulb size={16} aria-hidden="true" />
              <span>Ideas</span>
            </button>
            <button
              type="button"
              className="top-nav-link"
              aria-current={activeTab === "studio" ? "page" : undefined}
              onClick={() => setActiveTab("studio")}
            >
              <ImagePlus size={16} aria-hidden="true" />
              <span>Logo 1:1</span>
            </button>
            <button
              type="button"
              className="top-nav-link"
              aria-current={activeTab === "progress" ? "page" : undefined}
              onClick={() => setActiveTab("progress")}
            >
              <BarChart3 size={16} aria-hidden="true" />
              <span>Progreso</span>
            </button>
          </nav>

          <div className="flex items-center gap-2.5 md:ml-2">
            <button
              type="button"
              className="header-cta"
              onClick={() => setComposerOpen(true)}
            >
              <Plus size={16} aria-hidden="true" />
              <span>Agendar</span>
            </button>

            <button
              type="button"
              className="icon-button relative"
              aria-label="Ver recordatorios"
              onClick={() => showToast("Todo al día. Te avisaremos antes de publicar.", 2800)}
            >
              <Bell size={19} strokeWidth={1.8} aria-hidden="true" />
              <span
                aria-hidden="true"
                className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-[#f8f4e9] bg-[#bd807d]"
              />
            </button>

            <button
              type="button"
              className="profile-pill"
              onClick={() => showToast("Tu perfil de Dulce Victoria está listo.")}
            >
              <img className="mini-avatar" src="/dulce-victoria-logo.png" alt="" />
              <span>Perfil</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 pb-28 pt-6 md:px-8 md:pb-16 md:pt-10">
        {activeTab === "agenda" && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1.45fr)_340px] md:grid-rows-[auto_auto_1fr] md:items-start md:gap-x-8 md:gap-y-5">
            <div className="md:col-span-2">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b1776e]">
                Tu semana creativa
              </p>
              <h1 className="font-display text-[34px] leading-[1.05] tracking-[-0.035em] md:text-[42px]">
                Crecer también es <span className="italic text-[#9b5962]">ser constante.</span>
              </h1>
            </div>

            <section
              className="progress-card md:col-start-2 md:row-start-2"
              aria-label="Resumen semanal"
            >
              <div>
                <p className="text-[12px] font-semibold text-[#74504d] md:text-[13px]">
                  Objetivo semanal
                </p>
                <p className="mt-1 text-[11px] text-[#a07b75] md:text-[12px]">
                  {completed} de {posts.length} contenidos publicados
                </p>
              </div>
              <div
                className="progress-ring"
                style={{ "--progress": `${progress * 3.6}deg` } as CSSProperties}
              >
                <span>{progress}%</span>
              </div>
            </section>

            <div className="md:col-start-1 md:row-start-2 md:row-span-2">
              <div className="mb-4 flex items-center justify-between border-y border-[#eaded7] py-3">
                <button
                  type="button"
                  className="week-button"
                  onClick={() => setWeek((current) => Math.max(0, current - 1))}
                  disabled={week === 0}
                  aria-label="Semana anterior"
                >
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <div className="flex items-center gap-2">
                  <CalendarDays size={14} className="text-[#b66f6c]" aria-hidden="true" />
                  <span className="text-[11px] font-bold tracking-[0.14em] md:text-[12px]">
                    {weekLabels[week]}
                  </span>
                </div>
                <button
                  type="button"
                  className="week-button"
                  onClick={() => setWeek((current) => Math.min(2, current + 1))}
                  disabled={week === 2}
                  aria-label="Semana siguiente"
                >
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-3">
                {sortedPosts.map((post) => (
                  <article className={`post-card ${post.done ? "is-done" : ""}`} key={post.id}>
                    <div className={`date-block ${post.tone}`}>
                      <span>{post.day}</span>
                      <strong>{post.date}</strong>
                    </div>
                    <div className="min-w-0 flex-1 py-1">
                      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold text-[#a06c67] md:text-[11px]">
                        <Clock3 size={11} aria-hidden="true" />
                        {post.time}
                        <span className="text-[#d3b9ad]" aria-hidden="true">
                          •
                        </span>
                        <Camera size={11} aria-hidden="true" />
                        {post.channel}
                      </div>
                      <h2 className="truncate font-display text-[18px] font-semibold leading-tight md:text-[20px]">
                        {post.title}
                      </h2>
                      <p className="mt-1 truncate text-[11px] text-[#9d817a] md:text-[12px]">
                        {post.format}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={`check-button ${post.done ? "checked" : ""}`}
                      onClick={() => toggleDone(post.id)}
                      aria-pressed={post.done}
                      aria-label={
                        post.done
                          ? `Marcar ${post.title} como pendiente`
                          : `Marcar ${post.title} como publicado`
                      }
                    >
                      {post.done && <Check size={16} strokeWidth={3} aria-hidden="true" />}
                    </button>
                  </article>
                ))}
              </div>

              <button
                type="button"
                className="new-post-button"
                onClick={() => setComposerOpen(true)}
              >
                <Plus size={19} aria-hidden="true" />
                Agendar contenido
              </button>
            </div>

            <div className="quote md:col-start-2 md:row-start-3 md:mt-0 md:rounded-[18px] md:border md:border-[#eaded7] md:bg-[#fbf8ef] md:p-5">
              <Sparkles size={15} className="shrink-0 text-[#c26c66]" aria-hidden="true" />
              <p>
                No tiene que ser perfecto, <strong>tiene que estar publicado.</strong>
              </p>
            </div>
          </div>
        )}

        {activeTab === "ideas" && (
          <div>
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b1776e]">
                Banco creativo
              </p>
              <h1 className="font-display text-[34px] leading-tight tracking-[-0.035em] md:text-[42px]">
                Ideas para cuando{" "}
                <span className="italic text-[#9b5962]">no sabés qué subir.</span>
              </h1>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {ideas.map(([title, description], index) => (
                <article className="idea-card" key={title}>
                  <div className="idea-number">0{index + 1}</div>
                  <div>
                    <h2 className="font-display text-xl font-semibold">{title}</h2>
                    <p className="mt-1 text-[12px] leading-relaxed text-[#8e6f69] md:text-[13px]">
                      {description}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <button
              type="button"
              className="new-post-button md:mt-6 md:max-w-xs"
              onClick={() => {
                setActiveTab("agenda");
                setComposerOpen(true);
              }}
            >
              <Plus size={19} aria-hidden="true" />
              Convertir idea en contenido
            </button>
          </div>
        )}

        {activeTab === "studio" && <LogoStudio onNotify={showToast} />}

        {activeTab === "progress" && (
          <div>
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b1776e]">
                Tu avance
              </p>
              <h1 className="font-display text-[34px] leading-tight tracking-[-0.035em] md:text-[42px]">
                Cada publicación{" "}
                <span className="italic text-[#9b5962]">hace crecer tu marca.</span>
              </h1>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch md:gap-6">
              <section className="streak-card" aria-label="Racha de publicaciones">
                <Heart size={22} fill="currentColor" aria-hidden="true" />
                <strong className="font-display text-5xl">{completed}</strong>
                <p className="text-xs font-semibold uppercase tracking-[0.15em]">
                  publicaciones cumplidas
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/35">
                  <div
                    className="h-full rounded-full bg-[#fff8ef]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </section>

              <div className="flex flex-col justify-between gap-4">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div className="stat-card">
                    <strong>{posts.length}</strong>
                    <span>planificadas</span>
                  </div>
                  <div className="stat-card">
                    <strong>{posts.length - completed}</strong>
                    <span>por publicar</span>
                  </div>
                </div>
                <p className="mt-2 text-center font-display text-lg italic text-[#8c605d] md:mt-0 md:rounded-[18px] md:border md:border-[#eaded7] md:bg-[#fbf8ef] md:p-5">
                  “La constancia le gana a la inspiración.”
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Navegación móvil">
        <button
          type="button"
          className={activeTab === "agenda" ? "active" : ""}
          aria-current={activeTab === "agenda" ? "page" : undefined}
          onClick={() => setActiveTab("agenda")}
        >
          <Home size={20} aria-hidden="true" />
          <span>Agenda</span>
        </button>
        <button
          type="button"
          className={activeTab === "ideas" ? "active" : ""}
          aria-current={activeTab === "ideas" ? "page" : undefined}
          onClick={() => setActiveTab("ideas")}
        >
          <Lightbulb size={20} aria-hidden="true" />
          <span>Ideas</span>
        </button>
        <button
          type="button"
          className="nav-add"
          onClick={() => setComposerOpen(true)}
          aria-label="Agendar contenido"
        >
          <Plus size={26} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={activeTab === "studio" ? "active" : ""}
          aria-current={activeTab === "studio" ? "page" : undefined}
          onClick={() => setActiveTab("studio")}
        >
          <ImagePlus size={20} aria-hidden="true" />
          <span>Logo 1:1</span>
        </button>
        <button
          type="button"
          className={activeTab === "progress" ? "active" : ""}
          aria-current={activeTab === "progress" ? "page" : undefined}
          onClick={() => setActiveTab("progress")}
        >
          <BarChart3 size={20} aria-hidden="true" />
          <span>Progreso</span>
        </button>
      </nav>

      <div role="status" aria-live="polite" className={notice ? "toast" : "sr-only"}>
        {notice}
      </div>

      <dialog
        ref={dialogRef}
        className="composer-dialog"
        aria-labelledby="composer-title"
        {...({ closedby: "any" } as Record<string, string>)}
        onClose={(e) => {
          e.currentTarget.returnValue = "";
          setComposerOpen(false);
        }}
      >
        <div className="composer-sheet">
          <div className="sheet-handle" />
          <div className="mb-5 flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#b1776e]">
                Nueva publicación
              </p>
              <h2 id="composer-title" className="font-display text-[28px]">
                Agendá tu idea
              </h2>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setComposerOpen(false)}
              aria-label="Cerrar"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </div>
          <form onSubmit={addPost} className="space-y-4">
            <div>
              <label htmlFor="post-title" className="field-label">
                Título del contenido
              </label>
              <input
                id="post-title"
                name="title"
                placeholder="Ej: Nuestro sabor del mes"
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="post-day" className="field-label">
                  Día
                </label>
                <select id="post-day" name="day" defaultValue="Miércoles">
                  <option value="Lunes">Lunes</option>
                  <option value="Miércoles">Miércoles</option>
                  <option value="Viernes">Viernes</option>
                  <option value="Domingo">Domingo</option>
                </select>
              </div>
              <div>
                <label htmlFor="post-time" className="field-label">
                  Hora
                </label>
                <input id="post-time" name="time" type="time" defaultValue="19:00" required />
              </div>
            </div>
            <div>
              <label htmlFor="post-format" className="field-label">
                Formato
              </label>
              <select id="post-format" name="format" defaultValue="Reel">
                <option value="Reel">Reel</option>
                <option value="Carrusel">Carrusel</option>
                <option value="Historia">Historia</option>
                <option value="Foto">Foto</option>
              </select>
            </div>
            <button className="submit-button" type="submit">
              <CalendarDays size={18} aria-hidden="true" />
              Sumar a mi agenda
            </button>
          </form>
        </div>
      </dialog>
    </div>
  );
}
