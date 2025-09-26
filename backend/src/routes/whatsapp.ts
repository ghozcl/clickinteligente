import express from "express";
import uploadConfig from "../config/upload";
import multer from "multer";

const router = express.Router();
const upload = multer({ storage: uploadConfig.storage });

router.post("/audio", upload.single("audio"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Archivo no recibido" });

  const companyId = req.user?.companyId || req.body.companyId;
  const fileUrl = `/public/company${companyId}/audios/${req.file.filename}`;

  res.json({ message: "Audio guardado", url: fileUrl });
});

export default router;
