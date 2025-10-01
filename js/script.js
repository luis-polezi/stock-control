// Chaves para armazenamento local
const STORAGE_KEYS = {
    PRODUCTS: 'estoque_produtos',
    LOGS: 'estoque_logs',
    BACKUP: 'estoque_backup'
};

// Configuração da API
const API_CONFIG = {
    baseURL: 'https://stock-control-production.up.railway.app',
    endpoints: {
        sync: '/api/sync',
        backup: '/api/backup',
        data: '/api/data',
        latestBackup: '/api/latest-backup'
    }
};

const SYSTEM_VERSION = "1.0";

// No DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    const versionFooter = document.getElementById('version-footer');
    if (versionFooter) {
        versionFooter.innerHTML = `Sistema de Gerenciamento de Estoque - <strong>v${SYSTEM_VERSION}</strong>`;
    }
});

function showError(message) {
    alert('Erro: ' + message);
    console.error(message);
}

// Funções para gerenciar o armazenamento local
const storage = {
    save: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Erro ao salvar dados:', e);
            return false;
        }
    },
    
    load: function(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Erro ao carregar dados:', e);
            return null;
        }
    },
    
    clear: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Erro ao limpar dados:', e);
            return false;
        }
    }
};

// Sistema começa vazio
let products = storage.load(STORAGE_KEYS.PRODUCTS) || [];
let logs = storage.load(STORAGE_KEYS.LOGS) || [];

// Elementos da interface
const loginScreen = document.getElementById('login-screen');
const mainContent = document.getElementById('main-content');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const logoutBtn = document.getElementById('logout-btn');
const headerLogoutBtn = document.getElementById('header-logout-btn');
const userInfo = document.getElementById('user-info');
const userName = document.getElementById('user-name');

// Credenciais válidas
const users = {
    "admin": { password: "133712", role: "admin" },
    "Gabriela": { password: "070315", role: "admin" },
    "consulta": { password: "123456", role: "viewer" }
};

// Variáveis para controle de estado
let currentUser = "";
let currentUserRole = "";
let pendingMovements = {};
let currentSort = { column: 'name', direction: 'asc' };

// ============================================================================
// FUNÇÕES DE BACKUP AUTOMÁTICO
// ============================================================================

// Função para backup automático
async function autoBackup() {
    try {
        console.log('🔄 Iniciando backup automático...');
        
        if (!API_CONFIG.baseURL) {
            console.log('Backend não configurado - backup automático ignorado');
            return;
        }
        
        const response = await fetch(API_CONFIG.baseURL + API_CONFIG.endpoints.backup, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                products, 
                logs, 
                user: currentUser,
                timestamp: new Date().toISOString(),
                automatic: true
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Backup automático realizado com sucesso');
        } else {
            console.log('⚠️ Backup automático falhou:', result.error);
        }
    } catch (error) {
        console.log('⚠️ Erro no backup automático:', error);
    }
}

// Função para verificar status do backend
async function checkBackendStatus() {
    try {
        const response = await fetch(API_CONFIG.baseURL + '/api/health');
        const data = await response.json();
        console.log('✅ Backend conectado:', data.status);
        return true;
    } catch (error) {
        console.log('⚠️ Backend offline - modo local');
        return false;
    }
}

// Função para carregar último backup automaticamente
async function loadLatestBackupAuto() {
    try {
        console.log('🔄 Buscando último backup automaticamente...');
        
        const latestBackup = await api.getLatestBackup();
        
        if (latestBackup) {
            console.log('📦 Backup encontrado:', latestBackup.fileName);
            
            // Carrega automaticamente sem pedir confirmação
            await loadBackupFromUrlAuto(latestBackup.downloadUrl);
        } else {
            console.log('ℹ️ Nenhum backup encontrado para carregar');
        }
    } catch (error) {
        console.log('⚠️ Não foi possível verificar backups:', error);
    }
}

