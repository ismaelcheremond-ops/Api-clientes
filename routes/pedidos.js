// routes/pedidos.js
const express = require('express');
const router = express.Router();
const db = require('../db');

const STATUS_PEDIDO = ['pendente', 'pago', 'cancelado'];

// Recalcula e grava o valor_total do pedido a partir dos itens
async function recalcularTotal(conn, pedidoId) {
  await conn.execute(
    `UPDATE pedidos
        SET valor_total = (
          SELECT COALESCE(SUM(quantidade * preco_unitario), 0)
            FROM itens_pedido WHERE pedido_id = ?
        )
      WHERE id = ?`,
    [pedidoId, pedidoId]
  );
}

// CREATE: Criar pedido vinculado a um cliente existente
router.post('/', async (req, res) => {
  const { cliente_id } = req.body;
  if (!cliente_id) {
    return res.status(400).json({ mensagem: 'cliente_id é obrigatório.' });
  }
  try {
    const [cliente] = await db.execute('SELECT id FROM clientes WHERE id = ?', [cliente_id]);
    if (cliente.length === 0) {
      return res.status(404).json({ mensagem: 'Cliente não encontrado.' });
    }
    const [result] = await db.execute('INSERT INTO pedidos (cliente_id) VALUES (?)', [cliente_id]);
    res.status(201).json({
      id: result.insertId,
      cliente_id,
      status: 'pendente',
      valor_total: 0
    });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao criar pedido.', detalhes: error.message });
  }
});

