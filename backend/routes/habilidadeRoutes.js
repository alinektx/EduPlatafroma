import express from 'express';
import {
  criarHabilidade,
  obterHabilidades,
  obterHabilidadePorId
} from '../controllers/habilidadeController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);

router.route('/')
  .post(criarHabilidade)
  .get(obterHabilidades);

router.route('/:id')
  .get(obterHabilidadePorId);

export default router;