// Função para carregar backup automaticamente
async function loadBackupFromUrlAuto(backupUrl) {
    try {
        console.log('📥 Carregando backup automaticamente...');
        
        const response = await fetch(backupUrl);
        const backupData = await response.json();
        
        // Validar estrutura do backup
        if (backupData.data && backupData.data.products && Array.isArray(backupData.data.products)) {
            
            const productCount = backupData.data.products.length;
            const logCount = backupData.data.logs ? backupData.data.logs.length : 0;
            
            console.log(`📊 Carregando backup: ${productCount} produtos, ${logCount} logs`);
            
            // Substituir dados atuais
            products = backupData.data.products;
            logs = backupData.data.logs || [];
            
            // Salvar localmente
            saveAllData();
            
            // Atualizar interface
            updateBalanceTable();
            updateProductsTable();
            updateLogsTable();
            updateMovementGrid();
            
            console.log('✅ Backup carregado automaticamente');
            
        } else {
            throw new Error('Estrutura de backup inválida');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar backup automaticamente:', error);
    }
}

// ============================================================================
// FUNÇÕES DE EXPORTAÇÃO/IMPORTAÇÃO
// ============================================================================

// Exportar para JSON
function exportToJSON() {
    const exportData = {
        products: products,
        logs: logs,
        exportDate: new Date().toISOString(),
        system: "Sistema de Estoque",
        version: "2.0",
        totalProducts: products.length,
        totalLogs: logs.length,
        exportedBy: currentUser
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    
    const formatDate = (date) => {
        return date.toISOString()
            .replace(/T/, '_')
            .replace(/\..+/, '')
            .replace(/:/g, '-');
    };
    link.download = `estoque_${formatDate(new Date())}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('✅ Dados exportados em JSON com sucesso!');
}

// Exportar para CSV (Excel)
function exportToCSV() {
    // Cabeçalhos do CSV para produtos
    let csvContent = "Nome do Produto,Modelo (Cor),Saldo Atual\n";
    
    // Adicionar produtos
    products.forEach(product => {
        csvContent += `"${product.name}","${product.model}",${product.balance}\n`;
    });
    
    // Cabeçalhos do CSV para logs
    const logsCSV = "Data/Hora,Ficha,Usuário,Produto,Modelo,Movimentação,Valor\n" +
        logs.map(log => {
            const product = products.find(p => p.id === log.productId);
            const productName = product ? product.name : 'Produto não encontrado';
            const productModel = product ? product.model : 'N/A';
            return `"${log.date}","${log.ficha || 'N/A'}","${log.user}","${productName}","${productModel}","${log.type === 'entrada' ? 'Entrada' : 'Saída'}",${log.quantity}`;
        }).join('\n');
    
    // Criar arquivo CSV principal (produtos)
    const csvBlob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement('a');
    csvLink.href = csvUrl;
    csvLink.download = `estoque_produtos_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(csvLink);
    csvLink.click();
    document.body.removeChild(csvLink);
    URL.revokeObjectURL(csvUrl);
    
    // Criar arquivo CSV de logs
    const logsBlob = new Blob([logsCSV], {type: 'text/csv;charset=utf-8;'});
    const logsUrl = URL.createObjectURL(logsBlob);
    const logsLink = document.createElement('a');
    logsLink.href = logsUrl;
    logsLink.download = `estoque_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(logsLink);
    logsLink.click();
    document.body.removeChild(logsLink);
    URL.revokeObjectURL(logsUrl);
    
    alert('✅ Dados exportados em CSV (Excel) com sucesso!\n\nDois arquivos foram baixados:\n- estoque_produtos_[data].csv (Produtos)\n- estoque_logs_[data].csv (Logs)');
}

// Importar dados de arquivo
function importFromFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                let importedData;
                
                if (file.name.endsWith('.json')) {
                    // Importar JSON
                    importedData = JSON.parse(e.target.result);
                    validateImportedData(importedData);
                } else if (file.name.endsWith('.csv')) {
                    // Importar CSV (implementação básica)
                    importedData = parseCSV(e.target.result);
                } else {
                    reject(new Error('Formato de arquivo não suportado. Use JSON ou CSV.'));
                    return;
                }
                
                resolve(importedData);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Erro ao ler o arquivo'));
        };
        
        if (file.name.endsWith('.json') || file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reject(new Error('Formato de arquivo não suportado'));
        }
    });
}

// Função básica para parse de CSV
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const products = [];
    
    // Pular cabeçalho e processar linhas
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        // Processamento básico de CSV - pode ser expandido conforme necessidade
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        if (values.length >= 3) {
            products.push({
                id: products.length + 1,
                name: values[0],
                model: values[1],
                balance: parseInt(values[2]) || 0
            });
        }
    }
    
    return { products: products, logs: [] };
}

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

// Função para salvar todos os dados (COM BACKUP AUTOMÁTICO)
async function saveAllData() {
    try {
        // Salva localmente primeiro
        const success1 = storage.save(STORAGE_KEYS.PRODUCTS, products);
        const success2 = storage.save(STORAGE_KEYS.LOGS, logs);
        
        if (!success1 || !success2) {
            showError('Erro ao salvar dados localmente');
            return false;
        }
        
        // Tenta sincronizar com backend se disponível
        await api.syncToBackend();
        
        // FAZ BACKUP AUTOMÁTICO APÓS SALVAR
        await autoBackup();
        
        return true;
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        return false;
    }
}

// Funções para comunicação com backend
const api = {
    syncToBackend: async function() {
        if (!API_CONFIG.baseURL) {
            console.log('Backend não configurado - modo offline');
            return false;
        }
        
        try {
            const response = await fetch(API_CONFIG.baseURL + API_CONFIG.endpoints.sync, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    products, 
                    logs, 
                    user: currentUser 
                })
            });
            
            if (response.ok) {
                console.log('✅ Dados sincronizados com backend');
                return true;
            } else {
                console.error('❌ Erro na sincronização:', response.status);
                return false;
            }
        } catch (error) {
            console.error('❌ Erro de conexão com backend:', error);
            return false;
        }
    },

    getLatestBackup: async function() {
        if (!API_CONFIG.baseURL) {
            console.log('Backend não configurado');
            return null;
        }
        
        try {
            const response = await fetch(API_CONFIG.baseURL + '/api/latest-backup');
            const result = await response.json();
            
            if (result.success && result.hasBackup) {
                return result.backup;
            }
            return null;
        } catch (error) {
            console.log('⚠️ Não foi possível verificar backups:', error);
            return null;
        }
    }
};

// Configurar interface baseada no tipo de usuário
function setupUserInterface() {
    const isViewer = currentUserRole === 'viewer';
    
    // Mostrar informações do usuário no header
    userName.textContent = `${currentUser} (${isViewer ? 'Consulta' : 'Administrador'})`;
    userInfo.style.display = 'flex';
    
    // Mostrar mensagem de modo de consulta
    document.getElementById('readonly-message').style.display = isViewer ? 'block' : 'none';
    document.getElementById('readonly-products-message').style.display = isViewer ? 'block' : 'none';
    document.getElementById('readonly-movement-message').style.display = isViewer ? 'block' : 'none';
    document.getElementById('readonly-data-message').style.display = isViewer ? 'block' : 'none';
    
    // Liberar aba logs para consulta
    document.getElementById('logs-tab-header').classList.remove('disabled-tab');
    
    // Desabilitar abas para usuário viewer (exceto logs)
    document.getElementById('products-tab-header').classList.toggle('disabled-tab', isViewer);
    document.getElementById('movement-tab-header').classList.toggle('disabled-tab', isViewer);
    
    // Desabilitar formulários e botões para usuário viewer
    document.getElementById('product-form').style.display = isViewer ? 'none' : 'block';
    document.getElementById('save-movements').style.display = isViewer ? 'none' : 'block';
    
    // Desabilitar botões de ação para usuário viewer
    const actionButtons = document.querySelectorAll('.edit-btn, .delete-btn');
    actionButtons.forEach(btn => {
        btn.style.display = isViewer ? 'none' : 'inline-block';
    });
    
    // DESABILITAR IMPORTAÇÃO PARA USUÁRIO CONSULTA
    document.getElementById('import-section').style.display = isViewer ? 'none' : 'block';
}

// ============================================================================
// EVENT LISTENERS PRINCIPAIS
// ============================================================================

// Função para fazer login
loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (users[username] && users[username].password === password) {
        currentUser = username;
        currentUserRole = users[username].role;
        loginScreen.style.display = 'none';
        mainContent.style.display = 'block';
        setupUserInterface();
        updateBalanceTable();
        updateProductsTable();
        updateLogsTable();
        updateMovementGrid();
        
        // VERIFICAR BACKEND E CARREGAR BACKUP AUTOMATICAMENTE
        const backendOnline = await checkBackendStatus();
        if (backendOnline) {
            await loadLatestBackupAuto();
        } else {
            console.log('Modo offline - usando dados locais');
        }
        
    } else {
        loginError.style.display = 'block';
    }
});

// Função para fazer logout
function logout() {
    currentUser = "";
    currentUserRole = "";
    loginScreen.style.display = 'block';
    mainContent.style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    loginError.style.display = 'none';
    pendingMovements = {};
    userInfo.style.display = 'none';
}

logoutBtn.addEventListener('click', logout);
headerLogoutBtn.addEventListener('click', logout);

// Exportar para JSON
document.getElementById('export-json-btn').addEventListener('click', function() {
    exportToJSON();
});

// Exportar para CSV
document.getElementById('export-csv-btn').addEventListener('click', function() {
    exportToCSV();
});

// Importar dados
document.getElementById('import-data-btn').addEventListener('click', function() {
    if (currentUserRole === 'viewer') {
        alert('Usuários de consulta não podem importar dados.');
        return;
    }
    
    const fileInput = document.getElementById('import-file-input');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Por favor, selecione um arquivo para importar.');
        return;
    }
    
    importFromFile(file)
        .then(importedData => {
            if (confirm('Isso substituirá todos os dados atuais. Continuar?')) {
                products = importedData.products;
                logs = importedData.logs || [];
                saveAllData();
                updateBalanceTable();
                updateProductsTable();
                updateLogsTable();
                updateMovementGrid();
                alert('✅ Dados importados com sucesso!');
                fileInput.value = '';
                
                // BACKUP AUTOMÁTICO APÓS IMPORTAÇÃO
                autoBackup();
            }
        })
        .catch(error => {
            alert('❌ Erro ao importar dados: ' + error.message);
        });
});

// Pré-visualizar dados ao selecionar arquivo
document.getElementById('import-file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                let previewText;
                
                if (file.name.endsWith('.json')) {
                    const importedData = JSON.parse(e.target.result);
                    previewText = JSON.stringify(importedData, null, 2);
                } else if (file.name.endsWith('.csv')) {
                    previewText = e.target.result;
                } else {
                    previewText = 'Formato de arquivo não suportado';
                }
                
                document.getElementById('import-preview').textContent = 
                    previewText.substring(0, 500) + 
                    (previewText.length > 500 ? '...' : '');
            } catch (error) {
                document.getElementById('import-preview').textContent = 'Erro ao ler arquivo: ' + error.message;
            }
        };
        reader.readAsText(file);
    }
});

// ============================================================================
// FUNÇÕES DE INTERFACE E TABELAS
// ============================================================================

// Navegação entre abas
tabs.forEach(tab => {
    tab.addEventListener('click', function() {
        if (this.classList.contains('disabled-tab')) {
            alert('Esta funcionalidade não está disponível para usuários de consulta.');
            return;
        }
        
        const tabId = this.getAttribute('data-tab');
        
        // Remove a classe active de todas as abas e conteúdos
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        
        // Adiciona a classe active à aba e conteúdo selecionados
        this.classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});

// Função para ordenar produtos
function sortProducts(products, column, direction) {
    return products.sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];
        
        if (column === 'name') {
            const aNum = parseInt(aValue.match(/\d+/)?.[0]) || 0;
            const bNum = parseInt(bValue.match(/\d+/)?.[0]) || 0;
            
            if (aNum !== bNum) {
                return direction === 'asc' ? aNum - bNum : bNum - aNum;
            }
            
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
        }
        
        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

// Atualiza a tabela de saldo
function updateBalanceTable() {
    const tableBody = document.getElementById('balance-table-body');
    const searchTerm = document.getElementById('search-product').value.toLowerCase();
    
    tableBody.innerHTML = '';
    
    let filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.model.toLowerCase().includes(searchTerm)
    );
    
    filteredProducts = sortProducts(filteredProducts, currentSort.column, currentSort.direction);
    
    filteredProducts.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.model}</td>
            <td>${product.balance}</td>
        `;
        tableBody.appendChild(row);
    });
    
    updateSortIndicators();
}

