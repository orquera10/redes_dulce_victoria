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
  Lightbulb,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

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

type Tab = "agenda" | "ideas" | "progress";

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
    <main className="min-h-screen bg-[#e7ddd0] px-0 py-0 text-[#563a2a] sm:px-6 sm:py-8">
      <div className="phone-shell relative mx-auto min-h-screen w-full max-w-[430px] overflow-hidden bg-[#f8f4e9] sm:min-h-[880px] sm:rounded-[38px] sm:border-[7px] sm:border-[#563a2a] sm:shadow-[0_28px_80px_rgba(73,43,38,0.22)]">
        <header className="px-5 pb-5 pt-5">
          <div className="mb-6 flex items-center">
            <button
              type="button"
              className="brand-logo-button"
              onClick={() => setActiveTab("agenda")}
              aria-label="Ir a la agenda de Dulce Victoria"
            >
              <img src="/dulce-victoria-logo.png" alt="Dulce Victoria" />
            </button>
            <div className="ml-auto mr-3 text-right leading-none">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#bd807d]">
                Mi plan semanal
              </p>
              <p className="mt-2 font-display text-[14px] italic text-[#694635]">
                Crear · compartir · crecer
              </p>
            </div>
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
          </div>

          {activeTab === "agenda" && (
            <>
              <div className="mb-5">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b1776e]">
                  Tu semana creativa
                </p>
                <h1 className="font-display text-[34px] leading-[1.05] tracking-[-0.035em]">
                  Crecer también es
                  <br />
                  <span className="italic text-[#9b5962]">ser constante.</span>
                </h1>
              </div>

              <section className="progress-card" aria-label="Resumen semanal">
                <div>
                  <p className="text-[12px] font-semibold text-[#74504d]">Objetivo semanal</p>
                  <p className="mt-1 text-[11px] text-[#a07b75]">
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
            </>
          )}

          {activeTab === "ideas" && (
            <div className="mb-2">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b1776e]">
                Banco creativo
              </p>
              <h1 className="font-display text-[34px] leading-tight tracking-[-0.035em]">
                Ideas para cuando
                <br />
                <span className="italic text-[#9b5962]">no sabés qué subir.</span>
              </h1>
            </div>
          )}

          {activeTab === "progress" && (
            <div className="mb-2">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b1776e]">
                Tu avance
              </p>
              <h1 className="font-display text-[34px] leading-tight tracking-[-0.035em]">
                Cada publicación
                <br />
                <span className="italic text-[#9b5962]">hace crecer tu marca.</span>
              </h1>
            </div>
          )}
        </header>

        <div className="px-5 pb-28">
          {activeTab === "agenda" && (
            <>
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
                  <span className="text-[11px] font-bold tracking-[0.14em]">
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
                      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold text-[#a06c67]">
                        <Clock3 size={11} aria-hidden="true" />
                        {post.time}
                        <span className="text-[#d3b9ad]" aria-hidden="true">
                          •
                        </span>
                        <Camera size={11} aria-hidden="true" />
                        {post.channel}
                      </div>
                      <h2 className="truncate font-display text-[18px] font-semibold leading-tight">
                        {post.title}
                      </h2>
                      <p className="mt-1 truncate text-[11px] text-[#9d817a]">{post.format}</p>
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

              <div className="quote">
                <Sparkles size={15} className="shrink-0 text-[#c26c66]" aria-hidden="true" />
                <p>
                  No tiene que ser perfecto, <strong>tiene que estar publicado.</strong>
                </p>
              </div>
            </>
          )}

          {activeTab === "ideas" && (
            <div className="mt-4 space-y-3">
              {ideas.map(([title, description], index) => (
                <article className="idea-card" key={title}>
                  <div className="idea-number">0{index + 1}</div>
                  <div>
                    <h2 className="font-display text-xl font-semibold">{title}</h2>
                    <p className="mt-1 text-[12px] leading-relaxed text-[#8e6f69]">{description}</p>
                  </div>
                </article>
              ))}
              <button
                type="button"
                className="new-post-button"
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

          {activeTab === "progress" && (
            <div className="mt-4">
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
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="stat-card">
                  <strong>{posts.length}</strong>
                  <span>planificadas</span>
                </div>
                <div className="stat-card">
                  <strong>{posts.length - completed}</strong>
                  <span>por publicar</span>
                </div>
              </div>
              <p className="mt-5 text-center font-display text-lg italic text-[#8c605d]">
                “La constancia le gana a la inspiración.”
              </p>
            </div>
          )}
        </div>

        <nav className="bottom-nav" aria-label="Principal">
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
            className={activeTab === "progress" ? "active" : ""}
            aria-current={activeTab === "progress" ? "page" : undefined}
            onClick={() => setActiveTab("progress")}
          >
            <BarChart3 size={20} aria-hidden="true" />
            <span>Progreso</span>
          </button>
          <button
            type="button"
            onClick={() => showToast("Tu perfil de Dulce Victoria está listo.")}
          >
            <img className="mini-avatar" src="/dulce-victoria-logo.png" alt="" />
            <span>Perfil</span>
          </button>
        </nav>

        <div role="status" aria-live="polite" className={notice ? "toast" : "sr-only"}>
          {notice}
        </div>
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
    </main>
  );
}