// READ: Listar todos (dados básicos do pedido + cliente)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT p.id, p.data_pedido, p.status, p.valor_total,
              c.id AS cliente_id, c.nome AS cliente_nome, c.email AS cliente_email
         FROM pedidos p
         JOIN clientes c ON c.id = p.cliente_id
        ORDER BY p.id`
    );
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao buscar pedidos.', detalhes: error.message });
  }
});

// READ: Buscar pedido completo (pedido + cliente + itens)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [pedidos] = await db.execute('SELECT * FROM pedidos WHERE id = ?', [id]);
    if (pedidos.length === 0) {
      return res.status(404).json({ mensagem: 'Pedido não encontrado.' });
    }
    const pedido = pedidos[0];

    const [clientes] = await db.execute('SELECT * FROM clientes WHERE id = ?', [pedido.cliente_id]);

    const [itens] = await db.execute(
      `SELECT i.id, i.produto_id, pr.nome AS produto_nome, i.quantidade, i.preco_unitario,
              (i.quantidade * i.preco_unitario) AS subtotal
         FROM itens_pedido i
         JOIN produtos pr ON pr.id = i.produto_id
        WHERE i.pedido_id = ?`,
      [id]
    );

    const { cliente_id, ...dadosPedido } = pedido;
    res.status(200).json({ ...dadosPedido, cliente: clientes[0], itens });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao buscar pedido.', detalhes: error.message });
  }
});

// UPDATE Parcial: alterar apenas o status
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ mensagem: 'O campo status é obrigatório.' });
  }
  if (!STATUS_PEDIDO.includes(status)) {
    return res.status(400).json({
      mensagem: `Status inválido. Valores aceitos: ${STATUS_PEDIDO.join(', ')}.`
    });
  }
  try {
    const [result] = await db.execute('UPDATE pedidos SET status = ? WHERE id = ?', [status, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: 'Pedido não encontrado.' });
    }
    res.status(200).json({ mensagem: 'Status do pedido atualizado com sucesso.', status });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao atualizar status do pedido.', detalhes: error.message });
  }
});

// CREATE: Adicionar item a um pedido existente
router.post('/:id/itens', async (req, res) => {
  const { id } = req.params;
  const { produto_id, quantidade, preco_unitario } = req.body;

  if (!produto_id || quantidade === undefined || preco_unitario === undefined) {
    return res.status(400).json({
      mensagem: 'produto_id, quantidade e preco_unitario são obrigatórios.'
    });
  }
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    return res.status(400).json({ mensagem: 'A quantidade deve ser um inteiro maior que zero.' });
  }
  if (typeof preco_unitario !== 'number' || preco_unitario < 0) {
    return res.status(400).json({ mensagem: 'O preco_unitario deve ser um número maior ou igual a zero.' });
  }

  let conn;
  try {
    conn = await db.getConnection();

    const [pedidos] = await conn.execute('SELECT id, status FROM pedidos WHERE id = ?', [id]);
    if (pedidos.length === 0) {
      return res.status(404).json({ mensagem: 'Pedido não encontrado.' });
    }
    if (pedidos[0].status !== 'pendente') {
      return res.status(400).json({
        mensagem: `Não é possível adicionar itens a um pedido ${pedidos[0].status}.`
      });
    }

    const [produtos] = await conn.execute('SELECT id FROM produtos WHERE id = ?', [produto_id]);
    if (produtos.length === 0) {
      return res.status(404).json({ mensagem: 'Produto não encontrado.' });
    }

    await conn.beginTransaction();
    const [result] = await conn.execute(
      'INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)',
      [id, produto_id, quantidade, preco_unitario]
    );
    await recalcularTotal(conn, id);
    await conn.commit();

    res.status(201).json({
      id: result.insertId,
      pedido_id: Number(id),
      produto_id,
      quantidade,
      preco_unitario
    });
  } catch (error) {
    if (conn) await conn.rollback();
    res.status(500).json({ mensagem: 'Erro ao adicionar item ao pedido.', detalhes: error.message });
  } finally {
    if (conn) conn.release();
  }
});

// DELETE: Remover um item específico de um pedido
router.delete('/:id_pedido/:valor_total', async (req, res) => {
  const { id_pedido, id_item } = req.params;

  let conn;
  try {
    conn = await db.getConnection();

    const [pedidos] = await conn.execute('SELECT id, status FROM pedidos WHERE id = ?', [id_pedido]);
    if (pedidos.length === 0) {
      return res.status(404).json({ mensagem: 'Pedido não encontrado.' });
    }
    if (pedidos[0].status !== 'pendente') {
      return res.status(400).json({
        mensagem: `Não é possível remover itens de um pedido ${pedidos[0].status}.`
      });
    }

    await conn.beginTransaction();
    const [result] = await conn.execute(
      'DELETE FROM itens_pedido WHERE id = ? AND pedido_id = ?',
      [id_item, id_pedido]
    );
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ mensagem: 'Item não encontrado neste pedido.' });
    }
    await recalcularTotal(conn, id_pedido);
    await conn.commit();

    res.status(200).json({ mensagem: 'Item removido do pedido com sucesso.' });
  } catch (error) {
    if (conn) await conn.rollback();
    res.status(500).json({ mensagem: 'Erro ao remover item do pedido.', detalhes: error.message });
  } finally {
    if (conn) conn.release();
  }
});
// UPDATE Completo (PUT): substitui cliente_id e status
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { cliente_id, status } = req.body;

  if (!cliente_id || !status) {
    return res.status(400).json({
      mensagem: 'Para atualização completa (PUT), informe: cliente_id e status.'
    });
  }
  if (!STATUS_PEDIDO.includes(status)) {
    return res.status(400).json({
      mensagem: `Status inválido. Valores aceitos: ${STATUS_PEDIDO.join(', ')}.`
    });
  }

  try {
    const [cliente] = await db.execute('SELECT id FROM clientes WHERE id = ?', [cliente_id]);
    if (cliente.length === 0) {
      return res.status(404).json({ mensagem: 'Cliente não encontrado.' });
    }

    const [result] = await db.execute(
      'UPDATE pedidos SET cliente_id = ?, status = ? WHERE id = ?',
      [cliente_id, status, id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ mensagem: 'Pedido não encontrado.' });
    }

    res.status(200).json({ mensagem: 'Pedido atualizado completamente com sucesso.' });
  } catch (error) {
    res.status(500).json({ mensagem: 'Erro ao atualizar pedido.', detalhes: error.message });
  }
});
module.exports = router;