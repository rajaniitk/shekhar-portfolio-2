// ===== MAIN APPLICATION CONTROLLER =====
class EDAApplication {
    constructor() {
        this.currentSession = null;
        this.currentData = null;
        this.settings = this.loadSettings();
        this.apiBase = 'http://127.0.0.1:5000';
        this.activeSection = 'upload';
        this.sidebarCollapsed = this.loadSidebarState();
        
        // Initialize application
        this.init();
    }

    loadSidebarState() {
        try {
            const collapsed = localStorage.getItem('eda-pro-sidebar-collapsed');
            return collapsed === 'true';
        } catch (e) {
            return false;
        }
    }

    saveSidebarState() {
        try {
            localStorage.setItem('eda-pro-sidebar-collapsed', this.sidebarCollapsed);
        } catch (e) {}
    }

    async init() {
        console.log('🚀 Initializing EDA Pro Application...');
        
        try {
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize components
            await this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Restore sidebar state
            this.applySidebarState();
            
            // Initialize theme
            this.initializeTheme();
            
            // Initialize animations
            this.initializeAnimations();
            
            // Populate settings form
            this.populateSettingsForm();
            
            console.log('✅ Application initialized successfully!');
            
            // Hide loading screen after successful initialization
            setTimeout(() => {
                this.hideLoadingScreen();
                // Ensure the default section is shown
                this.navigateToSection(this.activeSection);
            }, 1500);
            
        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            
            // Hide loading screen even on error
            setTimeout(() => {
                this.hideLoadingScreen();
                this.showNotification('Application failed to initialize properly', 'error');
            }, 1000);
        }
    }

    applySidebarState() {
        const mainContainer = document.querySelector('.main-container');
        const sidebar = document.getElementById('sidebar');
        let sidebarArrow = document.getElementById('sidebar-arrow-toggle');
        if (this.sidebarCollapsed) {
            if (mainContainer) mainContainer.classList.add('sidebar-collapsed');
            if (sidebar) {
                sidebar.style.width = '0px';
                sidebar.style.overflow = 'hidden';
                sidebar.style.minWidth = '0';
                sidebar.style.padding = '0';
                sidebar.style.border = 'none';
            }
            // Show floating arrow button
            if (!sidebarArrow) {
                sidebarArrow = document.createElement('button');
                sidebarArrow.id = 'sidebar-arrow-toggle';
                sidebarArrow.innerHTML = '<i class="fas fa-chevron-right"></i>';
                sidebarArrow.style.position = 'fixed';
                sidebarArrow.style.top = '80px';
                sidebarArrow.style.left = '0';
                sidebarArrow.style.zIndex = '1001';
                sidebarArrow.style.width = '40px';
                sidebarArrow.style.height = '40px';
                sidebarArrow.style.borderRadius = '0 20px 20px 0';
                sidebarArrow.style.background = 'var(--fe-bg-secondary, #23262f)';
                sidebarArrow.style.color = '#f8d47c';
                sidebarArrow.style.border = 'none';
                sidebarArrow.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                sidebarArrow.style.display = 'flex';
                sidebarArrow.style.alignItems = 'center';
                sidebarArrow.style.justifyContent = 'center';
                sidebarArrow.style.cursor = 'pointer';
                sidebarArrow.style.transition = 'left 0.2s';
                sidebarArrow.title = 'Open Data Workspace';
                sidebarArrow.addEventListener('click', () => this.toggleSidebar());
                document.body.appendChild(sidebarArrow);
            } else {
                sidebarArrow.style.display = 'flex';
            }
        } else {
            if (mainContainer) mainContainer.classList.remove('sidebar-collapsed');
            if (sidebar) {
                sidebar.style.width = '300px';
                sidebar.style.overflow = '';
                sidebar.style.minWidth = '';
                sidebar.style.padding = '';
                sidebar.style.border = '';
            }
            // Hide floating arrow button
            if (sidebarArrow) sidebarArrow.style.display = 'none';
        }
    }

