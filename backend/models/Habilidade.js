import mongoose from 'mongoose';

const habilidadeSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  componente: {
    type: String,
    required: true,
    enum: [
      'Língua Portuguesa', 
      'Matemática', 
      'Ciências', 
      'História', 
      'Geografia',
      'Arte',
      'Educação Física',
      'Inglês'
    ]
  },
  ano: {
    type: Number,
    required: true,
    min: 1,
    max: 9
  },
  descricao: {
    type: String,
    required: true,
    trim: true
  },
  objetosConhecimento: {
    type: [String],
    required: true
  },
  criadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  }
}, { timestamps: true });

const Habilidade = mongoose.model('Habilidade', habilidadeSchema);

export default Habilidade;