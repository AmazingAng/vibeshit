export default {
  async scheduled(event, env) {
    // Hourly: GitHub trending
    const trendingUrl = `https://vibeshit.org/api/cron/github-trending?secret=${env.MIGRATE_SECRET}&limit=30`;
    const trendingRes = await fetch(trendingUrl, {
      headers: { "User-Agent": "vibeshit-cron-worker" },
    });
    const trendingBody = await trendingRes.text();
    console.log(`[cron] github-trending status=${trendingRes.status} body=${trendingBody.slice(0, 500)}`);

    // Weekly: Tweet digest (trigger on Monday ~9am UTC)
    const now = new Date();
    if (now.getUTCDay() === 1 && now.getUTCHours() >= 8 && now.getUTCHours() < 9) {
      const digestUrl = `https://vibeshit.org/api/cron/newsletter?secret=${env.MIGRATE_SECRET}`;
      const digestRes = await fetch(digestUrl, {
        headers: { "User-Agent": "vibeshit-cron-worker" },
      });
      const digestBody = await digestRes.text();
      console.log(`[cron] weekly-digest status=${digestRes.status} body=${digestBody.slice(0, 500)}`);
    }
  },
};
