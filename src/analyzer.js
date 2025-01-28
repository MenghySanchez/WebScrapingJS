const axios = require("axios");
const cheerio = require("cheerio");
const { URL } = require("url");
const sharp = require("sharp");
const fs = require("fs-extra");
const path = require("path");



/**
 * Analyzes images from a given URL, generates thumbnails for images larger than 1MB, and returns metadata about the images.
 *
 * @param {string} url - The URL of the webpage to analyze.
 * @returns {Promise<Object[]>} A promise that resolves to an array of objects containing image metadata.
 * Each object contains the following properties:
 *   - {string} url - The full URL of the image.
 *   - {number} size_kb - The size of the image in kilobytes.
 *   - {string} format - The format of the image (e.g., "jpg", "png").
 *   - {string} [thumbnail] - The relative URL of the generated thumbnail (if applicable).
 *   - {string} [error] - An error message if the image could not be processed.
 */
async function analyzeImages(url) { 
  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000,
    });
    const images = [];
    const $ = cheerio.load(response.data);

    // Directorio donde se guardarán las miniaturas
    const thumbnailsDir = path.join(__dirname, "../public/thumbnails");
    await fs.ensureDir(thumbnailsDir);

    const imagePromises = $("img[src]").map(async (_, element) => {
      const imgUrl = $(element).attr("src");
      const fullImgUrl = new URL(imgUrl, url).toString();
      try {
        const imgResponse = await axios({
          method: "get",
          url: fullImgUrl,
          responseType: "arraybuffer",
          timeout: 10000,
        });

/* This line of code calculates the size of the image data in kilobytes. */
        const sizeKb = Buffer.byteLength(imgResponse.data) / 1024;
        const format = fullImgUrl.split(".").pop();

        if (sizeKb > 1024) {
          // Generar una miniatura usando Sharp
          const thumbnailPath = path.join(thumbnailsDir, `${Date.now()}-${path.basename(imgUrl)}`);
          await sharp(imgResponse.data)
            .resize(150, 150, { fit: "inside" }) // Crear una miniatura de 150x150 píxeles
            .toFile(thumbnailPath);

          images.push({
            url: fullImgUrl,
            size_kb: Math.round(sizeKb),
            format,
            thumbnail: `/thumbnails/${path.basename(thumbnailPath)}`, // URL relativa de la miniatura
          });
        }
      } catch (error) {
        images.push({ url: fullImgUrl, error: error.message });
      }
    });

    await Promise.all(imagePromises);

    return images;
  } catch (error) {
    return { error: error.message };
  }
}

async function checkUrlsStatus(urls) {
  const results = [];

  for (const url of urls) {
    try {
      const response = await axios.head(url, {
        timeout: 10000,
      });
      results.push({
        url,
        status: response.status, // Código de estado HTTP
      });
    } catch (error) {
      results.push({
        url,
        status: error.response ? error.response.status : "Error", // Si no hay respuesta, marca como Error
      });
    }
  }

  return results;
}


async function detectTrackingTools(url) {
  const tools = {
    "Facebook Pixel": ["https://connect.facebook.net", "fbq("],
    "Hotjar": ["https://static.hotjar.com", "_hjSettings"],
    "Google Analytics": ["gtag('config'", "www.googletagmanager.com"],
    "LinkedIn Insights": ["snap.licdn.com"],
  };

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000,
    });
    const content = response.data;
    const detected = [];

    for (const [tool, patterns] of Object.entries(tools)) {
      for (const pattern of patterns) {
        if (content.includes(pattern)) {
          detected.push(tool);
          break;
        }
      }
    }

    return detected.length ? detected : ["No se detectaron herramientas de seguimiento"];
  } catch (error) {
    return [`Error al analizar ${url}: ${error.message}`];
  }
}

async function extractSiteTree(baseUrl, maxDepth = 2) {
  const visited = new Set(); // Rastrear las páginas visitadas
  const siteTree = {};

  async function crawl(url, depth) {
    if (depth > maxDepth || visited.has(url)) return;
    visited.add(url);

    try {
      const response = await axios.get(url, { timeout: 10000, headers: { "User-Agent": "Mozilla/5.0" } });
      const $ = cheerio.load(response.data);

      const links = $("a[href]")
        .map((_, el) => new URL($(el).attr("href"), baseUrl).toString())
        .get()
        .filter(link => link.startsWith(baseUrl)); // Solo enlaces internos

      siteTree[url] = [...new Set(links)];
      for (const link of links) {
        await crawl(link, depth + 1);
      }
    } catch (error) {
      siteTree[url] = { error: error.message };
    }
  }

  await crawl(baseUrl, 0);
  return siteTree;
}


module.exports = { analyzeImages, detectTrackingTools, extractSiteTree, checkUrlsStatus };