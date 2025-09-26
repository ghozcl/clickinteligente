import path from "path";
import multer from "multer";
import fs from "fs";
import Whatsapp from "../models/Whatsapp";
import { isEmpty, isNil } from "lodash";

// Carpeta base donde se guardan todos los archivos
const publicFolder = path.resolve(__dirname, "..", "..", "public");

export default {
  directory: publicFolder,
  storage: multer.diskStorage({
    destination: async function (req, file, cb) {
      let companyId = req.user?.companyId;
      const { typeArch, fileId } = req.body;

      // Si no viene companyId, intenta obtenerlo desde el token
      if (companyId === undefined || isNil(companyId) || isEmpty(companyId)) {
        const authHeader = req.headers.authorization;
        if (authHeader) {
          const [, token] = authHeader.split(" ");
          const whatsapp = await Whatsapp.findOne({ where: { token } });
          companyId = whatsapp?.companyId;
        }
      }

      let folder: string;

      if (typeArch && typeArch !== "announcements" && typeArch !== "logo") {
        // Para audios y otros archivos, siempre dentro de /audios
        const subFolder = typeArch === "audios" ? "audios" : typeArch;
        folder = path.resolve(publicFolder, `company${companyId}`, subFolder, fileId ? fileId : "");
      } else if (typeArch === "announcements") {
        folder = path.resolve(publicFolder, "announcements");
      } else if (typeArch === "logo") {
        folder = path.resolve(publicFolder, "logos");
      } else {
        // Por defecto, audios
        folder = path.resolve(publicFolder, `company${companyId}`, "audios");
      }

      // Crear la carpeta si no existe
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        fs.chmodSync(folder, 0o777);
      }

      return cb(null, folder);
    },
    filename(req, file, cb) {
      const { typeArch } = req.body;
      const fileName =
        typeArch && typeArch !== "announcements"
          ? file.originalname.replace("/", "-").replace(/ /g, "_")
          : new Date().getTime() + "_" + file.originalname.replace("/", "-").replace(/ /g, "_");
      return cb(null, fileName);
    },
  }),
};
