const { google } = require('googleapis');

class GoogleDriveService {
    constructor() {
        console.log('🔄 Inicializando Google Drive Service...');
        this.auth = null;
        this.drive = null;
        this.initializeAuth();
    }

    initializeAuth() {
        try {
            console.log('🔐 Tentando autenticar com Google Drive via variáveis de ambiente...');
            
            // Verificar se as variáveis de ambiente existem
            const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
            
            if (!credentialsJson) {
                throw new Error('GOOGLE_CREDENTIALS_JSON não encontrada nas variáveis de ambiente');
            }

            // Parse das credenciais do JSON string
            const credentials = JSON.parse(credentialsJson);
            
            this.auth = new google.auth.GoogleAuth({
                credentials: credentials,
                scopes: ['https://www.googleapis.com/auth/drive.file']
            });

            this.drive = google.drive({ version: 'v3', auth: this.auth });
            console.log('✅ Google Drive autenticado com sucesso via variáveis de ambiente');
            
        } catch (error) {
            console.error('❌ ERRO CRÍTICO na autenticação Google Drive:', error.message);
            throw error;
        }
    }

    async uploadBackup(data, fileName) {
        try {
            console.log('📤 Iniciando upload para Google Drive...');
            console.log('📝 Nome do arquivo:', fileName);
            console.log('📁 Folder ID:', process.env.GOOGLE_DRIVE_FOLDER_ID);
            
            if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
                throw new Error('GOOGLE_DRIVE_FOLDER_ID não configurado');
            }

            const fileMetadata = {
                name: fileName,
                parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
            };

            const media = {
                mimeType: 'application/json',
                body: JSON.stringify(data, null, 2)
            };

            console.log('🔄 Criando arquivo no Drive...');
            
            const response = await this.drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, webViewLink, name'
            });

            console.log('✅ Upload concluído com sucesso!');
            console.log('📄 Arquivo criado:', response.data.name);
            console.log('🔗 ID:', response.data.id);
            console.log('🌐 URL:', response.data.webViewLink);
            
            return {
                fileId: response.data.id,
                webViewLink: response.data.webViewLink,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ ERRO no upload para Google Drive:');
            console.error('Mensagem:', error.message);
            if (error.errors) console.error('Detalhes:', error.errors);
            throw error;
        }
    }
}

module.exports = new GoogleDriveService();