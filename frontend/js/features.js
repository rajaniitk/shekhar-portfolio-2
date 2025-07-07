// ===== ADVANCED FEATURE ENGINEERING MODULE =====
class FeatureEngine {
    constructor(app) {
        this.app = app;
        this.transformationHistory = [];
        this.undoStack = [];
        this.redoStack = [];
        this.previewMode = false;
        this.currentTransformations = new Map();
        this.transformationTemplates = new Map();
        this.batchOperations = [];
        this.customFunctions = new Map();
        
        // Feature engineering categories
        this.categories = {
            'numeric': {
                name: 'Numeric Transformations',
                icon: 'fas fa-calculator',
                transformations: ['scaling', 'normalization', 'binning', 'polynomial', 'log_transform', 'box_cox']
            },
            'categorical': {
                name: 'Categorical Encoding',
                icon: 'fas fa-tags',
                transformations: ['one_hot', 'label_encoding', 'target_encoding', 'frequency_encoding', 'binary_encoding']
            },
            'datetime': {
                name: 'DateTime Features',
                icon: 'fas fa-calendar',
                transformations: ['extract_components', 'cyclical_encoding', 'time_since', 'rolling_features']
            },
            'text': {
                name: 'Text Processing',
                icon: 'fas fa-font',
                transformations: ['tfidf', 'bag_of_words', 'sentiment', 'word_count', 'n_grams']
            },
            'interaction': {
                name: 'Feature Interactions',
                icon: 'fas fa-project-diagram',
                transformations: ['polynomial_features', 'feature_crosses', 'ratio_features', 'difference_features']
            },
            'selection': {
                name: 'Feature Selection',
                icon: 'fas fa-filter',
                transformations: ['univariate_selection', 'recursive_elimination', 'pca', 'variance_threshold']
            }
        };

        this.init();
    }

    init() {
        try {
            this.setupFeatureInterface();
            this.setupTransformationPanels();
            this.setupPreviewSystem();
            this.setupBatchOperations();
            this.setupCustomFunctions();
            this.loadSavedTemplates();
            
            console.log('✅ FeatureEngine initialized successfully');
        } catch (error) {
            console.error('❌ FeatureEngine initialization failed:', error);
        }
    }

