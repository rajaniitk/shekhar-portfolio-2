// ===== ADVANCED DATA VISUALIZER MODULE =====
class DataVisualizer {
    constructor(app) {
        this.app = app;
        this.plotlyConfig = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['pan2d', 'select2d', 'lasso2d'],
            toImageButtonOptions: {
                format: 'png',
                filename: 'eda_chart',
                height: 600,
                width: 800,
                scale: 2
            }
        };
        this.colorPalette = {
            primary: ['#64FFDA', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'],
            sequential: ['#0D47A1', '#1565C0', '#1976D2', '#1E88E5', '#2196F3', '#42A5F5', '#64B5F6', '#90CAF9'],
            diverging: ['#B71C1C', '#D32F2F', '#F44336', '#FFCDD2', '#E8F5E8', '#66BB6A', '#4CAF50', '#388E3C']
        };
        this.chartInstances = new Map();
        this.activeVisualization = null;
        this.visualizationHistory = [];
        
        this.init();
    }

    init() {
        try {
            this.setupVisualizationControls();
            this.setupChartInteractions();
            this.setupCustomChartBuilder();
            this.setupExportOptions();
            
            console.log('✅ DataVisualizer initialized successfully');
        } catch (error) {
            console.error('❌ DataVisualizer initialization failed:', error);
        }
    }

    // ===== VISUALIZATION CONTROLS SETUP =====
    setupVisualizationControls() {
        // Setup plot type selectors
        this.setupPlotTypeSelector();
        
        // Setup column selectors for custom charts
        this.setupCustomColumnSelectors();
        
        // Setup visualization settings panel
        this.setupVisualizationSettings();
    }

    setupPlotTypeSelector() {
        const vizSection = document.getElementById('eda-section');
        if (!vizSection) return;

        // Add visualization type selector if not exists
        let vizControls = document.getElementById('viz-controls');
        if (!vizControls) {
            const controlsHTML = `
                <div class="viz-controls" id="viz-controls">
                    <div class="control-group">
                        <label for="plot-type-select">Chart Type:</label>
                        <select id="plot-type-select" class="form-select">
                            <optgroup label="Distribution">
                                <option value="histogram">Histogram</option>
                                <option value="box">Box Plot</option>
                                <option value="violin">Violin Plot</option>
                                <option value="density">Density Plot</option>
                            </optgroup>
                            <optgroup label="Relationship">
                                <option value="scatter">Scatter Plot</option>
                                <option value="line">Line Chart</option>
                                <option value="heatmap">Heatmap</option>
                                <option value="correlation">Correlation Matrix</option>
                            </optgroup>
                            <optgroup label="Categorical">
                                <option value="bar">Bar Chart</option>
                                <option value="pie">Pie Chart</option>
                                <option value="donut">Donut Chart</option>
                                <option value="treemap">Treemap</option>
                            </optgroup>
                            <optgroup label="Advanced">
                                <option value="parallel">Parallel Coordinates</option>
                                <option value="radar">Radar Chart</option>
                                <option value="sunburst">Sunburst</option>
                                <option value="sankey">Sankey Diagram</option>
                            </optgroup>
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <label for="viz-columns">Columns:</label>
                        <select id="viz-columns" class="form-select" multiple>
                            <!-- Populated dynamically -->
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <button id="create-chart-btn" class="btn-primary">
                            <i class="fas fa-chart-bar"></i> Create Chart
                        </button>
                        <button id="chart-settings-btn" class="btn-secondary">
                            <i class="fas fa-cogs"></i> Settings
                        </button>
                    </div>
                </div>
            `;

            const sectionHeader = vizSection.querySelector('.section-header');
            if (sectionHeader) {
                sectionHeader.insertAdjacentHTML('afterend', controlsHTML);
            }

            // Setup event listeners
            this.setupControlsEventListeners();
        }
    }

