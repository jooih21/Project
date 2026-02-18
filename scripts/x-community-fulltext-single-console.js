/*
Run in DevTools Console on any X community page:
https://x.com/i/communities/{community_id}
*/

(async () => {
  const SCROLL_DELAY_MS = 1600;
  const MAX_IDLE_ROUNDS = 8;
  const MAX_ROUNDS = 400;
  const DETAIL_TIMEOUT_MS = 42000;
  const DETAIL_RENDER_WAIT_MS = 2600;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const csvEscape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  const normalizeStatusUrl = (href) => {
    try {
      const u = new URL(href, location.origin);
      const m = u.pathname.match(/^\/([^/]+)\/status\/(\d+)/);
      if (!m) return null;
      return {
        author: m[1],
        status_id: m[2],
        url: `https://x.com/${m[1]}/status/${m[2]}`
      };
    } catch {
      return null;
    }
  };

  const collectLinks = async () => {
    const map = new Map();
    let idle = 0;

    for (let round = 1; round <= MAX_ROUNDS; round += 1) {
      const before = map.size;
      const articles = document.querySelectorAll('main [data-testid="primaryColumn"] article');

      for (const article of articles) {
        const anchors = article.querySelectorAll('a[href*="/status/"]');
        for (const a of anchors) {
          const p = normalizeStatusUrl(a.getAttribute("href"));
          if (!p) continue;
          if (!map.has(p.url)) map.set(p.url, { ...p, created_at: "", text: "", error: "" });
          break;
        }
      }

      const added = map.size - before;
      console.log(`[collect ${round}] +${added}, total=${map.size}`);
      idle = added === 0 ? idle + 1 : 0;
      if (idle >= MAX_IDLE_ROUNDS) break;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(SCROLL_DELAY_MS);
    }

    return Array.from(map.values());
  };

  const waitPopupReady = async (popup, timeoutMs) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        if (popup && !popup.closed && popup.document && popup.document.body) return true;
      } catch {
        // ignore
      }
      await sleep(250);
    }
    return false;
  };

  const findArticle = async (doc, statusId, timeoutMs = 12000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const direct = doc.querySelector(`article:has(a[href*="/status/${statusId}"])`);
      if (direct) return direct;

      const anchors = doc.querySelectorAll(`a[href*="/status/${statusId}"]`);
      for (const a of anchors) {
        const article = a.closest("article");
        if (article) return article;
      }
      await sleep(300);
    }
    return null;
  };

  const extractFromPopup = async (popup, row) => {
    const urls = [row.url, `${row.url}?s=20`];

    for (let attempt = 0; attempt < urls.length; attempt += 1) {
      popup.location.href = urls[attempt];

      const ready = await waitPopupReady(popup, DETAIL_TIMEOUT_MS);
      if (!ready) return { ...row, error: "timeout_or_popup_closed" };

      await sleep(DETAIL_RENDER_WAIT_MS);

      try {
        const pathname = popup.location?.pathname || "";
        if (pathname.startsWith("/i/flow/login") || pathname.startsWith("/account/access")) {
          return { ...row, error: "login_or_access_gate" };
        }

        const doc = popup.document;
        const article = await findArticle(doc, row.status_id, 12000);
        if (!article) {
          if (attempt < urls.length - 1) continue;
          return { ...row, error: "article_not_found" };
        }

        const textNode = article.querySelector('[data-testid="tweetText"]');
        const timeNode = article.querySelector("time");
        const text = textNode ? textNode.innerText.trim() : "";
        const created_at = timeNode ? timeNode.getAttribute("datetime") || "" : "";

        if (!text && attempt < urls.length - 1) continue;

        return {
          ...row,
          text,
          created_at,
          error: text ? "" : "text_not_found"
        };
      } catch (e) {
        if (attempt < urls.length - 1) continue;
        return { ...row, error: `extract_error:${e?.message || "unknown"}` };
      }
    }

    return { ...row, error: "unknown" };
  };

  const downloadCsv = (rows) => {
    const header = ["index", "author", "status_id", "created_at", "url", "text", "error"];
    const lines = [header.join(",")];

    for (const r of rows) {
      lines.push(
        [
          r.index,
          csvEscape(r.author),
          csvEscape(r.status_id),
          csvEscape(r.created_at),
          csvEscape(r.url),
          csvEscape(r.text),
          csvEscape(r.error)
        ].join(",")
      );
    }

    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `x-community-fulltext-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!/^\/i\/communities\/\d+/.test(location.pathname)) {
    console.warn("Run this on a community page: /i/communities/{id}");
    return;
  }

  const links = await collectLinks();
  if (!links.length) {
    console.warn("No links collected.");
    return;
  }

  const popup = window.open("about:blank", "x_fulltext_worker");
  if (!popup) {
    alert("Popup blocked. Allow popups on x.com and run again.");
    return;
  }

  const out = [];
  for (let i = 0; i < links.length; i += 1) {
    const row = links[i];
    const extracted = await extractFromPopup(popup, row);
    out.push({ index: i + 1, ...extracted });
    console.log(
      `[detail ${i + 1}/${links.length}] ${row.status_id} ${extracted.error ? `(${extracted.error})` : ""}`
    );
    await sleep(1000);
  }

  try {
    popup.close();
  } catch {
    // ignore
  }

  downloadCsv(out);
  const errors = out.filter((x) => x.error).length;
  console.log(`Done. rows=${out.length}, errors=${errors}`);
})();
