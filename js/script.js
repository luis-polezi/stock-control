// Chaves para armazenamento local
const STORAGE_KEYS = {
    PRODUCTS: 'estoque_produtos',
    LOGS: 'estoque_logs',
    BACKUP: 'estoque_backup'
};

// Configuração da API - NO INÍCIO DO ARQUIVO JS
const API_CONFIG = {
    baseURL: 'https://stock-control-production.up.railway.app',
    endpoints: {
        sync: '/api/sync',
        backup: '/api/backup',
        data: '/api/data',
        latestBackup: '/api/latest-backup'
    }
};

function showError(message) {
    alert('Erro: ' + message);
    console.error(message);
}

// Funções para gerenciar o armazenamento local
const storage = {
    // Salvar dados
    save: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Erro ao salvar dados:', e);
            return false;
        }
    },
    
    // Carregar dados
    load: function(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Erro ao carregar dados:', e);
            return null;
        }
    },
    
    // Limpar dados
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

// Dados iniciais conforme solicitado
const initialProducts = [
    // Manta 01 Solteirão
    { id: 1, name: "Manta 01 Solteirão", model: "Café", balance: 293 },
    { id: 2, name: "Manta 01 Solteirão", model: "Cappucino", balance: 251 },
    { id: 3, name: "Manta 01 Solteirão", model: "Cinza", balance: 217 },
    { id: 4, name: "Manta 01 Solteirão", model: "Rosa", balance: 150 },
    { id: 5, name: "Manta 01 Solteirão", model: "Off White", balance: 201 },
    { id: 6, name: "Manta 01 Solteirão", model: "Chumbo", balance: 0 },
    
    // Manta 04
    { id: 7, name: "Manta 04", model: "Vermelho Liso", balance: 40 },
    { id: 8, name: "Manta 04", model: "Azul Liso", balance: 39 },
    { id: 9, name: "Manta 04", model: "Beje Quadrado", balance: 52 },
    { id: 10, name: "Manta 04", model: "Off White Quadrado", balance: 25 },
    { id: 11, name: "Manta 04", model: "Verde Quadrado", balance: 23 },
    { id: 12, name: "Manta 04", model: "Preto Quadrado", balance: 92 },
    { id: 13, name: "Manta 04", model: "Caramelo Quadrado", balance: 23 },
    { id: 14, name: "Manta 04", model: "Marrom Quadrado", balance: 25 },
    { id: 15, name: "Manta 04", model: "Off White Lisa", balance: 19 },
    { id: 16, name: "Manta 04", model: "Beje Lisa", balance: 15 },
    { id: 17, name: "Manta 04", model: "Palha Lisa", balance: 0 },
    { id: 18, name: "Manta 04", model: "Cafe Lisa", balance: 31 },
    { id: 19, name: "Manta 04", model: "Marrom Lisa", balance: 41 },
    { id: 20, name: "Manta 04", model: "Chumbo Liso", balance: 8 },
    { id: 21, name: "Manta 04", model: "Cinza Liso", balance: 30 },
    
    // Manta 05
    { id: 22, name: "Manta 05", model: "Marrom", balance: 106 },
    { id: 23, name: "Manta 05", model: "Verde", balance: 33 },
    { id: 24, name: "Manta 05", model: "Bege", balance: 20 },
    { id: 25, name: "Manta 05", model: "Off White", balance: 44 },
    { id: 26, name: "Manta 05", model: "Palha", balance: 128 },
    { id: 27, name: "Manta 05", model: "Preto", balance: 69 },
    { id: 28, name: "Manta 05", model: "Vermelho", balance: 102 },
    { id: 29, name: "Manta 05", model: "Chumbo", balance: 50 }
];

// Carregar dados do armazenamento local ou usar padrão
let products = storage.load(STORAGE_KEYS.PRODUCTS) || initialProducts;
let logs = storage.load(STORAGE_KEYS.LOGS) || [];

// Elementos da interface
const loginScreen = document.getElementById('login-screen');
const mainContent = document.getElementById('main-content');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');