    // ===== INTERFACE SETUP =====
    setupFeatureInterface() {
        const featuresSection = document.getElementById('features-section');
        if (!featuresSection) return;

        // Create main feature engineering interface
        const interfaceHTML = `
            <div class="features-workspace" id="features-workspace">
                <!-- Feature Engineering Toolbar -->
                <div class="features-toolbar">
                    <div class="toolbar-section">
                        <div class="toolbar-group">
                            <button class="btn-primary" id="auto-suggest-btn">
                                <i class="fas fa-magic"></i> AI Suggestions
                            </button>
                            <button class="btn-secondary" id="batch-operations-btn">
                                <i class="fas fa-layer-group"></i> Batch Operations
                            </button>
                            <button class="btn-secondary" id="save-template-btn">
                                <i class="fas fa-bookmark"></i> Save Template
                            </button>
                        </div>
                        
                        <div class="toolbar-group">
                            <button class="btn-secondary" id="undo-btn" disabled>
                                <i class="fas fa-undo"></i> Undo
                            </button>
                            <button class="btn-secondary" id="redo-btn" disabled>
                                <i class="fas fa-redo"></i> Redo
                            </button>
                            <button class="btn-secondary" id="reset-all-btn">
                                <i class="fas fa-refresh"></i> Reset All
                            </button>
                        </div>
                    </div>
                    
                    <!-- Preview Toggle -->
                    <div class="toolbar-section">
                        <label class="preview-toggle">
                            <input type="checkbox" id="preview-mode-toggle">
                            <span class="toggle-slider"></span>
                            <span class="toggle-label">Preview Mode</span>
                        </label>
                    </div>
                </div>

                <!-- Main Content Area -->
                <div class="features-content">
                    <!-- Column Explorer -->
                    <div class="column-explorer-panel">
                        <div class="panel-header">
                            <h3><i class="fas fa-columns"></i> Columns</h3>
                            <div class="panel-controls">
                                <button class="btn-icon" title="Refresh" onclick="featureEngine.refreshColumns()">
                                    <i class="fas fa-sync"></i>
                                </button>
                                <button class="btn-icon" title="Filter" onclick="featureEngine.openColumnFilter()">
                                    <i class="fas fa-filter"></i>
                                </button>
                            </div>
                        </div>
                        <div class="column-list-container">
                            <div class="column-search">
                                <input type="text" id="column-filter" placeholder="Search columns..." class="search-input">
                                <i class="fas fa-search search-icon"></i>
                            </div>
                            <div class="column-list" id="feature-column-list">
                                <!-- Populated dynamically -->
                            </div>
                        </div>
                    </div>

                    <!-- Transformation Categories -->
                    <div class="transformation-categories">
                        <div class="categories-header">
                            <h3><i class="fas fa-cogs"></i> Transformations</h3>
                        </div>
                        <div class="category-tabs" id="category-tabs">
                            <!-- Populated dynamically -->
                        </div>
                        <div class="transformation-panel" id="transformation-panel">
                            <!-- Transformation options -->
                        </div>
                    </div>

                    <!-- Preview & Results -->
                    <div class="preview-results-panel">
                        <div class="panel-header">
                            <h3><i class="fas fa-eye"></i> Preview & Results</h3>
                            <div class="panel-controls">
                                <select id="preview-size" class="form-select-sm">
                                    <option value="100">100 rows</option>
                                    <option value="500" selected>500 rows</option>
                                    <option value="1000">1000 rows</option>
                                    <option value="all">All rows</option>
                                </select>
                            </div>
                        </div>
                        <div class="preview-content" id="feature-preview-content">
                            <div class="preview-placeholder">
                                <i class="fas fa-eye"></i>
                                <p>Select a column and transformation to see preview</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Applied Transformations Summary -->
                <div class="applied-transformations">
                    <div class="panel-header">
                        <h3><i class="fas fa-list"></i> Applied Transformations</h3>
                        <div class="panel-controls">
                            <button class="btn-primary" id="apply-all-btn" disabled>
                                <i class="fas fa-check"></i> Apply All
                            </button>
                        </div>
                    </div>
                    <div class="transformations-list" id="transformations-list">
                        <div class="no-transformations">
                            <i class="fas fa-info-circle"></i>
                            <p>No transformations applied yet</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insert into features section
        const featuresContent = featuresSection.querySelector('.features-content') || 
                               featuresSection.querySelector('.section-content') || 
                               featuresSection;
        
        if (featuresContent) {
            featuresContent.innerHTML = interfaceHTML;
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Toolbar events
        document.getElementById('auto-suggest-btn')?.addEventListener('click', () => this.generateAISuggestions());
        document.getElementById('batch-operations-btn')?.addEventListener('click', () => this.openBatchOperations());
        document.getElementById('save-template-btn')?.addEventListener('click', () => this.saveAsTemplate());
        document.getElementById('undo-btn')?.addEventListener('click', () => this.undo());
        document.getElementById('redo-btn')?.addEventListener('click', () => this.redo());
        document.getElementById('reset-all-btn')?.addEventListener('click', () => this.resetAll());
        document.getElementById('apply-all-btn')?.addEventListener('click', () => this.applyAllTransformations());

        // Preview mode toggle
        document.getElementById('preview-mode-toggle')?.addEventListener('change', (e) => {
            this.previewMode = e.target.checked;
            this.togglePreviewMode();
        });

        // Column search
        document.getElementById('column-filter')?.addEventListener('input', (e) => {
            this.filterColumns(e.target.value);
        });

        // Preview size change
        document.getElementById('preview-size')?.addEventListener('change', (e) => {
            this.updatePreviewSize(e.target.value);
        });
    }

    setupTransformationPanels() {
        this.populateCategories();
        this.setupCategoryTabs();
    }

    populateCategories() {
        const categoryTabs = document.getElementById('category-tabs');
        if (!categoryTabs) return;

        categoryTabs.innerHTML = '';
        
        Object.entries(this.categories).forEach(([key, category], index) => {
            const tab = document.createElement('div');
            tab.className = `category-tab ${index === 0 ? 'active' : ''}`;
            tab.dataset.category = key;
            tab.innerHTML = `
                <div class="tab-icon">
                    <i class="${category.icon}"></i>
                </div>
                <div class="tab-content">
                    <div class="tab-title">${category.name}</div>
                    <div class="tab-count">${category.transformations.length} options</div>
                </div>
            `;
            
            tab.addEventListener('click', () => this.switchCategory(key));
            categoryTabs.appendChild(tab);
        });

        // Load first category by default
        this.switchCategory(Object.keys(this.categories)[0]);
    }

    setupCategoryTabs() {
        // Category switching is handled in populateCategories
    }

    switchCategory(categoryKey) {
        // Update active tab
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === categoryKey);
        });

        // Load transformation options for category
        this.loadTransformationOptions(categoryKey);
    }

    loadTransformationOptions(categoryKey) {
        const transformationPanel = document.getElementById('transformation-panel');
        const category = this.categories[categoryKey];
        
        if (!transformationPanel || !category) return;

        transformationPanel.innerHTML = `
            <div class="transformation-options">
                ${category.transformations.map(transformation => 
                    this.createTransformationCard(transformation, categoryKey)
                ).join('')}
            </div>
        `;

        this.setupTransformationCards();
    }

    createTransformationCard(transformationKey, categoryKey) {
        const transformationInfo = this.getTransformationInfo(transformationKey);
        
        return `
            <div class="transformation-card" data-transformation="${transformationKey}" data-category="${categoryKey}">
                <div class="card-header">
                    <div class="card-icon">
                        <i class="${transformationInfo.icon}"></i>
                    </div>
                    <div class="card-title">
                        <h4>${transformationInfo.name}</h4>
                        <p class="card-description">${transformationInfo.description}</p>
                    </div>
                </div>
                
                <div class="card-content">
                    <div class="transformation-preview">
                        <span class="preview-label">Example:</span>
                        <code>${transformationInfo.example}</code>
                    </div>
                    
                    <div class="card-requirements">
                        <span class="req-label">Requirements:</span>
                        <div class="requirements-list">
                            ${transformationInfo.requirements.map(req => 
                                `<span class="requirement-tag ${req.type}">${req.label}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="card-actions">
                    <button class="btn-secondary btn-sm" onclick="featureEngine.configureTransformation('${transformationKey}', '${categoryKey}')">
                        <i class="fas fa-cog"></i> Configure
                    </button>
                    <button class="btn-primary btn-sm" onclick="featureEngine.quickApply('${transformationKey}', '${categoryKey}')">
                        <i class="fas fa-bolt"></i> Quick Apply
                    </button>
                </div>
            </div>
        `;
    }

    setupTransformationCards() {
        // Add hover effects and interactions
        document.querySelectorAll('.transformation-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                this.showTransformationHint(card);
            });
            card.addEventListener('mouseleave', () => {
                this.hideTransformationHint();
            });
        });
    }

    /**
     * Show a transformation hint tooltip or highlight on hover.
     * @param {HTMLElement} card - The transformation card element.
     */
    showTransformationHint(card) {
        // Simple implementation: highlight the card and show a tooltip if needed
        if (!card) return;
        card.classList.add('highlight');
        // Optionally, show a tooltip (could be improved with a real tooltip system)
        let hint = card.querySelector('.transformation-hint');
        if (!hint) {
            hint = document.createElement('div');
            hint.className = 'transformation-hint';
            hint.innerHTML = `<i class="fas fa-info-circle"></i> Click Configure or Quick Apply to use this transformation.`;
            card.appendChild(hint);
        }
        hint.style.display = 'block';
    }

    /**
     * Hide the transformation hint tooltip or highlight.
     */
    hideTransformationHint() {
        document.querySelectorAll('.transformation-card').forEach(card => {
            card.classList.remove('highlight');
            const hint = card.querySelector('.transformation-hint');
            if (hint) hint.style.display = 'none';
        });
    }

    /**
     * Get the default parameters for a transformation.
     * @param {string} transformationKey
     * @returns {Object} Default parameters as key-value pairs
     */
    getDefaultParameters(transformationKey) {
        const params = this.getTransformationParameters(transformationKey);
        const defaults = {};
        params.forEach(param => {
            if (param.type === 'checkbox') {
                defaults[param.name] = !!param.default;
            } else {
                defaults[param.name] = param.default;
            }
        });
        return defaults;
    }

    // ===== TRANSFORMATION CONFIGURATION =====
    configureTransformation(transformationKey, categoryKey) {
        const selectedColumns = this.getSelectedColumns();
        
        if (selectedColumns.length === 0) {
            this.app.showNotification('Please select at least one column', 'warning');
            return;
        }

        // Validate column compatibility
        const validationResult = this.validateColumnsForTransformation(selectedColumns, transformationKey);
        if (!validationResult.valid) {
            this.app.showNotification(`Cannot apply transformation: ${validationResult.message}`, 'error');
            return;
        }

        this.openTransformationConfig(transformationKey, categoryKey, selectedColumns);
    }

    openTransformationConfig(transformationKey, categoryKey, columns) {
        const configModal = this.createConfigurationModal(transformationKey, categoryKey, columns);
        document.body.appendChild(configModal);
        
        this.setupConfigurationForm(transformationKey, columns);
        this.app.openModal('transformation-config-modal');
    }

    createConfigurationModal(transformationKey, categoryKey, columns) {
        const transformationInfo = this.getTransformationInfo(transformationKey);
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'transformation-config-modal';
        
        modal.innerHTML = `
            <div class="modal-content transformation-modal">
                <div class="modal-header">
                    <div class="transformation-title">
                        <i class="${transformationInfo.icon}"></i>
                        <div>
                            <h3>Configure ${transformationInfo.name}</h3>
                            <p>Selected columns: ${columns.join(', ')}</p>
                        </div>
                    </div>
                    <button class="modal-close" onclick="app.closeModal('transformation-config-modal'); this.parentElement.parentElement.parentElement.remove()">
                        &times;
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="config-content">
                        <!-- Parameters Panel -->
                        <div class="config-panel">
                            <h4><i class="fas fa-sliders-h"></i> Parameters</h4>
                            <div class="parameters-form" id="parameters-form">
                                ${this.createParametersForm(transformationKey)}
                            </div>
                        </div>
                        
                        <!-- Preview Panel -->
                        <div class="config-panel">
                            <h4><i class="fas fa-eye"></i> Live Preview</h4>
                            <div class="config-preview" id="config-preview">
                                <div class="preview-tabs">
                                    <button class="preview-tab active" data-tab="before">Before</button>
                                    <button class="preview-tab" data-tab="after">After</button>
                                    <button class="preview-tab" data-tab="comparison">Comparison</button>
                                </div>
                                <div class="preview-content">
                                    <div class="preview-loading">
                                        <div class="loading-spinner"></div>
                                        <span>Loading preview...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="app.closeModal('transformation-config-modal'); this.parentElement.parentElement.parentElement.remove()">
                        Cancel
                    </button>
                    <button class="btn-secondary" id="preview-transformation-btn">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                    <button class="btn-primary" id="apply-transformation-btn">
                        <i class="fas fa-check"></i> Apply Transformation
                    </button>
                </div>
            </div>
        `;

        return modal;
    }

    createParametersForm(transformationKey) {
        const parameters = this.getTransformationParameters(transformationKey);
        
        return parameters.map(param => {
            switch (param.type) {
                case 'select':
                    return `
                        <div class="parameter-group">
                            <label for="${param.name}">${param.label}:</label>
                            <select id="${param.name}" class="form-select">
                                ${param.options.map(option => 
                                    `<option value="${option.value}" ${option.value === param.default ? 'selected' : ''}>${option.label}</option>`
                                ).join('')}
                            </select>
                            ${param.description ? `<small class="param-help">${param.description}</small>` : ''}
                        </div>
                    `;
                    
                case 'number':
                    return `
                        <div class="parameter-group">
                            <label for="${param.name}">${param.label}:</label>
                            <input type="number" id="${param.name}" class="form-input" 
                                   value="${param.default}" min="${param.min}" max="${param.max}" step="${param.step}">
                            ${param.description ? `<small class="param-help">${param.description}</small>` : ''}
                        </div>
                    `;
                    
                case 'range':
                    return `
                        <div class="parameter-group">
                            <label for="${param.name}">${param.label}:</label>
                            <div class="range-input-group">
                                <input type="range" id="${param.name}" class="form-range" 
                                       value="${param.default}" min="${param.min}" max="${param.max}" step="${param.step}">
                                <span class="range-value" id="${param.name}-value">${param.default}</span>
                            </div>
                            ${param.description ? `<small class="param-help">${param.description}</small>` : ''}
                        </div>
                    `;
                    
                case 'checkbox':
                    return `
                        <div class="parameter-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="${param.name}" ${param.default ? 'checked' : ''}>
                                <span class="checkbox-custom"></span>
                                ${param.label}
                            </label>
                            ${param.description ? `<small class="param-help">${param.description}</small>` : ''}
                        </div>
                    `;
                    
                case 'text':
                    return `
                        <div class="parameter-group">
                            <label for="${param.name}">${param.label}:</label>
                            <input type="text" id="${param.name}" class="form-input" 
                                   value="${param.default}" placeholder="${param.placeholder}">
                            ${param.description ? `<small class="param-help">${param.description}</small>` : ''}
                        </div>
                    `;
                    
                default:
                    return '';
            }
        }).join('');
    }

    setupConfigurationForm(transformationKey, columns) {
        // Setup parameter change listeners
        const parametersForm = document.getElementById('parameters-form');
        if (!parametersForm) return;

        // Add change listeners to all form elements
        const formElements = parametersForm.querySelectorAll('input, select');
        formElements.forEach(element => {
            element.addEventListener('change', () => {
                this.updateLivePreview(transformationKey, columns);
            });
            
            element.addEventListener('input', () => {
                if (element.type === 'range') {
                    const valueSpan = document.getElementById(`${element.id}-value`);
                    if (valueSpan) {
                        valueSpan.textContent = element.value;
                    }
                }
                
                // Debounce preview updates for real-time feedback
                clearTimeout(this.previewTimer);
                this.previewTimer = setTimeout(() => {
                    this.updateLivePreview(transformationKey, columns);
                }, 500);
            });
        });

        // Setup preview tabs
        document.querySelectorAll('.preview-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.switchPreviewTab(tab.dataset.tab, transformationKey, columns);
            });
        });

        // Setup apply button
        document.getElementById('apply-transformation-btn')?.addEventListener('click', () => {
            this.applyTransformationFromConfig(transformationKey, columns);
        });

        // Setup preview button
        document.getElementById('preview-transformation-btn')?.addEventListener('click', () => {
            this.previewTransformationFromConfig(transformationKey, columns);
        });

        // Initial preview
        this.updateLivePreview(transformationKey, columns);
    }

    // ===== QUICK APPLY =====
    async quickApply(transformationKey, categoryKey) {
        const selectedColumns = this.getSelectedColumns();
        
        if (selectedColumns.length === 0) {
            this.app.showNotification('Please select at least one column', 'warning');
            return;
        }

        // Validate columns
        const validationResult = this.validateColumnsForTransformation(selectedColumns, transformationKey);
        if (!validationResult.valid) {
            this.app.showNotification(`Cannot apply transformation: ${validationResult.message}`, 'error');
            return;
        }

        try {
            this.app.showNotification(`Applying ${this.getTransformationInfo(transformationKey).name}...`, 'info');
            
            // Use default parameters for quick apply
            const defaultParams = this.getDefaultParameters(transformationKey);
            
            const result = await this.applyTransformation(transformationKey, selectedColumns, defaultParams);
            if (result.success) {
                this.addToTransformationHistory(transformationKey, selectedColumns, defaultParams, result);
                this.updateTransformationsList();
                this.app.showNotification('Transformation applied successfully!', 'success');
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Quick apply error:', error);
            this.app.showNotification(`Failed to apply transformation: ${error.message}`, 'error');
        }
    }

    /**
     * Apply a transformation to the selected columns with given parameters.
     * @param {string} transformationKey
     * @param {Array<string>} columns
     * @param {Object} parameters
     * @returns {Promise<Object>} Result object { success: boolean, error?: string, ... }
     */
    async applyTransformation(transformationKey, columns, parameters) {
        if (!this.app.currentSession) {
            return { success: false, error: 'No active session.' };
        }
        try {
            const response = await this.app.apiCall(`/apply_transformation/${this.app.currentSession}`, {
                method: 'POST',
                body: JSON.stringify({
                    transformation: transformationKey,
                    columns: columns,
                    parameters: parameters
                })
            });
            if (response.error) {
                return { success: false, error: response.error };
            }
            return { success: true, ...response };
        } catch (error) {
            return { success: false, error: error.message || 'Unknown error' };
        }
    }

    // ===== AI SUGGESTIONS =====
    async generateAISuggestions() {
        if (!this.app.currentSession) {
            this.app.showNotification('No data loaded for suggestions', 'warning');
            return;
        }

        try {
            this.app.showNotification('Generating AI suggestions...', 'info');
            
            const response = await this.app.apiCall(`/feature_suggestions/${this.app.currentSession}`, {
                method: 'POST',
                body: JSON.stringify({
                    target_column: this.getTargetColumn(),
                    task_type: this.getTaskType()
                })
            });

            if (response.error) {
                throw new Error(response.error);
            }

            this.displayAISuggestions(response.suggestions);
            
        } catch (error) {
            console.error('AI suggestions error:', error);
            this.app.showNotification('Failed to generate AI suggestions', 'error');
        }
    }

    displayAISuggestions(suggestions) {
        const suggestionsModal = this.createSuggestionsModal(suggestions);
        document.body.appendChild(suggestionsModal);
        this.app.openModal('ai-suggestions-modal');
    }

    createSuggestionsModal(suggestions) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'ai-suggestions-modal';
        
        modal.innerHTML = `
            <div class="modal-content suggestions-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-magic"></i> AI Feature Engineering Suggestions</h3>
                    <button class="modal-close" onclick="app.closeModal('ai-suggestions-modal'); this.parentElement.parentElement.parentElement.remove()">
                        &times;
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="suggestions-content">
                        ${suggestions.map((suggestion, index) => this.createSuggestionCard(suggestion, index)).join('')}
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="app.closeModal('ai-suggestions-modal'); this.parentElement.parentElement.parentElement.remove()">
                        Close
                    </button>
                    <button class="btn-primary" onclick="featureEngine.applySelectedSuggestions()">
                        <i class="fas fa-check"></i> Apply Selected
                    </button>
                </div>
            </div>
        `;

        return modal;
    }

    createSuggestionCard(suggestion, index) {
        return `
            <div class="suggestion-card" data-index="${index}">
                <div class="suggestion-header">
                    <label class="suggestion-checkbox">
                        <input type="checkbox" class="suggestion-select" data-index="${index}">
                        <span class="checkbox-custom"></span>
                    </label>
                    <div class="suggestion-info">
                        <h4>${suggestion.title}</h4>
                        <div class="suggestion-meta">
                            <span class="suggestion-type">${suggestion.type}</span>
                            <span class="suggestion-priority ${suggestion.priority}">${suggestion.priority}</span>
                            <span class="suggestion-impact">Impact: ${suggestion.impact}</span>
                        </div>
                    </div>
                </div>
                
                <div class="suggestion-content">
                    <p class="suggestion-description">${suggestion.description}</p>
                    <div class="suggestion-details">
                        <div class="detail-item">
                            <strong>Columns:</strong> ${suggestion.columns.join(', ')}
                        </div>
                        <div class="detail-item">
                            <strong>Transformation:</strong> ${suggestion.transformation}
                        </div>
                        ${suggestion.parameters ? `
                            <div class="detail-item">
                                <strong>Parameters:</strong>
                                <pre class="parameter-preview">${JSON.stringify(suggestion.parameters, null, 2)}</pre>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="suggestion-reasoning">
                        <strong>Why this suggestion?</strong>
                        <p>${suggestion.reasoning}</p>
                    </div>
                </div>
                
                <div class="suggestion-actions">
                    <button class="btn-secondary btn-sm" onclick="featureEngine.previewSuggestion(${index})">
                        <i class="fas fa-eye"></i> Preview
                    </button>
                    <button class="btn-primary btn-sm" onclick="featureEngine.applySingleSuggestion(${index})">
                        <i class="fas fa-bolt"></i> Apply Now
                    </button>
                </div>
            </div>
        `;
    }

    // ===== BATCH OPERATIONS =====
    openBatchOperations() {
        const batchModal = this.createBatchOperationsModal();
        document.body.appendChild(batchModal);
        this.setupBatchInterface();
        this.app.openModal('batch-operations-modal');
    }

    createBatchOperationsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'batch-operations-modal';
        
        modal.innerHTML = `
            <div class="modal-content batch-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-layer-group"></i> Batch Operations</h3>
                    <button class="modal-close" onclick="app.closeModal('batch-operations-modal'); this.parentElement.parentElement.parentElement.remove()">
                        &times;
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="batch-content">
                        <!-- Batch Builder -->
                        <div class="batch-builder">
                            <h4><i class="fas fa-plus"></i> Add Operations</h4>
                            <div class="operation-selector">
                                <select id="batch-transformation-select" class="form-select">
                                    <option value="">Select transformation...</option>
                                    ${this.createTransformationOptions()}
                                </select>
                                <select id="batch-column-select" class="form-select" multiple>
                                    <!-- Populated dynamically -->
                                </select>
                                <button class="btn-primary" id="add-to-batch-btn">
                                    <i class="fas fa-plus"></i> Add
                                </button>
                            </div>
                        </div>
                        
                        <!-- Batch Queue -->
                        <div class="batch-queue">
                            <h4><i class="fas fa-list"></i> Operation Queue</h4>
                            <div class="queue-controls">
                                <button class="btn-secondary btn-sm" onclick="featureEngine.clearBatchQueue()">
                                    <i class="fas fa-trash"></i> Clear All
                                </button>
                                <button class="btn-secondary btn-sm" onclick="featureEngine.saveBatchTemplate()">
                                    <i class="fas fa-save"></i> Save Template
                                </button>
                                <button class="btn-secondary btn-sm" onclick="featureEngine.loadBatchTemplate()">
                                    <i class="fas fa-folder-open"></i> Load Template
                                </button>
                            </div>
                            <div class="batch-operations-list" id="batch-operations-list">
                                <div class="empty-queue">
                                    <i class="fas fa-inbox"></i>
                                    <p>No operations in queue</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="app.closeModal('batch-operations-modal'); this.parentElement.parentElement.parentElement.remove()">
                        Cancel
                    </button>
                    <button class="btn-primary" id="execute-batch-btn" disabled>
                        <i class="fas fa-play"></i> Execute Batch
                    </button>
                </div>
            </div>
        `;

        return modal;
    }

    // ===== PREVIEW SYSTEM =====
    setupPreviewSystem() {
        // Preview system is integrated into the main interface
    }

    async updateLivePreview(transformationKey, columns) {
        const previewContent = document.querySelector('#config-preview .preview-content');
        if (!previewContent) return;

        try {
            // Show loading
            previewContent.innerHTML = `
                <div class="preview-loading">
                    <div class="loading-spinner"></div>
                    <span>Updating preview...</span>
                </div>
            `;

            // Get current parameters
            const parameters = this.getCurrentParameters();
            
            // Request preview from backend
            const response = await this.app.apiCall(`/preview_transformation/${this.app.currentSession}`, {
                method: 'POST',
                body: JSON.stringify({
                    transformation: transformationKey,
                    columns: columns,
                    parameters: parameters,
                    preview_size: 100
                })
            });

            if (response.error) {
                throw new Error(response.error);
            }

            this.displayPreviewResults(response.preview);
            
        } catch (error) {
            console.error('Preview error:', error);
            previewContent.innerHTML = `
                <div class="preview-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to generate preview: ${error.message}</p>
                </div>
            `;
        }
    }

    displayPreviewResults(previewData) {
        const previewContent = document.querySelector('#config-preview .preview-content');
        if (!previewContent) return;

        previewContent.innerHTML = `
            <div class="preview-tabs-content" id="preview-tabs-content">
                <div class="preview-tab-panel active" id="before-panel">
                    ${this.createPreviewTable(previewData.before, 'Before Transformation')}
                </div>
                <div class="preview-tab-panel" id="after-panel">
                    ${this.createPreviewTable(previewData.after, 'After Transformation')}
                </div>
                <div class="preview-tab-panel" id="comparison-panel">
                    ${this.createComparisonView(previewData.before, previewData.after)}
                </div>
            </div>
            
            <div class="preview-stats">
                <div class="stat-item">
                    <span class="stat-label">Rows affected:</span>
                    <span class="stat-value">${previewData.rows_affected}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Columns created:</span>
                    <span class="stat-value">${previewData.new_columns?.length || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Processing time:</span>
                    <span class="stat-value">${previewData.processing_time}ms</span>
                </div>
            </div>
        `;
    }

    createPreviewTable(data, title) {
        if (!data || !data.length) {
            return `<div class="no-preview-data">${title}: No data to display</div>`;
        }

        const headers = Object.keys(data[0]);
        const maxRows = Math.min(data.length, 10);

        return `
            <div class="preview-table-container">
                <h5>${title}</h5>
                <div class="table-scroll">
                    <table class="preview-table">
                        <thead>
                            <tr>
                                ${headers.map(header => `<th>${header}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.slice(0, maxRows).map(row => `
                                <tr>
                                    ${headers.map(header => `
                                        <td title="${row[header]}">${this.formatCellValue(row[header])}</td>
                                    `).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${data.length > maxRows ? `<p class="preview-note">Showing ${maxRows} of ${data.length} rows</p>` : ''}
            </div>
        `;
    }

    createComparisonView(beforeData, afterData) {
        return `
            <div class="comparison-view">
                <div class="comparison-summary">
                    <h5>Transformation Summary</h5>
                    <div class="summary-stats">
                        <div class="summary-item">
                            <span class="summary-label">Original columns:</span>
                            <span class="summary-value">${beforeData.length ? Object.keys(beforeData[0]).length : 0}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">New columns:</span>
                            <span class="summary-value">${afterData.length ? Object.keys(afterData[0]).length : 0}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Data types changed:</span>
                            <span class="summary-value">${this.countTypeChanges(beforeData, afterData)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="side-by-side-comparison">
                    <div class="comparison-column">
                        ${this.createPreviewTable(beforeData.slice(0, 5), 'Before (Sample)')}
                    </div>
                    <div class="comparison-column">
                        ${this.createPreviewTable(afterData.slice(0, 5), 'After (Sample)')}
                    </div>
                </div>
            </div>
        `;
    }

    // ===== COLUMN MANAGEMENT =====
    loadFeatureOptions() {
        this.populateColumnList();
        this.populateCategories();
    }

    populateColumnList() {
        const columnList = document.getElementById('feature-column-list');
        if (!columnList || !this.app.currentData?.columns) return;

        columnList.innerHTML = '';
        
        this.app.currentData.columns.forEach(column => {
            const dtype = this.app.currentData.dtypes?.[column];
            const columnType = this.getColumnType(dtype);
            
            const columnItem = document.createElement('div');
            columnItem.className = 'feature-column-item';
            columnItem.dataset.column = column;
            columnItem.dataset.type = columnType;
            
            columnItem.innerHTML = `
                <div class="column-checkbox">
                    <input type="checkbox" id="col-${column}" value="${column}">
                    <label for="col-${column}" class="checkbox-label"></label>
                </div>
                <div class="column-info">
                    <div class="column-name">${column}</div>
                    <div class="column-meta">
                        <span class="column-type ${columnType}">${this.getColumnTypeDisplay(columnType)}</span>
                        <span class="column-dtype">${dtype}</span>
                    </div>
                </div>
                <div class="column-actions">
                    <button class="btn-icon btn-xs" title="Column Info" onclick="featureEngine.showColumnInfo('${column}')">
                        <i class="fas fa-info"></i>
                    </button>
                </div>
            `;
            
            // Add click handler for selection
            columnItem.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox' && !e.target.closest('.column-actions')) {
                    const checkbox = columnItem.querySelector('input[type="checkbox"]');
                    checkbox.checked = !checkbox.checked;
                    this.updateSelectedColumns();
                }
            });
            
            columnList.appendChild(columnItem);
        });
        
        // Setup column checkboxes
        columnList.addEventListener('change', () => {
            this.updateSelectedColumns();
        });
    }

    getSelectedColumns() {
        const checkboxes = document.querySelectorAll('#feature-column-list input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    updateSelectedColumns() {
        const selectedCount = this.getSelectedColumns().length;
        
        // Update UI based on selection
        const applyAllBtn = document.getElementById('apply-all-btn');
        if (applyAllBtn) {
            applyAllBtn.disabled = this.transformationHistory.length === 0;
        }
        
        // Update transformation panel based on selected column types
        this.updateTransformationAvailability();
    }

    filterColumns(searchTerm) {
        const columnItems = document.querySelectorAll('.feature-column-item');
        const searchLower = searchTerm.toLowerCase();
        
        columnItems.forEach(item => {
            const columnName = item.dataset.column.toLowerCase();
            const columnType = item.dataset.type.toLowerCase();
            const isVisible = columnName.includes(searchLower) || columnType.includes(searchLower);
            item.style.display = isVisible ? 'flex' : 'none';
        });
    }

    // ===== UTILITY METHODS =====
    getTransformationInfo(transformationKey) {
        const transformationMap = {
            'scaling': {
                name: 'Feature Scaling',
                description: 'Scale numeric features to a standard range',
                icon: 'fas fa-expand-arrows-alt',
                example: '[1, 2, 3] → [0, 0.5, 1]',
                requirements: [
                    { type: 'numeric', label: 'Numeric' }
                ]
            },
            'normalization': {
                name: 'Normalization',
                description: 'Transform features to have zero mean and unit variance',
                icon: 'fas fa-balance-scale',
                example: '[1, 2, 3] → [-1, 0, 1]',
                requirements: [
                    { type: 'numeric', label: 'Numeric' }
                ]
            },
            'one_hot': {
                name: 'One-Hot Encoding',
                description: 'Convert categorical variables to binary columns',
                icon: 'fas fa-th',
                example: '[A, B, C] → [1,0,0], [0,1,0], [0,0,1]',
                requirements: [
                    { type: 'categorical', label: 'Categorical' }
                ]
            },
            'binning': {
                name: 'Feature Binning',
                description: 'Group continuous values into discrete bins',
                icon: 'fas fa-layer-group',
                example: '[1,5,10] → [Low, Medium, High]',
                requirements: [
                    { type: 'numeric', label: 'Numeric' }
                ]
            },
            'log_transform': {
                name: 'Log Transformation',
                description: 'Apply logarithmic transformation to reduce skewness',
                icon: 'fas fa-chart-line',
                example: '[1, 10, 100] → [0, 1, 2]',
                requirements: [
                    { type: 'numeric', label: 'Numeric > 0' }
                ]
            }
            // Add more transformations...
        };
        
        return transformationMap[transformationKey] || {
            name: transformationKey,
            description: 'Custom transformation',
            icon: 'fas fa-cog',
            example: 'N/A',
            requirements: []
        };
    }

    getTransformationParameters(transformationKey) {
        const parameterMap = {
            'scaling': [
                {
                    name: 'method',
                    type: 'select',
                    label: 'Scaling Method',
                    default: 'minmax',
                    options: [
                        { value: 'minmax', label: 'Min-Max Scaling' },
                        { value: 'standard', label: 'Standard Scaling' },
                        { value: 'robust', label: 'Robust Scaling' }
                    ],
                    description: 'Choose the scaling method to apply'
                },
                {
                    name: 'feature_range',
                    type: 'text',
                    label: 'Feature Range',
                    default: '(0, 1)',
                    placeholder: '(min, max)',
                    description: 'Target range for min-max scaling'
                }
            ],
            'binning': [
                {
                    name: 'n_bins',
                    type: 'number',
                    label: 'Number of Bins',
                    default: 5,
                    min: 2,
                    max: 50,
                    step: 1,
                    description: 'Number of bins to create'
                },
                {
                    name: 'strategy',
                    type: 'select',
                    label: 'Binning Strategy',
                    default: 'quantile',
                    options: [
                        { value: 'uniform', label: 'Uniform Width' },
                        { value: 'quantile', label: 'Equal Frequency' }
                    ],
                    description: 'How to determine bin boundaries'
                }
            ],
            'one_hot': [
                {
                    name: 'drop_first',
                    type: 'checkbox',
                    label: 'Drop First Category',
                    default: false,
                    description: 'Drop the first category to avoid multicollinearity'
                },
                {
                    name: 'handle_unknown',
                    type: 'select',
                    label: 'Handle Unknown Categories',
                    default: 'ignore',
                    options: [
                        { value: 'error', label: 'Raise Error' },
                        { value: 'ignore', label: 'Ignore' }
                    ],
                    description: 'How to handle unknown categories during transformation'
                }
            ]
            // Add more parameter definitions...
        };
        
        return parameterMap[transformationKey] || [];
    }

    validateColumnsForTransformation(columns, transformationKey) {
        const transformationInfo = this.getTransformationInfo(transformationKey);
        const requirements = transformationInfo.requirements;
        
        if (requirements.length === 0) {
            return { valid: true };
        }
        
        // Check each column against requirements
        for (const column of columns) {
            const dtype = this.app.currentData.dtypes?.[column];
            const columnType = this.getColumnType(dtype);
            
            const meetsRequirements = requirements.some(req => {
                switch (req.type) {
                    case 'numeric':
                        return columnType === 'numeric';
                    case 'categorical':
                        return columnType === 'categorical';
                    case 'datetime':
                        return columnType === 'datetime';
                    default:
                        return true;
                }
            });
            
            if (!meetsRequirements) {
                return {
                    valid: false,
                    message: `Column "${column}" (${columnType}) does not meet requirements: ${requirements.map(r => r.label).join(', ')}`
                };
            }
        }
        
        return { valid: true };
    }

    getColumnType(dtype) {
        if (!dtype) return 'unknown';
        const dtypeStr = dtype.toLowerCase();
        
        if (dtypeStr.includes('int') || dtypeStr.includes('float')) return 'numeric';
        if (dtypeStr.includes('datetime') || dtypeStr.includes('date')) return 'datetime';
        if (dtypeStr.includes('bool')) return 'boolean';
        return 'categorical';
    }

    getColumnTypeDisplay(type) {
        const displays = {
            numeric: 'NUM',
            categorical: 'CAT', 
            datetime: 'DATE',
            boolean: 'BOOL',
            unknown: '?'
        };
        return displays[type] || '?';
    }

    formatCellValue(value) {
        if (value === null || value === undefined) {
            return '<span class="null-value">NULL</span>';
        }
        
        if (typeof value === 'number') {
            return value.toFixed(3);
        }
        
        const str = String(value);
        return str.length > 30 ? str.substring(0, 30) + '...' : str;
    }

    getCurrentParameters() {
        const parametersForm = document.getElementById('parameters-form');
        if (!parametersForm) return {};
        
        const parameters = {};
        const formElements = parametersForm.querySelectorAll('input, select');
        
        formElements.forEach(element => {
            if (element.type === 'checkbox') {
                parameters[element.id] = element.checked;
            } else if (element.type === 'number' || element.type === 'range') {
                parameters[element.id] = parseFloat(element.value);
            } else {
                parameters[element.id] = element.value;
            }
        });
        
        return parameters;
    }

    countTypeChanges(beforeData, afterData) {
        // Simple implementation - in practice would analyze data types
        return Math.abs((beforeData.length ? Object.keys(beforeData[0]).length : 0) - 
                       (afterData.length ? Object.keys(afterData[0]).length : 0));
    }

    // ===== SETUP PLACEHOLDERS =====
    setupBatchOperations() {
        // Implemented in openBatchOperations method
    }

    setupCustomFunctions() {
        // Placeholder for custom function setup
    }

    loadSavedTemplates() {
        // Placeholder for loading saved templates
    }

    // ===== ADDITIONAL METHODS =====
    togglePreviewMode() {
        const workspace = document.getElementById('features-workspace');
        if (workspace) {
            workspace.classList.toggle('preview-mode', this.previewMode);
        }
        
        this.app.showNotification(
            `Preview mode ${this.previewMode ? 'enabled' : 'disabled'}`,
            'info'
        );
    }

    refreshColumns() {
        this.populateColumnList();
        this.app.showNotification('Columns refreshed', 'info');
    }

    async applyAllTransformations() {
        if (this.transformationHistory.length === 0) {
            this.app.showNotification('No transformations to apply', 'warning');
            return;
        }

        try {
            this.app.showNotification('Applying all transformations...', 'info');
            
            const response = await this.app.apiCall(`/apply_all_transformations/${this.app.currentSession}`, {
                method: 'POST',
                body: JSON.stringify({
                    transformations: this.transformationHistory
                })
            });

            if (response.error) {
                throw new Error(response.error);
            }

            // Update current data
            this.app.setCurrentData(response.updated_data);
            
            this.app.showNotification('All transformations applied successfully!', 'success');
            
            // Clear transformation history
            this.transformationHistory = [];
            this.updateTransformationsList();
            
        } catch (error) {
            console.error('Apply all transformations error:', error);
            this.app.showNotification(`Failed to apply transformations: ${error.message}`, 'error');
        }
    }

    addToTransformationHistory(transformationKey, columns, parameters, result) {
        this.transformationHistory.push({
            id: `trans_${Date.now()}`,
            transformation: transformationKey,
            columns: columns,
            parameters: parameters,
            result: result,
            timestamp: Date.now()
        });
        
        this.updateUndoRedoStack();
    }

    updateTransformationsList() {
        const transformationsList = document.getElementById('transformations-list');
        if (!transformationsList) return;

        if (this.transformationHistory.length === 0) {
            transformationsList.innerHTML = `
                <div class="no-transformations">
                    <i class="fas fa-info-circle"></i>
                    <p>No transformations applied yet</p>
                </div>
            `;
            return;
        }

        transformationsList.innerHTML = this.transformationHistory.map((trans, index) => `
            <div class="transformation-item" data-index="${index}">
                <div class="transformation-header">
                    <div class="transformation-icon">
                        <i class="${this.getTransformationInfo(trans.transformation).icon}"></i>
                    </div>
                    <div class="transformation-details">
                        <h5>${this.getTransformationInfo(trans.transformation).name}</h5>
                        <p>Columns: ${trans.columns.join(', ')}</p>
                        <small>Applied: ${new Date(trans.timestamp).toLocaleString()}</small>
                    </div>
                </div>
                <div class="transformation-actions">
                    <button class="btn-icon btn-xs" title="Remove" onclick="featureEngine.removeTransformation(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Make featureEngine globally available
    updateUndoRedoStack() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');
        
        if (undoBtn) undoBtn.disabled = this.undoStack.length === 0;
        if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
    }

    updateTransformationAvailability() {
        // Update which transformations are available based on selected columns
        const selectedColumns = this.getSelectedColumns();
        const transformationCards = document.querySelectorAll('.transformation-card');
        
        transformationCards.forEach(card => {
            const transformationKey = card.dataset.transformation;
            const validationResult = this.validateColumnsForTransformation(selectedColumns, transformationKey);
            
            card.classList.toggle('disabled', !validationResult.valid);
            
            if (!validationResult.valid) {
                card.title = validationResult.message;
            } else {
                card.title = '';
            }
        });
    }
}

// Make featureEngine globally available
window.featureEngine = null;

// Initialize when app is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.featureEngine = new FeatureEngine(window.app);
    }
});

console.log('⚙️ FeatureEngine module loaded successfully!');