// Atualiza a tabela de produtos
function updateProductsTable() {
    const tableBody = document.getElementById('products-table-body');
    tableBody.innerHTML = '';
    
    const sortedProducts = sortProducts([...products], currentSort.column, currentSort.direction);
    
    sortedProducts.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.model}</td>
            <td>${product.balance}</td>
            <td class="action-buttons">
                <button class="edit-btn" data-id="${product.id}" ${currentUserRole === 'viewer' ? 'style="display:none"' : ''}>Editar</button>
                <button class="delete-btn" data-id="${product.id}" ${currentUserRole === 'viewer' ? 'style="display:none"' : ''}>Excluir</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    if (currentUserRole !== 'viewer') {
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                editProduct(productId);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                deleteProduct(productId);
            });
        });
    }
    
    updateSortIndicators();
}

// Atualiza os indicadores de ordenação
function updateSortIndicators() {
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.textContent = '';
    });
    
    const currentHeader = document.querySelector(`th[data-sort="${currentSort.column}"] .sort-indicator`);
    if (currentHeader) {
        currentHeader.textContent = currentSort.direction === 'asc' ? '▲' : '▼';
    }
}

// Adiciona eventos de ordenação
document.addEventListener('click', function(e) {
    if (e.target.closest('th[data-sort]')) {
        const header = e.target.closest('th[data-sort]');
        const column = header.getAttribute('data-sort');
        
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'asc';
        }
        
        updateBalanceTable();
        updateProductsTable();
    }
});

