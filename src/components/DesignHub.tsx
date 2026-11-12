import { useState } from "react";
import { Image as ImageIcon, Smartphone } from "lucide-react";
import { LogoStudio } from "./LogoStudio";
import { StoryStudio } from "./StoryStudio";

type DesignMode = "posts" | "stories";

type DesignHubProps = {
  onNotify: (message: string, duration?: number) => void;
};

export function DesignHub({ onNotify }: DesignHubProps) {
  const [mode, setMode] = useState<DesignMode>("posts");

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b1776e]">
            Estudio creativo
          </p>
          <h1 className="font-display text-[34px] leading-tight tracking-[-0.035em] md:text-[42px]">
            {mode === "posts" ? (
              <>
                Posteos en <span className="italic text-[#9b5962]">formato 1:1.</span>
              </>
            ) : (
              <>
                Historias en <span className="italic text-[#9b5962]">formato 9:16.</span>
              </>
            )}
          </h1>
        </div>

        <div className="design-mode-bar" role="toolbar" aria-label="Formato de diseño">
          <button
            type="button"
            className="design-mode-btn"
            aria-pressed={mode === "posts"}
            onClick={() => setMode("posts")}
          >
            <ImageIcon size={16} aria-hidden="true" />
            <span>Posteos (1:1)</span>
          </button>
          <button
            type="button"
            className="design-mode-btn"
            aria-pressed={mode === "stories"}
            onClick={() => setMode("stories")}
          >
            <Smartphone size={16} aria-hidden="true" />
            <span>Historias (9:16)</span>
          </button>
        </div>
      </div>

      <div className="mt-5">
        {mode === "posts" ? (
          <LogoStudio onNotify={onNotify} showHero={false} />
        ) : (
          <StoryStudio onNotify={onNotify} />
        )}
      </div>
    </div>
  );
}
