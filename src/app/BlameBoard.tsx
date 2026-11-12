"use client";

import Image from "next/image";
import { type ReactNode, useRef, useState } from "react";
import { pickExcuse } from "@/lib/pickExcuse";
import { supabase } from "@/lib/supabase";

type Person = { name: string; photoUrl: string };
type Excuse = { id: number; text: string | null; animation: "bicep_curl" | null; audioUrl: string };

type Props = {
  left: Person & { count: number };
  right: Person;
  excuses: Excuse[];
};

// Upper arm fixed, forearm pivots at the elbow (60,60): straight at 0deg, curled at -110deg.
function BicepCurl() {
  return (
    <svg role="img" aria-label="Bicep curl" viewBox="0 0 120 80" className="w-24" fill="#FFCC4D" stroke="#E3A600" strokeWidth="2">
      <rect x="4" y="51" width="62" height="18" rx="9" />
      <ellipse cx="36" cy="52" rx="16" ry="9" className="[transform-box:view-box] origin-[36px_58px] motion-safe:animate-flex" />
      <g className="[transform-box:view-box] origin-[60px_60px] motion-safe:animate-curl">
        <rect x="54" y="52" width="50" height="16" rx="8" />
        <circle cx="106" cy="60" r="11" />
      </g>
    </svg>
  );
}

function Bubble({ excuse }: { excuse: Excuse }) {
  return (
    <div className="relative max-w-56 origin-bottom-right animate-pop rounded-2xl border-2 border-black bg-white px-4 py-2 text-lg font-medium whitespace-pre-line shadow-md">
      {excuse.animation === "bicep_curl" && (
        <BicepCurl />
      )}
      {excuse.text}
      <span aria-hidden className="absolute -bottom-2 right-6 h-4 w-4 rotate-45 border-r-2 border-b-2 border-black bg-white" />
    </div>
  );
}

function Card({ person, count, label, onClick, disabled, bubble }: {
  person: Person;
  count: number;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  bubble?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 w-64">
      <h2 className="text-2xl font-semibold">{person.name}</h2>
      <div className="relative">
        <div className="relative w-64 h-64 overflow-hidden rounded-lg border border-gray-200">
          <Image src={person.photoUrl} alt={person.name} fill sizes="256px" className="object-cover" />
        </div>
        <div aria-live="polite" className="absolute -top-10 -left-10 z-10">{bubble}</div>
      </div>
      <p className="text-5xl font-bold tabular-nums" aria-label={`${person.name} count`}>{count}</p>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full rounded-lg bg-black text-white py-3 font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        {label}
      </button>
    </div>
  );
}

export default function BlameBoard({ left, right, excuses }: Props) {
  const [count, setCount] = useState(left.count);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [excuse, setExcuse] = useState<Excuse | null>(null);
  const [clicks, setClicks] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);

  async function blameLeft() {
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("increment_blame");
    if (error) setError("Count update failed, try again.");
    else setCount(data as number);
    setBusy(false);
  }

  function blameRight() {
    const next = pickExcuse(excuses, excuse?.id ?? null);
    if (!next) return;
    setError(null);
    setExcuse(next);
    setClicks((c) => c + 1);
    audio.current?.pause();
    audio.current = new Audio(next.audioUrl);
    audio.current.play().catch(() => setError("Couldn't play the audio."));
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col sm:flex-row gap-12 sm:gap-24 items-center sm:items-start">
        <Card person={left} count={count} label="Ghalti +1" onClick={blameLeft} disabled={busy} />
        <Card
          person={right}
          count={0}
          label="Ghalti +1"
          onClick={blameRight}
          disabled={!excuses.length}
          bubble={excuse && <Bubble key={clicks} excuse={excuse} />}
        />
      </div>
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
