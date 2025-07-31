const express = require("express"); 
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;


// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/'); // Pasta onde as imagens serão salvas
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext); // Nome único para evitar conflitos
  }
});
const upload = multer({ storage });

// Caminho absoluto da pasta de uploads
const pastaUploads = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(pastaUploads));


// Conexão com MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.once("open", () => console.log("MongoDB conectado."));
db.on("error", console.error.bind(console, "Erro de conexão:"));

// Modelo da Questão
const QuestaoSchema = new mongoose.Schema({
  blocos: { type: Array, default: [] },
  enunciado: String,
  alternativas: [String],
  correta: Number,
  imagem: String,
  referenciaImagem: String,
  areaConhecimento: String,
  componenteCurricular: String,
  objetoConhecimento: String,
  fonte: String,
});

const Questao = mongoose.model("Questao", QuestaoSchema, "questoes");

// Rotas

// Buscar todas as questões
app.get("/api/questoes", async (req, res) => {
  const questoes = await Questao.find().sort({ _id: -1 });
  res.json(questoes);
});

// Salvar questão sem imagem
app.post("/api/questoes", async (req, res) => {
  const nova = new Questao(req.body);
  await nova.save();
  res.status(201).json(nova);
});

// Salvar questão com upload de imagem
app.post('/api/questoes-com-imagem', upload.single('imagem'), async (req, res) => {
  try {
    const dadosQuestao = JSON.parse(req.body.dadosQuestao);
    if (req.file) {
      dadosQuestao.imagem = `/uploads/${req.file.filename}`;
    }
    const nova = new Questao(dadosQuestao);
    await nova.save();
    res.status(201).json(nova);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar questão com imagem.' });
  }
});

// Atualizar questão
app.put("/api/questoes/:id", async (req, res) => {
  const { id } = req.params;
  const atualizada = await Questao.findByIdAndUpdate(id, req.body, { new: true });
  res.json(atualizada);
});

// Excluir questão
app.delete("/api/questoes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await Questao.findByIdAndDelete(id);
    res.status(204).end();
  } catch (err) {
    console.error("Erro ao excluir:", err);
    res.status(500).json({ error: "Erro ao excluir questão." });
  }
});

// Converter imagem externa para base64
app.post("/api/convert-image", async (req, res) => {
  const { url } = req.body;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Falha ao baixar imagem");
    const buffer = await response.buffer();
    const mime = response.headers.get("content-type") || "image/png";
    const base64 = `data:${mime};base64,${buffer.toString('base64')}`;
    res.json({ base64 });
  } catch (err) {
    res.status(500).json({ error: "Erro ao baixar/converter a imagem", details: err.message });
  }
});


// conexão com IA para gerar questões


// ====== CONEXÃO COM IA PARA GERAR QUESTÕES (Hugging Face) ======

const axios = require("axios");

const OPENROUTER_API_KEY = "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"; // coloque sua chave aqui!

  app.post("/api/gerar-questao-ia", async (req, res) => {
  let { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt ausente" });
  }

  // Adiciona a INSTRUÇÃO PADRÃO ao comando do usuário
  const promptPadrao = `
Responda em portugues do Brasil
Responda exatamente neste formato JSON:

{
  "context": "...",
  "files": [],
  "alternativesIntroduction": "...",
  "alternatives": [
    { "letter": "A", "text": "...", "isCorrect": false },
    { "letter": "B", "text": "...", "isCorrect": false },
    { "letter": "C", "text": "...", "isCorrect": false },
    { "letter": "D", "text": "...", "isCorrect": false },
    { "letter": "E", "text": "...", "isCorrect": false }
  ]
}

Apenas UMA alternativa deve ter "isCorrect": true, as outras "isCorrect": false. Escolha naturalmente a alternativa correta, sem fixar sempre na mesma letra. Não escreva nada fora do JSON.
  `;

  const fullPrompt = prompt + "\n" + promptPadrao;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [{ role: "user", content: fullPrompt }]
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 90000
      }
    );
    const texto = response.data.choices[0].message.content;
    res.json({ resposta: texto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar questão IA", detalhes: err.message });
  }
});
const puppeteer = require('puppeteer');

app.post('/api/gerar-pdf', async (req, res) => {
  const { html } = req.body;
  if (!html) {
    return res.status(400).json({ error: "HTML ausente" });
  }
  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" }
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="prova.pdf"',
    });
    res.send(pdfBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao gerar PDF", details: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

 
// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
