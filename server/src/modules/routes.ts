import { Router } from "express";
import healthRouter from "./health/health.routes.js";
import authRouter from "./auth/auth.routes.js";
import auctionRouter from "./auction/auction.routes.js";
import teamRouter from "./team/team.routes.js";
import playerRouter from "./player/player.routes.js";
import bidRouter from "./bid/bid.routes.js";
import uploadRouter from "./upload/upload.routes.js";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(auctionRouter);
router.use(teamRouter);
router.use(playerRouter);
router.use(bidRouter);
router.use(uploadRouter);

export default router;
