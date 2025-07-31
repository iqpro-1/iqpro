const express = require('express');
const router = express.Router();
const Question = require('../models/Question');

// Rota para cadastrar uma nova questão
router.post('/', async (req, res) => {
  try {
    const novaQuestao = new Question(req.body);
    await novaQuestao.save();
    res.status(201).json(novaQuestao);
  } catch (err) {
    res.status(400).json({ erro: err.message });
  }
});

// Rota para listar todas as questões
router.get('/', async (req, res) => {
  try {
    const questoes = await Question.find();
    res.json(questoes);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
