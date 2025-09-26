import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

// Convertir OGG a MP3
const convertToMp3 = (input: string, output: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    ffmpeg.setFfmpegPath(ffmpegPath);

    if (!fs.existsSync(input)) {
      const errorMsg = `❌ Input file does not exist: ${input}`;
      console.error(errorMsg);
      return reject(new Error(errorMsg));
    }

    ffmpeg(input)
      .inputFormat("ogg") // 👈 importante, tu archivo original es OGG
      .audioCodec("libmp3lame")
      .format("mp3")
      .save(output)
      .on("start", (commandLine) => {
        console.log(`🎬 FFMPEG CMD: ${commandLine}`);
      })
      .on("progress", (progress) => {
        console.log(`🔄 Convirtiendo... ${progress.percent}% completado`);
      })
      .on("error", (error) => {
        console.error("❌ Error en conversión:", error);
        reject(error);
      })
      .on("end", () => {
        console.log(`✅ Conversión exitosa: ${output}`);
        resolve();
      });
  });
};

export { convertToMp3 };
