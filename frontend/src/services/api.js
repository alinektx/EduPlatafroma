import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Adiciona token automaticamente nas requisições
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  return config;
});

export const gerarPlanoAula = (habilidadeId) => {
  return api.post('/ai/plano-aula', { habilidadeId });
};

// Chamada no componente React:
/*
const handleGerarPlano = async () => {
  try {
    const response = await gerarPlanoAula(selectedHabilidadeId);
    setPlanoAula(response.data.planoAula);
  } catch (error) {
    console.error("Erro ao gerar plano:", error);
  }
}
*/