// Credenciais válidas
const users = {
    "Gabriela": { password: "070315", role: "admin" },
    "consulta": { password: "123456", role: "viewer" }
};

// Variáveis para controle de estado
let currentUser = "";
let currentUserRole = "";
let pendingMovements = {};
let currentSort = { column: 'name', direction: 'asc' };

// Função para salvar todos os dados
async function saveAllData() {
    try {
        // Salva localmente primeiro
        const success1 = storage.save(STORAGE_KEYS.PRODUCTS, products);
        const success2 = storage.save(STORAGE_KEYS.LOGS, logs);
        
        if (!success1 || !success2) {
            showError('Erro ao salvar dados localmente');
            return false;
        }
        
        updateExportPreview();
        
        // Tenta sincronizar com backend se disponível
        await api.syncToBackend();
        
        return true;
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        return false;
    }
}

// Função para carregar último backup automaticamente
async function loadLatestBackup() {
    try {
        console.log('🔄 Verificando último backup...');
        
        const latestBackup = await api.getLatestBackup();
        
        if (latestBackup) {
            console.log('📦 Backup encontrado:', latestBackup.fileName);
            console.log('📅 Data:', latestBackup.createdAt);
            
            // Mostrar data formatada para o usuário
            const backupDate = new Date(latestBackup.createdAt).toLocaleString('pt-BR');
            
            // Perguntar se quer carregar o backup
            if (confirm(`Encontramos um backup de ${backupDate}.\n\nDeseja carregar estes dados?`)) {
                await loadBackupFromUrl(latestBackup.downloadUrl);
            }
        } else {
            console.log('ℹ️ Nenhum backup encontrado para carregar');
        }
    } catch (error) {
        console.log('⚠️ Não foi possível verificar backups:', error);
        // Não mostra erro para o usuário - é opcional
    }
}

