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
    try {
        const { products, logs, user, timestamp } = req.body;
        
        console.log('📦 Iniciando backup para Google Drive...');

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

        // Nome do arquivo com data
        const fileName = `backup_estoque_${new Date().toISOString().split('T')[0]}.json`;

        // Fazer upload para Google Drive
    //    const driveResponse = await googleDriveService.uploadBackup(backupData, fileName);

        console.log('✅ Backup realizado com sucesso no Google Drive');

        res.json({
            success: true,
            message: 'Backup realizado com sucesso no Google Drive',
            backupId: driveResponse.fileId,
            downloadUrl: driveResponse.webViewLink,
            timestamp: driveResponse.timestamp,
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
            error: 'Erro ao fazer backup no Google Drive',
            details: error.message 
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