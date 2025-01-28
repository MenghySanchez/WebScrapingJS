const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const {
    analyzeImages,
    detectTrackingTools,
    extractSiteTree,
    checkUrlsStatus,
    measurePageLoadTime,
    extractSeoInfo,
} = require("./analyzer");

const app = express();
const PORT = 3000;

// Configurar el motor de vistas EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware para procesar datos enviados por formularios y JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, "public")));

// Ruta de inicio
app.get("/", (req, res) => {
    res.render("index");
});

// Ruta para analizar URL
app.post("/analyze", async (req, res) => {
    const { url, siteTree } = req.body;

    if (!url) {
        return res.render("results", {
            error: "Por favor, ingresa una URL válida.",
            images: [], // Pasar un arreglo vacío si no hay datos
            trackingTools: [],
            siteTree: {}, // Pasar un objeto vacío si no hay datos
            urlStatuses: [],
            pageLoadResults: [],
            seoResults: [],
        });
    }

    try {
        // Analizar imágenes, herramientas de seguimiento y estructura del sitio
        const images = await analyzeImages(url);
        const trackingTools = await detectTrackingTools(url);
        const siteTree = await extractSiteTree(url); // Asegúrate de que esta función esté implementada

        // Obtener todas las URLs del árbol del sitio
        const allUrls = Object.keys(siteTree).concat(...Object.values(siteTree).flat());
        const uniqueUrls = [...new Set([url, ...allUrls])]; // Incluir la URL principal y eliminar duplicados

        // Verificar el estado de las URLs
        const urlStatuses = await checkUrlsStatus(uniqueUrls);

        // Recopilar todas las URLs del árbol del sitio
        const allUrlss = Object.keys(siteTree).concat(...Object.values(siteTree).flat());
        const uniqueUrlss = [...new Set([url, ...allUrlss])];

        // Analizar SEO para cada página
        const seoResults = [];
        for (const pageUrl of uniqueUrlss) {
        const seoInfo = await extractSeoInfo(pageUrl);
        seoResults.push(seoInfo);
        }


        // Analizar tiempos de carga de todas las páginas del árbol del sitio
        const pageLoadResults = [];
        for (const pageUrl of uniqueUrls) {
            const result = await measurePageLoadTime(pageUrl);
            pageLoadResults.push(result);
        }

        res.render("results", {
            error: null,
            images: images || [],
            trackingTools: trackingTools || [],
            siteTree: siteTree || {}, // Asegúrate de pasar un objeto vacío en caso de que no haya datos
            urlStatuses: urlStatuses || [],
            pageLoadResults,
            seoResults,
        });
    } catch (error) {
        res.render("results", {
            error: `Error al analizar ${url}: ${error.message}`,
            images: [],
            trackingTools: [],
            siteTree: {},
            urlStatuses: [],
            pageLoadResults: [],
            seoResults: [],
        });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
