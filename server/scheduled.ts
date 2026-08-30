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
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("Technocore returned")) {
      return res.status(200).json({ ok: true, status: "source-unavailable", retainedCache: true, error: message, timestamp });
    }
    return res.status(500).json({ error: message, timestamp, path: req.path });
  }
}
