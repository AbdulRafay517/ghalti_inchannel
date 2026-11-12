import { mediaUrl, supabase } from "@/lib/supabase";
import BlameBoard from "./BlameBoard";
import Flames from "./Flames";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [people, excuses] = await Promise.all([
    supabase.from("people").select("name, photo_path, side, count"),
    supabase.from("excuses").select("id, text, audio_path, animation"),
  ]);
  if (people.error) throw people.error;
  if (excuses.error) throw excuses.error;

  const left = people.data.find((p) => p.side === "left");
  const right = people.data.find((p) => p.side === "right");
  if (!left || !right) throw new Error("Seed the people table with a 'left' and a 'right' row");

  return (
    <main className="relative min-h-screen flex flex-col items-center px-4 pt-12 pb-48 gap-12">
      <Flames />
      <h1 className="relative z-10 text-4xl sm:text-5xl font-bold text-center drop-shadow-[0_0_12px_rgb(255_69_0)]">Ye Ghalti kis ki hai akhir?</h1>
      <BlameBoard
        left={{ name: left.name, photoUrl: mediaUrl(left.photo_path), count: left.count }}
        right={{ name: right.name, photoUrl: mediaUrl(right.photo_path) }}
        excuses={excuses.data.map((e) => ({ id: e.id, text: e.text, animation: e.animation, audioUrl: mediaUrl(e.audio_path) }))}
      />
    </main>
  );
}
