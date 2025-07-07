// ===== AI-POWERED INSIGHTS ENGINE =====
class InsightsEngine {
    constructor(app) {
        this.app = app;
        this.insights = [];
        this.insightHistory = [];
        this.filters = {
            priority: 'all',
            category: 'all',
            status: 'all'
        };
        this.insightCategories = {
            'data_quality': {
                name: 'Data Quality',
                icon: 'fas fa-shield-alt',
                color: '#e74c3c'
            },
            'statistical': {
                name: 'Statistical Analysis',
                icon: 'fas fa-chart-bar',
                color: '#3498db'
            },
            'feature_engineering': {
                name: 'Feature Engineering',
                icon: 'fas fa-cogs',
                color: '#9b59b6'
            },
            'correlations': {
                name: 'Correlations',
                icon: 'fas fa-project-diagram',
                color: '#e67e22'
            },
            'outliers': {
                name: 'Outliers',
                icon: 'fas fa-exclamation-triangle',
                color: '#f39c12'
            },
            'distributions': {
                name: 'Distributions',
                icon: 'fas fa-chart-line',
                color: '#2ecc71'
            },
            'recommendations': {
                name: 'ML Recommendations',
                icon: 'fas fa-robot',
                color: '#1abc9c'
            }
        };
        this.priorityLevels = {
            'critical': {
                label: 'Critical',
                color: '#c0392b',
                weight: 5
            },
            'high': {
                label: 'High',
                color: '#e74c3c',
                weight: 4
            },
            'medium': {
                label: 'Medium',
                color: '#f39c12',
                weight: 3
            },
            'low': {
                label: 'Low',
                color: '#27ae60',
                weight: 2
            },
            'info': {
                label: 'Info',
                color: '#3498db',
                weight: 1
            }
        };
        this.init();
    }

    init() {
        try {
            this.setupInsightsInterface();
            this.setupEventListeners();
            console.log('✅ InsightsEngine initialized successfully');
        } catch (error) {
            console.error('❌ InsightsEngine initialization failed:', error);
        }
    }

