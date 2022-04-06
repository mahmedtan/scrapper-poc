import axios from "axios";
import { randomUUID } from "crypto";
import express from "express";
import tiktok from "tiktok-app-api";

import puppeteer, { Page } from "puppeteer";
const app = express();

const requestHeaders = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36",
};

app.get("/user/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const userPayload = await axios.get(
      `https://www.tiktok.com/node/share/user/@${id}?user_agent=`,
      { headers: requestHeaders }
    );

    if (!Object.keys(userPayload.data.userInfo).length) {
      res.status(404).json({ message: "User Not Found!" });
    }
    res.json(userPayload.data.userInfo);
  } catch (error) {
    console.log(error);
  }
});

app.get("/video/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const videoPayload = await axios.get(
      `https://m.tiktok.com/api/item/detail/?agent_user=&itemId=${id}`,
      { headers: requestHeaders }
    );

    if (!Object.keys(videoPayload.data.itemInfo?.itemStruct).length) {
      res.status(404).json({ message: "User Not Found!" });
    }
    res.json(videoPayload.data.itemInfo?.itemStruct);
  } catch (error) {
    console.log(error);
  }
});

app.get("/videos/:id", async (req, res) => {
  const { id } = req.params;
  const { limit = 10 } = req.query;
  const posts: any = [];

  try {
    const browser = await puppeteer.launch({
      defaultViewport: null,
      // headless: false,
    });

    const page = await browser.newPage();

    await page.goto(`https://www.tiktok.com/@${id}`);

    res.json({
      postCount: posts.slice(0, limit).length,
      posts: posts.slice(0, limit),
    });
  } catch (error) {}
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