// Função para carregar backup a partir de URL
async function loadBackupFromUrl(backupUrl) {
    try {
        console.log('📥 Carregando backup da URL:', backupUrl);
        
        const response = await fetch(backupUrl);
        const backupData = await response.json();
        
        // Validar estrutura do backup
        if (backupData.data && backupData.data.products && Array.isArray(backupData.data.products)) {
            
            // Mostrar resumo antes de carregar
            const productCount = backupData.data.products.length;
            const logCount = backupData.data.logs ? backupData.data.logs.length : 0;
            
            if (confirm(`Backup contém:\n• ${productCount} produtos\n• ${logCount} registros de movimentação\n\nCarregar estes dados?`)) {
                
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
                updateExportPreview();
                
                alert(`✅ Backup carregado com sucesso!\n\n${productCount} produtos e ${logCount} logs restaurados.`);
                
                console.log('✅ Backup carregado:', {
                    products: products.length,
                    logs: logs.length
                });
            }
        } else {
            throw new Error('Estrutura de backup inválida');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar backup:', error);
        alert('❌ Erro ao carregar backup. Estrutura inválida ou arquivo corrompido.');
    }
}

// Funções para comunicação com backend
const api = {
    // Sincronizar dados com backend
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
    
    // Fazer backup no Cloudflare R2 via backend
    backupToCloudflare: async function() {
        if (!API_CONFIG.baseURL) {
            alert('Backup online ainda não configurado.');
            return false;
        }
        
        try {
            const response = await fetch(API_CONFIG.baseURL + API_CONFIG.endpoints.backup, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    products, 
                    logs, 
                    user: currentUser,
                    timestamp: new Date().toISOString()
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('✅ ' + result.message);
                return true;
            } else {
                alert('❌ Erro no backup: ' + (result.error || 'Erro desconhecido'));
                return false;
            }
        } catch (error) {
            console.error('Erro no backup online:', error);
            alert('❌ Erro de conexão com o servidor');
            return false;
        }
    },

    // Buscar último backup
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

// Atualizar a prévia de exportação
function updateExportPreview() {
    const exportData = {
        products: products,
        logs: logs,
        exportDate: new Date().toISOString(),
        system: "Sistema de Estoque",
        version: "1.0",
        totalProducts: products.length,
        totalLogs: logs.length,
        exportedBy: currentUser
    };
    
    document.getElementById('export-preview').textContent = 
        JSON.stringify(exportData, null, 2).substring(0, 500) + 
        (JSON.stringify(exportData, null, 2).length > 500 ? '...' : '');
}

// Configurar interface baseada no tipo de usuário
function setupUserInterface() {
    const isViewer = currentUserRole === 'viewer';
    
    // Mostrar informações do usuário
    userInfo.textContent = `${currentUser} (${isViewer ? 'Consulta' : 'Administrador'})`;
    userInfo.style.display = 'block';
    
    // Mostrar mensagem de modo de consulta
    document.getElementById('readonly-message').style.display = isViewer ? 'block' : 'none';
    document.getElementById('readonly-products-message').style.display = isViewer ? 'block' : 'none';
    document.getElementById('readonly-movement-message').style.display = isViewer ? 'block' : 'none';
    document.getElementById('readonly-logs-message').style.display = isViewer ? 'block' : 'none';
    document.getElementById('readonly-data-message').style.display = isViewer ? 'block' : 'none';
    
    // Desabilitar abas para usuário viewer
    document.getElementById('products-tab-header').classList.toggle('disabled-tab', isViewer);
    document.getElementById('movement-tab-header').classList.toggle('disabled-tab', isViewer);
    document.getElementById('logs-tab-header').classList.toggle('disabled-tab', isViewer);
    
    // Desabilitar formulários e botões para usuário viewer
    document.getElementById('product-form').style.display = isViewer ? 'none' : 'block';
    document.getElementById('save-movements').style.display = isViewer ? 'none' : 'block';
    
    // Desabilitar botões de ação para usuário viewer
    const actionButtons = document.querySelectorAll('.edit-btn, .delete-btn');
    actionButtons.forEach(btn => {
        btn.style.display = isViewer ? 'none' : 'inline-block';
    });
    
    // Desabilitar botões de gerenciamento de dados para usuário viewer (exceto importação)
    document.getElementById('export-btn').style.display = isViewer ? 'none' : 'block';
    
    // Manter importação habilitada para todos os usuários
    document.getElementById('import-btn').style.display = 'block';
    document.getElementById('import-json-btn').style.display = 'block';
}

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', function() {
    updateExportPreview();
});

// Função para fazer login
loginForm.addEventListener('submit', function(e) {
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
        
        // ✅ CARREGAR ÚLTIMO BACKUP APÓS LOGIN
        loadLatestBackup();
        
    } else {
        loginError.style.display = 'block';
    }
});

// Função para fazer logout
logoutBtn.addEventListener('click', function() {
    currentUser = "";
    currentUserRole = "";
    loginScreen.style.display = 'block';
    mainContent.style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    loginError.style.display = 'none';
    pendingMovements = {};
    userInfo.style.display = 'none';
});

// Navegação entre abas (impedir acesso a abas restritas)
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
        
        // Para ordenação por nome (Manta)
        if (column === 'name') {
            // Extrai o número da manta para ordenação numérica
            const aNum = parseInt(aValue.match(/\d+/)?.[0]) || 0;
            const bNum = parseInt(bValue.match(/\d+/)?.[0]) || 0;
            
            if (aNum !== bNum) {
                return direction === 'asc' ? aNum - bNum : bNum - aNum;
            }
            
            // Se os números forem iguais, ordena pelo nome completo
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
    
    // Aplica ordenação
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
    
    // Atualiza indicadores de ordenação
    updateSortIndicators();
}

// Atualiza a tabela de produtos
function updateProductsTable() {
    const tableBody = document.getElementById('products-table-body');
    tableBody.innerHTML = '';
    
    // Aplica ordenação
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
    
    // Adiciona eventos aos botões de edição (apenas para admin)
    if (currentUserRole !== 'viewer') {
        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                editProduct(productId);
            });
        });
        
        // Adiciona eventos aos botões de exclusão (apenas para admin)
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-id'));
                deleteProduct(productId);
            });
        });
    }
    
    // Atualiza indicadores de ordenação
    updateSortIndicators();
}