// Atualiza a tabela de logs COM FILTROS
function updateLogsTable() {
    const tableBody = document.getElementById('logs-table-body');
    const searchDate = document.getElementById('search-log-date').value;
    const searchFicha = document.getElementById('search-log-ficha').value;
    const searchProduct = document.getElementById('search-log-product').value.toLowerCase();
    
    tableBody.innerHTML = '';
    
    let filteredLogs = [...logs].reverse(); // Mostra os mais recentes primeiro
    
    // Aplicar filtros
    if (searchDate) {
        filteredLogs = filteredLogs.filter(log => log.date.startsWith(searchDate));
    }
    
    if (searchFicha) {
        filteredLogs = filteredLogs.filter(log => 
            log.ficha && log.ficha.toString().includes(searchFicha)
        );
    }
    
    if (searchProduct) {
        filteredLogs = filteredLogs.filter(log => {
            const product = products.find(p => p.id === log.productId);
            return product && (
                product.name.toLowerCase().includes(searchProduct) ||
                product.model.toLowerCase().includes(searchProduct)
            );
        });
    }
    
    filteredLogs.forEach(log => {
        const product = products.find(p => p.id === log.productId);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDateTime(log.date)}</td>
            <td>${log.ficha || 'N/A'}</td>
            <td>${log.user}</td>
            <td>${product ? `${product.name} - ${product.model}` : 'Produto não encontrado'}</td>
            <td>${log.type === 'entrada' ? 'Entrada' : 'Saída'}</td>
            <td>${log.quantity}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Formatar data e hora para exibição
function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Event listeners para busca de logs
document.getElementById('search-log-date').addEventListener('change', updateLogsTable);
document.getElementById('search-log-ficha').addEventListener('input', updateLogsTable);
document.getElementById('search-log-product').addEventListener('input', updateLogsTable);

// Limpar busca de logs
document.getElementById('clear-log-search').addEventListener('click', function() {
    document.getElementById('search-log-date').value = '';
    document.getElementById('search-log-ficha').value = '';
    document.getElementById('search-log-product').value = '';
    updateLogsTable();
});

// Atualiza a grade de movimentação
function updateMovementGrid() {
    const grid = document.getElementById('movement-grid');
    grid.innerHTML = '';
    
    const sortedProducts = sortProducts([...products], currentSort.column, currentSort.direction);
    
    sortedProducts.forEach(product => {
        const movementItem = document.createElement('div');
        movementItem.className = 'movement-item';
        movementItem.innerHTML = `
            <h3>${product.name} - ${product.model}</h3>
            <div class="movement-info">
                <span>Saldo atual: ${product.balance}</span>
            </div>
            <div class="counter">
                <div class="counter-btn minus" data-id="${product.id}" ${currentUserRole === 'viewer' ? 'style="display:none"' : ''}>-</div>
                <div class="counter-value" data-id="${product.id}">0</div>
                <div class="counter-btn plus" data-id="${product.id}" ${currentUserRole === 'viewer' ? 'style="display:none"' : ''}>+</div>
            </div>
        `;
        grid.appendChild(movementItem);
    });
    
    if (currentUserRole !== 'viewer') {
        document.querySelectorAll('.counter-btn.plus').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                adjustCounter(productId, 1);
            });
        });
        
        document.querySelectorAll('.counter-btn.minus').forEach(btn => {
            btn.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                adjustCounter(productId, -1);
            });
        });
    }
}

