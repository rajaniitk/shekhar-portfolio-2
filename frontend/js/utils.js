// ===== UTILITY FUNCTIONS AND HELPERS =====
class Utils {
    constructor() {
        this.formatters = new Map();
        this.validators = new Map();
        this.converters = new Map();
        this.mathUtils = new MathUtils();
        this.dateUtils = new DateUtils();
        this.stringUtils = new StringUtils();
        this.arrayUtils = new ArrayUtils();
        this.chartUtils = new ChartUtils();
        
        this.init();
    }

    init() {
        this.setupFormatters();
        this.setupValidators();
        this.setupConverters();
        this.setupEventDelegation();
        console.log('🔧 Utils initialized successfully');
    }

    // ===== FORMATTERS =====
    setupFormatters() {
        this.formatters.set('number', (value, decimals = 2) => {
            if (value === null || value === undefined || isNaN(value)) return 'N/A';
            return Number(value).toLocaleString(undefined, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
        });

        this.formatters.set('percentage', (value, decimals = 1) => {
            if (value === null || value === undefined || isNaN(value)) return 'N/A';
            return `${(value * 100).toFixed(decimals)}%`;
        });

        this.formatters.set('currency', (value, currency = 'USD') => {
            if (value === null || value === undefined || isNaN(value)) return 'N/A';
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency
            }).format(value);
        });

        this.formatters.set('fileSize', (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        });

        this.formatters.set('duration', (milliseconds) => {
            const seconds = Math.floor(milliseconds / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            
            if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
            if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
            return `${seconds}s`;
        });

        this.formatters.set('shortNumber', (value) => {
            if (value === null || value === undefined || isNaN(value)) return 'N/A';
            const absValue = Math.abs(value);
            
            if (absValue >= 1e9) return (value / 1e9).toFixed(1) + 'B';
            if (absValue >= 1e6) return (value / 1e6).toFixed(1) + 'M';
            if (absValue >= 1e3) return (value / 1e3).toFixed(1) + 'K';
            return value.toString();
        });
    }

    // ===== VALIDATORS =====
    setupValidators() {
        this.validators.set('email', (email) => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        });

        this.validators.set('url', (url) => {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        });

        this.validators.set('number', (value) => {
            return !isNaN(value) && isFinite(value);
        });

        this.validators.set('integer', (value) => {
            return Number.isInteger(Number(value));
        });

        this.validators.set('positive', (value) => {
            return this.validators.get('number')(value) && Number(value) > 0;
        });

        this.validators.set('range', (value, min, max) => {
            const num = Number(value);
            return this.validators.get('number')(value) && num >= min && num <= max;
        });

        this.validators.set('minLength', (str, minLen) => {
            return String(str).length >= minLen;
        });

