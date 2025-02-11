const axios = require("axios");
const cheerio = require("cheerio");

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

module.exports = { analyzeImages, detectTrackingTools };