// Ajusta o contador de movimentação
function adjustCounter(productId, change) {
    if (!pendingMovements[productId]) {
        pendingMovements[productId] = 0;
    }
    
    pendingMovements[productId] += change;
    
    const counterValue = document.querySelector(`.counter-value[data-id="${productId}"]`);
    counterValue.textContent = pendingMovements[productId];
    
    if (pendingMovements[productId] > 0) {
        counterValue.className = 'counter-value positive';
    } else if (pendingMovements[productId] < 0) {
        counterValue.className = 'counter-value negative';
    } else {
        counterValue.className = 'counter-value';
    }
}

// ============================================================================
// FUNÇÕES DE PRODUTOS E MOVIMENTAÇÕES
// ============================================================================

// Salva as movimentações pendentes
document.getElementById('save-movements').addEventListener('click', function() {
    if (currentUserRole === 'viewer') {
        alert('Usuários de consulta não podem fazer movimentações.');
        return;
    }
    
    const fichaInput = document.getElementById('movement-ficha');
    const ficha = fichaInput.value.trim();
    
    if (!ficha) {
        alert('Por favor, informe o número da ficha.');
        fichaInput.focus();
        return;
    }
    
    let hasMovements = false;
    
    for (const productId in pendingMovements) {
        if (pendingMovements[productId] !== 0) {
            hasMovements = true;
            
            const quantity = pendingMovements[productId];
            const type = quantity > 0 ? 'entrada' : 'saida';
            const absQuantity = Math.abs(quantity);
            
            const productIndex = products.findIndex(p => p.id === parseInt(productId));
            
            if (productIndex !== -1) {
                products[productIndex].balance += quantity;
                
                const newLog = {
                    id: logs.length > 0 ? Math.max(...logs.map(l => l.id)) + 1 : 1,
                    productId: parseInt(productId),
                    type,
                    quantity: absQuantity,
                    date: getCurrentDateTime(),
                    user: currentUser,
                    ficha: ficha
                };
                
                logs.push(newLog);
            }
        }
    }
    
    if (hasMovements) {
        pendingMovements = {};
        fichaInput.value = '';
        
        // SALVA E FAZ BACKUP AUTOMÁTICO
        saveAllData();
        
        const successMessage = document.getElementById('movement-success');
        successMessage.style.display = 'block';
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);
        
        updateBalanceTable();
        updateProductsTable();
        updateLogsTable();
        updateMovementGrid();
    } else {
        alert('Nenhuma movimentação para salvar!');
    }
});

