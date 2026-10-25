import { Router, type IRouter } from "express";
import healthRouter from "./health";
import fundsRouter from "./funds";
import assetsRouter from "./assets";
import matchesRouter from "./matches";
import dashboardRouter from "./dashboard";
import chatRouter from "./chat";
import storageRouter from "./storage";
import assistantRouter from "./assistant";
import fundPublicRouter from "./fund-public";
import authRouter from "./auth";
import networkRouter from "./network";
import documentsRouter from "./documents";
import adminRouter from "./admin";
import adminUsersRouter from "./admin-users";
import cnpjRouter from "./cnpj";
import contactRouter from "./contact";
import interestsRouter from "./interests";


const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(fundPublicRouter);
router.use("/funds", fundsRouter);
router.use("/assets", assetsRouter);
router.use("/matches", matchesRouter);
router.use("/interests", interestsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/network", networkRouter);
router.use("/documents", documentsRouter);
router.use(adminRouter);
router.use(adminUsersRouter);
router.use(cnpjRouter);
router.use(contactRouter);
router.use("/chat", chatRouter);
router.use(storageRouter);
router.use(assistantRouter);

export default router;
