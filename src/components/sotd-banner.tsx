import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { getSOTD, getTodayLiveLeader } from "@/lib/queries/products";
import { getMessages, type AppLocale } from "@/lib/i18n";

export async function SotdBanner({ locale }: { locale: AppLocale }) {
  let sotdData;
  let liveLeader;
  const t = getMessages(locale);
  
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = getDb(env.DB);
    [sotdData, liveLeader] = await Promise.all([
      getSOTD(db),
      getTodayLiveLeader(db),
    ]);
  } catch {
    return null;
  }

  if (!sotdData && !liveLeader) return null;

  return (
    <div className="border-b border-amber-300/40 bg-linear-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-amber-950/30">
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2">
        {sotdData ? (
          <Link
            href={`/product/${sotdData.productSlug}`}
            className="sotd-banner flex flex-1 items-center gap-3 rounded-lg border border-amber-300/40 bg-white/60 px-3 py-2 transition-all hover:bg-white/80 hover:scale-[1.01] dark:bg-black/20 dark:hover:bg-black/30"
          >
            <span className="sotd-emoji text-lg sm:text-xl" aria-hidden>💩</span>
            
            <div className="flex flex-1 items-center gap-2 min-w-0">
              {sotdData.productLogoUrl && (
                <img
                  src={sotdData.productLogoUrl}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-md border border-amber-200 object-cover sm:h-8 sm:w-8"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="sotd-shimmer-text font-mono text-[10px] font-black tracking-widest sm:text-xs">
                    {t.sotd.shitOfTheDay}
                  </span>
                  <span className="hidden font-mono text-[10px] text-amber-600/60 dark:text-amber-400/60 sm:inline">
                    {sotdData.date}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-semibold text-amber-900 dark:text-amber-100 sm:text-sm">
                    {sotdData.productName}
                  </span>
                  <span className="hidden truncate text-xs text-amber-700/70 dark:text-amber-300/50 sm:inline">
                    — {sotdData.productTagline}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-mono text-xs font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              <span>💩</span>
              <span>{sotdData.voteCount}</span>
            </div>
            
            <span className="sotd-emoji-delay text-lg sm:text-xl" aria-hidden>🏆</span>
          </Link>
        ) : liveLeader ? (
          <Link
            href={`/product/${liveLeader.productSlug}`}
            className="flex flex-1 items-center gap-3 rounded-lg border border-amber-200/30 bg-white/40 px-3 py-2 transition-all hover:bg-white/60 dark:bg-black/10 dark:hover:bg-black/20"
          >
            <span className="text-base sm:text-lg" aria-hidden>💩</span>
            <div className="flex flex-1 items-center gap-2 min-w-0">
              {liveLeader.productLogoUrl && (
                <img
                  src={liveLeader.productLogoUrl}
                  alt=""
                  className="h-6 w-6 shrink-0 rounded-md border border-amber-200/50 object-cover"
                />
              )}
              <div className="min-w-0">
                <span className="font-mono text-[10px] tracking-wider text-amber-600/80 dark:text-amber-400/60">
                  {t.sotd.todaysLeader}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs font-medium text-amber-800 dark:text-amber-200">
                    {liveLeader.productName}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100/60 px-2 py-0.5 font-mono text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <span>💩</span>
              <span>{liveLeader.voteCount}</span>
            </div>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
