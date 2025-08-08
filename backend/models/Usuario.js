import mongoose from 'mongoose';

const usuarioSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  senha: {
    type: String,
    required: true,
    minlength: 6
  },
  escola: {
    type: String,
    required: true,
    trim: true
  },
  dataCriacao: {
    type: Date,
    default: Date.now
  },
  tipo: {
    type: String,
    enum: ['professor', 'admin'],
    default: 'professor'
  }
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

export default Usuario;