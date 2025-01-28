const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { analyzeImages, detectTrackingTools, extractSiteTree } = require("./analyzer");

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
    const { url } = req.body;
  
    if (!url) {
      return res.render("results", {
        error: "Por favor, ingresa una URL válida.",
        images: [],
        trackingTools: [],
        siteTree: {} // Pasar un objeto vacío si no hay datos
      });
    }
  
    try {
      const images = await analyzeImages(url);
      const trackingTools = await detectTrackingTools(url);
      const siteTree = await extractSiteTree(url); // Asegúrate de que esta función esté implementada
  
      res.render("results", {
        error: null,
        images: images || [],
        trackingTools: trackingTools || [],
        siteTree: siteTree || {} // Asegúrate de pasar un objeto vacío en caso de que no haya datos
      });
    } catch (error) {
      res.render("results", {
        error: `Error al analizar ${url}: ${error.message}`,
        images: [],
        trackingTools: [],
        siteTree: {}
      });
    }
  });

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});