        this.validators.set('maxLength', (str, maxLen) => {
            return String(str).length <= maxLen;
        });
    }

    // ===== CONVERTERS =====
    setupConverters() {
        this.converters.set('csvToArray', (csvString) => {
            const lines = csvString.split('\n');
            return lines.map(line => line.split(',').map(cell => cell.trim()));
        });

        this.converters.set('arrayToCSV', (array) => {
            return array.map(row => row.map(cell => 
                typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
            ).join(',')).join('\n');
        });

        this.converters.set('rgbToHex', (r, g, b) => {
            return "#" + [r, g, b].map(x => {
                const hex = x.toString(16);
                return hex.length === 1 ? "0" + hex : hex;
            }).join('');
        });

        this.converters.set('hexToRgb', (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        });
    }

    // ===== EVENT DELEGATION =====
    setupEventDelegation() {
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
        document.addEventListener('input', this.handleGlobalInput.bind(this));
    }

    handleGlobalClick(e) {
        // Copy to clipboard functionality
        if (e.target.matches('[data-copy]')) {
            e.preventDefault();
            const textToCopy = e.target.dataset.copy || e.target.textContent;
            this.copyToClipboard(textToCopy);
            this.showTooltip(e.target, 'Copied!', 1000);
        }

        // Toggle functionality
        if (e.target.matches('[data-toggle]')) {
            e.preventDefault();
            const targetSelector = e.target.dataset.toggle;
            const target = document.querySelector(targetSelector);
            if (target) {
                target.classList.toggle('active');
                e.target.classList.toggle('active');
            }
        }

        // Expand/collapse functionality
        if (e.target.matches('[data-expand]') || e.target.closest('[data-expand]')) {
            const expandBtn = e.target.closest('[data-expand]') || e.target;
            const targetSelector = expandBtn.dataset.expand;
            const target = document.querySelector(targetSelector);
            if (target) {
                target.classList.toggle('expanded');
                expandBtn.classList.toggle('expanded');
                
                // Update icon if present
                const icon = expandBtn.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-chevron-down');
                    icon.classList.toggle('fa-chevron-up');
                }
            }
        }
    }

    handleGlobalKeydown(e) {
        // Global keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.triggerAutoSave();
                    break;
                case 'z':
                    if (!e.shiftKey) {
                        e.preventDefault();
                        this.triggerUndo();
                    } else {
                        e.preventDefault();
                        this.triggerRedo();
                    }
                    break;
                case 'f':
                    e.preventDefault();
                    this.focusSearchInput();
                    break;
            }
        }
        
        // Escape key
        if (e.key === 'Escape') {
            this.closeAllDropdowns();
            this.clearActiveStates();
        }
    }

    handleGlobalInput(e) {
        // Auto-format inputs
        if (e.target.matches('[data-format]')) {
            const formatType = e.target.dataset.format;
            this.formatInput(e.target, formatType);
        }

        // Auto-validate inputs
        if (e.target.matches('[data-validate]')) {
            const validationType = e.target.dataset.validate;
            this.validateInput(e.target, validationType);
        }

        // Auto-save inputs
        if (e.target.matches('[data-autosave]')) {
            clearTimeout(e.target._autosaveTimer);
            e.target._autosaveTimer = setTimeout(() => {
                this.autoSaveField(e.target);
            }, 1000);
        }
    }

    // ===== UTILITY METHODS =====
    format(type, value, ...args) {
        const formatter = this.formatters.get(type);
        return formatter ? formatter(value, ...args) : String(value);
    }

    validate(type, value, ...args) {
        const validator = this.validators.get(type);
        return validator ? validator(value, ...args) : true;
    }

    convert(type, value, ...args) {
        const converter = this.converters.get(type);
        return converter ? converter(value, ...args) : value;
    }

    // ===== DOM UTILITIES =====
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else if (key.startsWith('on')) {
                element.addEventListener(key.substring(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });

        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Element) {
                element.appendChild(child);
            }
        });

        return element;
    }

    queryAll(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    }

    query(selector, context = document) {
        return context.querySelector(selector);
    }

    hide(element) {
        if (typeof element === 'string') element = this.query(element);
        if (element) element.style.display = 'none';
    }

    show(element, display = 'block') {
        if (typeof element === 'string') element = this.query(element);
        if (element) element.style.display = display;
    }

    toggle(element) {
        if (typeof element === 'string') element = this.query(element);
        if (element) {
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }
    }

    addClass(element, className) {
        if (typeof element === 'string') element = this.query(element);
        if (element) element.classList.add(className);
    }

    removeClass(element, className) {
        if (typeof element === 'string') element = this.query(element);
        if (element) element.classList.remove(className);
    }

    toggleClass(element, className) {
        if (typeof element === 'string') element = this.query(element);
        if (element) element.classList.toggle(className);
    }

    hasClass(element, className) {
        if (typeof element === 'string') element = this.query(element);
        return element ? element.classList.contains(className) : false;
    }

    // ===== ASYNC UTILITIES =====
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    debounce(func, delay) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    async retry(fn, maxAttempts = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) throw error;
                await this.delay(delay * attempt);
            }
        }
    }

    // ===== CLIPBOARD UTILITIES =====
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return this.fallbackCopyToClipboard(text);
        }
    }

    fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            return true;
        } catch (error) {
            console.error('Fallback copy failed:', error);
            return false;
        } finally {
            document.body.removeChild(textArea);
        }
    }

    // ===== TOOLTIP UTILITIES =====
    showTooltip(element, text, duration = 2000) {
        const tooltip = this.createElement('div', {
            className: 'tooltip-temp',
            style: 'position: absolute; background: var(--primary-bg); color: var(--primary-text); padding: 0.5rem; border-radius: 4px; font-size: 0.8rem; z-index: 10000; box-shadow: 0 2px 8px rgba(0,0,0,0.15);'
        }, [text]);

        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';

        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, duration);
    }

    // ===== LOCAL STORAGE UTILITIES =====
    setStorage(key, value, isSession = false) {
        try {
            const storage = isSession ? sessionStorage : localStorage;
            storage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage error:', error);
            return false;
        }
    }

    getStorage(key, defaultValue = null, isSession = false) {
        try {
            const storage = isSession ? sessionStorage : localStorage;
            const item = storage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage retrieval error:', error);
            return defaultValue;
        }
    }

    removeStorage(key, isSession = false) {
        try {
            const storage = isSession ? sessionStorage : localStorage;
            storage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage removal error:', error);
            return false;
        }
    }

    clearStorage(isSession = false) {
        try {
            const storage = isSession ? sessionStorage : localStorage;
            storage.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }

    // ===== FORM UTILITIES =====
    getFormData(form) {
        if (typeof form === 'string') form = this.query(form);
        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            if (data[key]) {
                if (Array.isArray(data[key])) {
                    data[key].push(value);
                } else {
                    data[key] = [data[key], value];
                }
            } else {
                data[key] = value;
            }
        }
        
        return data;
    }

    setFormData(form, data) {
        if (typeof form === 'string') form = this.query(form);
        
        Object.entries(data).forEach(([key, value]) => {
            const field = form.querySelector(`[name="${key}"]`);
            if (field) {
                if (field.type === 'checkbox' || field.type === 'radio') {
                    field.checked = Boolean(value);
                } else {
                    field.value = value;
                }
            }
        });
    }

    validateForm(form, rules = {}) {
        if (typeof form === 'string') form = this.query(form);
        const errors = {};
        
        Object.entries(rules).forEach(([fieldName, fieldRules]) => {
            const field = form.querySelector(`[name="${fieldName}"]`);
            if (!field) return;
            
            const value = field.value;
            fieldRules.forEach(rule => {
                if (!this.validate(rule.type, value, ...rule.args || [])) {
                    if (!errors[fieldName]) errors[fieldName] = [];
                    errors[fieldName].push(rule.message || `${fieldName} is invalid`);
                }
            });
        });
        
        return { isValid: Object.keys(errors).length === 0, errors };
    }

    // ===== INPUT FORMATTING =====
    formatInput(input, formatType) {
        const value = input.value;
        let formattedValue = value;

        switch (formatType) {
            case 'phone':
                formattedValue = value.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
                break;
            case 'currency':
                formattedValue = value.replace(/[^\d.,]/g, '');
                break;
            case 'number':
                formattedValue = value.replace(/[^\d.-]/g, '');
                break;
            case 'uppercase':
                formattedValue = value.toUpperCase();
                break;
            case 'lowercase':
                formattedValue = value.toLowerCase();
                break;
        }

        if (formattedValue !== value) {
            input.value = formattedValue;
        }
    }

    validateInput(input, validationType) {
        const value = input.value;
        const isValid = this.validate(validationType, value);
        
        input.classList.toggle('invalid', !isValid);
        input.classList.toggle('valid', isValid);
        
        return isValid;
    }

    // ===== HELPER METHODS =====
    triggerAutoSave() {
        const event = new CustomEvent('autosave');
        document.dispatchEvent(event);
    }

    triggerUndo() {
        const event = new CustomEvent('undo');
        document.dispatchEvent(event);
    }

    triggerRedo() {
        const event = new CustomEvent('redo');
        document.dispatchEvent(event);
    }

    focusSearchInput() {
        const searchInput = this.query('input[type="search"], input[placeholder*="search"], .search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    closeAllDropdowns() {
        this.queryAll('.dropdown.active, .popup.active').forEach(element => {
            element.classList.remove('active');
        });
    }

    clearActiveStates() {
        this.queryAll('.active').forEach(element => {
            if (!element.matches('.persistent-active')) {
                element.classList.remove('active');
            }
        });
    }

    autoSaveField(field) {
        const data = {
            field: field.name,
            value: field.value,
            timestamp: Date.now()
        };
        
        this.setStorage(`autosave_${field.name}`, data);
        
        // Trigger autosave event
        field.dispatchEvent(new CustomEvent('autosave', { detail: data }));
    }

    // ===== DEVICE DETECTION =====
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    isTablet() {
        return /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
    }

    isDesktop() {
        return !this.isMobile() && !this.isTablet();
    }

    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    // ===== PERFORMANCE UTILITIES =====
    measurePerformance(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`${name} took ${(end - start).toFixed(2)} milliseconds`);
        return result;
    }

    async measureAsyncPerformance(name, fn) {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        console.log(`${name} took ${(end - start).toFixed(2)} milliseconds`);
        return result;
    }

    // ===== DOWNLOAD UTILITIES =====
    downloadJSON(data, filename = 'data.json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadBlob(blob, filename);
    }

    downloadCSV(data, filename = 'data.csv') {
        const csv = this.convert('arrayToCSV', data);
        const blob = new Blob([csv], { type: 'text/csv' });
        this.downloadBlob(blob, filename);
    }

    downloadText(text, filename = 'file.txt') {
        const blob = new Blob([text], { type: 'text/plain' });
        this.downloadBlob(blob, filename);
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// ===== SPECIALIZED UTILITY CLASSES =====

class MathUtils {
    round(number, decimals = 0) {
        return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    average(numbers) {
        return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    }

    median(numbers) {
        const sorted = [...numbers].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 
            ? (sorted[mid - 1] + sorted[mid]) / 2 
            : sorted[mid];
    }

    standardDeviation(numbers) {
        const avg = this.average(numbers);
        const squareDiffs = numbers.map(value => Math.pow(value - avg, 2));
        return Math.sqrt(this.average(squareDiffs));
    }

    correlation(x, y) {
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0);
        const sumXX = x.map(xi => xi * xi).reduce((a, b) => a + b, 0);
        const sumYY = y.map(yi => yi * yi).reduce((a, b) => a + b, 0);
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
        
        return denominator === 0 ? 0 : numerator / denominator;
    }
}

class DateUtils {
    formatDate(date, format = 'YYYY-MM-DD') {
        if (!(date instanceof Date)) date = new Date(date);
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    parseDate(dateString, format = 'YYYY-MM-DD') {
        // Simple date parsing - can be enhanced
        try {
            return new Date(dateString);
        } catch {
            return null;
        }
    }

    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }

    diffDays(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.round((date2 - date1) / oneDay);
    }

    isWeekend(date) {
        const day = date.getDay();
        return day === 0 || day === 6;
    }

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    }
}

