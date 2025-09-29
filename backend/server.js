const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Armazenamento em memória (substituir por banco de dados depois)
let database = {
  products: [],
  logs: []
};

// Rotas básicas
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend do estoque funcionando' });
});

// Rota para sincronizar dados
app.post('/api/sync', (req, res) => {
  try {
    const { products, logs, user } = req.body;
    
    // Validação básica
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }
    
    // Atualiza os dados (em produção, usar banco de dados)
    database.products = products;
    database.logs = logs;
    
    console.log(`Dados sincronizados por: ${user}`);
    
    res.json({ 
      success: true, 
      message: 'Dados sincronizados com sucesso',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erro na sincronização:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para fazer backup no Google Drive
app.post('/api/backup', async (req, res) => {
  try {
    const { products, logs, user, timestamp } = req.body;
    
    // Aqui vamos integrar com Google Drive depois
    console.log('Backup solicitado por:', user);
    
    // Simulação de backup
    const backupData = {
      products,
      logs,
      backedUpBy: user,
      backupDate: timestamp || new Date().toISOString(),
      totalProducts: products.length,
      totalLogs: logs.length
    };
    
    // Por enquanto, só registramos no console
    console.log('Backup realizado:', backupData);
    
    res.json({
      success: true,
      message: 'Backup realizado com sucesso (simulação)',
      backupId: `backup_${Date.now()}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erro no backup:', error);
    res.status(500).json({ error: 'Erro ao fazer backup' });
  }
});

// Rota para obter dados
app.get('/api/data', (req, res) => {
  res.json({
    products: database.products,
    logs: database.logs,
    lastUpdate: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Backend do sistema de estoque`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});