const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS CONFIGURADO CORRETAMENTE
app.use(cors({
    origin: [
        'https://bibi-paineis-estoque.netlify.app',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Import DEPOIS do CORS
const cloudflareR2Storage = require('./services/cloudflareR2Storage');

let database = { products: [], logs: [] };

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Backend do estoque funcionando',
        timestamp: new Date().toISOString()
    });
});

// Rota de Backup ÚNICA - Cloudflare R2
app.post('/api/backup', async (req, res) => {
    console.log('📦 Backup request recebida');
    
    try {
        const { products, logs, user, timestamp } = req.body;
        
        console.log('📊 Dados recebidos:', {
            user: user,
            products: products?.length,
            logs: logs?.length
        });

        // Preparar dados para backup
        const backupData = {
            system: "Sistema de Estoque",
            version: "1.0.0",
            backupDate: timestamp || new Date().toISOString(),
            backedUpBy: user,
            data: {
                products: products,
                logs: logs
            },
            totals: {
                products: products.length,
                logs: logs.length
            }
        };

        // Nome do arquivo
        const fileName = `backup_estoque_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;

        console.log('🔄 Iniciando upload para Cloudflare R2...');

        // Fazer upload para Cloudflare R2
        const r2Response = await cloudflareR2Storage.uploadBackup(backupData, fileName);

        console.log('✅ Backup realizado com sucesso no Cloudflare R2');

        res.json({
            success: true,
            message: '✅ Backup JSON salvo com sucesso no Cloudflare R2!',
            backupId: r2Response.fileId,
            downloadUrl: r2Response.downloadUrl,
            timestamp: r2Response.timestamp,
            details: {
                products: products.length,
                logs: logs.length,
                fileName: fileName
            }
        });
        
    } catch (error) {
        console.error('❌ Erro no backup:', error);
        res.status(500).json({ 
            success: false,
            error: 'Erro ao fazer backup no Cloudflare R2: ' + error.message
        });
    }
});

// Rota de sincronização (se precisar)
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

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});