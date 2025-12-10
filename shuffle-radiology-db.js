name: Shuffle Radiology DB

on:
  schedule:
    # 毎日 05:00 JST（20:00 UTC）に実行
    - cron: "0 20 * * *"
  workflow_dispatch: {}

jobs:
  shuffle:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install Notion SDK
        run: npm install @notionhq/client

      - name: Shuffle Radiology DB
        env:
          NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}
          RADIOLOGY_DB_ID: ${{ secrets.RADIOLOGY_DB_ID }}
        run: node shuffle-radiology-db.js
