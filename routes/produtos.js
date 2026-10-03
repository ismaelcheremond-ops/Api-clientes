// routes/produtos.js
const express = require('express');
const router = express.Router();
const db = require('../db');
// CREATE: Inserir Produto
router.post('/', async (req, res) => {
 const { nome, descricao, preco, estoque } = req.body;
 if (!nome || preco === undefined) {
 return res.status(400).json({ mensagem: 'Nome e preço são obrigatórios.' });
 }
 try {
 const [result] = await db.execute(
 'INSERT INTO produtos (nome, descricao, preco, estoque) VALUES(?, ?, ?, ?)',
 [nome, descricao || null, preco, estoque ?? 0]
 );
 res.status(201).json({
 id: result.insertId,
 nome,
 descricao,
 preco,
 estoque: estoque ?? 0,
 status: 'ativo'
 });
 } catch (error) {
 res.status(500).json({ mensagem: 'Erro ao cadastrar produto.',
detalhes: error.message });
 }
});
// READ: Listar todos
router.get('/', async (req, res) => {
 try {
 const [rows] = await db.execute('SELECT * FROM produtos');
 res.status(200).json(rows);
 } catch (error) {
 res.status(500).json({ mensagem: 'Erro ao buscar produtos.',
detalhes: error.message });
 }
});
// READ: Buscar por ID
router.get('/:id', async (req, res) => {
 const { id } = req.params;
 try {
 const [rows] = await db.execute('SELECT * FROM produtos WHERE id= ?', [id]);
 if (rows.length === 0) {
 return res.status(404).json({ mensagem: 'Produto não encontrado.' });
 }
 res.status(200).json(rows[0]);
 } catch (error) {
 res.status(500).json({ mensagem: 'Erro ao buscar produto.',
detalhes: error.message });
 }
});
// UPDATE Completo (PUT)
router.put('/:id', async (req, res) => {
 const { id } = req.params;
 const { nome, descricao, preco, estoque, status } = req.body;
 if (!nome || preco === undefined || estoque === undefined ||
!status) {
 return res.status(400).json({
 mensagem: 'Para atualização completa (PUT), informe: nome,preço, estoque e status.'
 });
 }
 try {
 const [result] = await db.execute(
 'UPDATE produtos SET nome = ?, descricao = ?, preco = ?,estoque = ?, status = ? WHERE id = ?',
 [nome, descricao || null, preco, estoque, status, id]
 );
 if (result.affectedRows === 0) {
 return res.status(404).json({ mensagem: 'Produto nãoencontrado.' });
 }
 res.status(200).json({ mensagem: 'Produto atualizado completamente com sucesso.' });
 } catch (error) {
 res.status(500).json({ mensagem: 'Erro ao atualizar produto.',
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
 if (['nome', 'descricao', 'preco', 'estoque',
'status'].includes(chave)) {
 setClauses.push(`${chave} = ?`);
 queryParams.push(valor);
 }
 }
 if (setClauses.length === 0) {
 return res.status(400).json({ mensagem: 'Nenhum campo válido enviado.' });
 }
 queryParams.push(id);
 const sql = `UPDATE produtos SET ${setClauses.join(', ')} WHERE id= ?`;
 try {
 const [result] = await db.execute(sql, queryParams);
 if (result.affectedRows === 0) {
 return res.status(404).json({ mensagem: 'Produto não encontrado.' });
 }
 res.status(200).json({ mensagem: 'Produto atualizado parcialmente com sucesso.' });
 } catch (error) {
 res.status(500).json({ mensagem: 'Erro ao atualizar produto.',
detalhes: error.message });
 }
});
// DELETE: Remover
router.delete('/:id', async (req, res) => {
 const { id } = req.params;
 try {
 const [result] = await db.execute('DELETE FROM produtos WHERE id= ?', [id]);
 if (result.affectedRows === 0) {
 return res.status(404).json({ mensagem: 'Produto não encontrado.' });
}

 res.status(200).json({ mensagem: 'Produto removido com sucesso.'
});
 } catch (error) {
 res.status(500).json({ mensagem: 'Erro ao remover produto.',detalhes: error.message });
 }
});
module.exports = router;
