// ===== ADVANCED DATA ANALYZER MODULE =====
class DataAnalyzer {
    constructor(app) {
        this.app = app;
        this.currentAnalysis = null;
        this.analysisHistory = [];
        this.analysisCache = new Map();
        this.activeTab = 'univariate';
        this.selectedColumns = new Set();
        this.analysisSettings = {
            maxCorrelationDisplay: 50,
            significanceLevel: 0.05,
            outlierMethod: 'iqr',
            normalizationMethod: 'standard'
        };
        
        this.init();
    }

    init() {
        try {
            this.setupAnalysisTabs();
            this.setupColumnSelector();
            this.setupAnalysisControls();
            this.setupQuickAnalysis();
            this.setupAdvancedOptions();
            
            console.log('✅ DataAnalyzer initialized successfully');
        } catch (error) {
            console.error('❌ DataAnalyzer initialization failed:', error);
        }
    }

    // ===== ANALYSIS TABS SETUP =====
    setupAnalysisTabs() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchAnalysisTab(btn.dataset.tab);
            });
        });
    }

    switchAnalysisTab(tabName) {
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        this.activeTab = tabName;
        this.updateAnalysisInterface();
        
        this.app.showNotification(`Switched to ${tabName} analysis`, 'info');
    }

    updateAnalysisInterface() {
        const columnSelector = document.getElementById('column-selector');
        const runButton = document.getElementById('run-analysis-btn');
        
        if (!columnSelector || !runButton) return;

        // Update interface based on active tab
        switch (this.activeTab) {
            case 'univariate':
                this.setupUnivariateInterface();
                break;
            case 'bivariate':
                this.setupBivariateInterface();
                break;
            case 'multivariate':
                this.setupMultivariateInterface();
                break;
            case 'statistical':
                this.setupStatisticalTestsInterface();
                break;
        }
    }

    // ===== INTERFACE SETUP METHODS =====
    setupUnivariateInterface() {
        const selectorGroup = document.querySelector('.selector-group');
        if (!selectorGroup) return;

        selectorGroup.querySelector('label').textContent = 'Select Column for Univariate Analysis:';
        
        const helper = selectorGroup.querySelector('.select-helper');
        if (helper) {
            helper.textContent = 'Choose a single column to analyze its distribution and characteristics';
        }

        // Update run button
        const runButton = document.getElementById('run-analysis-btn');
        if (runButton) {
            runButton.innerHTML = '<i class="fas fa-chart-bar"></i> Analyze Distribution';
        }
    }

    setupBivariateInterface() {
        const selectorGroup = document.querySelector('.selector-group');
        if (!selectorGroup) return;

        selectorGroup.querySelector('label').textContent = 'Select Two Columns for Bivariate Analysis:';
        
        const helper = selectorGroup.querySelector('.select-helper');
        if (helper) {
            helper.textContent = 'Choose exactly two columns to explore their relationship';
        }

        // Update run button
        const runButton = document.getElementById('run-analysis-btn');
        if (runButton) {
            runButton.innerHTML = '<i class="fas fa-project-diagram"></i> Analyze Relationship';
        }
    }

    setupMultivariateInterface() {
        const selectorGroup = document.querySelector('.selector-group');
        if (!selectorGroup) return;

        selectorGroup.querySelector('label').textContent = 'Select Multiple Columns for Multivariate Analysis:';
        
        const helper = selectorGroup.querySelector('.select-helper');
        if (helper) {
            helper.textContent = 'Choose 3 or more columns for comprehensive multivariate analysis';
        }

        // Update run button
        const runButton = document.getElementById('run-analysis-btn');
        if (runButton) {
            runButton.innerHTML = '<i class="fas fa-cubes"></i> Multivariate Analysis';
        }
    }

    setupStatisticalTestsInterface() {
        const selectorGroup = document.querySelector('.selector-group');
        if (!selectorGroup) return;

        selectorGroup.querySelector('label').textContent = 'Select Columns for Statistical Testing:';
        
        const helper = selectorGroup.querySelector('.select-helper');
        if (helper) {
            helper.textContent = 'Choose columns for hypothesis testing and statistical analysis';
        }

        // Add statistical test selector
        this.addStatisticalTestSelector();

        // Update run button
        const runButton = document.getElementById('run-analysis-btn');
        if (runButton) {
            runButton.innerHTML = '<i class="fas fa-calculator"></i> Run Statistical Tests';
        }
    }

    addStatisticalTestSelector() {
        const columnSelector = document.getElementById('column-selector');
        let testSelector = document.getElementById('statistical-test-selector');
        
        if (!testSelector) {
            const testSelectorHTML = `
                <div class="selector-group" id="statistical-test-selector">
                    <label>Statistical Test:</label>
                    <select id="statistical-test-select" class="filter-select">
                        <option value="auto">Auto-select (Recommended)</option>
                        <optgroup label="Normality Tests">
                            <option value="shapiro_wilk">Shapiro-Wilk Test</option>
                            <option value="kolmogorov_smirnov">Kolmogorov-Smirnov Test</option>
                            <option value="anderson_darling">Anderson-Darling Test</option>
                        </optgroup>
                        <optgroup label="Comparison Tests">
                            <option value="t_test">Independent T-Test</option>
                            <option value="paired_t_test">Paired T-Test</option>
                            <option value="mann_whitney_u">Mann-Whitney U Test</option>
                            <option value="wilcoxon">Wilcoxon Signed-Rank Test</option>
                        </optgroup>
                        <optgroup label="ANOVA">
                            <option value="one_way_anova">One-Way ANOVA</option>
                            <option value="two_way_anova">Two-Way ANOVA</option>
                            <option value="kruskal_wallis">Kruskal-Wallis Test</option>
                        </optgroup>
                        <optgroup label="Correlation">
                            <option value="pearson">Pearson Correlation</option>
                            <option value="spearman">Spearman Correlation</option>
                            <option value="kendall">Kendall's Tau</option>
                        </optgroup>
                        <optgroup label="Categorical">
                            <option value="chi_square">Chi-Square Test</option>
                            <option value="fisher_exact">Fisher's Exact Test</option>
                        </optgroup>
                    </select>
                    <div class="test-description" id="test-description">
                        <p><strong>Auto-select:</strong> The system will automatically choose the most appropriate statistical test based on your data and column selection.</p>
                    </div>
                </div>
            `;
            
            columnSelector.insertAdjacentHTML('beforeend', testSelectorHTML);
            
            // Setup test description updates
            const testSelect = document.getElementById('statistical-test-select');
            testSelect.addEventListener('change', (e) => {
                this.updateTestDescription(e.target.value);
            });
        }
    }

    updateTestDescription(testType) {
        const descriptions = {
            'auto': 'The system will automatically choose the most appropriate statistical test based on your data and column selection.',
            'shapiro_wilk': 'Tests whether a sample comes from a normally distributed population. Best for small to medium sample sizes (n < 5000).',
            'kolmogorov_smirnov': 'Tests goodness of fit between sample and theoretical distribution. Works well for larger sample sizes.',
            'anderson_darling': 'Tests whether sample comes from a specific distribution. More sensitive than Kolmogorov-Smirnov.',
            't_test': 'Compares means of two independent groups. Assumes normal distribution and equal variances.',
            'paired_t_test': 'Compares paired observations (before/after, matched pairs). Assumes normal distribution of differences.',
            'mann_whitney_u': 'Non-parametric test comparing two independent groups. No assumption of normality required.',
            'wilcoxon': 'Non-parametric test for paired observations. Alternative to paired t-test when normality assumption is violated.',
            'one_way_anova': 'Compares means across three or more independent groups. Assumes normality and equal variances.',
            'two_way_anova': 'Tests effects of two categorical variables on a continuous outcome. Includes interaction effects.',
            'kruskal_wallis': 'Non-parametric alternative to one-way ANOVA. Compares medians across multiple groups.',
            'pearson': 'Measures linear correlation between two continuous variables. Assumes bivariate normal distribution.',
            'spearman': 'Measures monotonic relationship between variables. Non-parametric alternative to Pearson.',
            'kendall': 'Measures ordinal association between variables. Robust to outliers.',
            'chi_square': 'Tests independence between two categorical variables. Requires sufficient expected frequencies.',
            'fisher_exact': 'Tests independence in 2x2 contingency tables. Exact test for small sample sizes.'
        };
        
        const descriptionElement = document.getElementById('test-description');
        if (descriptionElement && descriptions[testType]) {
            descriptionElement.innerHTML = `<p><strong>${testType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> ${descriptions[testType]}</p>`;
        }
    }

    // ===== COLUMN SELECTOR SETUP =====
    setupColumnSelector() {
        const columnSelect = document.getElementById('analysis-columns');
        const runButton = document.getElementById('run-analysis-btn');
        
        if (!columnSelect || !runButton) return;

        // Populate columns if data is available
        if (this.app.currentData?.columns) {
            this.populateColumnSelector();
        }

        // Setup selection change handler
        columnSelect.addEventListener('change', () => {
            this.updateSelectedColumns();
            this.validateSelection();
        });

        // Setup run analysis button
        runButton.addEventListener('click', () => {
            this.runAnalysis();
        });
    }

    populateColumnSelector() {
        const columnSelect = document.getElementById('analysis-columns');
        if (!columnSelect || !this.app.currentData?.columns) return;

        columnSelect.innerHTML = '';
        
        this.app.currentData.columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column;
            const dtype = this.app.currentData.dtypes?.[column];
            const typeDisplay = this.getColumnTypeDisplay(dtype);
            option.textContent = `${column} (${typeDisplay})`;
            option.title = `Data type: ${dtype || 'Unknown'}`;
            columnSelect.appendChild(option);
        });
    }

    updateSelectedColumns() {
        const columnSelect = document.getElementById('analysis-columns');
        this.selectedColumns.clear();
        
        Array.from(columnSelect.selectedOptions).forEach(option => {
            this.selectedColumns.add(option.value);
        });
    }

    validateSelection() {
        const runButton = document.getElementById('run-analysis-btn');
        if (!runButton) return;

        const selectedCount = this.selectedColumns.size;
        let isValid = false;
        let message = '';

        switch (this.activeTab) {
            case 'univariate':
                isValid = selectedCount === 1;
                message = selectedCount === 0 ? 'Select a column' : 
                         selectedCount > 1 ? 'Select only one column' : '';
                break;
                
            case 'bivariate':
                isValid = selectedCount === 2;
                message = selectedCount === 0 ? 'Select two columns' : 
                         selectedCount === 1 ? 'Select one more column' :
                         selectedCount > 2 ? 'Select only two columns' : '';
                break;
                
            case 'multivariate':
                isValid = selectedCount >= 3;
                message = selectedCount < 3 ? `Select ${3 - selectedCount} more column(s)` : '';
                break;
                
            case 'statistical':
                isValid = selectedCount >= 1;
                message = selectedCount === 0 ? 'Select at least one column' : '';
                break;
        }

        runButton.disabled = !isValid;
        
        // Update button appearance
        if (isValid) {
            runButton.classList.remove('disabled');
            runButton.title = '';
        } else {
            runButton.classList.add('disabled');
            runButton.title = message;
        }
    }

    // ===== ANALYSIS EXECUTION =====
    async runAnalysis() {
        if (this.selectedColumns.size === 0) {
            this.app.showNotification('Please select columns for analysis', 'warning');
            return;
        }

        const columns = Array.from(this.selectedColumns);
        const analysisId = this.generateAnalysisId(this.activeTab, columns);
        
        // Check cache first
        if (this.analysisCache.has(analysisId)) {
            this.displayCachedResults(analysisId);
            return;
        }

        try {
            // Show loading
            this.showAnalysisLoading();
            
            let results;
            switch (this.activeTab) {
                case 'univariate':
                    results = await this.performUnivariateAnalysis(columns[0]);
                    break;
                case 'bivariate':
                    results = await this.performBivariateAnalysis(columns);
                    break;
                case 'multivariate':
                    results = await this.performMultivariateAnalysis(columns);
                    break;
                case 'statistical':
                    results = await this.performStatisticalTests(columns);
                    break;
            }
            
            // Cache results
            this.analysisCache.set(analysisId, {
                timestamp: Date.now(),
                type: this.activeTab,
                columns: columns,
                results: results
            });
            
            // Display results
            this.displayAnalysisResults(results);
            
            // Add to history
            this.addToAnalysisHistory(analysisId, this.activeTab, columns);
            
            this.app.showNotification('Analysis completed successfully!', 'success');
            
        } catch (error) {
            console.error('Analysis error:', error);
            this.showAnalysisError(error.message);
            this.app.showNotification('Analysis failed', 'error');
        }
    }

    // ===== SPECIFIC ANALYSIS METHODS =====
    async performUnivariateAnalysis(column) {
        const response = await this.app.apiCall(`/analyze_column/${this.app.currentSession}`, {
            method: 'POST',
            body: JSON.stringify({
                column: column,
                analysis_type: 'univariate'
            })
        });

        if (response.error) {
            throw new Error(response.error);
        }

        return {
            type: 'univariate',
            column: column,
            analysis: response.analysis_results,
            plots: response.plots,
            insights: this.generateUnivariateInsights(response.analysis_results)
        };
    }

    async performBivariateAnalysis(columns) {
        const [col1, col2] = columns;
        
        const response = await this.app.apiCall(`/compare_columns/${this.app.currentSession}`, {
            method: 'POST',
            body: JSON.stringify({
                columns: [col1, col2]
            })
        });

        if (response.error) {
            throw new Error(response.error);
        }

        return {
            type: 'bivariate',
            columns: columns,
            comparison: response.comparison_results,
            plots: response.plots,
            insights: this.generateBivariateInsights(response.comparison_results),
            recommendations: response.recommendations
        };
    }

    async performMultivariateAnalysis(columns) {
        // Perform pairwise analysis for all combinations
        const pairwiseResults = [];
        
        for (let i = 0; i < columns.length; i++) {
            for (let j = i + 1; j < columns.length; j++) {
                const pairResult = await this.performBivariateAnalysis([columns[i], columns[j]]);
                pairwiseResults.push({
                    pair: [columns[i], columns[j]],
                    result: pairResult
                });
            }
        }

        // Get correlation matrix
        const correlationResponse = await this.app.apiCall(`/analyze_correlations/${this.app.currentSession}`, {
            method: 'POST',
            body: JSON.stringify({
                columns: columns
            })
        });

        return {
            type: 'multivariate',
            columns: columns,
            pairwise_analysis: pairwiseResults,
            correlation_matrix: correlationResponse.correlation_matrix,
            pca_analysis: correlationResponse.pca_analysis,
            insights: this.generateMultivariateInsights(pairwiseResults, correlationResponse),
            recommendations: correlationResponse.recommendations
        };
    }

    async performStatisticalTests(columns) {
        const selectedTest = document.getElementById('statistical-test-select')?.value || 'auto';
        
        let testType = selectedTest;
        if (selectedTest === 'auto') {
            testType = this.autoSelectTest(columns);
        }

        const response = await this.app.apiCall(`/statistical_tests/${this.app.currentSession}`, {
            method: 'POST',
            body: JSON.stringify({
                test_type: testType,
                columns: columns
            })
        });

        if (response.error) {
            throw new Error(response.error);
        }

        return {
            type: 'statistical',
            test_type: testType,
            columns: columns,
            test_results: response.test_results,
            insights: this.generateStatisticalInsights(response.test_results)
        };
    }

    // ===== AUTO TEST SELECTION =====
    autoSelectTest(columns) {
        const columnTypes = columns.map(col => 
            this.getColumnType(this.app.currentData.dtypes?.[col])
        );

        // Auto-selection logic based on column count and types
        if (columns.length === 1) {
            return columnTypes[0] === 'numeric' ? 'shapiro_wilk' : 'chi_square';
        } else if (columns.length === 2) {
            if (columnTypes.every(type => type === 'numeric')) {
                return 'pearson';
            } else if (columnTypes.every(type => type === 'categorical')) {
                return 'chi_square';
            } else {
                return 't_test';
            }
        } else {
            return columnTypes.every(type => type === 'numeric') ? 'one_way_anova' : 'chi_square';
        }
    }

    // ===== RESULTS DISPLAY =====
    displayAnalysisResults(results) {
        const resultsContainer = document.getElementById('analysis-results');
        if (!resultsContainer) return;

        resultsContainer.innerHTML = this.createResultsHTML(results);
        this.setupResultsInteractions(results);
    }

    createResultsHTML(results) {
        switch (results.type) {
            case 'univariate':
                return this.createUnivariateResultsHTML(results);
            case 'bivariate':
                return this.createBivariateResultsHTML(results);
            case 'multivariate':
                return this.createMultivariateResultsHTML(results);
            case 'statistical':
                return this.createStatisticalResultsHTML(results);
            default:
                return '<div class="results-error">Unknown analysis type</div>';
        }
    }

    createUnivariateResultsHTML(results) {
        const analysis = results.analysis;
        
        return `
            <div class="analysis-results-container">
                <div class="results-header">
                    <h3><i class="fas fa-chart-bar"></i> Univariate Analysis: ${results.column}</h3>
                    <div class="results-actions">
                        <button class="btn-secondary" onclick="analyzer.exportResults('${results.column}')">
                            <i class="fas fa-download"></i> Export
                        </button>
                    </div>
                </div>
                
                <div class="results-grid">
                    <!-- Summary Statistics -->
                    <div class="result-card">
                        <h4><i class="fas fa-calculator"></i> Summary Statistics</h4>
                        <div class="stats-grid">
                            ${this.createStatsGrid(analysis)}
                        </div>
                    </div>
                    
                    <!-- Distribution Analysis -->
                    <div class="result-card">
                        <h4><i class="fas fa-chart-area"></i> Distribution Analysis</h4>
                        <div class="distribution-info">
                            ${this.createDistributionInfo(analysis)}
                        </div>
                    </div>
                    
                    <!-- Visualizations -->
                    <div class="result-card full-width">
                        <h4><i class="fas fa-chart-line"></i> Visualizations</h4>
                        <div class="visualization-container">
                            ${this.createVisualizationTabs(results.plots)}
                        </div>
                    </div>
                    
                    <!-- Insights -->
                    <div class="result-card full-width">
                        <h4><i class="fas fa-lightbulb"></i> Key Insights</h4>
                        <div class="insights-container">
                            ${this.createInsightsHTML(results.insights)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createBivariateResultsHTML(results) {
        const comparison = results.comparison.pairwise_comparisons;
        const comparisonKey = Object.keys(comparison)[0];
        const comparisonData = comparison[comparisonKey];
        
        return `
            <div class="analysis-results-container">
                <div class="results-header">
                    <h3><i class="fas fa-project-diagram"></i> Bivariate Analysis</h3>
                    <div class="column-tags">
                        ${results.columns.map(col => `<span class="column-tag">${col}</span>`).join('')}
                    </div>
                </div>
                
                <div class="results-grid">
                    <!-- Relationship Analysis -->
                    <div class="result-card">
                        <h4><i class="fas fa-link"></i> Relationship Analysis</h4>
                        <div class="relationship-info">
                            ${this.createRelationshipInfo(comparisonData)}
                        </div>
                    </div>
                    
                    <!-- Statistical Tests -->
                    <div class="result-card">
                        <h4><i class="fas fa-calculator"></i> Statistical Tests</h4>
                        <div class="test-results">
                            ${this.createTestResultsHTML(comparisonData)}
                        </div>
                    </div>
                    
                    <!-- Visualizations -->
                    <div class="result-card full-width">
                        <h4><i class="fas fa-chart-scatter"></i> Relationship Visualizations</h4>
                        <div class="visualization-container">
                            ${this.createVisualizationTabs(results.plots)}
                        </div>
                    </div>
                    
                    <!-- Insights & Recommendations -->
                    <div class="result-card full-width">
                        <h4><i class="fas fa-recommendations"></i> Insights & Recommendations</h4>
                        <div class="insights-container">
                            ${this.createInsightsHTML(results.insights)}
                            ${this.createRecommendationsHTML(results.recommendations)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createMultivariateResultsHTML(results) {
        return `
            <div class="analysis-results-container">
                <div class="results-header">
                    <h3><i class="fas fa-cubes"></i> Multivariate Analysis</h3>
                    <div class="column-tags">
                        ${results.columns.map(col => `<span class="column-tag">${col}</span>`).join('')}
                    </div>
                </div>
                
                <div class="results-grid">
                    <!-- Correlation Matrix -->
                    <div class="result-card">
                        <h4><i class="fas fa-th"></i> Correlation Matrix</h4>
                        <div class="correlation-matrix">
                            ${this.createCorrelationMatrixHTML(results.correlation_matrix)}
                        </div>
                    </div>
                    
                    <!-- PCA Analysis -->
                    <div class="result-card">
                        <h4><i class="fas fa-compress-arrows-alt"></i> Principal Component Analysis</h4>
                        <div class="pca-results">
                            ${this.createPCAResultsHTML(results.pca_analysis)}
                        </div>
                    </div>
                    
                    <!-- Pairwise Relationships -->
                    <div class="result-card full-width">
                        <h4><i class="fas fa-network-wired"></i> Pairwise Relationships</h4>
                        <div class="pairwise-container">
                            ${this.createPairwiseHTML(results.pairwise_analysis)}
                        </div>
                    </div>
                    
                    <!-- Insights -->
                    <div class="result-card full-width">
                        <h4><i class="fas fa-brain"></i> Multivariate Insights</h4>
                        <div class="insights-container">
                            ${this.createInsightsHTML(results.insights)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createStatisticalResultsHTML(results) {
        const testResults = results.test_results;
        
        return `
            <div class="analysis-results-container">
                <div class="results-header">
                    <h3><i class="fas fa-calculator"></i> Statistical Test Results</h3>
                    <div class="test-info">
                        <span class="test-name">${testResults.test_name || results.test_type}</span>
                        <span class="test-columns">${results.columns.join(', ')}</span>
                    </div>
                </div>
                
                <div class="results-grid">
                    <!-- Test Summary -->
                    <div class="result-card">
                        <h4><i class="fas fa-info-circle"></i> Test Summary</h4>
                        <div class="test-summary">
                            ${this.createTestSummaryHTML(testResults)}
                        </div>
                    </div>
                    
                    <!-- Test Statistics -->
                    <div class="result-card">
                        <h4><i class="fas fa-chart-bar"></i> Test Statistics</h4>
                        <div class="test-statistics">
                            ${this.createTestStatisticsHTML(testResults)}
                        </div>
                    </div>
                    
                    <!-- Interpretation -->
                    <div class="result-card full-width">
                        <h4><i class="fas fa-comments"></i> Interpretation</h4>
                        <div class="interpretation-container">
                            ${this.createInterpretationHTML(testResults)}
                        </div>
                    </div>
                    
                    <!-- Insights -->
                    <div class="result-card full-width">
                        <h4><i class="fas fa-lightbulb"></i> Statistical Insights</h4>
                        <div class="insights-container">
                            ${this.createInsightsHTML(results.insights)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ===== HTML CREATION HELPERS =====
    createStatsGrid(analysis) {
        const stats = [
            { label: 'Mean', value: analysis.mean?.toFixed(4), icon: 'fas fa-calculator' },
            { label: 'Median', value: analysis.median?.toFixed(4), icon: 'fas fa-divide' },
            { label: 'Std Dev', value: analysis.std?.toFixed(4), icon: 'fas fa-arrows-alt-h' },
            { label: 'Min', value: analysis.min?.toFixed(4), icon: 'fas fa-arrow-down' },
            { label: 'Max', value: analysis.max?.toFixed(4), icon: 'fas fa-arrow-up' },
            { label: 'Range', value: analysis.range?.toFixed(4), icon: 'fas fa-ruler' },
            { label: 'Skewness', value: analysis.skewness?.toFixed(4), icon: 'fas fa-chart-line' },
            { label: 'Kurtosis', value: analysis.kurtosis?.toFixed(4), icon: 'fas fa-mountain' }
        ];

        return stats.filter(stat => stat.value !== undefined).map(stat => `
            <div class="stat-item">
                <div class="stat-icon"><i class="${stat.icon}"></i></div>
                <div class="stat-content">
                    <span class="stat-label">${stat.label}</span>
                    <span class="stat-value">${stat.value}</span>
                </div>
            </div>
        `).join('');
    }

    createDistributionInfo(analysis) {
        const normalityTest = analysis.normality_test;
        const outliers = analysis.outliers_count || 0;
        const missingPct = analysis.missing_percentage || 0;

        return `
            <div class="distribution-metrics">
                <div class="metric-item">
                    <span class="metric-label">Normality:</span>
                    <span class="metric-value ${normalityTest?.is_normal ? 'normal' : 'not-normal'}">
                        ${normalityTest?.is_normal ? 'Normal' : 'Not Normal'}
                        ${normalityTest?.shapiro_wilk ? `(p=${normalityTest.shapiro_wilk.p_value.toFixed(4)})` : ''}
                    </span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Outliers:</span>
                    <span class="metric-value ${outliers > 0 ? 'has-outliers' : 'no-outliers'}">
                        ${outliers} (${analysis.outliers_percentage?.toFixed(1) || 0}%)
                    </span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">Missing Data:</span>
                    <span class="metric-value ${missingPct > 0 ? 'has-missing' : 'no-missing'}">
                        ${missingPct.toFixed(1)}%
                    </span>
                </div>
            </div>
        `;
    }

    createVisualizationTabs(plots) {
        if (!plots || Object.keys(plots).length === 0) {
            return '<div class="no-plots">No visualizations available</div>';
        }

        const plotEntries = Object.entries(plots);
        
        let tabsHTML = '<div class="viz-tabs">';
        plotEntries.forEach(([key, value], index) => {
            const plotName = key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            tabsHTML += `
                <button class="viz-tab ${index === 0 ? 'active' : ''}" data-plot="${key}">
                    ${plotName}
                </button>
            `;
        });
        tabsHTML += '</div>';

        tabsHTML += '<div class="viz-content">';
        plotEntries.forEach(([key, value], index) => {
            tabsHTML += `
                <div class="viz-panel ${index === 0 ? 'active' : ''}" id="plot-${key}">
                    <iframe src="${value}" width="100%" height="500" frameborder="0"></iframe>
                </div>
            `;
        });
        tabsHTML += '</div>';

        return tabsHTML;
    }

    createInsightsHTML(insights) {
        if (!insights || insights.length === 0) {
            return '<div class="no-insights">No insights generated</div>';
        }

        return insights.map(insight => `
            <div class="insight-item ${insight.priority || 'medium'}">
                <div class="insight-header">
                    <i class="fas fa-lightbulb"></i>
                    <span class="insight-title">${insight.title || 'Insight'}</span>
                    <span class="insight-priority ${insight.priority || 'medium'}">${insight.priority || 'Medium'}</span>
                </div>
                <div class="insight-content">
                    <p>${insight.description || insight.message}</p>
                    ${insight.action ? `<div class="insight-action"><strong>Recommended Action:</strong> ${insight.action}</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    // ===== QUICK ANALYSES =====
    async generateEDA() {
        if (!this.app.currentSession) {
            this.app.showNotification('No data loaded for EDA', 'warning');
            return;
        }

        try {
            this.app.showLoading('eda-dashboard', 'Generating comprehensive EDA...');
            
            const response = await this.app.apiCall(`/eda/${this.app.currentSession}`);
            
            if (response.error) {
                throw new Error(response.error);
            }

            this.displayEDAResults(response);
            this.app.showNotification('EDA generated successfully!', 'success');
            
        } catch (error) {
            console.error('EDA generation error:', error);
            this.app.showNotification('Failed to generate EDA', 'error');
        } finally {
            this.app.hideLoading('eda-dashboard');
        }
    }

    displayEDAResults(results) {
        // Update overview cards
        this.updateOverviewCards(results.eda_results);
        
        // Create visualization grid
        this.createVisualizationGrid(results.plots);
        
        // Update recommendations
        if (results.recommendations) {
            this.displayEDARecommendations(results.recommendations);
        }
    }

    updateOverviewCards(edaResults) {
        const overview = edaResults.dataset_overview;
        const missing = edaResults.missing_values;
        const duplicates = edaResults.duplicates;

        this.app.updateElement('shape-value', `${overview.shape[0]} × ${overview.shape[1]}`);
        this.app.updateElement('missing-value', missing.total_missing);
        this.app.updateElement('duplicates-value', duplicates.duplicate_rows);
        this.app.updateElement('memory-value', `${overview.memory_usage_mb} MB`);
    }

    createVisualizationGrid(plots) {
        const vizGrid = document.getElementById('viz-grid');
        if (!vizGrid) return;

        vizGrid.innerHTML = '';

        const plotCategories = {
            'overview': { title: 'Dataset Overview', icon: 'fas fa-chart-pie' },
            'correlation': { title: 'Correlations', icon: 'fas fa-project-diagram' },
            'distributions': { title: 'Distributions', icon: 'fas fa-chart-area' },
            'missing_values': { title: 'Missing Values', icon: 'fas fa-exclamation-triangle' },
            'categorical': { title: 'Categorical Analysis', icon: 'fas fa-tags' }
        };

        Object.entries(plotCategories).forEach(([category, info]) => {
            if (plots[category]) {
                const vizCard = this.createVisualizationCard(category, info, plots[category]);
                vizGrid.appendChild(vizCard);
            }
        });
    }

    createVisualizationCard(category, info, categoryPlots) {
        const card = document.createElement('div');
        card.className = 'viz-card';
        card.dataset.aos = 'fade-up';

        card.innerHTML = `
            <div class="viz-header">
                <h3 class="viz-title">
                    <i class="${info.icon}"></i>
                    ${info.title}
                </h3>
                <div class="viz-actions">
                    <button class="btn-icon" title="Fullscreen" onclick="analyzer.openFullscreen('${category}')">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button class="btn-icon" title="Download" onclick="analyzer.downloadPlot('${category}')">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
            <div class="viz-content" id="viz-${category}">
                ${this.createVisualizationContent(categoryPlots)}
            </div>
        `;

        return card;
    }

    createVisualizationContent(plots) {
        if (typeof plots === 'string') {
            return `<iframe src="${plots}" width="100%" height="400" frameborder="0"></iframe>`;
        } else if (typeof plots === 'object') {
            const plotEntries = Object.entries(plots);
            if (plotEntries.length === 1) {
                return `<iframe src="${plotEntries[0][1]}" width="100%" height="400" frameborder="0"></iframe>`;
            } else {
                return this.createVisualizationTabs(plots);
            }
        }
        return '<div class="viz-placeholder">Visualization not available</div>';
    }

    // ===== QUICK ANALYSIS METHODS =====
    async analyzeMissingValues() {
        try {
            this.app.showNotification('Analyzing missing values...', 'info');
            
            // Implementation for missing values analysis
            const response = await this.app.apiCall(`/analyze_missing/${this.app.currentSession}`);
            
            if (response.error) {
                throw new Error(response.error);
            }

            this.showQuickAnalysisModal('Missing Values Analysis', response);
            
        } catch (error) {
            console.error('Missing values analysis error:', error);
            this.app.showNotification('Failed to analyze missing values', 'error');
        }
    }

    async analyzeCorrelations() {
        try {
            this.app.showNotification('Analyzing correlations...', 'info');
            
            const response = await this.app.apiCall(`/analyze_correlations/${this.app.currentSession}`);
            
            if (response.error) {
                throw new Error(response.error);
            }

            this.showQuickAnalysisModal('Correlation Analysis', response);
            
        } catch (error) {
            console.error('Correlation analysis error:', error);
            this.app.showNotification('Failed to analyze correlations', 'error');
        }
    }

    async detectOutliers() {
        try {
            this.app.showNotification('Detecting outliers...', 'info');
            
            const response = await this.app.apiCall(`/detect_outliers/${this.app.currentSession}`);
            
            if (response.error) {
                throw new Error(response.error);
            }

            this.showQuickAnalysisModal('Outlier Detection', response);
            
        } catch (error) {
            console.error('Outlier detection error:', error);
            this.app.showNotification('Failed to detect outliers', 'error');
        }
    }

    // ===== UTILITY METHODS =====
    showAnalysisLoading() {
        const resultsContainer = document.getElementById('analysis-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="analysis-loading">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">
                        <h3>Analyzing Data...</h3>
                        <p>This may take a few moments depending on your dataset size.</p>
                    </div>
                </div>
            `;
        }
    }

    showAnalysisError(message) {
        const resultsContainer = document.getElementById('analysis-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <div class="analysis-error">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="error-content">
                        <h3>Analysis Failed</h3>
                        <p>${message}</p>
                        <button class="btn-primary" onclick="location.reload()">
                            <i class="fas fa-refresh"></i> Try Again
                        </button>
                    </div>
                </div>
            `;
        }
    }

    displayCachedResults(analysisId) {
        const cached = this.analysisCache.get(analysisId);
        this.displayAnalysisResults(cached.results);
        this.app.showNotification('Loaded cached results', 'info');
    }

    generateAnalysisId(type, columns) {
        return `${type}_${columns.sort().join('_')}_${Date.now()}`.substring(0, 50);
    }

    addToAnalysisHistory(id, type, columns) {
        this.analysisHistory.unshift({
            id: id,
            type: type,
            columns: columns,
            timestamp: Date.now()
        });

        // Keep only last 10 analyses
        if (this.analysisHistory.length > 10) {
            this.analysisHistory = this.analysisHistory.slice(0, 10);
        }
    }

    getColumnType(dtype) {
        if (!dtype) return 'unknown';
        const dtypeStr = dtype.toLowerCase();
        
        if (dtypeStr.includes('int') || dtypeStr.includes('float')) return 'numeric';
        if (dtypeStr.includes('datetime') || dtypeStr.includes('date')) return 'datetime';
        if (dtypeStr.includes('bool')) return 'boolean';
        return 'categorical';
    }

    getColumnTypeDisplay(dtype) {
        const type = this.getColumnType(dtype);
        const displays = {
            numeric: 'Numeric',
            categorical: 'Categorical',
            datetime: 'DateTime',
            boolean: 'Boolean',
            unknown: 'Unknown'
        };
        return displays[type] || 'Unknown';
    }

    // ===== SETUP METHODS =====
    setupAnalysisControls() {
        // Additional setup for analysis controls
        console.log('Analysis controls setup completed');
    }

    setupQuickAnalysis() {
        // Quick analysis buttons are handled in the main app
        console.log('Quick analysis setup completed');
    }

    setupAdvancedOptions() {
        // Setup for advanced analysis options
        console.log('Advanced options setup completed');
    }

    setupResultsInteractions(results) {
        // Setup interactions for analysis results
        this.setupVisualizationTabs();
        this.setupResultsExport(results);
    }

    setupVisualizationTabs() {
        const vizTabs = document.querySelectorAll('.viz-tab');
        const vizPanels = document.querySelectorAll('.viz-panel');

        vizTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPlot = tab.dataset.plot;
                
                // Update active tab
                vizTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active panel
                vizPanels.forEach(panel => {
                    panel.classList.toggle('active', panel.id === `plot-${targetPlot}`);
                });
            });
        });
    }

    setupResultsExport(results) {
        // Setup export functionality for results
        console.log('Results export setup completed');
    }
}

// Make analyzer globally available
window.analyzer = null;

// Initialize when app is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.analyzer = new DataAnalyzer(window.app);
    }
});

console.log('🔍 DataAnalyzer module loaded successfully!');