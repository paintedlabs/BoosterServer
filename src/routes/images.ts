import { Router, Request, Response } from "express";
import { ImageService } from "../types";
import { NotFoundError } from "../utils/errors";
import logger from "../utils/logger";

export function createImagesRouter(imageService: ImageService): Router {
  const router = Router();

  /**
   * @route GET /cards/:allPrintingsId/:cardFace/image
   * @desc Get card image (front or back)
   * @access Public
   */
  router.get(
    "/cards/:allPrintingsId/:cardFace/image",
    async (req: Request, res: Response) => {
      const allPrintingsId = req.params["allPrintingsId"];
      const cardFace = req.params["cardFace"];

      if (!allPrintingsId || !cardFace) {
        return res.status(400).json({ error: "Card ID and face are required" });
      }

      logger.info(
        `Received GET for card image: ${allPrintingsId}, face: ${cardFace}`
      );

      try {
        const imagePath = await imageService.getCardImage(
          allPrintingsId,
          cardFace
        );
        return res.sendFile(imagePath);
      } catch (error) {
        logger.error(`Error serving card image ${allPrintingsId}:`, error);
        if (error instanceof NotFoundError) {
          return res.status(404).json({ error: error.message });
        } else {
          return res.status(500).json({ error: "Failed to serve card image" });
        }
      }
    }
  );

  /**
   * @route GET /setimages/:setCode
   * @desc Get set symbol image
   * @access Public
   */
  router.get("/setimages/:setCode", (req: Request, res: Response) => {
    const setCode = req.params["setCode"];
    if (!setCode) {
      return res.status(400).json({ error: "Set code is required" });
    }

    logger.info(`Received GET for set image: ${setCode}`);

    try {
      const imagePath = imageService.getSetImage(setCode);
      return res.sendFile(imagePath);
    } catch (error) {
      logger.error(`Error serving set image ${setCode}:`, error);
      if (error instanceof NotFoundError) {
        return res.status(404).json({ error: error.message });
      } else {
        return res.status(500).json({ error: "Failed to serve set image" });
      }
    }
  });

  return router;
}