class StringUtils {
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    titleCase(str) {
        return str.replace(/\w\S*/g, 
            txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    camelCase(str) {
        return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
            return index === 0 ? word.toLowerCase() : word.toUpperCase();
        }).replace(/\s+/g, '');
    }

    kebabCase(str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
    }

    snakeCase(str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1_$2')
            .replace(/[\s-]+/g, '_')
            .toLowerCase();
    }

    truncate(str, length, suffix = '...') {
        return str.length <= length ? str : str.substring(0, length) + suffix;
    }

    stripHtml(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    wordCount(str) {
        return str.trim().split(/\s+/).length;
    }

    generateSlug(str) {
        return str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
}

class ArrayUtils {
    unique(arr) {
        return [...new Set(arr)];
    }

    flatten(arr) {
        return arr.reduce((flat, item) => 
            flat.concat(Array.isArray(item) ? this.flatten(item) : item), []
        );
    }

    chunk(arr, size) {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }

    groupBy(arr, key) {
        return arr.reduce((groups, item) => {
            const group = typeof key === 'function' ? key(item) : item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }

    sortBy(arr, key, desc = false) {
        return [...arr].sort((a, b) => {
            const aVal = typeof key === 'function' ? key(a) : a[key];
            const bVal = typeof key === 'function' ? key(b) : b[key];
            
            if (aVal < bVal) return desc ? 1 : -1;
            if (aVal > bVal) return desc ? -1 : 1;
            return 0;
        });
    }

    shuffle(arr) {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    intersection(arr1, arr2) {
        return arr1.filter(x => arr2.includes(x));
    }

    difference(arr1, arr2) {
        return arr1.filter(x => !arr2.includes(x));
    }

    union(arr1, arr2) {
        return this.unique([...arr1, ...arr2]);
    }
}

class ChartUtils {
    generateColors(count, opacity = 1) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            const hue = (i * 360 / count) % 360;
            colors.push(`hsla(${hue}, 70%, 60%, ${opacity})`);
        }
        return colors;
    }

    formatChartData(data, xKey, yKey) {
        return data.map(item => ({ x: item[xKey], y: item[yKey] }));
    }

    calculateTicks(min, max, count = 5) {
        const range = max - min;
        const interval = range / (count - 1);
        const ticks = [];
        
        for (let i = 0; i < count; i++) {
            ticks.push(min + (interval * i));
        }
        
        return ticks;
    }

    getColorPalette(name = 'default') {
        const palettes = {
            default: ['#64ffda', '#3498db', '#9b59b6', '#e67e22', '#e74c3c', '#2ecc71'],
            blue: ['#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5', '#2196f3'],
            green: ['#e8f5e8', '#c8e6c9', '#a5d6a7', '#81c784', '#66bb6a', '#4caf50'],
            red: ['#ffebee', '#ffcdd2', '#ef9a9a', '#e57373', '#ef5350', '#f44336']
        };
        
        return palettes[name] || palettes.default;
    }
}

// ===== CREATE GLOBAL UTILS INSTANCE =====
const utils = new Utils();

// Export utils for global access
window.utils = utils;

console.log('🔧 Utils module loaded successfully!');