// Cadastra ou edita um produto
document.getElementById('product-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (currentUserRole === 'viewer') {
        alert('Usuários de consulta não podem cadastrar ou editar produtos.');
        return;
    }
    
    const productId = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value;
    const model = document.getElementById('product-model').value;
    const balance = parseInt(document.getElementById('initial-balance').value);
    
    if (productId) {
        const index = products.findIndex(p => p.id === parseInt(productId));
        if (index !== -1) {
            products[index].name = name;
            products[index].model = model;
        }
        
        cancelEdit();
    } else {
        const newProduct = {
            id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
            name,
            model,
            balance
        };
        
        products.push(newProduct);
        
        const newLog = {
            id: logs.length > 0 ? Math.max(...logs.map(l => l.id)) + 1 : 1,
            productId: newProduct.id,
            type: 'entrada',
            quantity: balance,
            date: getCurrentDateTime(),
            user: currentUser,
            ficha: 'Cadastro Inicial'
        };
        
        logs.push(newLog);
        
        this.reset();
    }
    
    // SALVA E FAZ BACKUP AUTOMÁTICO
    saveAllData();
    
    const successMessage = document.getElementById('product-success');
    successMessage.style.display = 'block';
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 3000);
    
    updateBalanceTable();
    updateProductsTable();
    updateLogsTable();
    updateMovementGrid();
});