    // ===== INITIALIZATION METHODS =====
    async initializeComponents() {
        try {
            // Initialize specialized modules 
            this.uploader = null;  // Will be lazy-loaded
            
            // Initialize core modules
            this.analyzer = new DataAnalyzer(this);
            this.visualizer = new VisualizationEngine(this);
            this.featureEngine = new FeatureEngineer(this);
            this.insightsEngine = new InsightsEngine(this);
            
            console.log('✅ All modules initialized successfully');
            
            // Initialize UI components
            this.initializeNavigation();
            this.initializeSidebar();
            this.initializeModals();
            this.initializeNotifications();
            
        } catch (error) {
            console.error('Error initializing components:', error);
            this.showNotification('Failed to initialize application components', 'error');
        }
    }

    initializeNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.navigateToSection(section);
            });
        });
    }

    initializeSidebar() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => this.toggleMobileMenu());
        }
    }

    initializeModals() {
        // Settings modal
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const settingsClose = document.getElementById('settings-close');
        const settingsSave = document.getElementById('settings-save');
        const settingsReset = document.getElementById('settings-reset');
        
        if (settingsBtn && settingsModal) {
            settingsBtn.addEventListener('click', () => this.openModal('settings-modal'));
            if (settingsClose) settingsClose.addEventListener('click', () => this.closeModal('settings-modal'));
            if (settingsSave) settingsSave.addEventListener('click', () => this.saveSettings());
            if (settingsReset) settingsReset.addEventListener('click', () => this.resetSettings());
        }
        
        // Close modal on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active');
                if (activeModal) {
                    this.closeModal(activeModal.id);
                }
            }
        });
    }

    initializeNotifications() {
        this.notificationContainer = document.getElementById('notification-container');
        this.notificationQueue = [];
        this.maxNotifications = 5;
    }

    initializeAnimations() {
        // Initialize AOS (Animate On Scroll)
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: 800,
                easing: 'ease-in-out',
                once: true,
                offset: 100
            });
        }
        
        // Initialize background animation
        this.initializeBackgroundAnimation();
        
        // Initialize developer credit animation
        this.initializeDeveloperCredit();
    }

    initializeBackgroundAnimation() {
        const background = document.getElementById('animated-background');
        if (!background) return;
        
        // Create dynamic particles
        const particleCount = 50;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'background-particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 4 + 1}px;
                height: ${Math.random() * 4 + 1}px;
                background: rgba(100, 255, 218, ${Math.random() * 0.5 + 0.1});
                border-radius: 50%;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation: particleFloat ${Math.random() * 20 + 10}s linear infinite;
                animation-delay: ${Math.random() * 5}s;
            `;
            background.appendChild(particle);
        }
    }

    initializeDeveloperCredit() {
        const creditToggle = document.getElementById('credit-toggle');
        const developerCredit = document.getElementById('developer-credit');
        
        if (creditToggle && developerCredit) {
            creditToggle.addEventListener('click', () => {
                developerCredit.classList.toggle('expanded');
            });
            
            // Auto-show credit after 5 seconds
            setTimeout(() => {
                developerCredit.classList.add('expanded');
                setTimeout(() => {
                    developerCredit.classList.remove('expanded');
                }, 5000);
            }, 5000);
        }
    }

    initializeTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        const themeSelect = document.getElementById('theme-select');
        
        // Apply saved theme
        this.applyTheme(this.settings.theme);
        
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        if (themeSelect) {
            themeSelect.value = this.settings.theme;
            themeSelect.addEventListener('change', (e) => {
                this.settings.theme = e.target.value;
                this.applyTheme(this.settings.theme);
                this.saveSettings();
            });
        }
    }

    // ===== NAVIGATION METHODS =====
    navigateToSection(section) {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });
        // Update active section
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === `${section}-section`);
        });
        this.activeSection = section;
        // Lazy initialize FileUploader if navigating to upload section
        if (section === 'upload' && !this.uploader) {
            // Check that upload-zone and file-input exist before initializing
            const uploadZone = document.getElementById('upload-zone');
            const fileInput = document.getElementById('file-input');
            if (!uploadZone || !fileInput) {
                console.error('❌ FileUploader initialization failed: upload-zone or file-input not found in DOM');
                this.showNotification('Upload section failed to load. Please reload the page.', 'error');
                return;
            }
            try {
                window.fileUploader = new FileUploader(this);
                this.uploader = window.fileUploader;
                console.log('✅ FileUploader initialized (lazy)');
            } catch (error) {
                console.error('❌ FileUploader initialization failed (lazy):', error);
                this.showNotification('File uploader failed to initialize. Please reload the page.', 'error');
            }
        }
        // Trigger section-specific logic
        this.handleSectionChange(section);
        // Close mobile menu if open
        this.closeMobileMenu();
    }

    handleSectionChange(section) {
        switch (section) {
            case 'eda':
                if (this.currentData && this.analyzer) {
                    this.analyzer.generateEDA();
                }
                break;
            case 'analysis':
                if (this.currentData) {
                    this.populateColumnSelectors();
                }
                break;
            case 'features':
                if (this.currentData && this.featureEngine) {
                    this.featureEngine.loadFeatureOptions();
                }
                break;
            case 'insights':
                if (this.currentData && this.insightsEngine) {
                    this.insightsEngine.generateInsights();
                }
                break;
            case 'reports':
                if (this.currentData) {
                    this.loadReportOptions();
                }
                break;
        }
    }

    // ===== UI CONTROL METHODS =====
    toggleSidebar() {
        const mainContainer = document.querySelector('.main-container');
        const sidebar = document.getElementById('sidebar');
        this.sidebarCollapsed = !this.sidebarCollapsed;
        this.saveSidebarState();
        this.applySidebarState();
    }

    toggleMobileMenu() {
        const navMenu = document.getElementById('nav-menu');
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        
        if (navMenu) navMenu.classList.toggle('active');
        if (mobileToggle) mobileToggle.classList.toggle('active');
    }

    closeMobileMenu() {
        const navMenu = document.getElementById('nav-menu');
        const mobileToggle = document.getElementById('mobile-menu-toggle');
        
        if (navMenu) navMenu.classList.remove('active');
        if (mobileToggle) mobileToggle.classList.remove('active');
    }

    // ===== THEME METHODS =====
    toggleTheme() {
        const currentTheme = document.documentElement.dataset.theme || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        this.applyTheme(newTheme);
        this.settings.theme = newTheme;
        this.saveSettings();
    }

    applyTheme(theme) {
        document.documentElement.dataset.theme = theme;
        
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    // ===== MODAL METHODS =====
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Focus management for accessibility
            const firstFocusable = modal.querySelector('button, input, select, textarea');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // ===== LOADING METHODS =====
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
            loadingScreen.style.display = 'flex';
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    showLoading(element, message = 'Loading...') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        
        element.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">${message}</div>
            </div>
        `;
        element.classList.add('loading');
    }

    hideLoading(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;
        element.classList.remove('loading');
    }

    // ===== NOTIFICATION METHODS =====
    showNotification(message, type = 'info', title = '', duration = 5000) {
        if (!this.notificationContainer) {
            console.log(`Notification: ${message} (${type})`);
            return;
        }
        
        const notification = this.createNotificationElement(message, type, title);
        
        this.notificationContainer.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Auto-remove
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);
        
        // Limit number of notifications
        this.limitNotifications();
    }

    createNotificationElement(message, type, title) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="${icons[type]}"></i>
                </div>
                <div class="notification-text">
                    ${title ? `<div class="notification-title">${title}</div>` : ''}
                    <div class="notification-message">${message}</div>
                </div>
                <button class="notification-close" onclick="app.removeNotification(this.parentElement.parentElement)">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        return notification;
    }

    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOutNotification 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    limitNotifications() {
        const notifications = this.notificationContainer.children;
        while (notifications.length > this.maxNotifications) {
            this.removeNotification(notifications[0]);
        }
    }

    // ===== DATA MANAGEMENT METHODS =====
    setCurrentSession(sessionId) {
        this.currentSession = sessionId;
        this.updateSidebar();
    }

    setCurrentData(data) {
        this.currentData = data;
        this.updateDataInfo();
        this.updateSidebar();
    }

    updateDataInfo() {
        if (!this.currentData) return;
        
        const dataInfoPanel = document.getElementById('data-info-panel');
        if (dataInfoPanel) {
            dataInfoPanel.style.display = 'block';
        }
        
        // Update data statistics
        this.updateElement('data-rows', this.formatNumber(this.currentData.shape[0]));
        this.updateElement('data-columns', this.formatNumber(this.currentData.shape[1]));
        this.updateElement('data-size', this.currentData.file_info?.size_mb ? `${this.currentData.file_info.size_mb} MB` : 'Unknown');
        this.updateElement('data-missing', this.calculateMissingPercentage());
    }

    updateSidebar() {
        const columnExplorer = document.getElementById('column-explorer');
        const quickActions = document.getElementById('quick-actions');
        
        if (this.currentData) {
            if (columnExplorer) columnExplorer.style.display = 'block';
            if (quickActions) quickActions.style.display = 'block';
            
            this.populateColumnList();
            this.setupQuickActions();
        }
    }

    populateColumnList() {
        const columnList = document.getElementById('column-list');
        if (!columnList || !this.currentData?.columns) return;
        
        columnList.innerHTML = '';
        
        this.currentData.columns.forEach(column => {
            const columnItem = document.createElement('div');
            columnItem.className = 'column-item';
            columnItem.dataset.column = column;
            
            const dtype = this.currentData.dtypes?.[column] || 'unknown';
            const columnType = this.getColumnType(dtype);
            
            columnItem.innerHTML = `
                <span class="column-name">${column}</span>
                <span class="column-type ${columnType}">${columnType}</span>
            `;
            
            columnItem.addEventListener('click', () => {
                this.selectColumn(column, columnItem);
            });
            
            columnList.appendChild(columnItem);
        });
        
        // Setup column search
        this.setupColumnSearch();
    }

    setupColumnSearch() {
        const searchInput = document.getElementById('column-search');
        if (!searchInput) return;
        
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const columnItems = document.querySelectorAll('.column-item');
            
            columnItems.forEach(item => {
                const columnName = item.dataset.column.toLowerCase();
                const isVisible = columnName.includes(searchTerm);
                item.style.display = isVisible ? 'flex' : 'none';
            });
        });
    }

    selectColumn(columnName, columnElement) {
        // Toggle selection
        columnElement.classList.toggle('selected');
        
        // Add to analysis if in analysis section
        if (this.activeSection === 'analysis') {
            const analysisSelect = document.getElementById('analysis-columns');
            if (analysisSelect) {
                const option = Array.from(analysisSelect.options)
                    .find(opt => opt.value === columnName);
                if (option) {
                    option.selected = !option.selected;
                }
            }
        }
        
        this.showNotification(`Column "${columnName}" ${columnElement.classList.contains('selected') ? 'selected' : 'deselected'}`, 'info');
    }

    setupQuickActions() {
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
            });
        });
    }

    async handleQuickAction(action) {
        if (!this.currentSession) {
            this.showNotification('No data loaded', 'warning');
            return;
        }
        
        this.showNotification(`Starting ${action.replace('-', ' ')}...`, 'info');
        
        try {
            switch (action) {
                case 'generate-eda':
                    this.navigateToSection('eda');
                    if (this.analyzer) {
                        await this.analyzer.generateEDA();
                    }
                    break;
                case 'missing-analysis':
                    if (this.analyzer) {
                        await this.analyzer.analyzeMissingValues();
                    }
                    break;
                case 'correlation-analysis':
                    if (this.analyzer) {
                        await this.analyzer.analyzeCorrelations();
                    }
                    break;
                case 'outlier-detection':
                    if (this.analyzer) {
                        await this.analyzer.detectOutliers();
                    }
                    break;
                default:
                    this.showNotification(`Unknown action: ${action}`, 'error');
            }
        } catch (error) {
            console.error(`Error in quick action ${action}:`, error);
            this.showNotification(`Failed to execute ${action}`, 'error');
        }
    }

    populateColumnSelectors() {
        const analysisColumns = document.getElementById('analysis-columns');
        if (!analysisColumns || !this.currentData?.columns) return;
        
        analysisColumns.innerHTML = '';
        
        this.currentData.columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column;
            option.textContent = `${column} (${this.getColumnType(this.currentData.dtypes?.[column])})`;
            analysisColumns.appendChild(option);
        });
    }

    // ===== SETTINGS METHODS =====
    loadSettings() {
        const defaultSettings = {
            theme: 'dark',
            animations: true,
            autoInsights: true,
            maxFeatures: 20,
            apiTimeout: 30000
        };
        
        try {
            const saved = localStorage.getItem('eda-pro-settings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            console.error('Error loading settings:', error);
            return defaultSettings;
        }
    }

    saveSettings() {
        try {
            // Get values from settings form
            const themeSelect = document.getElementById('theme-select');
            const animationsToggle = document.getElementById('animations-toggle');
            const autoInsights = document.getElementById('auto-insights');
            const maxFeatures = document.getElementById('max-features');
            
            if (themeSelect) this.settings.theme = themeSelect.value;
            if (animationsToggle) this.settings.animations = animationsToggle.checked;
            if (autoInsights) this.settings.autoInsights = autoInsights.checked;
            if (maxFeatures) this.settings.maxFeatures = parseInt(maxFeatures.value);
            
            localStorage.setItem('eda-pro-settings', JSON.stringify(this.settings));
            
            // Apply settings
            this.applySettings();
            
            this.showNotification('Settings saved successfully', 'success');
            this.closeModal('settings-modal');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    resetSettings() {
        this.settings = {
            theme: 'dark',
            animations: true,
            autoInsights: true,
            maxFeatures: 20,
            apiTimeout: 30000
        };
        
        this.populateSettingsForm();
        this.applySettings();
        
        this.showNotification('Settings reset to defaults', 'info');
    }

    populateSettingsForm() {
        const themeSelect = document.getElementById('theme-select');
        const animationsToggle = document.getElementById('animations-toggle');
        const autoInsights = document.getElementById('auto-insights');
        const maxFeatures = document.getElementById('max-features');
        
        if (themeSelect) themeSelect.value = this.settings.theme;
        if (animationsToggle) animationsToggle.checked = this.settings.animations;
        if (autoInsights) autoInsights.checked = this.settings.autoInsights;
        if (maxFeatures) maxFeatures.value = this.settings.maxFeatures;
    }

    applySettings() {
        // Apply theme
        this.applyTheme(this.settings.theme);
        
        // Apply animations setting
        if (!this.settings.animations) {
            document.documentElement.style.setProperty('--transition-fast', '0ms');
            document.documentElement.style.setProperty('--transition-normal', '0ms');
            document.documentElement.style.setProperty('--transition-slow', '0ms');
        } else {
            document.documentElement.style.removeProperty('--transition-fast');
            document.documentElement.style.removeProperty('--transition-normal');
            document.documentElement.style.removeProperty('--transition-slow');
        }
    }

    // ===== API METHODS =====
    async apiCall(endpoint, options = {}) {
        const url = `${this.apiBase}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: this.settings.apiTimeout
        };
        
        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API call failed: ${endpoint}`, error);
            throw error;
        }
    }

    async uploadFile(formData) {
        const response = await fetch(`${this.apiBase}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    // ===== UTILITY METHODS =====
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    }

    getColumnType(dtype) {
        if (!dtype) return 'unknown';
        
        const dtypeStr = dtype.toLowerCase();
        
        if (dtypeStr.includes('int') || dtypeStr.includes('float')) {
            return 'numeric';
        } else if (dtypeStr.includes('datetime') || dtypeStr.includes('date')) {
            return 'datetime';
        } else if (dtypeStr.includes('bool')) {
            return 'boolean';
        } else {
            return 'categorical';
        }
    }

    calculateMissingPercentage() {
        if (!this.currentData?.preview?.info) return '0%';
        
        const totalCells = this.currentData.shape[0] * this.currentData.shape[1];
        const missingCells = Object.values(this.currentData.preview.info.null_counts)
            .reduce((sum, count) => sum + count, 0);
        
        const percentage = (missingCells / totalCells * 100).toFixed(1);
        return `${percentage}%`;
    }

    // ===== GLOBAL EVENT LISTENERS =====
    setupEventListeners() {
        // Handle scroll for navbar
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const navbar = document.getElementById('navbar');
            const currentScroll = window.pageYOffset;
            
            if (navbar) {
                if (currentScroll > 100) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            }
            
            lastScroll = currentScroll;
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 968) {
                this.closeMobileMenu();
            }
        });
        
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for quick search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('column-search');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            
            // Ctrl/Cmd + U for upload
            if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
                e.preventDefault();
                this.navigateToSection('upload');
            }
            
            // Ctrl/Cmd + E for EDA
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                if (this.currentData) {
                    this.navigateToSection('eda');
                }
            }
        });
        
        // Handle online/offline status
        window.addEventListener('online', () => {
            this.showNotification('Connection restored', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.showNotification('Connection lost', 'warning');
        });
        
        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                document.title = '⏸️ EDA Pro - Paused';
            } else {
                document.title = '🔍 Intelligent EDA Pro';
            }
        });
    }

    // ===== REPORT METHODS =====
    loadReportOptions() {
        const reportGenerator = document.getElementById('report-generator');
        if (!reportGenerator) return;
        
        reportGenerator.innerHTML = `
            <div class="report-options-grid">
                <div class="report-option-card">
                    <div class="option-icon">
                        <i class="fas fa-file-code"></i>
                    </div>
                    <h4>HTML Report</h4>
                    <p>Interactive web report with visualizations</p>
                    <button class="btn-primary" onclick="app.generateReport('html')">
                        <i class="fas fa-download"></i> Generate HTML
                    </button>
                </div>
                
                <div class="report-option-card">
                    <div class="option-icon">
                        <i class="fas fa-file-pdf"></i>
                    </div>
                    <h4>PDF Report</h4>
                    <p>Professional printable document</p>
                    <button class="btn-primary" onclick="app.generateReport('pdf')">
                        <i class="fas fa-download"></i> Generate PDF
                    </button>
                </div>
                
                <div class="report-option-card">
                    <div class="option-icon">
                        <i class="fas fa-database"></i>
                    </div>
                    <h4>Data Export</h4>
                    <p>Export processed data in various formats</p>
                    <button class="btn-primary" onclick="app.exportData()">
                        <i class="fas fa-download"></i> Export Data
                    </button>
                </div>
            </div>
        `;
    }

    async generateReport(format) {
        if (!this.currentSession) {
            this.showNotification('No data to generate report from', 'warning');
            return;
        }
        
        try {
            this.showNotification(`Generating ${format.toUpperCase()} report...`, 'info');
            
            const response = await this.apiCall(`/export_report/${this.currentSession}`);
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            // Trigger download
            const link = document.createElement('a');
            link.href = response.download_url;
            link.download = `eda_report_${Date.now()}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification(`${format.toUpperCase()} report generated successfully`, 'success');
        } catch (error) {
            console.error('Error generating report:', error);
            this.showNotification(`Failed to generate ${format} report`, 'error');
        }
    }

    async exportData() {
        if (!this.currentSession) {
            this.showNotification('No data to export', 'warning');
            return;
        }
        
        // Show export options modal
        const modalContent = `
            <div class="modal" id="export-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-download"></i> Export Data</h3>
                        <button class="modal-close" onclick="app.closeModal('export-modal')">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="export-options">
                            <div class="setting-item">
                                <label for="export-format">Format:</label>
                                <select id="export-format">
                                    <option value="csv">CSV</option>
                                    <option value="json">JSON</option>
                                    <option value="xlsx">Excel</option>
                                    <option value="parquet">Parquet</option>
                                </select>
                            </div>
                            <div class="setting-item">
                                <label for="include-processed">Include processed data:</label>
                                <label class="toggle-switch">
                                    <input type="checkbox" id="include-processed" checked>
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="app.closeModal('export-modal')">Cancel</button>
                        <button class="btn-primary" onclick="app.performDataExport()">Export</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalContent);
        this.openModal('export-modal');
    }

    async performDataExport() {
        const format = document.getElementById('export-format').value;
        const includeProcessed = document.getElementById('include-processed').checked;
        
        try {
            this.showNotification(`Exporting data as ${format.toUpperCase()}...`, 'info');
            
            const response = await this.apiCall(`/export_data/${this.currentSession}`, {
                method: 'POST',
                body: JSON.stringify({
                    format: format,
                    include_processed: includeProcessed
                })
            });
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            // Trigger download
            const link = document.createElement('a');
            link.href = response.download_url;
            link.download = `exported_data_${Date.now()}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification(`Data exported successfully as ${format.toUpperCase()}`, 'success');
            this.closeModal('export-modal');
            
            // Remove modal from DOM
            const modal = document.getElementById('export-modal');
            if (modal) {
                modal.remove();
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showNotification(`Failed to export data as ${format}`, 'error');
        }
    }
}

