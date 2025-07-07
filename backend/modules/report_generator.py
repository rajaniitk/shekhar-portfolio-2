import pandas as pd
import numpy as np
from jinja2 import Template
import os
from datetime import datetime
import base64
import io
import matplotlib.pyplot as plt
import seaborn as sns

class ReportGenerator:
    def __init__(self):
        self.template_dir = 'templates'
        self.output_dir = 'reports'
        os.makedirs(self.output_dir, exist_ok=True)
    
    def generate_html_report(self, df: pd.DataFrame, session_id: str, 
                           eda_results: dict = None, recommendations: dict = None) -> str:
        """Generate comprehensive HTML report"""
        
        # Generate report data
        report_data = {
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'dataset_info': self._get_dataset_info(df),
            'eda_summary': eda_results or {},
            'recommendations': recommendations or {},
            'session_id': session_id
        }
        
        # Generate HTML content
        html_content = self._create_html_template(report_data)
        
        # Save report
        report_path = os.path.join(self.output_dir, f"{session_id}_eda_report.html")
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        return report_path
    
    def _get_dataset_info(self, df: pd.DataFrame) -> dict:
        """Get basic dataset information for report"""
        return {
            'shape': df.shape,
            'memory_usage': f"{df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB",
            'columns': df.columns.tolist(),
            'dtypes': df.dtypes.astype(str).to_dict(),
            'missing_values': df.isnull().sum().to_dict(),
            'duplicate_rows': df.duplicated().sum()
        }
    
    def _create_html_template(self, data: dict) -> str:
        """Create HTML template for the report"""
        template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EDA Report - {{ session_id }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 0;
            margin-bottom: 30px;
            border-radius: 10px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .section {
            background: white;
            margin-bottom: 30px;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .section h2 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        
        .stat-card h3 {
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .stat-value {
            font-size: 1.8em;
            font-weight: bold;
            color: #3498db;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background-color: #3498db;
            color: white;
        }
        
        tr:nth-child(even) {
            background-color: #f2f2f2;
        }
        
        .recommendation {
            background: #e8f5e8;
            border-left: 4px solid #27ae60;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
        }
        
        .recommendation h4 {
            color: #27ae60;
            margin-bottom: 5px;
        }
        
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
        }
        
        .error {
            background: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin: 10px 0;
            border-radius: 5px;
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            border-top: 1px solid #ddd;
            margin-top: 30px;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Exploratory Data Analysis Report</h1>
            <p>Generated on {{ timestamp }}</p>
            <p>Session ID: {{ session_id }}</p>
        </div>
        
        <div class="section">
            <h2>📊 Dataset Overview</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Dataset Shape</h3>
                    <div class="stat-value">{{ dataset_info.shape[0] }} × {{ dataset_info.shape[1] }}</div>
                </div>
                <div class="stat-card">
                    <h3>Memory Usage</h3>
                    <div class="stat-value">{{ dataset_info.memory_usage }}</div>
                </div>
                <div class="stat-card">
                    <h3>Missing Values</h3>
                    <div class="stat-value">{{ dataset_info.missing_values.values() | sum }}</div>
                </div>
                <div class="stat-card">
                    <h3>Duplicate Rows</h3>
                    <div class="stat-value">{{ dataset_info.duplicate_rows }}</div>
                </div>
            </div>
        </div>
        
        {% if recommendations %}
        <div class="section">
            <h2>💡 Key Recommendations</h2>
            {% for category, recs in recommendations.items() %}
                {% if recs %}
                <h3>{{ category.replace('_', ' ').title() }}</h3>
                {% for rec in recs[:3] %}
                    <div class="recommendation">
                        <h4>{{ rec.title }}</h4>
                        <p>{{ rec.description }}</p>
                        <strong>Action:</strong> {{ rec.action }}
                    </div>
                {% endfor %}
                {% endif %}
            {% endfor %}
        </div>
        {% endif %}
        
        <div class="section">
            <h2>📈 Column Information</h2>
            <table>
                <thead>
                    <tr>
                        <th>Column Name</th>
                        <th>Data Type</th>
                        <th>Missing Values</th>
                        <th>Missing %</th>
                    </tr>
                </thead>
                <tbody>
                    {% for column in dataset_info.columns %}
                    <tr>
                        <td>{{ column }}</td>
                        <td>{{ dataset_info.dtypes[column] }}</td>
                        <td>{{ dataset_info.missing_values[column] }}</td>
                        <td>{{ "%.2f"|format((dataset_info.missing_values[column] / dataset_info.shape[0]) * 100) }}%</td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>Report generated by Intelligent EDA Application</p>
            <p>© 2024 - Advanced Data Analysis Platform</p>
        </div>
    </div>
</body>
</html>
        """
        
        from jinja2 import Template
        template = Template(template)
        return template.render(**data)