    // ===== INTERFACE SETUP =====
    setupInsightsInterface() {
        const insightsSection = document.getElementById('insights-section');
        if (!insightsSection) return;

        const interfaceHTML = `
            <div class="insights-workspace" id="insights-workspace">
                <!-- Insights Dashboard Header -->
                <div class="insights-header">
                    <div class="insights-summary">
                        <div class="summary-cards">
                            <div class="insight-summary-card" data-category="total">
                                <div class="card-icon">
                                    <i class="fas fa-lightbulb"></i>
                                </div>
                                <div class="card-content">
                                    <div class="card-value" id="total-insights">0</div>
                                    <div class="card-label">Total Insights</div>
                                </div>
                            </div>
                            <div class="insight-summary-card" data-category="critical">
                                <div class="card-icon critical">
                                    <i class="fas fa-exclamation-circle"></i>
                                </div>
                                <div class="card-content">
                                    <div class="card-value" id="critical-insights">0</div>
                                    <div class="card-label">Critical</div>
                                </div>
                            </div>
                            <div class="insight-summary-card" data-category="implemented">
                                <div class="card-icon">
                                    <i class="fas fa-check-circle"></i>
                                </div>
                                <div class="card-content">
                                    <div class="card-value" id="implemented-insights">0</div>
                                    <div class="card-label">Implemented</div>
                                </div>
                            </div>
                            <div class="insight-summary-card" data-category="suggestions">
                                <div class="card-icon">
                                    <i class="fas fa-robot"></i>
                                </div>
                                <div class="card-content">
                                    <div class="card-value" id="ai-suggestions">0</div>
                                    <div class="card-label">AI Suggestions</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Insights Controls -->
                    <div class="insights-controls">
                        <div class="control-group">
                            <label for="insight-priority-filter">Priority:</label>
                            <select id="insight-priority-filter" class="insight-filter">
                                <option value="all">All Priorities</option>
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                                <option value="info">Info</option>
                            </select>
                        </div>
                        <div class="control-group">
                            <label for="insight-category-filter">Category:</label>
                            <select id="insight-category-filter" class="insight-filter">
                                <option value="all">All Categories</option>
                                ${Object.entries(this.insightCategories).map(([key, cat]) =>
                                    `<option value="${key}">${cat.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="control-group">
                            <button class="btn-primary" id="generate-insights-btn">
                                <i class="fas fa-magic"></i> Generate Insights
                            </button>
                            <button class="btn-secondary" id="refresh-insights-btn">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                    </div>
                </div>

                <!-- AI Insights Panel -->
                <div class="ai-insights-panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <i class="fas fa-robot"></i>
                            <h3>AI-Powered Analysis</h3>
                        </div>
                        <div class="panel-actions">
                            <button class="btn-accent" id="run-ai-analysis-btn">
                                <i class="fas fa-brain"></i> Run AI Analysis
                            </button>
                        </div>
                    </div>
                    <div class="ai-analysis-content" id="ai-analysis-content">
                        <div class="analysis-placeholder">
                            <div class="placeholder-icon">
                                <i class="fas fa-robot"></i>
                            </div>
                            <h4>AI Analysis Ready</h4>
                            <p>Click "Run AI Analysis" to get intelligent insights about your data</p>
                        </div>
                    </div>
                </div>

                <!-- Insights Grid -->
                <div class="insights-grid">
                    <!-- Category Insights -->
                    <div class="insights-categories">
                        <h4><i class="fas fa-layer-group"></i> Insight Categories</h4>
                        <div class="category-grid" id="category-grid">
                            ${Object.entries(this.insightCategories).map(([key, category]) => `
                                <div class="category-item" data-category="${key}">
                                    <div class="category-icon" style="color: ${category.color}">
                                        <i class="${category.icon}"></i>
                                    </div>
                                    <div class="category-info">
                                        <div class="category-name">${category.name}</div>
                                        <div class="category-count" id="count-${key}">0</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Main Insights Feed -->
                    <div class="insights-feed">
                        <div class="feed-header">
                            <h4><i class="fas fa-stream"></i> Insights Feed</h4>
                            <div class="feed-controls">
                                <button class="feed-control active" data-sort="priority">
                                    <i class="fas fa-sort-amount-down"></i> Priority
                                </button>
                                <button class="feed-control" data-sort="recent">
                                    <i class="fas fa-clock"></i> Recent
                                </button>
                                <button class="feed-control" data-sort="category">
                                    <i class="fas fa-tags"></i> Category
                                </button>
                            </div>
                        </div>
                        <div class="insights-container" id="insights-container">
                            <div class="no-insights-placeholder">
                                <div class="placeholder-icon">
                                    <i class="fas fa-lightbulb-o"></i>
                                </div>
                                <h4>No Insights Generated Yet</h4>
                                <p>Upload data and click "Generate Insights" to see AI-powered analysis</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Insight Actions Panel -->
                <div class="insight-actions-panel">
                    <div class="actions-header">
                        <h4><i class="fas fa-tasks"></i> Recommended Actions</h4>
                    </div>
                    <div class="actions-content" id="actions-content">
                        <div class="no-actions">
                            <i class="fas fa-clipboard-list"></i>
                            <p>Actions will appear as you generate insights</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Insight Detail Modal -->
            <div class="modal" id="insight-detail-modal">
                <div class="modal-content insight-modal">
                    <div class="modal-header">
                        <div class="insight-modal-title">
                            <div class="insight-icon" id="modal-insight-icon">
                                <i class="fas fa-lightbulb"></i>
                            </div>
                            <div>
                                <h3 id="modal-insight-title">Insight Details</h3>
                                <div class="insight-meta">
                                    <span class="insight-category" id="modal-insight-category"></span>
                                    <span class="insight-priority" id="modal-insight-priority"></span>
                                </div>
                            </div>
                        </div>
                        <button class="modal-close" onclick="app.closeModal('insight-detail-modal')">
                            &times;
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="insight-detail-content" id="insight-detail-content">
                            <!-- Content populated dynamically -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="app.closeModal('insight-detail-modal')">
                            Close
                        </button>
                        <button class="btn-accent" id="implement-insight-btn">
                            <i class="fas fa-magic"></i> Implement Suggestion
                        </button>
                    </div>
                </div>
            </div>
        `;

        const insightsContent = insightsSection.querySelector('.insights-content') ||
                               insightsSection.querySelector('.section-content') ||
                               insightsSection;
        
        if (insightsContent) {
            insightsContent.innerHTML = interfaceHTML;
        }
    }

    setupEventListeners() {
        // Generate insights button
        document.getElementById('generate-insights-btn')?.addEventListener('click', () => {
            this.generateInsights();
        });

        // Refresh insights button
        document.getElementById('refresh-insights-btn')?.addEventListener('click', () => {
            this.refreshInsights();
        });

        // AI Analysis button
        document.getElementById('run-ai-analysis-btn')?.addEventListener('click', () => {
            this.runAIAnalysis();
        });

        // Filter listeners
        document.getElementById('insight-priority-filter')?.addEventListener('change', (e) => {
            this.filters.priority = e.target.value;
            this.filterInsights();
        });

        document.getElementById('insight-category-filter')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.filterInsights();
        });

        // Sorting controls
        document.querySelectorAll('.feed-control').forEach(control => {
            control.addEventListener('click', () => {
                document.querySelectorAll('.feed-control').forEach(c => c.classList.remove('active'));
                control.classList.add('active');
                this.sortInsights(control.dataset.sort);
            });
        });

        // Category item clicks
        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', () => {
                const category = item.dataset.category;
                this.filterByCategory(category);
            });
        });
    }

    // ===== INSIGHTS GENERATION =====
    async generateInsights() {
        if (!this.app.currentSession) {
            this.app.showNotification('No data loaded for analysis', 'warning');
            return;
        }

        try {
            this.app.showNotification('Generating AI insights...', 'info');
            this.showLoadingState();

            // Call backend for insights generation
            const response = await this.app.apiCall(`/generate_insights/${this.app.currentSession}`, {
                method: 'POST',
                body: JSON.stringify({
                    analysis_types: ['data_quality', 'statistical', 'correlations', 'outliers', 'distributions'],
                    include_recommendations: true,
                    risk_assessment: true
                })
            });

            if (response.error) {
                throw new Error(response.error);
            }

            this.insights = response.insights;
            this.processInsights();
            this.displayInsights();
            this.updateSummaryCards();
            this.generateActionItems();

            this.app.showNotification(`Generated ${this.insights.length} insights`, 'success');

        } catch (error) {
            console.error('Insights generation error:', error);
            this.app.showNotification('Failed to generate insights', 'error');
            this.hideLoadingState();
        }
    }

    processInsights() {
        // Enhance insights with additional metadata
        this.insights.forEach((insight, index) => {
            insight.id = `insight_${Date.now()}_${index}`;
            insight.timestamp = Date.now();
            insight.status = 'pending';
            insight.viewed = false;
            insight.implemented = false;
            
            // Calculate confidence score
            insight.confidence = this.calculateConfidence(insight);
            
            // Generate action items
            insight.actions = this.generateInsightActions(insight);
            
            // Risk assessment
            insight.risk_level = this.assessRisk(insight);
        });

        // Sort by priority and confidence
        this.insights.sort((a, b) => {
            const aPriority = this.priorityLevels[a.priority]?.weight || 0;
            const bPriority = this.priorityLevels[b.priority]?.weight || 0;
            if (aPriority !== bPriority) return bPriority - aPriority;
            return (b.confidence || 0) - (a.confidence || 0);
        });
    }

    calculateConfidence(insight) {
        // Calculate confidence based on various factors
        let confidence = 0.5; // Base confidence

        // Statistical significance
        if (insight.statistical_data?.p_value) {
            const pValue = insight.statistical_data.p_value;
            if (pValue < 0.001) confidence += 0.4;
            else if (pValue < 0.01) confidence += 0.3;
            else if (pValue < 0.05) confidence += 0.2;
            else if (pValue < 0.1) confidence += 0.1;
        }

        // Sample size
        if (insight.sample_size) {
            if (insight.sample_size > 1000) confidence += 0.1;
            else if (insight.sample_size < 30) confidence -= 0.2;
        }

        // Data quality
        if (insight.data_quality_score) {
            confidence += (insight.data_quality_score - 0.5) * 0.2;
        }

        return Math.max(0, Math.min(1, confidence));
    }

    generateInsightActions(insight) {
        const actions = [];

        switch (insight.category) {
            case 'data_quality':
                if (insight.type === 'missing_values') {
                    actions.push({
                        type: 'impute',
                        label: 'Apply Imputation',
                        description: 'Fill missing values using statistical methods',
                        automated: true
                    });
                    actions.push({
                        type: 'remove',
                        label: 'Remove Rows',
                        description: 'Remove rows with missing values',
                        automated: true
                    });
                }
                break;

            case 'outliers':
                actions.push({
                    type: 'investigate',
                    label: 'Investigate Outliers',
                    description: 'Examine outlier values in detail',
                    automated: false
                });
                actions.push({
                    type: 'remove_outliers',
                    label: 'Remove Outliers',
                    description: 'Automatically remove detected outliers',
                    automated: true
                });
                break;

            case 'feature_engineering':
                actions.push({
                    type: 'apply_transformation',
                    label: 'Apply Transformation',
                    description: insight.recommendation,
                    automated: true
                });
                break;

            case 'correlations':
                if (insight.correlation_strength === 'high') {
                    actions.push({
                        type: 'feature_selection',
                        label: 'Feature Selection',
                        description: 'Consider removing highly correlated features',
                        automated: false
                    });
                }
                break;
        }

        return actions;
    }

    assessRisk(insight) {
        // Assess the risk level of implementing the insight
        let riskScore = 0;

        // Data modification risk
        if (insight.actions?.some(action => action.type.includes('remove'))) {
            riskScore += 3;
        }

        // Statistical uncertainty
        if (insight.confidence < 0.7) {
            riskScore += 2;
        }

        // Impact on data size
        if (insight.impact?.data_loss > 0.1) {
            riskScore += 2;
        }

        if (riskScore >= 5) return 'high';
        if (riskScore >= 3) return 'medium';
        return 'low';
    }

    displayInsights() {
        const container = document.getElementById('insights-container');
        if (!container) return;

        if (this.insights.length === 0) {
            container.innerHTML = `
                <div class="no-insights-placeholder">
                    <div class="placeholder-icon">
                        <i class="fas fa-lightbulb-o"></i>
                    </div>
                    <h4>No Insights Found</h4>
                    <p>Try running analysis on your data to generate insights</p>
                </div>
            `;
            return;
        }

        const filteredInsights = this.getFilteredInsights();
        
        container.innerHTML = filteredInsights.map(insight => this.createInsightCard(insight)).join('');

        // Setup card interactions
        this.setupInsightCardInteractions();
        this.hideLoadingState();
    }

    createInsightCard(insight) {
        const category = this.insightCategories[insight.category];
        const priority = this.priorityLevels[insight.priority];
        
        return `
            <div class="insight-card" data-insight-id="${insight.id}" data-category="${insight.category}" data-priority="${insight.priority}">
                <div class="insight-card-header">
                    <div class="insight-category-badge" style="background: ${category?.color}20; color: ${category?.color}">
                        <i class="${category?.icon}"></i>
                        <span>${category?.name}</span>
                    </div>
                    <div class="insight-priority-badge ${insight.priority}" style="background: ${priority?.color}20; color: ${priority?.color}">
                        ${priority?.label}
                    </div>
                </div>
                
                <div class="insight-content">
                    <h4 class="insight-title">${insight.title}</h4>
                    <p class="insight-description">${insight.description}</p>
                    
                    ${insight.key_findings ? `
                        <div class="key-findings">
                            <strong>Key Findings:</strong>
                            <ul>
                                ${insight.key_findings.map(finding => `<li>${finding}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    <div class="insight-metrics">
                        <div class="metric">
                            <span class="metric-label">Confidence:</span>
                            <div class="confidence-bar">
                                <div class="confidence-fill" style="width: ${(insight.confidence * 100)}%"></div>
                                <span class="confidence-text">${(insight.confidence * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                        
                        ${insight.impact ? `
                            <div class="metric">
                                <span class="metric-label">Impact:</span>
                                <span class="metric-value impact-${insight.impact.level}">${insight.impact.level}</span>
                            </div>
                        ` : ''}
                        
                        <div class="metric">
                            <span class="metric-label">Risk:</span>
                            <span class="metric-value risk-${insight.risk_level}">${insight.risk_level}</span>
                        </div>
                    </div>
                    
                    ${insight.recommendation ? `
                        <div class="insight-recommendation">
                            <strong><i class="fas fa-lightbulb"></i> Recommendation:</strong>
                            <p>${insight.recommendation}</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="insight-actions">
                    <button class="btn-secondary btn-sm view-details-btn" data-insight-id="${insight.id}">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    
                    ${insight.actions?.length > 0 ? `
                        <div class="quick-actions">
                            ${insight.actions.slice(0, 2).map(action => `
                                <button class="btn-accent btn-sm action-btn" 
                                        data-action="${action.type}" 
                                        data-insight-id="${insight.id}"
                                        title="${action.description}">
                                    ${action.automated ? '<i class="fas fa-magic"></i>' : '<i class="fas fa-hand-paper"></i>'} 
                                    ${action.label}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="insight-status">
                        <span class="status-indicator ${insight.status}"></span>
                        <span class="status-text">${this.getStatusText(insight.status)}</span>
                    </div>
                </div>
                
                <div class="insight-timestamp">
                    Generated ${new Date(insight.timestamp).toLocaleString()}
                </div>
            </div>
        `;
    }

    setupInsightCardInteractions() {
        // View details buttons
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const insightId = e.target.closest('[data-insight-id]').dataset.insightId;
                this.showInsightDetails(insightId);
            });
        });

        // Action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const insightId = e.target.closest('[data-insight-id]').dataset.insightId;
                const actionType = e.target.dataset.action;
                this.executeAction(insightId, actionType);
            });
        });

        // Card click to mark as viewed
        document.querySelectorAll('.insight-card').forEach(card => {
            card.addEventListener('click', () => {
                card.classList.add('viewed');
            });
        });
    }

    showInsightDetails(insightId) {
        const insight = this.insights.find(i => i.id === insightId);
        if (!insight) return;

        // Populate modal
        document.getElementById('modal-insight-title').textContent = insight.title;
        document.getElementById('modal-insight-category').textContent = this.insightCategories[insight.category]?.name;
        document.getElementById('modal-insight-priority').textContent = this.priorityLevels[insight.priority]?.label;
        document.getElementById('modal-insight-priority').className = `insight-priority ${insight.priority}`;

        const iconElement = document.getElementById('modal-insight-icon');
        iconElement.innerHTML = `<i class="${this.insightCategories[insight.category]?.icon}"></i>`;
        iconElement.style.color = this.insightCategories[insight.category]?.color;

        // Detailed content
        const detailContent = document.getElementById('insight-detail-content');
        detailContent.innerHTML = this.createDetailedInsightContent(insight);

        // Setup implement button
        const implementBtn = document.getElementById('implement-insight-btn');
        implementBtn.onclick = () => this.implementInsight(insightId);

        this.app.openModal('insight-detail-modal');
        
        // Mark as viewed
        insight.viewed = true;
    }

    createDetailedInsightContent(insight) {
        return `
            <div class="detailed-insight-content">
                <div class="insight-summary">
                    <h4><i class="fas fa-info-circle"></i> Summary</h4>
                    <p>${insight.description}</p>
                    
                    ${insight.detailed_explanation ? `
                        <div class="detailed-explanation">
                            <h5>Detailed Explanation</h5>
                            <p>${insight.detailed_explanation}</p>
                        </div>
                    ` : ''}
                </div>
                
                ${insight.statistical_data ? `
                    <div class="statistical-details">
                        <h4><i class="fas fa-chart-bar"></i> Statistical Analysis</h4>
                        <div class="stats-grid">
                            ${Object.entries(insight.statistical_data).map(([key, value]) => `
                                <div class="stat-item">
                                    <span class="stat-key">${key.replace(/_/g, ' ').toUpperCase()}:</span>
                                    <span class="stat-value">${typeof value === 'number' ? value.toFixed(4) : value}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${insight.affected_columns ? `
                    <div class="affected-columns">
                        <h4><i class="fas fa-columns"></i> Affected Columns</h4>
                        <div class="column-tags">
                            ${insight.affected_columns.map(col => `
                                <span class="column-tag">${col}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${insight.visualization ? `
                    <div class="insight-visualization">
                        <h4><i class="fas fa-chart-line"></i> Visualization</h4>
                        <div class="viz-container">
                            <img src="${insight.visualization.url}" alt="Insight Visualization" />
                        </div>
                    </div>
                ` : ''}
                
                ${insight.actions?.length > 0 ? `
                    <div class="available-actions">
                        <h4><i class="fas fa-tasks"></i> Available Actions</h4>
                        <div class="actions-list">
                            ${insight.actions.map(action => `
                                <div class="action-item">
                                    <div class="action-header">
                                        <span class="action-type ${action.automated ? 'automated' : 'manual'}">
                                            ${action.automated ? '<i class="fas fa-magic"></i> Automated' : '<i class="fas fa-hand-paper"></i> Manual'}
                                        </span>
                                        <strong>${action.label}</strong>
                                    </div>
                                    <p class="action-description">${action.description}</p>
                                    <button class="btn-accent btn-sm execute-action-btn" 
                                            data-action="${action.type}" 
                                            data-insight-id="${insight.id}">
                                        Execute Action
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="insight-metadata">
                    <h4><i class="fas fa-info"></i> Metadata</h4>
                    <div class="metadata-grid">
                        <div class="metadata-item">
                            <span class="metadata-label">Confidence Score:</span>
                            <span class="metadata-value">${(insight.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div class="metadata-item">
                            <span class="metadata-label">Risk Level:</span>
                            <span class="metadata-value risk-${insight.risk_level}">${insight.risk_level.toUpperCase()}</span>
                        </div>
                        <div class="metadata-item">
                            <span class="metadata-label">Category:</span>
                            <span class="metadata-value">${this.insightCategories[insight.category]?.name}</span>
                        </div>
                        <div class="metadata-item">
                            <span class="metadata-label">Generated:</span>
                            <span class="metadata-value">${new Date(insight.timestamp).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ===== AI ANALYSIS =====
    async runAIAnalysis() {
        if (!this.app.currentSession) {
            this.app.showNotification('No data available for AI analysis', 'warning');
            return;
        }

        try {
            this.app.showNotification('Running comprehensive AI analysis...', 'info');
            this.showAIAnalysisLoading();

            const response = await this.app.apiCall(`/ai_analysis/${this.app.currentSession}`, {
                method: 'POST',
                body: JSON.stringify({
                    analysis_depth: 'comprehensive',
                    include_predictions: true,
                    generate_narratives: true
                })
            });

            if (response.error) {
                throw new Error(response.error);
            }

            this.displayAIAnalysis(response.analysis);
            this.app.showNotification('AI analysis completed successfully!', 'success');

        } catch (error) {
            console.error('AI analysis error:', error);
            this.app.showNotification('AI analysis failed', 'error');
            this.hideAIAnalysisLoading();
        }
    }

    displayAIAnalysis(analysis) {
        const content = document.getElementById('ai-analysis-content');
        if (!content) return;

        content.innerHTML = `
            <div class="ai-analysis-results">
                <div class="analysis-overview">
                    <h4><i class="fas fa-brain"></i> AI Analysis Overview</h4>
                    <p class="analysis-summary">${analysis.summary}</p>
                    <div class="analysis-score">
                        <span class="score-label">Data Quality Score:</span>
                        <div class="score-bar">
                            <div class="score-fill" style="width: ${analysis.data_quality_score * 100}%"></div>
                            <span class="score-text">${(analysis.data_quality_score * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
                
                ${analysis.narrative ? `
                    <div class="ai-narrative">
                        <h4><i class="fas fa-comment-alt"></i> AI Narrative</h4>
                        <div class="narrative-content">${analysis.narrative}</div>
                    </div>
                ` : ''}
                
                ${analysis.predictions ? `
                    <div class="ai-predictions">
                        <h4><i class="fas fa-crystal-ball"></i> Predictions & Recommendations</h4>
                        <div class="predictions-list">
                            ${analysis.predictions.map(prediction => `
                                <div class="prediction-item">
                                    <div class="prediction-header">
                                        <strong>${prediction.title}</strong>
                                        <span class="prediction-confidence">Confidence: ${(prediction.confidence * 100).toFixed(0)}%</span>
                                    </div>
                                    <p>${prediction.description}</p>
                                    ${prediction.action_required ? `
                                        <div class="prediction-action">
                                            <i class="fas fa-exclamation-circle"></i>
                                            Action Required: ${prediction.action_required}
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="analysis-actions">
                    <button class="btn-primary" onclick="insightsEngine.generateDetailedReport()">
                        <i class="fas fa-file-alt"></i> Generate Detailed Report
                    </button>
                    <button class="btn-accent" onclick="insightsEngine.implementAIRecommendations()">
                        <i class="fas fa-magic"></i> Implement AI Recommendations
                    </button>
                </div>
            </div>
        `;
    }

    // ===== UTILITY METHODS =====
    updateSummaryCards() {
        const totalInsights = this.insights.length;
        const criticalInsights = this.insights.filter(i => i.priority === 'critical').length;
        const implementedInsights = this.insights.filter(i => i.implemented).length;
        const aiSuggestions = this.insights.filter(i => i.category === 'recommendations').length;

        document.getElementById('total-insights').textContent = totalInsights;
        document.getElementById('critical-insights').textContent = criticalInsights;
        document.getElementById('implemented-insights').textContent = implementedInsights;
        document.getElementById('ai-suggestions').textContent = aiSuggestions;

        // Update category counts
        Object.keys(this.insightCategories).forEach(category => {
            const count = this.insights.filter(i => i.category === category).length;
            document.getElementById(`count-${category}`).textContent = count;
        });
    }

    getFilteredInsights() {
        return this.insights.filter(insight => {
            if (this.filters.priority !== 'all' && insight.priority !== this.filters.priority) {
                return false;
            }
            if (this.filters.category !== 'all' && insight.category !== this.filters.category) {
                return false;
            }
            if (this.filters.status !== 'all' && insight.status !== this.filters.status) {
                return false;
            }
            return true;
        });
    }

    filterInsights() {
        this.displayInsights();
    }

    filterByCategory(category) {
        this.filters.category = category;
        document.getElementById('insight-category-filter').value = category;
        this.filterInsights();
    }

    sortInsights(sortBy) {
        switch (sortBy) {
            case 'priority':
                this.insights.sort((a, b) => {
                    const aPriority = this.priorityLevels[a.priority]?.weight || 0;
                    const bPriority = this.priorityLevels[b.priority]?.weight || 0;
                    return bPriority - aPriority;
                });
                break;
            case 'recent':
                this.insights.sort((a, b) => b.timestamp - a.timestamp);
                break;
            case 'category':
                this.insights.sort((a, b) => a.category.localeCompare(b.category));
                break;
        }
        this.displayInsights();
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Pending Review',
            'reviewed': 'Reviewed',
            'implemented': 'Implemented',
            'dismissed': 'Dismissed'
        };
        return statusMap[status] || status;
    }

    showLoadingState() {
        const container = document.getElementById('insights-container');
        if (container) {
            container.innerHTML = `
                <div class="loading-insights">
                    <div class="loading-spinner"></div>
                    <h4>Analyzing Your Data...</h4>
                    <p>Our AI is examining patterns, correlations, and anomalies</p>
                </div>
            `;
        }
    }

    hideLoadingState() {
        // Loading state is replaced by actual insights
    }

    showAIAnalysisLoading() {
        const content = document.getElementById('ai-analysis-content');
        if (content) {
            content.innerHTML = `
                <div class="ai-analysis-loading">
                    <div class="loading-brain">
                        <i class="fas fa-brain"></i>
                    </div>
                    <h4>AI Brain Processing...</h4>
                    <p>Deep learning algorithms are analyzing your dataset</p>
                    <div class="loading-progress">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                    </div>
                </div>
            `;

            // Animate progress bar
            const progressFill = content.querySelector('.progress-fill');
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 10;
                if (progress >= 90) {
                    clearInterval(interval);
                    progress = 90;
                }
                progressFill.style.width = `${progress}%`;
            }, 300);
        }
    }

    hideAIAnalysisLoading() {
        // Loading state is replaced by actual analysis
    }

    refreshInsights() {
        this.generateInsights();
    }

    async executeAction(insightId, actionType) {
        const insight = this.insights.find(i => i.id === insightId);
        if (!insight) return;

        try {
            this.app.showNotification(`Executing ${actionType}...`, 'info');

            const response = await this.app.apiCall(`/execute_insight_action/${this.app.currentSession}`, {
                method: 'POST',
                body: JSON.stringify({
                    insight_id: insightId,
                    action_type: actionType,
                    insight_data: insight
                })
            });

            if (response.error) {
                throw new Error(response.error);
            }

            // Update insight status
            insight.status = 'implemented';
            insight.implemented = true;

            this.displayInsights();
            this.updateSummaryCards();
            this.app.showNotification('Action executed successfully!', 'success');

        } catch (error) {
            console.error('Action execution error:', error);
            this.app.showNotification(`Failed to execute ${actionType}`, 'error');
        }
    }

    implementInsight(insightId) {
        const insight = this.insights.find(i => i.id === insightId);
        if (!insight || !insight.actions?.length) {
            this.app.showNotification('No actions available for this insight', 'warning');
            return;
        }

        // Execute the primary action
        const primaryAction = insight.actions[0];
        this.executeAction(insightId, primaryAction.type);
        this.app.closeModal('insight-detail-modal');
    }

    generateActionItems() {
        const actionsContent = document.getElementById('actions-content');
        if (!actionsContent) return;

        const actionableInsights = this.insights.filter(i => 
            i.actions?.length > 0 && i.status === 'pending'
        );

        if (actionableInsights.length === 0) {
            actionsContent.innerHTML = `
                <div class="no-actions">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No pending actions available</p>
                </div>
            `;
            return;
        }

        actionsContent.innerHTML = `
            <div class="action-items">
                ${actionableInsights.slice(0, 5).map(insight => `
                    <div class="action-item">
                        <div class="action-info">
                            <h5>${insight.title}</h5>
                            <p>${insight.actions[0].description}</p>
                        </div>
                        <button class="btn-accent btn-sm" 
                                onclick="insightsEngine.executeAction('${insight.id}', '${insight.actions[0].type}')">
                            <i class="fas fa-play"></i> Execute
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async generateDetailedReport() {
        try {
            this.app.showNotification('Generating detailed insights report...', 'info');

            const response = await this.app.apiCall(`/generate_insights_report/${this.app.currentSession}`, {
                method: 'POST',
                body: JSON.stringify({
                    insights: this.insights,
                    include_visualizations: true,
                    format: 'html'
                })
            });

            if (response.error) {
                throw new Error(response.error);
            }

            // Trigger download
            const link = document.createElement('a');
            link.href = response.download_url;
            link.download = `insights_report_${Date.now()}.html`;
            link.click();

            this.app.showNotification('Insights report generated successfully!', 'success');

        } catch (error) {
            console.error('Report generation error:', error);
            this.app.showNotification('Failed to generate report', 'error');
        }
    }

    async implementAIRecommendations() {
        const aiRecommendations = this.insights.filter(i => 
            i.category === 'recommendations' && 
            i.status === 'pending' &&
            i.actions?.some(a => a.automated)
        );

        if (aiRecommendations.length === 0) {
            this.app.showNotification('No automated AI recommendations available', 'warning');
            return;
        }

        try {
            this.app.showNotification(`Implementing ${aiRecommendations.length} AI recommendations...`, 'info');

            for (const insight of aiRecommendations) {
                const automatedAction = insight.actions.find(a => a.automated);
                if (automatedAction) {
                    await this.executeAction(insight.id, automatedAction.type);
                }
            }

            this.app.showNotification('AI recommendations implemented successfully!', 'success');

        } catch (error) {
            console.error('Implementation error:', error);
            this.app.showNotification('Failed to implement some recommendations', 'error');
        }
    }
}

// Make InsightsEngine globally available
window.insightsEngine = null;

// Initialize when app is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.insightsEngine = new InsightsEngine(window.app);
    }
});

console.log('💡 InsightsEngine module loaded successfully!');