export default {
  async scheduled(event, env) {
    const url = `https://vibeshit.org/api/cron/github-trending?secret=${env.MIGRATE_SECRET}&limit=30`;
    const res = await fetch(url, {
      headers: { "User-Agent": "vibeshit-cron-worker" },
    });
    const body = await res.text();
    console.log(`[cron] github-trending status=${res.status} body=${body.slice(0, 500)}`);
  },
};
