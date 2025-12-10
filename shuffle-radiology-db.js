// shuffle-radiology-db.js
// 毎日ランダムに 11 症例だけ Today Review = true にするスクリプト

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.RADIOLOGY_DB_ID;
const NOTION_VERSION = "2022-06-28"; // Notion APIの安定版

// 毎日抽出する症例数
const DAILY_REVIEW_COUNT = 11;

if (!NOTION_TOKEN) {
  throw new Error("NOTION_TOKEN が設定されていません。GitHub Secrets を確認してください。");
}
if (!DATABASE_ID) {
  throw new Error("RADIOLOGY_DB_ID が設定されていません。GitHub Secrets を確認してください。");
}

// 共通ヘッダ
function notionHeaders() {
  return {
    "Authorization": `Bearer ${NOTION_TOKEN}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

// データベースから全ページ取得（ページネーション対応）
async function fetchAllPages(databaseId) {
  const pages = [];
  let hasMore = true;
  let cursor = null;

  while (hasMore) {
    const body = {
      page_size: 100,
    };
    if (cursor) {
      body.start_cursor = cursor;
    }

    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: notionHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Database query failed: ${res.status} ${res.statusText} - ${text}`);
    }

    const data = await res.json();
    pages.push(...data.results);
    hasMore = data.has_more;
    cursor = data.next_cursor;
  }

  return pages;
}

// Today Review と Random を更新
async function updatePageReview(pageId, isTodayReview) {
  const body = {
    properties: {
      // チェックボックス Today Review
      "Today Review": {
        checkbox: isTodayReview,
      },
      // ついでに Random も更新（任意）
      Random: {
        number: Math.random(),
      },
    },
  };

  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: notionHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Update page failed (${pageId}): ${res.status} ${res.statusText} - ${text}`);
  }
}

// 配列をインプレースでシャッフル（Fisher–Yates）
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function main() {
  console.log("Fetching pages from Radiology DB...");

  const pages = await fetchAllPages(DATABASE_ID);
  console.log(`Total pages: ${pages.length}`);

  if (pages.length === 0) {
    console.log("No pages found. Exiting.");
    return;
  }

  // ランダムシャッフル
  shuffleArray(pages);

  // 先頭 DAILY_REVIEW_COUNT 件を今日の復習対象に
  const selectedCount = Math.min(DAILY_REVIEW_COUNT, pages.length);
  const selectedIds = new Set(
    pages.slice(0, selectedCount).map((page) => page.id)
  );

  console.log(`Selecting ${selectedCount} pages for Today Review.`);

  // 全ページに対して Today Review を更新
  for (const page of pages) {
    const pageId = page.id;
    const isTodayReview = selectedIds.has(pageId);
    await updatePageReview(pageId, isTodayReview);
    console.log(
      `Updated ${pageId} -> Today Review: ${isTodayReview ? "true" : "false"}`
    );
  }

  console.log("Done: Today Review pages updated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
