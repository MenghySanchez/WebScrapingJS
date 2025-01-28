const express = require("express");
const bodyParser = require("body-parser");
const path = require("path"); // Asegúrate de requerir el módulo 'path'
const { analyzeImages, detectTrackingTools } = require("./analyzer");

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
    return res.render("results", { error: "Por favor, ingresa una URL válida.", images: [], trackingTools: [] });
  }

  try {
    // Analizar imágenes y herramientas de seguimiento
    const images = await analyzeImages(url);
    const trackingTools = await detectTrackingTools(url);

    res.render("results", {
      error: null,
      images: images || [],
      trackingTools: trackingTools || [],
    });
  } catch (error) {
    res.render("results", {
      error: `Error al analizar ${url}: ${error.message}`,
      images: [],
      trackingTools: [],
    });
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});