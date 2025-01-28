const axios = require("axios");
const cheerio = require("cheerio");
const { URL } = require("url");


async function analyzeImages(url) {
  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000,
    });
    const images = [];
    const $ = cheerio.load(response.data);

    $("img[src]").each(async (_, element) => {
      const imgUrl = $(element).attr("src");
      const fullImgUrl = new URL(imgUrl, url).toString();
      try {
        const imgResponse = await axios.head(fullImgUrl, { timeout: 10000 });
        const sizeKb = parseInt(imgResponse.headers["content-length"] || 0) / 1024;
        const format = fullImgUrl.split(".").pop();
        if (sizeKb > 1024) {
          images.push({
            url: fullImgUrl,
            size_kb: Math.round(sizeKb),
            format,
          });
        }
      } catch (error) {
        images.push({ url: fullImgUrl, error: error.message });
      }
    });

    return images;
  } catch (error) {
    return { error: error.message };
  }
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


module.exports = { analyzeImages, detectTrackingTools, extractSiteTree };