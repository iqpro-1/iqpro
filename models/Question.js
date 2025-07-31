const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  enunciado: { type: String, required: true },
  imagem: { type: String }, // URL ou base64
  referenciaImagem: { type: String },
  alternativas: [{ type: String }],
  correta: { type: Number }, // índice da alternativa correta (0-4)
  areaConhecimento: { type: String, required: true },
  componenteCurricular: { type: String, required: true },
  anoBNCC: { type: String, required: true },
  objetoConhecimento: { type: String }, // adicionado aqui com o mesmo papel de anoBNCC
  criadaPor: { type: String, default: 'professor' }, // "professor" ou "sistema"
  favorita: { type: Boolean, default: false },
  criadoEm: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Question', questionSchema);