// Atualiza os indicadores de ordenação nas tabelas
function updateSortIndicators() {
    // Remove todos os indicadores
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.textContent = '';
    });
    
    // Adiciona o indicador na coluna atual
    const currentHeader = document.querySelector(`th[data-sort="${currentSort.column}"] .sort-indicator`);
    if (currentHeader) {
        currentHeader.textContent = currentSort.direction === 'asc' ? '▲' : '▼';
    }
}

// Adiciona eventos de ordenação aos cabeçalhos das tabelas
document.addEventListener('click', function(e) {
    if (e.target.closest('th[data-sort]')) {
        const header = e.target.closest('th[data-sort]');
        const column = header.getAttribute('data-sort');
        
        // Alterna a direção se for a mesma coluna
        if (currentSort.column === column) {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.direction = 'asc';
        }
        
        // Atualiza as tabelas
        updateBalanceTable();
        updateProductsTable();
    }
});

// Atualiza a tabela de logs
function updateLogsTable() {
    const tableBody = document.getElementById('logs-table-body');
    tableBody.innerHTML = '';
    
    logs.forEach(log => {
        const product = products.find(p => p.id === log.productId);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.date}</td>
            <td>${log.ficha || 'N/A'}</td>
            <td>${log.user}</td>
            <td>${product ? `${product.name} - ${product.model}` : 'Produto não encontrado'}</td>
            <td>${log.type === 'entrada' ? 'Entrada' : 'Saída'}</td>
            <td>${log.quantity}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Atualiza a grade de movimentação
function updateMovementGrid() {
    const grid = document.getElementById('movement-grid');
    grid.innerHTML = '';
    
    // Aplica ordenação
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
    
    // Adiciona eventos aos botões de contador (apenas para admin)
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
    // Inicializa se não existir
    if (!pendingMovements[productId]) {
        pendingMovements[productId] = 0;
    }
    
    // Atualiza o valor
    pendingMovements[productId] += change;
    
    // Atualiza a exibição
    const counterValue = document.querySelector(`.counter-value[data-id="${productId}"]`);
    counterValue.textContent = pendingMovements[productId];
    
    // Aplica a classe de cor
    if (pendingMovements[productId] > 0) {
        counterValue.className = 'counter-value positive';
    } else if (pendingMovements[productId] < 0) {
        counterValue.className = 'counter-value negative';
    } else {
        counterValue.className = 'counter-value';
    }
}

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
            
            // Encontra o produto
            const productIndex = products.findIndex(p => p.id === parseInt(productId));
            
            if (productIndex !== -1) {
                // Atualiza o saldo do produto
                products[productIndex].balance += quantity;
                
                // Registra o log com a ficha
                const newLog = {
                    id: logs.length > 0 ? Math.max(...logs.map(l => l.id)) + 1 : 1,
                    productId: parseInt(productId),
                    type,
                    quantity: absQuantity,
                    date: getCurrentDateTime(),
                    user: currentUser,
                    ficha: ficha // Adiciona o número da ficha ao log
                };
                
                logs.push(newLog);
            }
        }
    }
    
    if (hasMovements) {
        // Limpa as movimentações pendentes
        pendingMovements = {};
        
        // Limpa o campo da ficha
        fichaInput.value = '';
        
        // Salva os dados
        saveAllData();
        
        // Exibe mensagem de sucesso
        const successMessage = document.getElementById('movement-success');
        successMessage.style.display = 'block';
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 3000);
        
        // Atualiza as tabelas
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
        // Edição de produto
        const index = products.findIndex(p => p.id === parseInt(productId));
        if (index !== -1) {
            products[index].name = name;
            products[index].model = model;
            // O saldo não é alterado na edição
        }
        
        // Limpa o formulário
        cancelEdit();
    } else {
        // Cadastro de novo produto
        const newProduct = {
            id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
            name,
            model,
            balance
        };
        
        products.push(newProduct);
        
        // Registra o log de entrada inicial
        const newLog = {
            id: logs.length > 0 ? Math.max(...logs.map(l => l.id)) + 1 : 1,
            productId: newProduct.id,
            type: 'entrada',
            quantity: balance,
            date: getCurrentDateTime(),
            user: currentUser,
            ficha: 'Cadastro Inicial' // Ficha padrão para cadastro
        };
        
        logs.push(newLog);
        
        // Limpa o formulário
        this.reset();
    }
    
    // Salva os dados
    saveAllData();
    
    // Exibe mensagem de sucesso
    const successMessage = document.getElementById('product-success');
    successMessage.style.display = 'block';
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 3000);
    
    // Atualiza as tabelas
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
        
        // Rola para o topo do formulário
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
        // Remove o produto
        products = products.filter(p => p.id !== productId);
        
        // Remove os logs relacionados ao produto
        logs = logs.filter(l => l.productId !== productId);
        
        // Salva os dados
        saveAllData();
        
        // Atualiza as tabelas
        updateBalanceTable();
        updateProductsTable();
        updateLogsTable();
        updateMovementGrid();
    }
}

