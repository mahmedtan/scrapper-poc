import axios from "axios";
import express from "express";
import * as cheerio from "cheerio";
import puppeteer, { ElementHandle, Page } from "puppeteer";
import { mapSeries } from "async";

const app = express.Router();

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
  const { limit = 30 } = req.query;

  try {
    const browser = await puppeteer.launch({
      defaultViewport: null,
    });
    const page = await browser.newPage();

    await page.goto(`https://www.tiktok.com/@${id}`);

    await scrollPage(page, Math.ceil(+limit / 30 - 1));

    const elements = await page.$$(".tiktok-x6y88p-DivItemContainerV2");

    const videos = await mapSeries(
      elements,
      async (item: ElementHandle, callback: any) => {
        const href = await item.$eval("a", (e) => e.getAttribute("href"));
        const views = await item.$eval(
          "[data-e2e='video-views']",
          (e) => e.textContent
        );
        const title = await item.$eval(
          ".tiktok-1wrhn5c-AMetaCaptionLine",
          (e) => e.getAttribute("title")
        );

        callback(null, {
          title,
          views,
          href,
          id: href?.replace(`https://www.tiktok.com/@${id}/video/`, ""),
        });
      }
    );

    res.json({ videos });
  } catch (error) {
    console.log(error);
  }
});

async function scrollPage(page: Page, length: number) {
  try {
    let scrollDelay = 0;
    let previousHeight;

    let count = 0;

    while (count < length) {
      previousHeight = await page.evaluate("document.body.scrollHeight");

      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      await page.waitForFunction(
        `document.body.scrollHeight > ${previousHeight}`
      );

      await page.waitForTimeout(scrollDelay);

      count++;
      console.log("SCROLLED");
    }
  } catch (e) {}
}

app.get("/tag/:id", async (req, res) => {
  const { id } = req.params;
  const { limit = 10, cursor = 0 } = req.query;

  if (limit > 30) res.status(400).json({ message: "Limit too large!" });

  try {
    const tagResponse = await axios.get(`https://www.tiktok.com/tag/${id}`);

    const $ = cheerio.load(tagResponse.data);

    const challengeId = $("[property='al:ios:url']").attr("content")?.slice(30);

    const tagInfo = (
      await axios.get(
        `https://m.tiktok.com/api/challenge/detail/?agent_user=&challengeId=${challengeId}`,
        { headers: requestHeaders }
      )
    ).data;

    const tagPostsResponse = await axios.get(
      `https://m.tiktok.com/api/challenge/item_list/?aid=1988&user_agent=&challengeID=${challengeId}&count=${limit}&cursor=${cursor}`,
      { headers: requestHeaders }
    );

    if (tagPostsResponse.status === 400) {
      res.status(400).json({ message: "Bad Request" });
    }

    const tagPosts = tagPostsResponse.data.itemList;
    res.json({
      info: tagInfo,
      videoCount: tagPosts.length,
      videos: tagPosts,
      nextCursor: +tagPostsResponse.data.cursor,
    });
  } catch (error) {
    console.log(error);
  }
});

export default app;
