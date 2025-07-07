// ===== ADVANCED FILE UPLOADER MODULE =====
class FileUploader {
    constructor(app) {
        this.app = app;
        this.maxFileSize = 100 * 1024 * 1024; // 100MB
        this.supportedFormats = {
            'csv': ['text/csv', 'application/csv'],
            'json': ['application/json', 'text/json'],
            'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            'xls': ['application/vnd.ms-excel'],
            'parquet': ['application/octet-stream']
        };
        this.uploadQueue = [];
        this.currentUpload = null;
        this.previewSettings = {
            maxPreviewRows: 100,
            maxColumnsDisplay: 10,
            maxCellLength: 50
        };
        
        // Initialize uploader
        this.init();
    }

    init() {
        try {
            this.setupUploadZone();
            this.setupFileInput();
            this.setupDataPreviewHandlers();
            // this.setupValidation(); // <-- Removed, not defined
            // Prevent default form submission if a form is present
            const uploadForm = document.getElementById('upload-form');
            if (uploadForm) {
                uploadForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                });
            }
            console.log('✅ FileUploader initialized successfully');
        } catch (error) {
            console.error('❌ FileUploader initialization failed:', error);
            this.app.showNotification('File uploader initialization failed', 'error');
        }
    }

    // ===== UPLOAD ZONE SETUP =====
    setupUploadZone() {
        const uploadZone = document.getElementById('upload-zone');
        const fileInput = document.getElementById('file-input');
        const browseBtn = document.querySelector('.browse-btn');

        if (!uploadZone) {
            throw new Error('Upload zone element not found');
        }

        // Drag and drop events
        uploadZone.addEventListener('dragenter', (e) => this.handleDragEnter(e));
        uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Click to browse
        uploadZone.addEventListener('click', (e) => {
            if (!e.target.closest('.browse-btn')) {
                fileInput?.click();
            }
        });

        // Browse button
        if (browseBtn) {
            browseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                fileInput?.click();
            });
        }

        // Paste functionality
        document.addEventListener('paste', (e) => this.handlePaste(e));
    }

    setupFileInput() {
        const fileInput = document.getElementById('file-input');
        if (!fileInput) return;

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                this.handleFileSelection(files);
            }
        });
    }

    // ===== DRAG AND DROP HANDLERS =====
    handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const uploadZone = document.getElementById('upload-zone');
        uploadZone.classList.add('drag-enter');
        
        // Add visual feedback
        this.updateUploadZoneContent('drop-ready');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const uploadZone = document.getElementById('upload-zone');
        uploadZone.classList.add('dragover');
        
        // Set the appropriate drop effect
        e.dataTransfer.dropEffect = 'copy';
        
        // Enhanced visual feedback
        this.addDropEffects(e);
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const uploadZone = document.getElementById('upload-zone');
        
        // Only remove classes if actually leaving the drop zone
        if (!uploadZone.contains(e.relatedTarget)) {
            uploadZone.classList.remove('dragover', 'drag-enter');
            this.updateUploadZoneContent('default');
            this.removeDropEffects();
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const uploadZone = document.getElementById('upload-zone');
        uploadZone.classList.remove('dragover', 'drag-enter');
        
        this.removeDropEffects();
        this.updateUploadZoneContent('default');
        
        // Get dropped files
        const files = Array.from(e.dataTransfer.files);
        
        if (files.length > 0) {
            this.handleFileSelection(files);
        } else {
            // Check for text data
            const textData = e.dataTransfer.getData('text/plain');
            if (textData) {
                this.handleTextData(textData);
            }
        }
    }

    handlePaste(e) {
        // Only handle paste when in upload section
        if (this.app.activeSection !== 'upload') return;
        
        const clipboardData = e.clipboardData || window.clipboardData;
        
        // Check for files
        if (clipboardData.files.length > 0) {
            e.preventDefault();
            const files = Array.from(clipboardData.files);
            this.handleFileSelection(files);
            return;
        }
        
        // Check for text data
        const textData = clipboardData.getData('text/plain');
        if (textData && textData.length > 100) { // Minimum length for data
            e.preventDefault();
            this.handleTextData(textData);
        }
    }

    // ===== VISUAL FEEDBACK METHODS =====
    updateUploadZoneContent(state) {
        const uploadZone = document.getElementById('upload-zone');
        if (!uploadZone) return;
        const uploadContent = uploadZone.querySelector('.upload-content');
        if (!uploadContent) return;

        const states = {
            'default': {
                icon: 'fas fa-cloud-upload-alt',
                title: 'Drag & Drop Your Dataset',
                subtitle: 'or click to browse files',
                class: ''
            },
            'drop-ready': {
                icon: 'fas fa-download',
                title: 'Drop Your File Here',
                subtitle: 'Release to upload',
                class: 'drop-ready'
            },
            'uploading': {
                icon: 'fas fa-spinner fa-spin',
                title: 'Uploading...',
                subtitle: 'Please wait',
                class: 'uploading'
            },
            'processing': {
                icon: 'fas fa-cogs fa-spin',
                title: 'Processing Data...',
                subtitle: 'Analyzing your dataset',
                class: 'processing'
            },
            'success': {
                icon: 'fas fa-check-circle',
                title: 'Upload Successful!',
                subtitle: 'Your data is ready for analysis',
                class: 'success'
            },
            'error': {
                icon: 'fas fa-exclamation-triangle',
                title: 'Upload Failed',
                subtitle: 'Please try again',
                class: 'error'
            }
        };

        const currentState = states[state] || states.default;
        
        // Defensive: check for all required children before updating
        const iconElem = uploadContent.querySelector('.upload-icon i');
        const h3Elem = uploadContent.querySelector('h3');
        const pElem = uploadContent.querySelector('p');
        if (!iconElem || !h3Elem || !pElem) return;

        uploadContent.className = `upload-content ${currentState.class}`;
        iconElem.className = currentState.icon;
        h3Elem.textContent = currentState.title;
        pElem.textContent = currentState.subtitle;
    }

    addDropEffects(e) {
        const uploadZone = document.getElementById('upload-zone');
        
        // Add dynamic background effect
        uploadZone.style.background = `
            radial-gradient(circle at ${e.clientX - uploadZone.offsetLeft}px ${e.clientY - uploadZone.offsetTop}px, 
            rgba(100, 255, 218, 0.2) 0%, 
            rgba(100, 255, 218, 0.05) 50%, 
            transparent 70%)
        `;
    }

    removeDropEffects() {
        const uploadZone = document.getElementById('upload-zone');
        uploadZone.style.background = '';
    }

    // ===== FILE HANDLING =====
    async handleFileSelection(files) {
        try {
            // Filter and validate files
            const validFiles = [];
            const errors = [];

            for (const file of files) {
                const validation = await this.validateFile(file);
                if (validation.valid) {
                    validFiles.push(file);
                } else {
                    errors.push(`${file.name}: ${validation.error || 'Unknown validation error'}`);
                }
            }

            // Show validation errors
            if (errors.length > 0) {
                this.showValidationErrors(errors);
            }

            // Process valid files
            if (validFiles.length > 0) {
                if (validFiles.length === 1) {
                    await this.processFile(validFiles[0]);
                } else {
                    await this.handleMultipleFiles(validFiles);
                }
            }

        } catch (error) {
            console.error('File selection error:', error);
            this.app.showNotification('Failed to process selected files', 'error');
            this.updateUploadZoneContent('error');
        }
    }

    async handleTextData(textData) {
        try {
            // Try to parse as CSV
            if (this.looksLikeCSV(textData)) {
                const blob = new Blob([textData], { type: 'text/csv' });
                const file = new File([blob], 'pasted_data.csv', { type: 'text/csv' });
                await this.processFile(file);
            } else {
                this.app.showNotification('Pasted text doesn\'t appear to be valid data', 'warning');
            }
        } catch (error) {
            console.error('Text data processing error:', error);
            this.app.showNotification('Failed to process pasted data', 'error');
        }
    }

    async handleMultipleFiles(files) {
        // Show file selection dialog for multiple files
        const selectedFile = await this.showFileSelectionDialog(files);
        if (selectedFile) {
            await this.processFile(selectedFile);
        }
    }

    // ===== FILE VALIDATION =====
    async validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            return {
                valid: false,
                error: `File too large. Maximum size is ${this.formatFileSize(this.maxFileSize)}`
            };
        }

        // Check file type
        const extension = this.getFileExtension(file.name);
        const mimeType = file.type;

        if (!this.isValidFormat(extension, mimeType)) {
            return {
                valid: false,
                error: `Unsupported file format. Supported formats: ${Object.keys(this.supportedFormats).join(', ')}`
            };
        }

        // Check if file is empty
        if (file.size === 0) {
            return {
                valid: false,
                error: 'File is empty'
            };
        }

        // Additional validation based on file type
        return await this.validateFileContent(file);
    }

    async validateFileContent(file) {
        const extension = this.getFileExtension(file.name);

        // For now, basic validation - could be enhanced to read file headers
        switch (extension) {
            case 'csv':
                return await this.validateCSVHeader(file);
            case 'json':
                return await this.validateJSONStructure(file);
            case 'xlsx':
            case 'xls':
                return { valid: true }; // Excel files need special handling
            case 'parquet':
                return { valid: true }; // Parquet files are binary
            default:
                return { valid: true };
        }
    }

    async validateCSVHeader(file) {
        try {
            // Read first few bytes to check for CSV structure
            const firstChunk = await this.readFileChunk(file, 0, 1024);
            const lines = firstChunk.split('\n').slice(0, 3);
            
            if (lines.length < 2) {
                return {
                    valid: false,
                    error: 'CSV file must have at least a header and one data row'
                };
            }

            // Check if first line looks like a header
            const header = lines[0];
            const secondLine = lines[1];
            
            if (!header || !secondLine) {
                return {
                    valid: false,
                    error: 'Invalid CSV structure'
                };
            }

            return { valid: true };
        } catch (error) {
            return {
                valid: false,
                error: 'Could not validate CSV file'
            };
        }
    }

    async validateJSONStructure(file) {
        try {
            // Read first chunk to validate JSON
            const chunk = await this.readFileChunk(file, 0, 2048);
            JSON.parse(chunk);
            return { valid: true };
        } catch (error) {
            return {
                valid: false,
                error: 'Invalid JSON structure'
            };
        }
    }

    // ===== FILE PROCESSING =====
    async processFile(file) {
        try {
            this.currentUpload = {
                file: file,
                startTime: Date.now(),
                progress: 0
            };

            // Update UI to show uploading state
            this.updateUploadZoneContent('uploading');
            this.showUploadProgress();
            
            // Show file info
            this.showFileInfo(file);
            
            // Create FormData for upload
            const formData = new FormData();
            formData.append('file', file);
            
            // Add upload metadata
            formData.append('upload_metadata', JSON.stringify({
                original_name: file.name,
                size: file.size,
                type: file.type,
                last_modified: file.lastModified
            }));

            // Perform upload with progress tracking
            const result = await this.uploadWithProgress(formData);
            
            if (result.error) {
                throw new Error(result.error);
            }

            // Update UI to show processing
            this.updateUploadZoneContent('processing');
            
            // Store session and data
            this.app.setCurrentSession(result.session_id);
            this.app.setCurrentData(result);
            
            // Show data preview
            await this.showAdvancedDataPreview(result);
            
            // Update UI to show success
            this.updateUploadZoneContent('success');
            
            this.app.showNotification(
                `File "${file.name}" uploaded successfully!`, 
                'success',
                'Upload Complete'
            );
            
            // Auto-navigate after success
            setTimeout(() => {
                const proceedBtn = document.getElementById('proceed-btn');
                if (proceedBtn) {
                    proceedBtn.style.animation = 'pulse 1s infinite';
                }
            }, 2000);

        } catch (error) {
            console.error('File processing error:', error);
            
            this.updateUploadZoneContent('error');
            this.hideUploadProgress();
            
            this.app.showNotification(
                error.message || 'Upload failed', 
                'error',
                'Upload Error'
            );
            
            // Reset UI after error
            setTimeout(() => {
                this.resetUploadUI();
            }, 3000);
        } finally {
            this.currentUpload = null;
        }
    }

    async uploadWithProgress(formData) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            // Track upload progress
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    this.updateUploadProgress(percentComplete);
                }
            });
            // Handle completion
            xhr.addEventListener('load', () => {
                // Debug: log the raw response
                console.log('[FileUploader] Raw server response:', xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        resolve(result);
                    } catch (error) {
                        console.error('[FileUploader] JSON parse error:', error);
                        reject(new Error('Invalid server response'));
                    }
                } else {
                    // Try to parse error message from server
                    try {
                        const errorResult = JSON.parse(xhr.responseText);
                        reject(new Error(errorResult.error || `Server error: ${xhr.status}`));
                    } catch {
                        reject(new Error(`Server error: ${xhr.status}`));
                    }
                }
            });
            // Handle errors
            xhr.addEventListener('error', () => {
                reject(new Error('Network error occurred'));
            });
            xhr.addEventListener('timeout', () => {
                reject(new Error('Upload timeout'));
            });
            // Configure and send request
            xhr.open('POST', `${this.app.apiBase}/upload`);
            xhr.timeout = 300000; // 5 minutes timeout
            xhr.send(formData);
        });
    }

    // ===== PROGRESS TRACKING =====
    showUploadProgress() {
        const uploadProgress = document.getElementById('upload-progress');
        const uploadZone = document.getElementById('upload-zone');
        
        if (uploadProgress) {
            uploadProgress.style.display = 'block';
            this.updateUploadProgress(0);
        }
        
        if (uploadZone) {
            uploadZone.style.opacity = '0.7';
        }
    }

    updateUploadProgress(percentage) {
        const progressFill = document.getElementById('progress-fill');
        const progressPercentage = document.getElementById('progress-percentage');
        const progressStatus = document.getElementById('progress-status');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(percentage)}%`;
        }
        
        if (progressStatus) {
            if (percentage < 50) {
                progressStatus.textContent = 'Uploading...';
            } else if (percentage < 100) {
                progressStatus.textContent = 'Almost done...';
            } else {
                progressStatus.textContent = 'Processing...';
            }
        }
    }

    hideUploadProgress() {
        const uploadProgress = document.getElementById('upload-progress');
        const uploadZone = document.getElementById('upload-zone');
        
        if (uploadProgress) {
            uploadProgress.style.display = 'none';
        }
        
        if (uploadZone) {
            uploadZone.style.opacity = '';
        }
    }

    // ===== FILE INFORMATION DISPLAY =====
    showFileInfo(file) {
        const fileInfoHtml = `
            <div class="file-info-card" id="file-info-card">
                <div class="file-info-header">
                    <div class="file-icon">
                        <i class="${this.getFileIcon(file)}"></i>
                    </div>
                    <div class="file-details">
                        <h4 class="file-name">${file.name}</h4>
                        <div class="file-meta">
                            <span class="file-size">${this.formatFileSize(file.size)}</span>
                            <span class="file-type">${this.getFileExtension(file.name).toUpperCase()}</span>
                            <span class="file-modified">${new Date(file.lastModified).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <div class="file-info-stats">
                    <div class="stat-item">
                        <span class="stat-label">Format</span>
                        <span class="stat-value">${this.getFileExtension(file.name).toUpperCase()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Size</span>
                        <span class="stat-value">${this.formatFileSize(file.size)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Status</span>
                        <span class="stat-value processing">Processing...</span>
                    </div>
                </div>
            </div>
        `;
        
        // Insert file info before upload progress
        const uploadProgress = document.getElementById('upload-progress');
        if (uploadProgress && !document.getElementById('file-info-card')) {
            uploadProgress.insertAdjacentHTML('beforebegin', fileInfoHtml);
        }
    }

    // ===== ADVANCED DATA PREVIEW =====
    async showAdvancedDataPreview(data) {
        const dataPreview = document.getElementById('data-preview');
        const previewContent = document.querySelector('.preview-content');
        
        if (!dataPreview || !previewContent) return;
        
        // Show preview section
        dataPreview.style.display = 'block';
        
        // Create enhanced preview
        const previewHTML = this.createAdvancedPreviewHTML(data);
        previewContent.innerHTML = previewHTML;
        
        // Setup preview interactions
        this.setupPreviewInteractions(data);
        
        // Setup proceed button
        this.setupProceedButton();
    }

    createAdvancedPreviewHTML(data) {
        const preview = data.preview;
        const columns = data.columns || [];
        const dtypes = data.dtypes || {};
        
        return `
            <div class="preview-header-enhanced">
                <div class="preview-stats">
                    <div class="preview-stat">
                        <span class="stat-number">${data.shape[0].toLocaleString()}</span>
                        <span class="stat-label">Rows</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-number">${data.shape[1]}</span>
                        <span class="stat-label">Columns</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-number">${this.calculateMissingPercentage(preview)}%</span>
                        <span class="stat-label">Missing</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-number">${data.file_info?.size_mb || 'Unknown'}</span>
                        <span class="stat-label">Size (MB)</span>
                    </div>
                </div>
                
                <div class="preview-controls">
                    <div class="view-toggle">
                        <button class="toggle-btn active" data-view="table">
                            <i class="fas fa-table"></i> Table
                        </button>
                        <button class="toggle-btn" data-view="summary">
                            <i class="fas fa-chart-bar"></i> Summary
                        </button>
                        <button class="toggle-btn" data-view="types">
                            <i class="fas fa-tags"></i> Data Types
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="preview-views">
                <div class="preview-view active" id="table-view">
                    ${this.createTableView(preview, columns, dtypes)}
                </div>
                
                <div class="preview-view" id="summary-view">
                    ${this.createSummaryView(data)}
                </div>
                
                <div class="preview-view" id="types-view">
                    ${this.createTypesView(columns, dtypes)}
                </div>
            </div>
        `;
    }

    createTableView(preview, columns, dtypes) {
        const displayColumns = columns.slice(0, this.previewSettings.maxColumnsDisplay);
        const showMore = columns.length > this.previewSettings.maxColumnsDisplay;
        
        let tableHTML = `
            <div class="table-container-enhanced">
                <table class="data-table-enhanced">
                    <thead>
                        <tr>
                            ${displayColumns.map(col => `
                                <th>
                                    <div class="column-header">
                                        <span class="column-name">${col}</span>
                                        <span class="column-type ${this.getColumnTypeClass(dtypes[col])}">
                                            ${this.getColumnTypeDisplay(dtypes[col])}
                                        </span>
                                    </div>
                                </th>
                            `).join('')}
                            ${showMore ? `<th class="more-columns">+${columns.length - this.previewSettings.maxColumnsDisplay} more</th>` : ''}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (preview.head && preview.head.length > 0) {
            preview.head.slice(0, this.previewSettings.maxPreviewRows).forEach((row, index) => {
                tableHTML += '<tr>';
                displayColumns.forEach(col => {
                    const value = row[col];
                    const displayValue = this.formatCellValue(value);
                    const cellClass = this.getCellClass(value, dtypes[col]);
                    
                    tableHTML += `<td class="${cellClass}" title="${this.getCellTooltip(value)}">${displayValue}</td>`;
                });
                
                if (showMore) {
                    tableHTML += '<td class="more-columns">...</td>';
                }
                tableHTML += '</tr>';
            });
        }
        
        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        if (preview.head && preview.head.length > this.previewSettings.maxPreviewRows) {
            tableHTML += `
                <div class="table-footer">
                    <p>Showing first ${this.previewSettings.maxPreviewRows} rows of ${data.shape[0].toLocaleString()} total rows</p>
                </div>
            `;
        }
        
        return tableHTML;
    }

    createSummaryView(data) {
        const preview = data.preview;
        const nullCounts = preview.info?.null_counts || {};
        const nullPercentages = preview.info?.null_percentages || {};
        
        return `
            <div class="summary-grid">
                <div class="summary-section">
                    <h4><i class="fas fa-info-circle"></i> Dataset Overview</h4>
                    <div class="summary-stats">
                        <div class="summary-stat">
                            <span class="summary-label">Total Cells:</span>
                            <span class="summary-value">${(data.shape[0] * data.shape[1]).toLocaleString()}</span>
                        </div>
                        <div class="summary-stat">
                            <span class="summary-label">Memory Usage:</span>
                            <span class="summary-value">${data.file_info?.size_mb || 'Unknown'} MB</span>
                        </div>
                        <div class="summary-stat">
                            <span class="summary-label">File Format:</span>
                            <span class="summary-value">${data.file_info?.format?.toUpperCase() || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="summary-section">
                    <h4><i class="fas fa-exclamation-triangle"></i> Data Quality</h4>
                    <div class="quality-metrics">
                        ${Object.entries(nullPercentages).slice(0, 5).map(([col, pct]) => `
                            <div class="quality-metric">
                                <span class="metric-column">${col}</span>
                                <div class="metric-bar">
                                    <div class="metric-fill" style="width: ${pct}%"></div>
                                    <span class="metric-text">${pct.toFixed(1)}% missing</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="summary-section">
                    <h4><i class="fas fa-chart-pie"></i> Column Types</h4>
                    <div class="type-distribution">
                        ${this.getTypeDistribution(data.columns, data.dtypes)}
                    </div>
                </div>
            </div>
        `;
    }

    createTypesView(columns, dtypes) {
        const typeGroups = this.groupColumnsByType(columns, dtypes);
        
        return `
            <div class="types-grid">
                ${Object.entries(typeGroups).map(([type, cols]) => `
                    <div class="type-group">
                        <h4 class="type-header">
                            <i class="${this.getTypeIcon(type)}"></i>
                            ${type} (${cols.length})
                        </h4>
                        <div class="type-columns">
                            ${cols.map(col => `
                                <div class="type-column">
                                    <span class="column-name">${col}</span>
                                    <span class="column-dtype">${dtypes[col]}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // ===== PREVIEW INTERACTIONS =====
    setupPreviewInteractions(data) {
        // Setup view toggle
        const toggleBtns = document.querySelectorAll('.toggle-btn');
        const previewViews = document.querySelectorAll('.preview-view');
        
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetView = btn.dataset.view;
                
                // Update active button
                toggleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update active view
                previewViews.forEach(view => {
                    view.classList.toggle('active', view.id === `${targetView}-view`);
                });
            });
        });

        // Setup table interactions
        this.setupTableInteractions();
    }

    setupTableInteractions() {
        // Add hover effects and column sorting
        const tableHeaders = document.querySelectorAll('.data-table-enhanced th');
        tableHeaders.forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                this.app.showNotification('Column sorting will be available in analysis view', 'info');
            });
        });
    }

    setupProceedButton() {
        const proceedBtn = document.getElementById('proceed-btn');
        if (proceedBtn) {
            proceedBtn.onclick = () => {
                this.app.navigateToSection('eda');
                this.app.showNotification('Starting EDA analysis...', 'info');
            };
        }
    }

    // ===== DATA PREVIEW HANDLERS =====
    setupDataPreviewHandlers() {
        const editDataBtn = document.getElementById('edit-data-btn');
        if (editDataBtn) {
            editDataBtn.addEventListener('click', () => {
                this.showDataEditDialog();
            });
        }
    }

    showDataEditDialog() {
        // Future implementation for data editing
        this.app.showNotification('Data editing feature coming soon!', 'info');
    }

    // ===== VALIDATION ERROR DISPLAY =====
    showValidationErrors(errors) {
        const errorList = errors.map(error => `<li>${error}</li>`).join('');
        const errorHTML = `
            <div class="validation-errors" id="validation-errors">
                <div class="error-header">
                    <h4><i class="fas fa-exclamation-triangle"></i> Validation Errors</h4>
                    <button class="error-close" onclick="document.getElementById('validation-errors').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <ul class="error-list">${errorList}</ul>
            </div>
        `;
        
        const uploadSection = document.getElementById('upload-section');
        if (uploadSection && !document.getElementById('validation-errors')) {
            uploadSection.insertAdjacentHTML('afterbegin', errorHTML);
        }
    }

    // ===== FILE SELECTION DIALOG =====
    async showFileSelectionDialog(files) {
        return new Promise((resolve) => {
            const modalHTML = `
                <div class="modal" id="file-selection-modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3><i class="fas fa-files"></i> Multiple Files Detected</h3>
                            <button class="modal-close" onclick="document.getElementById('file-selection-modal').remove(); resolve(null);">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p>Please select which file you'd like to analyze:</p>
                            <div class="file-selection-list">
                                ${files.map((file, index) => `
                                    <div class="file-option" data-index="${index}">
                                        <div class="file-option-icon">
                                            <i class="${this.getFileIcon(file)}"></i>
                                        </div>
                                        <div class="file-option-info">
                                            <div class="file-option-name">${file.name}</div>
                                            <div class="file-option-meta">
                                                ${this.formatFileSize(file.size)} • ${this.getFileExtension(file.name).toUpperCase()}
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="document.getElementById('file-selection-modal').remove(); resolve(null);">Cancel</button>
                            <button class="btn-primary" id="select-file-btn" disabled>Select File</button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            const modal = document.getElementById('file-selection-modal');
            const selectBtn = document.getElementById('select-file-btn');
            let selectedIndex = null;
            
            // Setup file option clicks
            const fileOptions = modal.querySelectorAll('.file-option');
            fileOptions.forEach(option => {
                option.addEventListener('click', () => {
                    fileOptions.forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');
                    selectedIndex = parseInt(option.dataset.index);
                    selectBtn.disabled = false;
                });
            });
            
            // Setup select button
            selectBtn.onclick = () => {
                modal.remove();
                resolve(selectedIndex !== null ? files[selectedIndex] : null);
            };
            
            this.app.openModal('file-selection-modal');
        });
    }

    // ===== UTILITY METHODS =====
    getFileExtension(filename) {
        return filename.split('.').pop().toLowerCase();
    }

    getFileIcon(file) {
        const extension = this.getFileExtension(file.name);
        const icons = {
            csv: 'fas fa-file-csv',
            json: 'fas fa-file-code',
            xlsx: 'fas fa-file-excel',
            xls: 'fas fa-file-excel',
            parquet: 'fas fa-database'
        };
        return icons[extension] || 'fas fa-file';
    }

    isValidFormat(extension, mimeType) {
        const validFormats = this.supportedFormats[extension];
        return validFormats && (validFormats.includes(mimeType) || mimeType === '');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    looksLikeCSV(text) {
        const lines = text.split('\n').slice(0, 5);
        if (lines.length < 2) return false;
        
        const firstLineCommas = (lines[0].match(/,/g) || []).length;
        const secondLineCommas = (lines[1].match(/,/g) || []).length;
        
        return firstLineCommas > 0 && firstLineCommas === secondLineCommas;
    }

    async readFileChunk(file, start, length) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file.slice(start, start + length));
        });
    }

    formatCellValue(value) {
        if (value === null || value === undefined) {
            return '<span class="null-value">NULL</span>';
        }
        
        const str = String(value);
        if (str.length > this.previewSettings.maxCellLength) {
            return str.substring(0, this.previewSettings.maxCellLength) + '...';
        }
        
        return str;
    }

    getCellClass(value, dtype) {
        if (value === null || value === undefined) return 'cell-null';
        
        const typeClass = this.getColumnTypeClass(dtype);
        return `cell-${typeClass}`;
    }

    getCellTooltip(value) {
        if (value === null || value === undefined) return 'NULL value';
        return String(value);
    }

    getColumnTypeClass(dtype) {
        if (!dtype) return 'unknown';
        const dtypeStr = dtype.toLowerCase();
        
        if (dtypeStr.includes('int') || dtypeStr.includes('float')) return 'numeric';
        if (dtypeStr.includes('datetime') || dtypeStr.includes('date')) return 'datetime';
        if (dtypeStr.includes('bool')) return 'boolean';
        return 'categorical';
    }

    getColumnTypeDisplay(dtype) {
        const typeClass = this.getColumnTypeClass(dtype);
        const displayNames = {
            numeric: 'NUM',
            categorical: 'CAT',
            datetime: 'DATE',
            boolean: 'BOOL',
            unknown: '?'
        };
        return displayNames[typeClass] || '?';
    }

    calculateMissingPercentage(preview) {
        if (!preview?.info?.null_percentages) return 0;
        const percentages = Object.values(preview.info.null_percentages);
        return percentages.length > 0 ? (percentages.reduce((sum, pct) => sum + pct, 0) / percentages.length).toFixed(1) : 0;
    }

    getTypeDistribution(columns, dtypes) {
        const typeGroups = this.groupColumnsByType(columns, dtypes);
        const total = columns.length;
        
        return Object.entries(typeGroups).map(([type, cols]) => {
            const percentage = (cols.length / total * 100).toFixed(1);
            return `
                <div class="type-dist-item">
                    <div class="type-dist-bar">
                        <div class="type-dist-fill" style="width: ${percentage}%"></div>
                    </div>
                    <span class="type-dist-label">${type} (${cols.length})</span>
                </div>
            `;
        }).join('');
    }

    groupColumnsByType(columns, dtypes) {
        const groups = {
            'Numeric': [],
            'Categorical': [],
            'DateTime': [],
            'Boolean': [],
            'Unknown': []
        };
        
        columns.forEach(col => {
            const typeClass = this.getColumnTypeClass(dtypes[col]);
            switch (typeClass) {
                case 'numeric': groups['Numeric'].push(col); break;
                case 'categorical': groups['Categorical'].push(col); break;
                case 'datetime': groups['DateTime'].push(col); break;
                case 'boolean': groups['Boolean'].push(col); break;
                default: groups['Unknown'].push(col); break;
            }
        });
        
        // Remove empty groups
        return Object.fromEntries(Object.entries(groups).filter(([type, cols]) => cols.length > 0));
    }

    getTypeIcon(type) {
        const icons = {
            'Numeric': 'fas fa-hashtag',
            'Categorical': 'fas fa-tags',
            'DateTime': 'fas fa-calendar',
            'Boolean': 'fas fa-toggle-on',
            'Unknown': 'fas fa-question'
        };
        return icons[type] || 'fas fa-question';
    }

    resetUploadUI() {
        this.updateUploadZoneContent('default');
        
        const fileInfoCard = document.getElementById('file-info-card');
        if (fileInfoCard) {
            fileInfoCard.remove();
        }
        
        const validationErrors = document.getElementById('validation-errors');
        if (validationErrors) {
            validationErrors.remove();
        }
        
        const dataPreview = document.getElementById('data-preview');
        if (dataPreview) {
            dataPreview.style.display = 'none';
        }
    }
}

