const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const googleDriveService = require('./services/googleDrive');

app.use(cors());
app.use(express.json());

let database = { products: [], logs: [] };

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend do estoque funcionando' });
});

// Sincronizar dados
app.post('/api/backup', async (req, res) => {
    console.log('📦 Backup request recebida');
    
    try {
        const { products, logs, user } = req.body;
        
        console.log('📊 Dados recebidos:', {
            user: user,
            products: products?.length,
            logs: logs?.length
        });

        // SIMULAÇÃO - REMOVA DEPOIS
        const simulatedResponse = {
            success: true,
            message: '✅ Backup simulado - Backend funcionando!',
            backupId: 'simulated_' + Date.now(),
            timestamp: new Date().toISOString(),
            data: {
                products: products?.length || 0,
                logs: logs?.length || 0
            }
        };

        console.log('✅ Resposta simulada:', simulatedResponse);
        
        res.json(simulatedResponse);

    } catch (error) {
        console.error('❌ Erro no backup:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erro interno: ' + error.message
        });
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