const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleDriveService {
    constructor() {
        this.auth = null;
        this.drive = null;
        this.initializeAuth();
    }

    initializeAuth() {
        // Autenticação com Service Account
        this.auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, '../../credentials.json'),
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });

        this.drive = google.drive({ version: 'v3', auth: this.auth });
    }

    // Criar pasta no Google Drive
    async createFolder(folderName) {
        try {
            const fileMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder'
            };

            const response = await this.drive.files.create({
                resource: fileMetadata,
                fields: 'id'
            });

            console.log('📁 Pasta criada no Google Drive:', response.data.id);
            return response.data.id;
        } catch (error) {
            console.error('❌ Erro ao criar pasta:', error);
            throw error;
        }
    }

    // Fazer upload de arquivo
    async uploadBackup(data, fileName) {
        try {
            const fileMetadata = {
                name: fileName,
                parents: ['1ABC123DEF456'] // ID da pasta - atualizar depois
            };

            const media = {
                mimeType: 'application/json',
                body: JSON.stringify(data, null, 2)
            };

            const response = await this.drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, webViewLink'
            });

            console.log('✅ Backup realizado no Google Drive:', response.data.id);
            return {
                fileId: response.data.id,
                webViewLink: response.data.webViewLink,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Erro no upload para Google Drive:', error);
            throw error;
        }
    }

    // Listar backups
    async listBackups() {
        try {
            const response = await this.drive.files.list({
                q: "mimeType='application/json' and name contains 'backup'",
                fields: 'files(id, name, createdTime, webViewLink)',
                orderBy: 'createdTime desc'
            });

            return response.data.files;
        } catch (error) {
            console.error('❌ Erro ao listar backups:', error);
            throw error;
        }
    }
}

module.exports = new GoogleDriveService();