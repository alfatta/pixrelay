require("dotenv").config();
import Fastify from "fastify";
import sharp from "sharp";
import axios from "axios";
import fs from "fs";
import path from "path";
import { mkdirp } from "mkdirp";
import crypto from "crypto";
import fastifyStatic from "@fastify/static";

const app = Fastify({
  maxParamLength: 8192,
  bodyLimit: 30 * 1024 * 1024,
});

const port = process.env.PORT || 3000;
const useCache = process.env.USE_CACHE !== "false"; // Default to true if not set
const cacheDir = path.join(__dirname, "..", "cache");

// Only setup cache if enabled
if (useCache) {
  mkdirp.sync(cacheDir);
  app.register(fastifyStatic, {
    root: cacheDir,
    prefix: "/cache/",
  });
}

const decodeBase64UrlSafe = (str: string): string => {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) {
    str += "=";
  }
  return Buffer.from(str, "base64").toString("utf-8");
};

const getFileToBuffer = async (url: string): Promise<Buffer> => {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(response.data, "binary");
};

const generateETag = (buffer: Buffer): string => {
  return crypto.createHash("md5").update(buffer).digest("hex");
};

interface QueryParams {
  size?: string;
}

app.get<{ Params: { encodedUrl: string }; Querystring: QueryParams }>(
  "/img/:encodedUrl/fit",
  async (request, reply) => {
    try {
      const { encodedUrl } = request.params;
      const originalUrl = decodeBase64UrlSafe(encodedUrl);

      const sizeParam = request.query.size;
      if (!sizeParam || !sizeParam.includes("x")) {
        return reply
          .status(400)
          .send("Size query param must be like wxh, e.g. 300x200");
      }

      const [w, h] = sizeParam.split("x").map(Number);
      if (isNaN(w) || isNaN(h)) {
        return reply.status(400).send("Invalid size parameters");
      }

      const cacheKey = `fit_${w}x${h}_${encodedUrl}.webp`;
      const cachePath = path.join(cacheDir, cacheKey);

      reply.header("Cache-Control", "public, max-age=86400");
      reply.header("Content-Type", "image/webp");

      if (useCache && fs.existsSync(cachePath)) {
        const stats = fs.statSync(cachePath);
        const fileBuffer = fs.readFileSync(cachePath);
        const etag = generateETag(fileBuffer);
        const lastModified = stats.mtime.toUTCString();

        if (
          request.headers["if-none-match"] === etag ||
          request.headers["if-modified-since"] === lastModified
        ) {
          return reply.status(304).send();
        }

        reply.header("Cache-Control", "public, max-age=86400");
        reply.header("ETag", etag);
        reply.header("Last-Modified", lastModified);
        return reply.sendFile(cacheKey);
      }

      const buffer = await getFileToBuffer(originalUrl);
      const processedBuffer = await sharp(buffer)
        .resize(w, h, { fit: "cover" })
        .webp()
        .toBuffer();

      if (useCache) {
        await sharp(processedBuffer).toFile(cachePath);
        const stats = fs.statSync(cachePath);
        const fileBuffer = fs.readFileSync(cachePath);
        const etag = generateETag(fileBuffer);
        const lastModified = stats.mtime.toUTCString();
        reply.header("ETag", etag);
        reply.header("Last-Modified", lastModified);
        return reply.sendFile(cacheKey);
      }

      return reply.send(processedBuffer);
    } catch (e) {
      console.error(e);
      return reply.status(500).send("Server error");
    }
  }
);

app.get<{ Params: { encodedUrl: string }; Querystring: QueryParams }>(
  "/img/:encodedUrl/resize",
  async (request, reply) => {
    try {
      const { encodedUrl } = request.params;
      const originalUrl = decodeBase64UrlSafe(encodedUrl);

      const sizeParam = request.query.size;
      if (!sizeParam)
        return reply.status(400).send("Size query param required");

      const w = Number(sizeParam);
      if (isNaN(w) || w <= 0) {
        return reply.status(400).send("Invalid size parameter");
      }

      const cacheKey = `resize_${w}_${encodedUrl}.webp`;
      const cachePath = path.join(cacheDir, cacheKey);

      reply.header("Cache-Control", "public, max-age=86400");
      reply.header("Content-Type", "image/webp");
      if (useCache && fs.existsSync(cachePath)) {
        const stats = fs.statSync(cachePath);
        const fileBuffer = fs.readFileSync(cachePath);
        const etag = generateETag(fileBuffer);
        const lastModified = stats.mtime.toUTCString();

        if (
          request.headers["if-none-match"] === etag ||
          request.headers["if-modified-since"] === lastModified
        ) {
          return reply.status(304).send();
        }

        reply.header("ETag", etag);
        reply.header("Last-Modified", lastModified);
        return reply.sendFile(cacheKey);
      }

      const buffer = await getFileToBuffer(originalUrl);
      const processedBuffer = await sharp(buffer)
        .resize({ width: w })
        .webp()
        .toBuffer();

      if (useCache) {
        await sharp(processedBuffer).toFile(cachePath);
        const stats = fs.statSync(cachePath);
        const fileBuffer = fs.readFileSync(cachePath);
        const etag = generateETag(fileBuffer);
        const lastModified = stats.mtime.toUTCString();

        reply.header("ETag", etag);
        reply.header("Last-Modified", lastModified);
        return reply.sendFile(cacheKey);
      }

      return reply.send(processedBuffer);
    } catch (e) {
      console.error(e);
      return reply.status(500).send("Server error");
    }
  }
);

const start = async () => {
  try {
    await app.listen({ port: Number(port), host: "0.0.0.0" });
    console.log(`App running on port ${port}`);
    console.log(`Caching is ${useCache ? "enabled" : "disabled"}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
