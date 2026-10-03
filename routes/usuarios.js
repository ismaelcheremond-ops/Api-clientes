// routes/usuarios.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');

const PERFIS = ['admin', 'operador'];
const STATUS = ['ativo', 'inativo'];
const CAMPOS_PATCH = ['nome', 'email', 'senha', 'perfil', 'status'];

// Gera hash da senha (scrypt nativo do Node, sem dependência extra)
function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(senha), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

// Nunca devolve a senha nas respostas
const COLUNAS = 'id, nome, email, perfil, status, criado_em';

// Retorna mensagem de erro se perfil/status forem inválidos
function validarEnums({ perfil, status }) {
  if (perfil !== undefined && !PERFIS.includes(perfil)) {
    return `Perfil inválido. Valores aceitos: ${PERFIS.join(', ')}.`;
  }
  if (status !== undefined && !STATUS.includes(status)) {
    return `Status inválido. Valores aceitos: ${STATUS.join(', ')}.`;
  }
  return null;
}

// CREATE: Inserir Usuário
router.post('/', async (req, res) => {
  const { nome, email, senha, perfil, status } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ mensagem: 'Nome, email e senha são obrigatórios.' });
  }
  const erroEnum = validarEnums({ perfil, status });
  if (erroEnum) {
    return res.status(400).json({ mensagem: erroEnum });
  }
  try {
    const [result] = await db.execute(
      'INSERT INTO usuarios (nome, email, senha, perfil, status) VALUES (?, ?, ?, ?, ?)',
      [nome, email, hashSenha(senha), perfil || 'operador', status || 'ativo']
    );
    res.status(201).json({
      id: result.insertId,
      nome,
      email,
      perfil: perfil || 'operador',
      status: status || 'ativo'
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ mensagem: 'Email já cadastrado.' });
    }
    res.status(500).json({ mensagem: 'Erro interno no servidor.', detalhes: error.message });
  }
});

// READ: Listar todos
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(`SELECT ${COLUNAS} FROM usuarios`);
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao buscar usuários.', detalhes: error.message });
  }
});

// READ: Buscar por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.execute(`SELECT ${COLUNAS} FROM usuarios WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao buscar usuário.', detalhes: error.message });
  }
});

// UPDATE Completo (PUT)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, perfil, status } = req.body;
  if (!nome || !email || !senha || !perfil || !status) {
    return res.status(400).json({
      mensagem: 'Para atualização completa (PUT), informe: nome, email, senha, perfil e status.'
    });
  }
  const erroEnum = validarEnums({ perfil, status });
  if (erroEnum) {
    return res.status(400).json({ mensagem: erroEnum });
  }
  try {
    const [result] = await db.execute(
      'UPDATE usuarios SET nome = ?, email = ?, senha = ?, perfil = ?, status = ? WHERE id = ?',
      [nome, email, hashSenha(senha), perfil, status, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }
    res.status(200).json({ mensagem: 'Usuário atualizado completamente com sucesso.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ mensagem: 'Email já cadastrado.' });
    }
    res.status(500).json({ mensagem: 'Erro ao atualizar usuário.', detalhes: error.message });
  }
});

// UPDATE Parcial (PATCH)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const campos = req.body;
  if (Object.keys(campos).length === 0) {
    return res.status(400).json({ mensagem: 'Nenhum campo fornecido para atualização.' });
  }
  const erroEnum = validarEnums(campos);
  if (erroEnum) {
    return res.status(400).json({ mensagem: erroEnum });
  }
  const setClauses = [];
  const queryParams = [];
  for (const [chave, valor] of Object.entries(campos)) {
    if (CAMPOS_PATCH.includes(chave)) {
      if (valor === '' || valor === null) {
        return res.status(400).json({ mensagem: `O campo ${chave} não pode ser vazio.` });
      }
      setClauses.push(`${chave} = ?`);
      queryParams.push(chave === 'senha' ? hashSenha(valor) : valor);
    }
  }
  if (setClauses.length === 0) {
    return res.status(400).json({ mensagem: 'Nenhum campo válido enviado.' });
  }
  queryParams.push(id);
  const sql = `UPDATE usuarios SET ${setClauses.join(', ')} WHERE id = ?`;
  try {
    const [result] = await db.execute(sql, queryParams);
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }
    res.status(200).json({ mensagem: 'Usuário atualizado parcialmente com sucesso.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ mensagem: 'Email já cadastrado.' });
    }
    res.status(500).json({ mensagem: 'Erro ao atualizar usuário.', detalhes: error.message });
  }
});

// DELETE: Remover
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.execute('DELETE FROM usuarios WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: 'Usuário não encontrado.' });
    }
    res.status(200).json({ mensagem: 'Usuário removido com sucesso.' });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao remover usuário.', detalhes: error.message });
  }
});
module.exports = router;