// Exportar dados para arquivo JSON
document.getElementById('export-json-btn').addEventListener('click', function() {
    if (currentUserRole === 'viewer') {
        alert('Usuários de consulta não podem exportar dados.');
        return;
    }
    
    const exportData = {
        products: products,
        logs: logs,
        exportDate: new Date().toISOString(),
        system: "Sistema de Estoque"
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    
    // Nomeando arquivo
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
    
    alert('Dados exportados com sucesso! Envie o arquivo .json para outras pessoas.');
});

// Função para validar dados importados
function validateImportedData(data) {
    if (!data.products || !Array.isArray(data.products)) {
        throw new Error('Dados de produtos inválidos');
    }
    
    // Verificar estrutura mínima dos produtos
    data.products.forEach((product, index) => {
        if (!product.name || !product.model || typeof product.balance !== 'number') {
            throw new Error(`Produto na posição ${index} está com estrutura inválida`);
        }
    });
    
    return true;
}

// Importar dados de arquivo JSON
document.getElementById('import-json-btn').addEventListener('click', function() {
    const fileInput = document.getElementById('import-file-input');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Por favor, selecione um arquivo para importar.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validação completa dos dados
            validateImportedData(importedData);
            
            if (confirm('Isso substituirá todos os dados atuais. Continuar?')) {
                products = importedData.products;
                logs = importedData.logs || [];
                
                // Salva os dados importados
                saveAllData();
                
                // Atualiza a interface
                updateBalanceTable();
                updateProductsTable();
                updateLogsTable();
                updateMovementGrid();
                
                alert('Dados importados com sucesso!');
                fileInput.value = ''; // Limpa o input de arquivo
            }
        } catch (error) {
            alert('Erro ao importar dados: ' + error.message);
        }
    };
    reader.readAsText(file);
});

// Pré-visualizar dados ao selecionar arquivo
document.getElementById('import-file-input').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                document.getElementById('import-preview').textContent = 
                    JSON.stringify(importedData, null, 2).substring(0, 500) + 
                    (JSON.stringify(importedData, null, 2).length > 500 ? '...' : '');
            } catch (error) {
                document.getElementById('import-preview').textContent = 'Erro ao ler arquivo: ' + error.message;
            }
        };
        reader.readAsText(file);
    }
});

// Busca produtos na tabela de saldo
document.getElementById('search-product').addEventListener('input', updateBalanceTable);

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

// Backup Online no Google Drive - ADICIONAR ESTE EVENT LISTENER
document.getElementById('drive-backup-btn').addEventListener('click', async function() {
    if (currentUserRole === 'viewer') {
        alert('Usuários de consulta não podem fazer backup online.');
        return;
    }
    
    if (confirm('Deseja fazer backup dos dados?')) {
        await api.backupToCloudflare();
    }
});

// Inicializa a ordenação por padrão por nome (A-Z)
updateSortIndicators();