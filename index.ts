import { randomUUID } from "crypto";
import express from "express";

import puppeteer, { Page } from "puppeteer";
const app = express();

app.get("/profile/:id", async (req, res) => {
  const { id } = req.params;

  if (!id)
    return res
      .status(400)
      .json({ statusCode: 400, type: "error", message: "userId not provided" });

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    page.on("response", async (event) => {
      try {
        const val = await event.json();

        val?.userInfo?.user && res.json({ ...val?.userInfo?.user });
      } catch (err) {}
    });

    await page.goto(`https://www.tiktok.com/@${id}`);
  } catch (error) {
    console.log(error);
  }
});

app.get("/posts/:id", async (req, res) => {
  const { id } = req.params;

  const posts: any = [];

  if (!id)
    return res
      .status(400)
      .json({ statusCode: 400, type: "error", message: "userId not provided" });

  try {
    const browser = await puppeteer.launch({
      defaultViewport: null,
    });
    const page = await browser.newPage();

    page.on("response", async (event: any) => {
      try {
        if (
          event._headers["content-type"] === "application/json; charset=utf-8"
        ) {
          const val = await event.json();
          const postsPaginated = val?.itemList;
          postsPaginated && posts.push(...postsPaginated);
        }
      } catch (err) {}
    });

    await page.goto(`https://www.tiktok.com/@${id}`);

    await scrollPage(page, 1000);

    res.json({ postCount: posts.length, posts });
  } catch (error) {
    console.log(error);
  }
});

app.get("/tag/:id", async (req, res) => {
  const { id } = req.params;

  const posts: any = [];

  if (!id)
    return res
      .status(400)
      .json({ statusCode: 400, type: "error", message: "userId not provided" });

  try {
    const browser = await puppeteer.launch({
      defaultViewport: null,
    });
    const page = await browser.newPage();

    page.on("response", async (event: any) => {
      try {
        if (
          event._headers["content-type"] === "application/json; charset=utf-8"
        ) {
          const val = await event.json();
          const postsPaginated = val?.itemList;
          postsPaginated && posts.push(...postsPaginated);
        }
      } catch (err) {}
    });

    await page.goto(`https://www.tiktok.com/tag/${id}`, {
      waitUntil: "networkidle0",
    });

    await scrollPage(page, 10);

    console.log(
      await page.$$eval("[data-e2e=user-post-item]", (sel) => console.log(sel))
    );

    res.json({ postCount: posts.length, posts });
  } catch (error) {
    console.log(error);
  }
});

async function scrollPage(page: Page, length: number) {
  try {
    let scrollDelay = 0;
    let previousHeight;

    let count = 0;

    while (count <= length) {
      previousHeight = await page.evaluate("document.body.scrollHeight");

      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      await page.waitForFunction(
        `document.body.scrollHeight > ${previousHeight}`
      );

      await page.waitForTimeout(scrollDelay);

      count++;
    }
  } catch (e) {}
}

app.listen(3000);