// ===== ADD CSS FOR ADDITIONAL COMPONENTS =====
const additionalCSS = `
.report-options-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
}

.report-option-card {
    background: var(--secondary-bg);
    border: 1px solid rgba(100, 255, 218, 0.1);
    border-radius: var(--border-radius-lg);
    padding: 2rem;
    text-align: center;
    transition: all var(--transition-normal);
}

.report-option-card:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow-large);
    border-color: var(--primary-accent);
}

.option-icon {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: rgba(100, 255, 218, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.5rem;
    font-size: 2rem;
    color: var(--primary-accent);
}

.report-option-card h4 {
    color: var(--primary-text);
    font-size: 1.3rem;
    font-weight: 600;
    margin-bottom: 1rem;
}

.report-option-card p {
    color: var(--secondary-text);
    margin-bottom: 2rem;
    line-height: 1.6;
}

.export-options {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.column-item.selected {
    background: rgba(100, 255, 218, 0.2);
    border: 1px solid var(--primary-accent);
}

.background-particle {
    pointer-events: none;
}

@keyframes slideOutNotification {
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

.loading {
    position: relative;
}

.loading::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: inherit;
    z-index: 100;
}
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

// ===== INITIALIZE APPLICATION =====
let app;

// Wait for DOM content to be loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('📱 DOM loaded, initializing application...');
        console.log('🔍 Debug Info:');
        console.log('- DOM loaded at:', new Date().toISOString());
        console.log('- Loading screen found:', !!document.getElementById('loading-screen'));
        console.log('- Utils available:', typeof Utils !== 'undefined');
        console.log('- FeatureEngine available:', typeof FeatureEngine !== 'undefined');
        console.log('- InsightsEngine available:', typeof InsightsEngine !== 'undefined');

        app = new EDAApplication();
        // Make app globally available immediately
        window.app = app;
        // Initialize FeatureEngine and InsightsEngine after app is ready
        setTimeout(() => {
            // Initialize FeatureEngine
            if (typeof FeatureEngine !== 'undefined') {
                try {
                    window.featureEngine = new FeatureEngine(app);
                    app.featureEngine = window.featureEngine;
                    console.log('✅ FeatureEngine initialized');
                } catch (error) {
                    console.error('❌ FeatureEngine initialization failed:', error);
                }
            }
            // Initialize InsightsEngine  
            if (typeof InsightsEngine !== 'undefined') {
                try {
                    window.insightsEngine = new InsightsEngine(app);
                    app.insightsEngine = window.insightsEngine;
                    console.log('✅ InsightsEngine initialized');
                } catch (error) {
                    console.error('❌ InsightsEngine initialization failed:', error);
                }
            }
            console.log('🔧 All modules initialized');
        }, 500);
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
        console.error('❌ Error stack:', error.stack);
        
        // Force hide loading screen on error
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
        }, 2000);
    }
});

// Emergency loading screen fix
setTimeout(() => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen && !loadingScreen.classList.contains('hidden')) {
        console.warn('🚨 Force hiding stuck loading screen');
        loadingScreen.style.display = 'none';
    }
}, 5000);

// Handle beforeunload
window.addEventListener('beforeunload', (e) => {
    if (app && app.currentData) {
        e.preventDefault();
        e.returnValue = '';
        return 'You have unsaved work. Are you sure you want to leave?';
    }
});

// Export for global access
window.app = app;