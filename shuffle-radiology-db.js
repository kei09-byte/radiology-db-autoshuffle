// shuffle-radiology-db.js
const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.RADIOLOGY_DB_ID;

async function fetchAllPages(databaseId) {
  const pages = [];
  let cursor = undefined;

  while (true) {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });

    pages.push(...response.results);

    if (!response.has_more) break;
    cursor = response.next_cursor;
  }

  return pages;
}

async function shuffleRadiologyDb() {
  if (!DATABASE_ID) {
    throw new Error("RADIOLOGY_DB_ID が設定されていません。");
  }

  console.log("Fetching pages from Radiology DB...");
  const pages = await fetchAllPages(DATABASE_ID);
  console.log(`Total pages: ${pages.length}`);

  for (const page of pages) {
    const pageId = page.id;
    const randomValue = Math.random(); // 0〜1 の乱数

    await notion.pages.update({
      page_id: pageId,
      properties: {
        Random: {
          number: randomValue,
        },
      },
    });

    console.log(`Updated page ${pageId} -> Random: ${randomValue}`);
  }

  console.log("Done: Radiology DB shuffled.");
}

shuffleRadiologyDb().catch((error) => {
  console.error(error);
  process.exit(1);
});
