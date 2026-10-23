import { useId, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useI18n } from "../shared/i18n-react";
import { Button } from "./ui/button";

export function VehicleVideo({
  src,
  poster,
  label,
}: {
  src: string;
  poster?: string;
  label: string;
}) {
  const { t } = useI18n();
  const video = useRef<HTMLVideoElement>(null);
  const id = useId();
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const action = t(playing ? "Pause" : "Play");

  async function togglePlayback() {
    const element = video.current;
    if (!element) return;
    setFailed(false);
    if (!element.paused && !element.ended) {
      element.pause();
      return;
    }
    try {
      await element.play();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Could not play vehicle video", error);
      setFailed(true);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="relative overflow-hidden rounded-lg bg-black">
        <video
          ref={video}
          id={id}
          src={src}
          poster={poster}
          playsInline
          preload="metadata"
          aria-label={label}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => setFailed(true)}
          className="aspect-video w-full"
        />
        <Button
          type="button"
          className="absolute bottom-3 start-3 h-11 w-11 rounded-full p-0"
          aria-label={`${action}: ${label}`}
          aria-controls={id}
          title={action}
          onClick={() => void togglePlayback()}
        >
          {playing ? (
            <Pause size={20} aria-hidden />
          ) : (
            <Play size={20} aria-hidden />
          )}
        </Button>
      </div>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {t("Could not play this video. Please try again.")}
        </p>
      )}
    </div>
  );
}
