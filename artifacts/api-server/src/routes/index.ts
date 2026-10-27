import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import auctionRouter from "./auction.js";
import teamRouter from "./team.js";
import playerRouter from "./player.js";
import bidRouter from "./bid.js";
import uploadRouter from "./upload.js";
import publicRouter from "./public.js";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(auctionRouter);
router.use(teamRouter);
router.use(playerRouter);
router.use(bidRouter);
router.use(uploadRouter);
router.use(publicRouter);

export default router;