// Edita um produto
function editProduct(productId) {
    if (currentUserRole === 'viewer') {
        alert('Usuários de consulta não podem editar produtos.');
        return;
    }
    
    const product = products.find(p => p.id === productId);
    
    if (product) {
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-model').value = product.model;
        document.getElementById('initial-balance').value = product.balance;
        document.getElementById('product-submit-btn').textContent = 'Atualizar Produto';
        document.getElementById('product-cancel-btn').style.display = 'block';
        
        document.getElementById('products-tab').scrollTop = 0;
    }
}

// Cancela a edição
document.getElementById('product-cancel-btn').addEventListener('click', cancelEdit);

function cancelEdit() {
    document.getElementById('product-id').value = '';
    document.getElementById('product-form').reset();
    document.getElementById('product-submit-btn').textContent = 'Cadastrar Produto';
    document.getElementById('product-cancel-btn').style.display = 'none';
}

// Exclui um produto
function deleteProduct(productId) {
    if (currentUserRole === 'viewer') {
        alert('Usuários de consulta não podem excluir produtos.');
        return;
    }
    
    if (confirm('Tem certeza que deseja excluir este produto?')) {
        products = products.filter(p => p.id !== productId);
        logs = logs.filter(l => l.productId !== productId);
        saveAllData();
        updateBalanceTable();
        updateProductsTable();
        updateLogsTable();
        updateMovementGrid();
    }
}

// Busca produtos na tabela de saldo
document.getElementById('search-product').addEventListener('input', updateBalanceTable);

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================

// Função para validar dados importados
function validateImportedData(data) {
    if (!data.products || !Array.isArray(data.products)) {
        throw new Error('Dados de produtos inválidos');
    }
    
    data.products.forEach((product, index) => {
        if (!product.name || !product.model || typeof product.balance !== 'number') {
            throw new Error(`Produto na posição ${index} está com estrutura inválida`);
        }
    });
    
    return true;
}

// Função para obter a data e hora atual formatada
function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Inicializa a ordenação
updateSortIndicators();