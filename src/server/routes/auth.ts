import express from "express";
import { getAuth } from "firebase-admin/auth";

export const authRouter = express.Router();

// Middleware to verify Firebase Session token
export const verifyFirebaseSession = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying auth token", error);
    res.status(403).json({ error: "Unauthorized" });
  }
};

// Admin Endpoint to set claims (e.g. Roles) - can only be called by a SuperAdmin or via a service account
authRouter.post("/set-claims", verifyFirebaseSession, async (req: any, res: any) => {
  try {
    // Basic verification - Ensure the caller is already an admin
    if (req.user.uid !== "master-uid" && !req.user.isAdmin) {
       return res.status(403).json({ error: "Forbidden: Admins only" });
    }

    const { targetUid, claims } = req.body;
    if (!targetUid || !claims) {
      return res.status(400).json({ error: "targetUid and claims required" });
    }

    await getAuth().setCustomUserClaims(targetUid, claims);
    return res.json({ success: true, message: `Claims set for ${targetUid}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