    setupControlsEventListeners() {
        const plotSelect = document.getElementById('plot-type-select');
        const createBtn = document.getElementById('create-chart-btn');
        const settingsBtn = document.getElementById('chart-settings-btn');
        
        if (plotSelect) {
            plotSelect.addEventListener('change', () => {
                this.updateColumnSelector();
                this.showPlotPreview();
            });
        }
        
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.createCustomChart();
            });
        }
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.openVisualizationSettings();
            });
        }
    }

    // ===== CHART CREATION METHODS =====
    async createCustomChart() {
        const plotType = document.getElementById('plot-type-select')?.value;
        const selectedColumns = this.getSelectedVisualizationColumns();
        
        if (!plotType || selectedColumns.length === 0) {
            this.app.showNotification('Please select chart type and columns', 'warning');
            return;
        }

        try {
            this.app.showNotification('Creating visualization...', 'info');
            
            const chartData = await this.generateChartData(plotType, selectedColumns);
            const chartConfig = this.createChartConfig(plotType, chartData);
            
            await this.renderChart(chartConfig, 'custom-chart-container');
            
            this.addToVisualizationHistory(plotType, selectedColumns, chartConfig);
            this.app.showNotification('Chart created successfully!', 'success');
            
        } catch (error) {
            console.error('Chart creation error:', error);
            this.app.showNotification('Failed to create chart', 'error');
        }
    }

    async generateChartData(plotType, columns) {
        // Request chart data from backend
        const response = await this.app.apiCall(`/generate_chart/${this.app.currentSession}`, {
            method: 'POST',
            body: JSON.stringify({
                chart_type: plotType,
                columns: columns,
                settings: this.getChartSettings()
            })
        });

        if (response.error) {
            throw new Error(response.error);
        }

        return response.chart_data;
    }

    createChartConfig(plotType, data) {
        const baseConfig = {
            data: data,
            layout: this.getBaseLayout(plotType),
            config: this.plotlyConfig
        };

        // Apply plot-specific configurations
        switch (plotType) {
            case 'histogram':
                return this.createHistogramConfig(baseConfig);
            case 'box':
                return this.createBoxPlotConfig(baseConfig);
            case 'violin':
                return this.createViolinPlotConfig(baseConfig);
            case 'scatter':
                return this.createScatterPlotConfig(baseConfig);
            case 'line':
                return this.createLineChartConfig(baseConfig);
            case 'bar':
                return this.createBarChartConfig(baseConfig);
            case 'pie':
                return this.createPieChartConfig(baseConfig);
            case 'heatmap':
                return this.createHeatmapConfig(baseConfig);
            case 'correlation':
                return this.createCorrelationMatrixConfig(baseConfig);
            case 'parallel':
                return this.createParallelCoordinatesConfig(baseConfig);
            case 'radar':
                return this.createRadarChartConfig(baseConfig);
            case 'treemap':
                return this.createTreemapConfig(baseConfig);
            case 'sunburst':
                return this.createSunburstConfig(baseConfig);
            case 'sankey':
                return this.createSankeyConfig(baseConfig);
            default:
                return baseConfig;
        }
    }

    // ===== SPECIFIC CHART CONFIGURATIONS =====
    createHistogramConfig(baseConfig) {
        return {
            ...baseConfig,
            data: baseConfig.data.map(trace => ({
                ...trace,
                type: 'histogram',
                nbinsx: 30,
                marker: {
                    color: this.colorPalette.primary[0],
                    opacity: 0.7,
                    line: {
                        color: this.colorPalette.primary[0],
                        width: 1
                    }
                }
            })),
            layout: {
                ...baseConfig.layout,
                title: 'Distribution Histogram',
                xaxis: { title: 'Values' },
                yaxis: { title: 'Frequency' },
                bargap: 0.1
            }
        };
    }

    createBoxPlotConfig(baseConfig) {
        return {
            ...baseConfig,
            data: baseConfig.data.map((trace, index) => ({
                ...trace,
                type: 'box',
                boxmean: 'sd',
                marker: {
                    color: this.colorPalette.primary[index % this.colorPalette.primary.length]
                },
                line: {
                    color: this.colorPalette.primary[index % this.colorPalette.primary.length]
                }
            })),
            layout: {
                ...baseConfig.layout,
                title: 'Box Plot Analysis',
                yaxis: { title: 'Values' }
            }
        };
    }

    createViolinPlotConfig(baseConfig) {
        return {
            ...baseConfig,
            data: baseConfig.data.map((trace, index) => ({
                ...trace,
                type: 'violin',
                box: { visible: true },
                meanline: { visible: true },
                fillcolor: this.colorPalette.primary[index % this.colorPalette.primary.length],
                opacity: 0.6,
                line: {
                    color: this.colorPalette.primary[index % this.colorPalette.primary.length]
                }
            })),
            layout: {
                ...baseConfig.layout,
                title: 'Violin Plot Distribution',
                yaxis: { title: 'Values' }
            }
        };
    }

    createScatterPlotConfig(baseConfig) {
        return {
            ...baseConfig,
            data: baseConfig.data.map((trace, index) => ({
                ...trace,
                type: 'scatter',
                mode: 'markers',
                marker: {
                    size: 8,
                    color: this.colorPalette.primary[index % this.colorPalette.primary.length],
                    opacity: 0.7,
                    line: {
                        width: 1,
                        color: 'white'
                    }
                }
            })),
            layout: {
                ...baseConfig.layout,
                title: 'Scatter Plot Analysis',
                xaxis: { title: 'X Values' },
                yaxis: { title: 'Y Values' }
            }
        };
    }

    createLineChartConfig(baseConfig) {
        return {
            ...baseConfig,
            data: baseConfig.data.map((trace, index) => ({
                ...trace,
                type: 'scatter',
                mode: 'lines+markers',
                line: {
                    color: this.colorPalette.primary[index % this.colorPalette.primary.length],
                    width: 3
                },
                marker: {
                    size: 6,
                    color: this.colorPalette.primary[index % this.colorPalette.primary.length]
                }
            })),
            layout: {
                ...baseConfig.layout,
                title: 'Line Chart Trend',
                xaxis: { title: 'X Values' },
                yaxis: { title: 'Y Values' }
            }
        };
    }

    createBarChartConfig(baseConfig) {
        return {
            ...baseConfig,
            data: baseConfig.data.map((trace, index) => ({
                ...trace,
                type: 'bar',
                marker: {
                    color: this.colorPalette.primary,
                    opacity: 0.8,
                    line: {
                        color: 'white',
                        width: 1
                    }
                }
            })),
            layout: {
                ...baseConfig.layout,
                title: 'Bar Chart Analysis',
                xaxis: { title: 'Categories' },
                yaxis: { title: 'Values' }
            }
        };
    }

    createPieChartConfig(baseConfig) {
        return {
            ...baseConfig,
            data: baseConfig.data.map(trace => ({
                ...trace,
                type: 'pie',
                hole: 0.3,
                textinfo: 'label+percent',
                textposition: 'outside',
                marker: {
                    colors: this.colorPalette.primary,
                    line: {
                        color: 'white',
                        width: 2
                    }
                }
            })),
            layout: {
                ...baseConfig.layout,
                title: 'Distribution Pie Chart'
            }
        };
    }

    createHeatmapConfig(baseConfig) {
        return {
            ...baseConfig,
            data: baseConfig.data.map(trace => ({
                ...trace,
                type: 'heatmap',
                colorscale: 'Viridis',
                showscale: true,
                hoverongaps: false
            })),
            layout: {
                ...baseConfig.layout,
                title: 'Heatmap Visualization',
                xaxis: { title: 'X Axis' },
                yaxis: { title: 'Y Axis' }
            }
        };
    }

    createCorrelationMatrixConfig(baseConfig) {
        return {
            ...baseConfig,
            data: baseConfig.data.map(trace => ({
                ...trace,
                type: 'heatmap',
                colorscale: 'RdBu',
                zmid: 0,
                zmin: -1,
                zmax: 1,
                showscale: true,
                colorbar: {
                    title: 'Correlation',
                    titleside: 'right'
                }
            })),
            layout: {
                ...baseConfig.layout,
                title: 'Correlation Matrix',
                xaxis: { 
                    title: 'Features',
                    side: 'bottom'
                },
                yaxis: { 
                    title: 'Features',
                    autorange: 'reversed'
                }
            }
        };
    }

    createParallelCoordinatesConfig(baseConfig) {
        return {
            ...baseConfig,
            data: baseConfig.data.map(trace => ({
                ...trace,
                type: 'parcoords',
                line: {
                    color: trace.line?.color || this.colorPalette.primary[0],
                    colorscale: 'Viridis'
                }
            })),
            layout: {
                ...baseConfig.layout,
                title: 'Parallel Coordinates Plot'
            }
        };
    }

    createRadarChartConfig(baseConfig) {
        return {
            ...baseConfig,
            data: baseConfig.data.map((trace, index) => ({
                ...trace,
                type: 'scatterpolar',
                fill: 'toself',
                fillcolor: this.colorPalette.primary[index % this.colorPalette.primary.length],
                opacity: 0.6,
                line: {
                    color: this.colorPalette.primary[index % this.colorPalette.primary.length]
                }
            })),
            layout: {
                ...baseConfig.layout,
                title: 'Radar Chart',
                polar: {
                    radialaxis: {
                        visible: true,
                        range: [0, 1]
                    }
                }
            }
        };
    }

    createTreemapConfig(baseConfig) {
        return {
            ...baseConfig,
            data: baseConfig.data.map(trace => ({
                ...trace,
                type: 'treemap',
                textinfo: 'label+value+percent parent',
                marker: {
                    colors: this.colorPalette.primary,
                    line: {
                        width: 2,
                        color: 'white'
                    }
                }
            })),
            layout: {
                ...baseConfig.layout,
                title: 'Treemap Visualization'
            }
        };
    }

    createSunburstConfig(baseConfig) {
        return {
            ...baseConfig,
            data: baseConfig.data.map(trace => ({
                ...trace,
                type: 'sunburst',
                textinfo: 'label+percent parent',
                marker: {
                    colors: this.colorPalette.primary,
                    line: {
                        width: 2,
                        color: 'white'
                    }
                }
            })),
            layout: {
                ...baseConfig.layout,
                title: 'Sunburst Chart'
            }
        };
    }

    createSankeyConfig(baseConfig) {
        return {
            ...baseConfig,
            data: baseConfig.data.map(trace => ({
                ...trace,
                type: 'sankey',
                node: {
                    pad: 15,
                    thickness: 20,
                    line: {
                        color: 'black',
                        width: 0.5
                    },
                    color: this.colorPalette.primary
                },
                link: {
                    line: {
                        color: 'black',
                        width: 0.5
                    }
                }
            })),
            layout: {
                ...baseConfig.layout,
                title: 'Sankey Diagram',
                font: { size: 10 }
            }
        };
    }

    // ===== CHART RENDERING =====
    async renderChart(chartConfig, containerId) {
        const container = document.getElementById(containerId) || this.createChartContainer(containerId);
        
        try {
            // Clear existing chart
            if (this.chartInstances.has(containerId)) {
                Plotly.purge(container);
            }
            
            // Create new chart
            await Plotly.newPlot(container, chartConfig.data, chartConfig.layout, chartConfig.config);
            
            // Store chart instance
            this.chartInstances.set(containerId, {
                config: chartConfig,
                container: container
            });
            
            // Setup chart interactions
            this.setupChartEventListeners(container);
            
        } catch (error) {
            console.error('Chart rendering error:', error);
            throw error;
        }
    }

    createChartContainer(containerId) {
        const container = document.createElement('div');
        container.id = containerId;
        container.className = 'chart-container';
        container.style.cssText = `
            width: 100%;
            height: 500px;
            margin: 1rem 0;
            background: var(--secondary-bg);
            border-radius: var(--border-radius-md);
            border: 1px solid rgba(100, 255, 218, 0.1);
        `;
        
        // Add to visualization area
        const vizGrid = document.getElementById('viz-grid') || document.querySelector('.eda-dashboard');
        if (vizGrid) {
            const chartCard = document.createElement('div');
            chartCard.className = 'viz-card';
            chartCard.innerHTML = `
                <div class="viz-header">
                    <h3 class="viz-title">
                        <i class="fas fa-chart-area"></i>
                        Custom Visualization
                    </h3>
                    <div class="viz-actions">
                        <button class="btn-icon" title="Fullscreen" onclick="visualizer.openFullscreen('${containerId}')">
                            <i class="fas fa-expand"></i>
                        </button>
                        <button class="btn-icon" title="Download" onclick="visualizer.downloadChart('${containerId}')">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn-icon" title="Settings" onclick="visualizer.editChart('${containerId}')">
                            <i class="fas fa-cogs"></i>
                        </button>
                    </div>
                </div>
                <div class="viz-content"></div>
            `;
            
            chartCard.querySelector('.viz-content').appendChild(container);
            vizGrid.appendChild(chartCard);
        }
        
        return container;
    }

    // ===== CHART INTERACTIONS =====
    setupChartInteractions() {
        // Global chart interaction methods
        window.visualizer = this;
    }

    setupChartEventListeners(container) {
        // Hover events
        container.on('plotly_hover', (data) => {
            this.handleChartHover(data);
        });
        
        // Click events
        container.on('plotly_click', (data) => {
            this.handleChartClick(data);
        });
        
        // Selection events
        container.on('plotly_selecting', (data) => {
            this.handleChartSelection(data);
        });
        
        // Zoom events
        container.on('plotly_relayout', (data) => {
            this.handleChartRelayout(data);
        });
    }

    handleChartHover(data) {
        // Custom hover behavior
        if (data.points && data.points.length > 0) {
            const point = data.points[0];
            console.log('Chart hover:', point);
        }
    }

    handleChartClick(data) {
        // Custom click behavior
        if (data.points && data.points.length > 0) {
            const point = data.points[0];
            this.showDataPointDetails(point);
        }
    }

    handleChartSelection(data) {
        // Custom selection behavior
        console.log('Chart selection:', data);
    }

    handleChartRelayout(data) {
        // Custom relayout behavior
        console.log('Chart relayout:', data);
    }

    // ===== ADVANCED FEATURES =====
    openFullscreen(containerId) {
        const chartInstance = this.chartInstances.get(containerId);
        if (!chartInstance) return;
        
        const modal = this.createFullscreenModal(chartInstance);
        document.body.appendChild(modal);
        
        // Clone chart to fullscreen
        const fullscreenContainer = modal.querySelector('.fullscreen-chart');
        Plotly.newPlot(fullscreenContainer, 
            chartInstance.config.data, 
            {
                ...chartInstance.config.layout,
                autosize: true
            }, 
            chartInstance.config.config
        );
        
        this.app.openModal('chart-fullscreen-modal');
    }

    createFullscreenModal(chartInstance) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'chart-fullscreen-modal';
        
        modal.innerHTML = `
            <div class="modal-content fullscreen-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-chart-area"></i> Fullscreen Visualization</h3>
                    <button class="modal-close" onclick="app.closeModal('chart-fullscreen-modal'); this.parentElement.parentElement.parentElement.remove()">
                        &times;
                    </button>
                </div>
                <div class="modal-body fullscreen-body">
                    <div class="fullscreen-chart" style="width: 100%; height: 70vh;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="app.closeModal('chart-fullscreen-modal'); this.parentElement.parentElement.parentElement.remove()">
                        Close
                    </button>
                    <button class="btn-primary" onclick="visualizer.downloadCurrentChart()">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
        `;
        
        return modal;
    }

    async downloadChart(containerId) {
        const chartInstance = this.chartInstances.get(containerId);
        if (!chartInstance) {
            this.app.showNotification('Chart not found', 'error');
            return;
        }
        
        try {
            const imageData = await Plotly.toImage(chartInstance.container, {
                format: 'png',
                width: 1200,
                height: 800,
                scale: 2
            });
            
            const link = document.createElement('a');
            link.download = `chart_${Date.now()}.png`;
            link.href = imageData;
            link.click();
            
            this.app.showNotification('Chart downloaded successfully', 'success');
            
        } catch (error) {
            console.error('Download error:', error);
            this.app.showNotification('Failed to download chart', 'error');
        }
    }

    editChart(containerId) {
        const chartInstance = this.chartInstances.get(containerId);
        if (!chartInstance) return;
        
        this.openChartEditor(chartInstance, containerId);
    }

    openChartEditor(chartInstance, containerId) {
        const editorModal = this.createChartEditorModal(chartInstance, containerId);
        document.body.appendChild(editorModal);
        
        this.setupChartEditor(chartInstance, containerId);
        this.app.openModal('chart-editor-modal');
    }

    createChartEditorModal(chartInstance, containerId) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'chart-editor-modal';
        
        modal.innerHTML = `
            <div class="modal-content editor-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Chart Editor</h3>
                    <button class="modal-close" onclick="app.closeModal('chart-editor-modal'); this.parentElement.parentElement.parentElement.remove()">
                        &times;
                    </button>
                </div>
                <div class="modal-body editor-body">
                    <div class="editor-tabs">
                        <button class="editor-tab active" data-tab="style">Style</button>
                        <button class="editor-tab" data-tab="data">Data</button>
                        <button class="editor-tab" data-tab="layout">Layout</button>
                    </div>
                    <div class="editor-content">
                        <div class="editor-panel active" id="style-panel">
                            ${this.createStyleEditor()}
                        </div>
                        <div class="editor-panel" id="data-panel">
                            ${this.createDataEditor()}
                        </div>
                        <div class="editor-panel" id="layout-panel">
                            ${this.createLayoutEditor()}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="app.closeModal('chart-editor-modal'); this.parentElement.parentElement.parentElement.remove()">
                        Cancel
                    </button>
                    <button class="btn-primary" onclick="visualizer.applyChartEdits('${containerId}')">
                        Apply Changes
                    </button>
                </div>
            </div>
        `;
        
        return modal;
    }

    createStyleEditor() {
        return `
            <div class="editor-section">
                <h4>Colors</h4>
                <div class="color-picker-group">
                    <label>Primary Color:</label>
                    <input type="color" id="primary-color" value="#64FFDA">
                </div>
                <div class="color-picker-group">
                    <label>Secondary Color:</label>
                    <input type="color" id="secondary-color" value="#FF6B6B">
                </div>
            </div>
            
            <div class="editor-section">
                <h4>Typography</h4>
                <div class="input-group">
                    <label>Title Size:</label>
                    <input type="range" id="title-size" min="12" max="24" value="16">
                    <span id="title-size-value">16px</span>
                </div>
                <div class="input-group">
                    <label>Font Family:</label>
                    <select id="font-family">
                        <option value="Arial">Arial</option>
                        <option value="Inter">Inter</option>
                        <option value="Roboto">Roboto</option>
                    </select>
                </div>
            </div>
            
            <div class="editor-section">
                <h4>Appearance</h4>
                <div class="checkbox-group">
                    <label>
                        <input type="checkbox" id="show-grid" checked>
                        Show Grid
                    </label>
                </div>
                <div class="checkbox-group">
                    <label>
                        <input type="checkbox" id="show-legend" checked>
                        Show Legend
                    </label>
                </div>
            </div>
        `;
    }

    createDataEditor() {
        return `
            <div class="editor-section">
                <h4>Data Filtering</h4>
                <div class="input-group">
                    <label>Filter Column:</label>
                    <select id="filter-column">
                        <option value="">Select column...</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Filter Value:</label>
                    <input type="text" id="filter-value" placeholder="Enter filter value">
                </div>
            </div>
            
            <div class="editor-section">
                <h4>Aggregation</h4>
                <div class="input-group">
                    <label>Group By:</label>
                    <select id="group-by-column">
                        <option value="">No grouping</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>Aggregation Function:</label>
                    <select id="agg-function">
                        <option value="mean">Mean</option>
                        <option value="sum">Sum</option>
                        <option value="count">Count</option>
                        <option value="median">Median</option>
                    </select>
                </div>
            </div>
        `;
    }

    createLayoutEditor() {
        return `
            <div class="editor-section">
                <h4>Title & Labels</h4>
                <div class="input-group">
                    <label>Chart Title:</label>
                    <input type="text" id="chart-title" placeholder="Enter chart title">
                </div>
                <div class="input-group">
                    <label>X-Axis Label:</label>
                    <input type="text" id="x-axis-label" placeholder="X-axis label">
                </div>
                <div class="input-group">
                    <label>Y-Axis Label:</label>
                    <input type="text" id="y-axis-label" placeholder="Y-axis label">
                </div>
            </div>
            
            <div class="editor-section">
                <h4>Dimensions</h4>
                <div class="input-group">
                    <label>Width:</label>
                    <input type="number" id="chart-width" value="800" min="300" max="1500">
                    <span>px</span>
                </div>
                <div class="input-group">
                    <label>Height:</label>
                    <input type="number" id="chart-height" value="500" min="300" max="1000">
                    <span>px</span>
                </div>
            </div>
            
            <div class="editor-section">
                <h4>Margins</h4>
                <div class="margin-controls">
                    <div class="input-group">
                        <label>Top:</label>
                        <input type="number" id="margin-top" value="60" min="0" max="200">
                    </div>
                    <div class="input-group">
                        <label>Bottom:</label>
                        <input type="number" id="margin-bottom" value="60" min="0" max="200">
                    </div>
                    <div class="input-group">
                        <label>Left:</label>
                        <input type="number" id="margin-left" value="80" min="0" max="200">
                    </div>
                    <div class="input-group">
                        <label>Right:</label>
                        <input type="number" id="margin-right" value="80" min="0" max="200">
                    </div>
                </div>
            </div>
        `;
    }

    // ===== UTILITY METHODS =====
    getBaseLayout(plotType) {
        return {
            autosize: true,
            margin: { l: 80, r: 80, t: 80, b: 80 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: {
                family: 'Inter, Arial, sans-serif',
                size: 12,
                color: '#ffffff' // Assuming dark theme
            },
            showlegend: true,
            legend: {
                orientation: 'v',
                x: 1,
                y: 1
            }
        };
    }

    getChartSettings() {
        return {
            responsive: true,
            theme: this.app.settings.theme || 'dark',
            colorPalette: this.colorPalette.primary
        };
    }

    getSelectedVisualizationColumns() {
        const columnSelect = document.getElementById('viz-columns');
        if (!columnSelect) return [];
        
        return Array.from(columnSelect.selectedOptions).map(option => option.value);
    }

    updateColumnSelector() {
        const plotType = document.getElementById('plot-type-select')?.value;
        const columnSelect = document.getElementById('viz-columns');
        
        if (!plotType || !columnSelect || !this.app.currentData?.columns) return;
        
        // Clear existing options
        columnSelect.innerHTML = '';
        
        // Add columns based on plot type requirements
        const requiredTypes = this.getRequiredColumnTypes(plotType);
        
        this.app.currentData.columns.forEach(column => {
            const dtype = this.app.currentData.dtypes?.[column];
            const columnType = this.getColumnType(dtype);
            
            if (requiredTypes.length === 0 || requiredTypes.includes(columnType)) {
                const option = document.createElement('option');
                option.value = column;
                option.textContent = `${column} (${columnType})`;
                columnSelect.appendChild(option);
            }
        });
    }

    getRequiredColumnTypes(plotType) {
        const typeRequirements = {
            histogram: ['numeric'],
            box: ['numeric'],
            violin: ['numeric'],
            scatter: ['numeric'],
            line: ['numeric'],
            bar: ['categorical', 'numeric'],
            pie: ['categorical'],
            heatmap: ['numeric'],
            correlation: ['numeric'],
            parallel: ['numeric'],
            radar: ['numeric'],
            treemap: ['categorical', 'numeric'],
            sunburst: ['categorical'],
            sankey: ['categorical']
        };
        
        return typeRequirements[plotType] || [];
    }

    getColumnType(dtype) {
        if (!dtype) return 'unknown';
        const dtypeStr = dtype.toLowerCase();
        
        if (dtypeStr.includes('int') || dtypeStr.includes('float')) return 'numeric';
        if (dtypeStr.includes('datetime') || dtypeStr.includes('date')) return 'datetime';
        if (dtypeStr.includes('bool')) return 'boolean';
        return 'categorical';
    }

    showPlotPreview() {
        const plotType = document.getElementById('plot-type-select')?.value;
        if (!plotType) return;
        
        // Show preview description
        this.app.showNotification(`Selected: ${plotType.replace('_', ' ')} chart`, 'info');
    }

    // ===== VISUALIZATION HISTORY =====
    addToVisualizationHistory(plotType, columns, chartConfig) {
        this.visualizationHistory.unshift({
            id: `viz_${Date.now()}`,
            type: plotType,
            columns: columns,
            config: chartConfig,
            timestamp: Date.now()
        });
        
        // Keep only last 20 visualizations
        if (this.visualizationHistory.length > 20) {
            this.visualizationHistory = this.visualizationHistory.slice(0, 20);
        }
    }

    // ===== SETUP METHODS =====
    setupCustomColumnSelectors() {
        // Implementation for custom column selectors
        if (this.app.currentData?.columns) {
            this.updateColumnSelector();
        }
    }

    setupVisualizationSettings() {
        // Implementation for visualization settings panel
        console.log('Visualization settings setup completed');
    }

    setupExportOptions() {
        // Implementation for export options
        console.log('Export options setup completed');
    }
}

// Make visualizer globally available
window.visualizer = null;

// Initialize when app is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.visualizer = new DataVisualizer(window.app);
    }
});

console.log('📊 DataVisualizer module loaded successfully!');