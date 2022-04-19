import express from "express";

const app = express();

import TiktokRouter from "./tiktok";

app.use("/tiktok", TiktokRouter);

app.listen(3000);
