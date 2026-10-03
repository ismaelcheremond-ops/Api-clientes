// routes/clientes.js
const express = require('express');
const router = express.Router();
const db = require('../db');
// CREATE: Inserir Cliente
router.post('/', async (req, res) => {
 const { nome, email, telefone } = req.body;
 if (!nome || !email) {
 return res.status(400).json({ mensagem: 'Nome e email são obrigatórios.' });
 }
 try {
 const [result] = await db.execute(
 'INSERT INTO clientes (nome, email, telefone) VALUES (?, ?,?)',
 [nome, email, telefone || null]
 );
 res.status(201).json({ id: result.insertId, nome, email,
telefone, status: 'ativo' });
 } catch (error) {
 if (error.code === 'ER_DUP_ENTRY') {
 return res.status(400).json({ mensagem: 'Email já cadastrado.'
});
 }
 res.status(500).json({ mensagem: 'Erro interno no servidor.',
detalhes: error.message });
 }
});
// READ: Listar todos
router.get('/', async (req, res) => {
 try {
 const [rows] = await db.execute('SELECT * FROM clientes');
 res.status(200).json(rows);
 } catch (error) {
 res.status(500).json({ mensagem: 'Erro ao buscar clientes.',
detalhes: error.message });
 }
});
// READ: Buscar por ID
router.get('/:id', async (req, res) => {
 const { id } = req.params;
 try {
 const [rows] = await db.execute('SELECT * FROM clientes WHERE id= ?', [id]);
 if (rows.length === 0) {
 return res.status(404).json({ mensagem: 'Cliente não encontrado.' });
 }
 res.status(200).json(rows[0]);
 } catch (error) {
 res.status(500).json({ mensagem: 'Erro ao buscar cliente.',
detalhes: error.message });
 }
});
// UPDATE Completo (PUT)
router.put('/:id', async (req, res) => {
 const { id } = req.params;
 const { nome, email, telefone, status } = req.body;
 if (!nome || !email || !status) {
 return res.status(400).json({
 mensagem: 'Para atualização completa (PUT), informe: nome,email e status.'
 });
 }
 try {
 const [result] = await db.execute(
 'UPDATE clientes SET nome = ?, email = ?, telefone = ?, status= ? WHERE id = ?',
 [nome, email, telefone || null, status, id]
 );
 if (result.affectedRows === 0) {
 return res.status(404).json({ mensagem: 'Cliente não encontrado.' });
 }
 res.status(200).json({ mensagem: 'Cliente atualizado completamente com sucesso.' });
 } catch (error) {
 res.status(500).json({ mensagem: 'Erro ao atualizar cliente.',
detalhes: error.message });
 }
});
// UPDATE Parcial (PATCH)
router.patch('/:id', async (req, res) => {
 const { id } = req.params;
 const campos = req.body;
 if (Object.keys(campos).length === 0) {
 return res.status(400).json({ mensagem: 'Nenhum campo fornecido para atualização.' });
 }
 const setClauses = [];
 const queryParams = [];
 for (const [chave, valor] of Object.entries(campos)) {
 if (['nome', 'email', 'telefone', 'status'].includes(chave)) {
 setClauses.push(`${chave} = ?`);
 queryParams.push(valor);
 }
 }
 if (setClauses.length === 0) {
 return res.status(400).json({ mensagem: 'Nenhum campo válido enviado.' });
 }
queryParams.push(id);
 const sql = `UPDATE clientes SET ${setClauses.join(', ')} WHERE id= ?`;
 try {
 const [result] = await db.execute(sql, queryParams);
 if (result.affectedRows === 0) {
 return res.status(404).json({ mensagem: 'Cliente não encontrado.' });
 }
 res.status(200).json({ mensagem: 'Cliente atualizado parcialmente com sucesso.' });
 } catch (error) {
 res.status(500).json({ mensagem: 'Erro ao atualizar cliente.',detalhes: error.message });
 }
});

// DELETE: Remover
router.delete('/:id', async (req, res) => {
 const { id } = req.params;
 try {
 const [result] = await db.execute('DELETE FROM clientes WHERE id= ?', [id]);
 if (result.affectedRows === 0) {
 return res.status(404).json({ mensagem: 'Cliente nãoencontrado.' });
 }
 res.status(200).json({ mensagem: 'Cliente removido com sucesso.'
});
 } catch (error) {
 res.status(500).json({ mensagem: 'Erro ao remover cliente.',detalhes: error.message });
 }
});
module.exports = router;