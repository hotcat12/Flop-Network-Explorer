import type { Request, Response } from "express";
import { refreshPublicRooms } from "./db";
import { sdk } from "./_core/sdk";

export async function refreshTechnocoreHandler(req: Request, res: Response) {
  const timestamp = new Date().toISOString();
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only", timestamp });
    }
    const result = await refreshPublicRooms();
    return res.json({ ok: true, ...result, timestamp });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      timestamp,
      path: req.path,
    });
  }
}
