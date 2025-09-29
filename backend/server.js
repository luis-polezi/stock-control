const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let database = { products: [], logs: [] };

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend do estoque funcionando' });
});

// Sincronizar dados
app.post('/api/sync', (req, res) => {
    try {
        const { products, logs, user } = req.body;
        
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ error: 'Dados inválidos' });
        }
        
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

// Backup (simulação)
app.post('/api/backup', async (req, res) => {
    try {
        const { products, logs, user, timestamp } = req.body;
        
        console.log('Backup solicitado por:', user);
        
        // Simulação de backup
        const backupData = {
            products,
            logs,
            backedUpBy: user,
            backupDate: timestamp || new Date().toISOString()
        };
        
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

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});