// ===== ENHANCED CSS FOR FILE UPLOADER =====
const uploaderCSS = `
/* File Info Card */
.file-info-card {
    background: var(--secondary-bg);
    border: 1px solid rgba(100, 255, 218, 0.2);
    border-radius: var(--border-radius-lg);
    padding: 1.5rem;
    margin: 2rem 0;
    transition: all var(--transition-normal);
}

.file-info-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
}

.file-icon {
    width: 50px;
    height: 50px;
    background: rgba(100, 255, 218, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: var(--primary-accent);
}

.file-details h4 {
    color: var(--primary-text);
    margin-bottom: 0.5rem;
}

.file-meta {
    display: flex;
    gap: 1rem;
    color: var(--muted-text);
    font-size: 0.9rem;
}

.file-info-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(100, 255, 218, 0.1);
}

.stat-item {
    text-align: center;
}

.stat-label {
    display: block;
    color: var(--muted-text);
    font-size: 0.8rem;
    margin-bottom: 0.25rem;
}

.stat-value {
    color: var(--primary-text);
    font-weight: 600;
}

.stat-value.processing {
    color: var(--warning-color);
}

/* Enhanced Preview */
.preview-header-enhanced {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background: rgba(100, 255, 218, 0.05);
    border-bottom: 1px solid rgba(100, 255, 218, 0.1);
    margin: 0;
}

.preview-stats {
    display: flex;
    gap: 2rem;
}

.preview-stat {
    text-align: center;
}

.preview-stat .stat-number {
    display: block;
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--primary-accent);
    font-family: var(--font-mono);
}

.preview-stat .stat-label {
    display: block;
    color: var(--muted-text);
    font-size: 0.8rem;
    text-transform: uppercase;
}

.view-toggle {
    display: flex;
    gap: 0.5rem;
    background: var(--primary-bg);
    padding: 0.5rem;
    border-radius: var(--border-radius-md);
}

.toggle-btn {
    padding: 0.5rem 1rem;
    background: transparent;
    border: none;
    border-radius: var(--border-radius-sm);
    color: var(--muted-text);
    cursor: pointer;
    transition: all var(--transition-fast);
    font-size: 0.9rem;
}

.toggle-btn.active,
.toggle-btn:hover {
    background: var(--primary-accent);
    color: var(--primary-bg);
}

.preview-views {
    padding: 2rem;
}

.preview-view {
    display: none;
}

.preview-view.active {
    display: block;
    animation: fadeIn 0.3s ease;
}

/* Enhanced Table */
.table-container-enhanced {
    overflow-x: auto;
    border-radius: var(--border-radius-md);
    background: var(--primary-bg);
    border: 1px solid rgba(100, 255, 218, 0.1);
}

.data-table-enhanced {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
    min-width: 600px;
}

.column-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    align-items: flex-start;
}

.column-name {
    font-weight: 600;
    color: var(--primary-text);
}

.column-type {
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
    border-radius: var(--border-radius-sm);
    font-weight: 600;
    text-transform: uppercase;
}

.column-type.numeric {
    background: rgba(78, 205, 196, 0.2);
    color: var(--tertiary-accent);
}

.column-type.categorical {
    background: rgba(255, 107, 107, 0.2);
    color: var(--secondary-accent);
}

.column-type.datetime {
    background: rgba(69, 183, 209, 0.2);
    color: var(--quaternary-accent);
}

.column-type.boolean {
    background: rgba(156, 39, 176, 0.2);
    color: #e91e63;
}

.data-table-enhanced th {
    background: var(--tertiary-bg);
    padding: 1rem 0.75rem;
    text-align: left;
    border-bottom: 2px solid rgba(100, 255, 218, 0.2);
    position: sticky;
    top: 0;
    z-index: 10;
}

.data-table-enhanced td {
    padding: 0.75rem;
    border-bottom: 1px solid rgba(100, 255, 218, 0.1);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.cell-null {
    color: var(--muted-text);
    font-style: italic;
}

.cell-numeric {
    color: var(--tertiary-accent);
    font-family: var(--font-mono);
}

.cell-categorical {
    color: var(--secondary-text);
}

.cell-datetime {
    color: var(--quaternary-accent);
}

.null-value {
    color: var(--muted-text);
    font-style: italic;
    opacity: 0.7;
}

.more-columns {
    background: rgba(100, 255, 218, 0.05);
    color: var(--muted-text);
    text-align: center;
    font-style: italic;
}

/* Summary View */
.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
}

.summary-section {
    background: var(--primary-bg);
    border: 1px solid rgba(100, 255, 218, 0.1);
    border-radius: var(--border-radius-md);
    padding: 1.5rem;
}

.summary-section h4 {
    color: var(--primary-text);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.summary-stats {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.summary-stat {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(100, 255, 218, 0.05);
}

.summary-label {
    color: var(--secondary-text);
}

.summary-value {
    color: var(--primary-text);
    font-weight: 600;
    font-family: var(--font-mono);
}

/* Quality Metrics */
.quality-metrics {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.quality-metric {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.metric-column {
    color: var(--primary-text);
    font-weight: 500;
    font-size: 0.9rem;
}

.metric-bar {
    position: relative;
    height: 20px;
    background: rgba(100, 255, 218, 0.1);
    border-radius: 10px;
    overflow: hidden;
}

.metric-fill {
    height: 100%;
    background: var(--warning-color);
    border-radius: 10px;
    transition: width 0.5s ease;
}

.metric-text {
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);
    font-size: 0.7rem;
    color: var(--primary-text);
    font-weight: 600;
}

/* Type Distribution */
.type-distribution {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.type-dist-item {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.type-dist-bar {
    flex: 1;
    height: 16px;
    background: rgba(100, 255, 218, 0.1);
    border-radius: 8px;
    overflow: hidden;
}

.type-dist-fill {
    height: 100%;
    background: var(--primary-accent);
    border-radius: 8px;
    transition: width 0.5s ease;
}

.type-dist-label {
    color: var(--secondary-text);
    font-size: 0.8rem;
    min-width: 120px;
}

/* Types View */
.types-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
}

.type-group {
    background: var(--primary-bg);
    border: 1px solid rgba(100, 255, 218, 0.1);
    border-radius: var(--border-radius-md);
    padding: 1.5rem;
}

.type-header {
    color: var(--primary-text);
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
}

.type-columns {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.type-column {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: rgba(100, 255, 218, 0.05);
    border-radius: var(--border-radius-sm);
}

.type-column .column-name {
    color: var(--primary-text);
    font-weight: 500;
}

.column-dtype {
    color: var(--muted-text);
    font-size: 0.8rem;
    font-family: var(--font-mono);
}

/* Validation Errors */
.validation-errors {
    background: rgba(255, 82, 82, 0.1);
    border: 1px solid var(--error-color);
    border-radius: var(--border-radius-md);
    padding: 1.5rem;
    margin-bottom: 2rem;
}

.error-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.error-header h4 {
    color: var(--error-color);
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.error-close {
    background: none;
    border: none;
    color: var(--error-color);
    cursor: pointer;
    font-size: 1.2rem;
}

.error-list {
    list-style: none;
    padding: 0;
}

.error-list li {
    color: var(--error-color);
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 82, 82, 0.2);
}

/* File Selection Modal */
.file-selection-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-height: 300px;
    overflow-y: auto;
}

.file-option {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--primary-bg);
    border: 1px solid rgba(100, 255, 218, 0.1);
    border-radius: var(--border-radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
}

.file-option:hover,
.file-option.selected {
    border-color: var(--primary-accent);
    background: rgba(100, 255, 218, 0.1);
}

.file-option-icon {
    width: 40px;
    height: 40px;
    background: rgba(100, 255, 218, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary-accent);
}

.file-option-name {
    color: var(--primary-text);
    font-weight: 600;
    margin-bottom: 0.25rem;
}

.file-option-meta {
    color: var(--muted-text);
    font-size: 0.8rem;
}

/* Upload States */
.upload-content.drop-ready .upload-icon {
    transform: scale(1.2);
    color: var(--success-color);
}

.upload-content.uploading .upload-icon {
    animation: pulse 1.5s ease-in-out infinite;
}

.upload-content.processing .upload-icon {
    color: var(--warning-color);
}

.upload-content.success .upload-icon {
    color: var(--success-color);
    transform: scale(1.1);
}

.upload-content.error .upload-icon {
    color: var(--error-color);
}

/* Responsive Design */
@media (max-width: 768px) {
    .preview-header-enhanced {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
    }
    
    .preview-stats {
        justify-content: space-around;
        gap: 1rem;
    }
    
    .summary-grid {
        grid-template-columns: 1fr;
    }
    
    .types-grid {
        grid-template-columns: 1fr;
    }
    
    .file-info-stats {
        grid-template-columns: repeat(2, 1fr);
    }
}
`;

// Inject the CSS
const uploaderStyle = document.createElement('style');
uploaderStyle.textContent = uploaderCSS;
document.head.appendChild(uploaderStyle);

console.log('📁 FileUploader module loaded successfully!');