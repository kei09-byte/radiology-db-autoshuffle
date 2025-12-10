// shuffle-radiology-db.js
// Notion SDK を使わず、Node.js の fetch で直接 Notion API を叩くバージョン

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.RADIOLOGY_DB_ID;
const NOTION_VERSION = "2022-06-28"; // 安定版のバージョン

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

// データベースから全ページを取得（ページネーション対応）
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

// 各ページの Random プロパティを更新
async function updatePageRandom(pageId, value) {
  const body = {
    properties: {
      Random: {
        number: value,
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

async function main() {
  console.log("Fetching pages from Radiology DB...");

  const pages = await fetchAllPages(DATABASE_ID);
  console.log(`Total pages: ${pages.length}`);

  for (const page of pages) {
    const pageId = page.id;
    const randomValue = Math.random(); // 0〜1 の乱数

    await updatePageRandom(pageId, randomValue);
    console.log(`Updated ${pageId} -> Random: ${randomValue}`);
  }

  console.log("Done: Radiology DB shuffled.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
