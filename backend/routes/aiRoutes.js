import express from 'express';
import { gerarPlanoAula, gerarProva } from '../controllers/aiController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.post('/plano-aula', gerarPlanoAula);
router.post('/gerar-prova', gerarProva);

export default router;